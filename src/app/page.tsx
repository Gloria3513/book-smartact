'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import BookCard from '@/components/BookCard';
import LibraryCard from '@/components/LibraryCard';
import type { Book, Library } from '@/types';
import { fetchPublicBooks } from '@/lib/public-books';

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [publicLibraries, setPublicLibraries] = useState<Library[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // 스마택트에서 토큰 전달받은 경우 세션 설정
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, '', '/');
      }

      const { data: { user } } = await supabase.auth.getUser();
      setLoggedIn(!!user);
    };
    init();
  }, [supabase]);

  useEffect(() => {
    const fetchPublic = async () => {
      const [books, { data: libs }] = await Promise.all([
        fetchPublicBooks(supabase, 10),
        supabase
          .from('book_libraries')
          .select('*, book_items(id, title, cover_image, page_count, sort_order)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      setPublicBooks(books);
      setPublicLibraries((libs as Library[]) ?? []);
    };
    fetchPublic();
  }, [supabase]);

  const hasPublicContent = publicBooks.length > 0 || publicLibraries.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white">
      {/* 네비게이션 */}
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xl font-bold text-gray-900">BOOK</span>
          <span className="text-sm text-gray-400 mt-1">by SMARTACT</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/gallery"
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            구경하기
          </Link>
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
            >
              대시보드
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
              >
                시작하기
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* 히어로 */}
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
          PDF를
          <br />
          <span className="text-teal-600">플립북</span>으로
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
          교재와 자료를 아름다운 플립북으로 변환하고,
          <br />
          도서관으로 묶어 한 번에 공유하세요.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={loggedIn ? '/dashboard' : '/login'}
            className="px-8 py-3 bg-teal-600 text-white rounded-xl text-lg font-medium hover:bg-teal-700 transition shadow-lg shadow-teal-200"
          >
            {loggedIn ? '대시보드로 이동' : '시작하기'}
          </Link>
          {hasPublicContent && (
            <a
              href="#explore"
              className="px-8 py-3 border border-teal-200 text-teal-700 rounded-xl text-lg font-medium hover:bg-teal-50 transition"
            >
              구경하기
            </a>
          )}
        </div>

        {/* 기능 카드 */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">PDF 업로드</h3>
            <p className="mt-2 text-gray-500 text-sm">
              PDF를 올리면 자동으로 플립북으로 변환됩니다.
              페이지를 넘기는 생동감 있는 뷰어를 제공합니다.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">도서관으로 묶기</h3>
            <p className="mt-2 text-gray-500 text-sm">
              여러 권의 책을 하나의 도서관으로 묶어
              링크 하나로 전체 컬렉션을 공유하세요.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">어디서나 임베드</h3>
            <p className="mt-2 text-gray-500 text-sm">
              임베드 코드를 복사해서 홈페이지, 블로그 등
              원하는 곳 어디에나 플립북을 삽입하세요.
            </p>
          </div>
        </div>
      </main>

      {/* 구경하기 섹션 */}
      {hasPublicContent && (
        <section
          id="explore"
          className="relative scroll-mt-8"
          style={{
            background: [
              'radial-gradient(ellipse at top, rgba(254, 243, 199, 0.6) 0%, transparent 60%)',
              'linear-gradient(180deg, #fffbeb 0%, #fefce8 100%)',
            ].join(','),
          }}
        >
          {/* 책장 패턴 (얇은) */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 18px, #78350f 18px 19px, transparent 19px 30px, #92400e 30px 31px, transparent 31px 48px)',
            }}
          />

          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/60 border border-amber-200 text-xs font-semibold text-amber-800 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                지금 구경할 수 있어요
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900" style={{ letterSpacing: '-0.02em' }}>
                모두의 책장
              </h2>
              <p className="mt-2 text-stone-500">스마택트 강사·창작자들이 공개한 플립북과 도서관</p>
            </div>

            {/* 공개 도서관 */}
            {publicLibraries.length > 0 && (
              <div className="mb-16">
                <div className="flex items-end justify-between mb-5">
                  <h3 className="text-lg font-bold text-stone-800">공개 도서관</h3>
                  <Link href="/gallery" className="text-sm text-amber-700 hover:text-amber-900 transition">
                    전체 보기 →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {publicLibraries.slice(0, 3).map((lib) => (
                    <LibraryCard key={lib.id} library={lib} />
                  ))}
                </div>
              </div>
            )}

            {/* 공개 플립북 */}
            {publicBooks.length > 0 && (
              <div>
                <div className="flex items-end justify-between mb-5">
                  <h3 className="text-lg font-bold text-stone-800">공개 플립북</h3>
                  <Link href="/gallery" className="text-sm text-amber-700 hover:text-amber-900 transition">
                    전체 보기 →
                  </Link>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                    {publicBooks.slice(0, 10).map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                  {/* 책장 선반 */}
                  <div
                    aria-hidden
                    className="h-3 rounded-sm shadow-md"
                    style={{
                      background: 'linear-gradient(180deg, #b45309 0%, #92400e 50%, #78350f 100%)',
                      boxShadow: '0 4px 8px -2px rgba(120, 53, 15, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-14 text-center">
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition shadow-md"
              >
                전체 구경하기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 푸터 */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        SMARTACT &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
