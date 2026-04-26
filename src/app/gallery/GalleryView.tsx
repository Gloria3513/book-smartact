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
      {/* 탭 (반투명 페이지 배경 위에 살짝 떠있게) */}
      <div className="border-b border-amber-100/70 bg-white/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setTab('books')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'books'
                ? 'border-amber-700 text-amber-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            플립북 ({books.length})
          </button>
          <button
            onClick={() => setTab('libraries')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'libraries'
                ? 'border-amber-700 text-amber-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            공개도서관 ({libraries.length})
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {tab === 'books' && (
          books.length === 0 ? (
            <EmptyState
              title="아직 공개된 플립북이 없어요"
              hint="대시보드에서 플립북을 공개로 전환하면 이곳에 등장해요"
            />
          ) : (
            <Shelf>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </Shelf>
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

// 책장 선반(우드톤 가로 막대)이 받치는 책 진열
function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      {children}
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

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-20">
      <div className="inline-block p-6 rounded-2xl bg-amber-50/70 border border-amber-100">
        <svg className="w-16 h-16 mx-auto text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="mt-3 text-base text-stone-600">{title}</p>
        <p className="mt-1 text-sm text-stone-400">{hint}</p>
      </div>
    </div>
  );
}
