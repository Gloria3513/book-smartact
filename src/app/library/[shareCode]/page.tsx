import { createServerSupabaseClient } from '@/lib/supabase-server';
import BookCard from '@/components/BookCard';
import { notFound } from 'next/navigation';
import type { Library, Book } from '@/types';

interface PageProps {
  params: Promise<{ shareCode: string }>;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 도서관 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {library.title}
          </h1>
          {library.description && (
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              {library.description}
            </p>
          )}
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {books.length}권의 책
          </div>
        </div>

        {/* 책 그리드 */}
        {books.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            아직 등록된 책이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}

        {/* 푸터 */}
        <div className="mt-16 text-center text-sm text-gray-400">
          <a href="https://book.smartact.kr" className="hover:text-teal-500 transition">
            book.smartact.kr
          </a>
        </div>
      </div>
    </div>
  );
}
