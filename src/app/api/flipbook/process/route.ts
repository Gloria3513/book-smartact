import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { uploadToR2, r2PublicUrl, isR2Configured } from '@/lib/r2';

// 최대 120초 (50-80페이지 변환 여유)
export const maxDuration = 120;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  }

  const { bookId } = await req.json();
  if (!bookId) {
    return NextResponse.json({ error: 'bookId required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. book 조회
  const { data: book, error: fetchErr } = await supabase
    .from('book_items')
    .select('id, pdf_url, owner_id')
    .eq('id', bookId)
    .single();

  if (fetchErr || !book) {
    return NextResponse.json({ error: 'book not found' }, { status: 404 });
  }

  // 2. processing 상태로
  await supabase.from('book_items').update({
    status: 'processing',
    error_message: null,
  }).eq('id', bookId);

  try {
    // 3. PDF 다운로드
    const pdfRes = await fetch(book.pdf_url);
    if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`);
    const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());

    // 4. pdfjs-dist + canvas로 페이지 렌더
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { createCanvas } = await import('@napi-rs/canvas');

    const pdf = await getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
      disableFontFace: false,
    }).promise;

    const pageCount = pdf.numPages;

    // 5. 각 페이지 → webp → R2
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');

      // 흰 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
        canvas: canvas as unknown as HTMLCanvasElement,
      }).promise;

      const webpBuffer = await canvas.encode('webp', 85);
      const filename = `${String(i).padStart(3, '0')}.webp`;
      await uploadToR2(bookId, filename, webpBuffer, 'image/webp');

      // 첫 페이지는 cover로 복사
      if (i === 1) {
        await uploadToR2(bookId, 'cover.webp', webpBuffer, 'image/webp');
      }
    }

    // 6. meta.json
    const meta = {
      pageCount,
      createdAt: new Date().toISOString(),
    };
    await uploadToR2(bookId, 'meta.json', Buffer.from(JSON.stringify(meta)), 'application/json');

    // 7. DB 업데이트
    await supabase.from('book_items').update({
      r2_base_url: r2PublicUrl(bookId, '').replace(/\/$/, ''),
      page_count: pageCount,
      cover_image: r2PublicUrl(bookId, 'cover.webp'),
      status: 'ready',
      error_message: null,
    }).eq('id', bookId);

    return NextResponse.json({ ok: true, pageCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('book_items').update({
      status: 'failed',
      error_message: msg,
    }).eq('id', bookId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
