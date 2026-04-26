'use client';

import BookCard from '@/components/BookCard';
import LibraryCard from '@/components/LibraryCard';
import type { Library, Book } from '@/types';

interface Props {
  books: Book[];
  libraries: Library[];
}

export default function GalleryView({ books, libraries }: Props) {
  const isEmpty = books.length === 0 && libraries.length === 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {isEmpty ? (
        <div className="text-center py-24">
          <div className="inline-block p-6 rounded-2xl bg-amber-50/70 border border-amber-100">
            <svg className="w-16 h-16 mx-auto text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="mt-3 text-base text-stone-600">아직 공개된 책장이 없어요</p>
            <p className="mt-1 text-sm text-stone-400">대시보드에서 도서관·플립북을 공개로 전환하면 이곳에 등장해요</p>
          </div>
        </div>
      ) : (
        <div className="space-y-16">
          {/* 공개 도서관 — 먼저 */}
          <section>
            <SectionHeader
              eyebrow="묶음"
              title="공개 도서관"
              count={libraries.length}
              hint="여러 권을 묶은 컬렉션"
            />
            {libraries.length === 0 ? (
              <SectionEmpty hint="공개로 전환된 도서관이 아직 없어요" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {libraries.map((lib) => (
                  <LibraryCard key={lib.id} library={lib} />
                ))}
              </div>
            )}
          </section>

          {/* 공개 플립북 — 한 권씩 */}
          <section>
            <SectionHeader
              eyebrow="낱권"
              title="공개 플립북"
              count={books.length}
              hint="책 한 권 한 권 따로 둘러보기"
            />
            {books.length === 0 ? (
              <SectionEmpty hint="공개로 전환된 낱권 플립북이 아직 없어요" />
            ) : (
              <Shelf>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </Shelf>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
  hint,
}: {
  eyebrow: string;
  title: string;
  count: number;
  hint: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div>
        <div className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase mb-1">
          {eyebrow}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-stone-900 flex items-center gap-2">
          {title}
          <span className="text-sm font-medium text-stone-400">({count})</span>
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

function SectionEmpty({ hint }: { hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 py-10 text-center text-sm text-stone-500">
      {hint}
    </div>
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
