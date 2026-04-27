import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { uploadToR2, r2PublicUrl, isR2Configured } from '@/lib/r2';

// Vercel serverless에서 pdfjs-dist의 fake worker가
// pdf.worker.mjs를 동적 require할 때 사용할 절대 경로 확보용.
const nodeRequire = createRequire(import.meta.url);

// 한글 폰트를 캔버스에 등록 (모듈 로드 시 1회).
// PDF에 폰트가 임베딩 안 된 채로 시스템 폰트 fallback하는 경우
// 서버에 한글 폰트가 없으면 □□□로 깨짐 → Noto Sans KR을 미리 등록한다.
let koreanFontRegistered = false;
async function ensureKoreanFontRegistered() {
  if (koreanFontRegistered) return;
  try {
    const { GlobalFonts } = await import('@napi-rs/canvas');
    const fontPath = nodeRequire.resolve('@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff');
    GlobalFonts.registerFromPath(fontPath, 'Noto Sans KR');
    koreanFontRegistered = true;
  } catch (e) {
    console.warn('한글 폰트 등록 실패:', e);
  }
}

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
    // 한글 폰트 등록 (모듈 로드 후 1회)
    await ensureKoreanFontRegistered();

    // 3. PDF 다운로드
    const pdfRes = await fetch(book.pdf_url);
    if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`);
    const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());

    // 4. pdfjs-dist + canvas로 페이지 렌더
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Node 환경에서 fake worker가 worker 모듈을 못 찾으면 실패하므로
    // workerSrc를 worker 파일의 절대 경로로 명시한다.
    try {
      const workerPath = nodeRequire.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
      (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } })
        .GlobalWorkerOptions.workerSrc = workerPath;
    } catch (e) {
      console.warn('pdfjs worker 경로 해결 실패, fake worker로 진행:', e);
    }
    const { getDocument } = pdfjsLib;
    const { createCanvas } = await import('@napi-rs/canvas');

    // pdfjs-dist의 cmap (한중일 매핑) + standard fonts 디렉토리 경로
    // PDF에 폰트가 임베딩 안 됐을 때 글자가 깨지지 않도록 fallback에 필요.
    const pdfjsRoot = path.dirname(nodeRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs'))
      .replace(/legacy[\\/]+build$/, '');
    const cMapUrl = pathToFileURL(path.join(pdfjsRoot, 'cmaps') + path.sep).href;
    const standardFontDataUrl = pathToFileURL(path.join(pdfjsRoot, 'standard_fonts') + path.sep).href;

    const pdf = await getDocument({
      data: pdfBuffer,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
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
