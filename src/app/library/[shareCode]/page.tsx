import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import BookCard from '@/components/BookCard';
import EmojiReactions from '@/components/EmojiReactions';
import { notFound } from 'next/navigation';
import type { Library, Book } from '@/types';

interface PageProps {
  params: Promise<{ shareCode: string }>;
}

// 카카오톡·페이스북·트위터 등에 공유 시 표지 썸네일이 뜨도록 OG 메타데이터 생성.
// 우선순위: 도서관 cover_image(http URL) > 첫 책의 cover_image > 없음
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareCode } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: library } = await supabase
    .from('book_libraries')
    .select('title, description, cover_image, book_items(cover_image, sort_order)')
    .eq('share_code', shareCode)
    .eq('is_public', true)
    .single<{
      title: string;
      description: string | null;
      cover_image: string | null;
      book_items: { cover_image: string | null; sort_order: number }[] | null;
    }>();

  if (!library) {
    return { title: '도서관을 찾을 수 없어요 · BOOK by SMARTACT' };
  }

  // OG 이미지 결정
  let ogImage: string | undefined;
  if (library.cover_image && /^https?:\/\//i.test(library.cover_image)) {
    ogImage = library.cover_image;
  } else {
    const items = (library.book_items ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const b of items) {
      if (b.cover_image) { ogImage = b.cover_image; break; }
    }
  }

  const title = `${library.title} · BOOK by SMARTACT`;
  const description = library.description ?? `${library.title} 공개 도서관 — 누구나 둘러볼 수 있어요`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'BOOK by SMARTACT',
      images: ogImage ? [{ url: ogImage, alt: library.title }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function LibraryPage({ params }: PageProps) {
  const { shareCode } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: library } = await supabase
    .from('book_libraries')
    .select('*, book_items(*)')
    .eq('share_code', shareCode)
    .eq('is_public', true)
    .single<Library & { book_items: Book[] }>();

  if (!library) {
    notFound();
  }

  const books = (library.book_items ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const backHref = `/library/${shareCode}`;
  const backLabel = library.title;

  return (
    <div
      className="min-h-screen"
      style={{
        background: [
          'radial-gradient(ellipse at top, rgba(254, 243, 199, 0.6) 0%, transparent 60%)',
          'radial-gradient(ellipse at bottom, rgba(254, 215, 170, 0.4) 0%, transparent 60%)',
          'linear-gradient(180deg, #fffbeb 0%, #fefce8 50%, #fafaf9 100%)',
        ].join(','),
      }}
    >
      {/* 도서관 입구 헤더 */}
      <header className="relative pt-16 pb-12 overflow-hidden">
        {/* 배경 책장 패턴 (얇은) */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0 18px, #78350f 18px 19px, transparent 19px 30px, #92400e 30px 31px, transparent 31px 48px)',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          {/* 작은 라벨 */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/60 border border-amber-200 text-xs font-semibold text-amber-800 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            공개 도서관
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-stone-900 leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {library.title}
          </h1>

          {library.description && (
            <p className="mt-4 text-base md:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
              {library.description}
            </p>
          )}

          <div className="mt-6 inline-flex items-center gap-2 text-sm text-stone-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {books.length}권의 책이 있어요
          </div>

          {/* 도서관 응원 — 누구나 누를 수 있고 카운트 공개 */}
          <div className="mt-6 flex justify-center">
            <EmojiReactions targetType="library" targetId={library.id} showCounts />
          </div>
        </div>
      </header>

      {/* 책 진열대 */}
      <main className="max-w-6xl mx-auto px-4 pb-20">
        {books.length === 0 ? (
          <EmptyShelf />
        ) : (
          <Shelf books={books} backHref={backHref} backLabel={backLabel} />
        )}

        {/* 푸터 */}
        <div className="mt-20 text-center">
          <a
            href="https://book.smartact.kr"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-teal-600 transition"
          >
            book.smartact.kr
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </main>
    </div>
  );
}

function Shelf({ books, backHref, backLabel }: { books: Book[]; backHref: string; backLabel: string }) {
  return (
    <div className="space-y-12">
      {/* 책 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 px-2">
        {books.map((book) => (
          <BookCard key={book.id} book={book} backHref={backHref} backLabel={backLabel} />
        ))}
      </div>

      {/* 책장 선반 — 책 그리드 아래 우드톤 가로 막대 */}
      <div
        aria-hidden
        className="h-3 rounded-sm shadow-md"
        style={{
          background: 'linear-gradient(180deg, #b45309 0%, #92400e 50%, #78350f 100%)',
          boxShadow: '0 4px 8px -2px rgba(120, 53, 15, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      />
    </div>
  );
}

function EmptyShelf() {
  return (
    <div className="text-center py-20">
      <div className="inline-block p-6 rounded-2xl bg-amber-50 border border-amber-100">
        <svg className="w-16 h-16 mx-auto text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="mt-3 text-stone-500 text-sm">아직 등록된 책이 없어요</p>
      </div>
    </div>
  );
}
