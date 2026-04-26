'use client';

import { useState } from 'react';
import BookCard from '@/components/BookCard';
import LibraryCard from '@/components/LibraryCard';
import type { Library, Book } from '@/types';

type Tab = 'books' | 'libraries';

interface Props {
  books: Book[];
  libraries: Library[];
}

export default function GalleryView({ books, libraries }: Props) {
  const [tab, setTab] = useState<Tab>('books');

  return (
    <>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setTab('books')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              tab === 'books'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            플립북 ({books.length})
          </button>
          <button
            onClick={() => setTab('libraries')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              tab === 'libraries'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            공개도서관 ({libraries.length})
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'books' && (
          books.length === 0 ? (
            <EmptyState
              title="아직 공개된 플립북이 없어요"
              hint="대시보드에서 플립북을 공개로 전환하면 이곳에 등장해요"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )
        )}

        {tab === 'libraries' && (
          libraries.length === 0 ? (
            <EmptyState
              title="아직 공개된 도서관이 없어요"
              hint="대시보드의 도서관 카드에서 공개로 전환할 수 있어요"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {libraries.map((lib) => (
                <LibraryCard key={lib.id} library={lib} />
              ))}
            </div>
          )
        )}
      </main>
    </>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-base text-gray-500">{title}</p>
      <p className="mt-2 text-sm">{hint}</p>
    </div>
  );
}
