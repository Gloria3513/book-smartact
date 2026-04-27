import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import FlipbookViewer from '@/components/FlipbookViewer';
import { notFound } from 'next/navigation';
import type { Book } from '@/types';

interface PageProps {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ from?: string; fromLabel?: string }>;
}

// 외부 URL로의 open redirect를 막기 위해 내부 절대 경로만 허용
function safeBackHref(input: string | undefined): string | null {
  if (!input) return null;
  if (!input.startsWith('/')) return null;
  if (input.startsWith('//')) return null;
  return input;
}

// 카카오톡·SNS 공유 시 책 표지를 썸네일로 노출
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: book } = await supabase
    .from('book_items')
    .select('title, cover_image')
    .eq('id', bookId)
    .single<{ title: string; cover_image: string | null }>();

  if (!book) {
    return { title: '플립북을 찾을 수 없어요 · BOOK by SMARTACT' };
  }

  const ogImage = book.cover_image && /^https?:\/\//i.test(book.cover_image) ? book.cover_image : undefined;
  const title = `${book.title} · BOOK by SMARTACT`;
  const description = `${book.title} — 플립북으로 넘겨보세요`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'book',
      siteName: 'BOOK by SMARTACT',
      images: ogImage ? [{ url: ogImage, alt: book.title }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { bookId } = await params;
  const { from, fromLabel } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: book } = await supabase
    .from('book_items')
    .select('*')
    .eq('id', bookId)
    .single<Book>();

  if (!book) {
    notFound();
  }

  const backHref = safeBackHref(from);
  const backLabel = fromLabel?.slice(0, 60) || '돌아가기';

  return (
    <div className="min-h-screen bg-gray-100">
      {backHref && <BackBar href={backHref} label={backLabel} />}
      <FlipbookViewer
        pdfUrl={book.pdf_url}
        title={book.title}
        r2BaseUrl={book.r2_base_url}
        pageCount={book.page_count}
      />
    </div>
  );
}

function BackBar({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="fixed top-3 left-3 z-50 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-white hover:text-teal-700 hover:border-teal-300 shadow-sm transition max-w-[60vw]"
      title={label}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span className="truncate">{label}</span>
    </a>
  );
}
