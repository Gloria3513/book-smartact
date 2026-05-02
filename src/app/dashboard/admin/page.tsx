'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { isIhAdmin } from '@/lib/ih-gate';
import { EMOJIS } from '@/components/EmojiReactions';
import type { Book, Library, User } from '@/types';

interface UserStat {
  id: string;
  full_name: string | null;
  role: string;
  book_count: number;
  library_count: number;
}

type ReactionAggMap = Record<string, Record<string, number>>;

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'libraries' | 'users' | 'reactions'>('overview');
  const [allBooks, setAllBooks] = useState<(Book & { owner_name?: string })[]>([]);
  const [allLibraries, setAllLibraries] = useState<(Library & { owner_name?: string })[]>([]);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactionsByBook, setReactionsByBook] = useState<ReactionAggMap>({});
  const [reactionsByLibrary, setReactionsByLibrary] = useState<ReactionAggMap>({});
  const [reactionTotal, setReactionTotal] = useState(0);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { window.location.href = '/login'; return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single<User>();

    // 관리자 게이트: user_profiles.role === 'admin' OR ih_admins 화이트리스트
    // (둘 중 하나만 만족해도 통과 — ih_admins 만 등록된 통합 관리자도 들어올 수 있게)
    const isLegacyAdmin = profile?.role === 'admin';
    const isHubAdmin = await isIhAdmin(supabase);
    if (!isLegacyAdmin && !isHubAdmin) {
      window.location.href = '/dashboard';
      return;
    }
    setUser(profile);

    // 전체 플립북
    const { data: books } = await supabase
      .from('book_items')
      .select('*')
      .order('created_at', { ascending: false });

    // 전체 도서관
    const { data: libs } = await supabase
      .from('book_libraries')
      .select('*, book_items(*)')
      .order('created_at', { ascending: false });

    // 전체 유저 프로필
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const profileMap = new Map<string, string>();
    (profiles ?? []).forEach((p: User) => profileMap.set(p.id, p.full_name || '이름없음'));

    // 책에 소유자 이름 매핑
    const booksWithOwner = (books ?? []).map((b: Book) => ({
      ...b,
      owner_name: b.owner_id ? profileMap.get(b.owner_id) || '알 수 없음' : '알 수 없음',
    }));
    setAllBooks(booksWithOwner);

    // 도서관에 소유자 이름 매핑
    const libsWithOwner = (libs ?? []).map((l: Library) => ({
      ...l,
      owner_name: profileMap.get(l.owner_id) || '알 수 없음',
    }));
    setAllLibraries(libsWithOwner);

    // 유저별 통계
    const stats: UserStat[] = (profiles ?? []).map((p: User) => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      book_count: (books ?? []).filter((b: Book) => b.owner_id === p.id).length,
      library_count: (libs ?? []).filter((l: Library) => l.owner_id === p.id).length,
    }));
    setUserStats(stats.sort((a, b) => b.book_count - a.book_count));

    // 전체 응원 (admin은 모든 책 reaction 조회 가능)
    const { data: reacts } = await supabase
      .from('reactions')
      .select('target_type, target_id, emoji_key');
    const byBook: ReactionAggMap = {};
    const byLib: ReactionAggMap = {};
    let total = 0;
    for (const r of (reacts ?? []) as { target_type: string; target_id: string; emoji_key: string }[]) {
      total++;
      const target = r.target_type === 'book' ? byBook : byLib;
      if (!target[r.target_id]) target[r.target_id] = {};
      target[r.target_id][r.emoji_key] = (target[r.target_id][r.emoji_key] ?? 0) + 1;
    }
    setReactionsByBook(byBook);
    setReactionsByLibrary(byLib);
    setReactionTotal(total);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteBook = async (book: Book) => {
    if (!confirm(`"${book.title}" 플립북을 삭제하시겠습니까?`)) return;
    const path = book.pdf_url.split('/flipbooks/')[1];
    if (path) await supabase.storage.from('flipbooks').remove([path]);
    await supabase.from('book_items').delete().eq('id', book.id);
    loadData();
  };

  const deleteLibrary = async (lib: Library) => {
    if (!confirm(`"${lib.title}" 도서관을 삭제하시겠습니까? (포함된 책은 단독으로 전환됩니다)`)) return;
    // 포함된 책의 library_id를 null로 변경
    await supabase.from('book_items').update({ library_id: null }).eq('library_id', lib.id);
    await supabase.from('book_libraries').delete().eq('id', lib.id);
    loadData();
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`이 사용자의 권한을 ${newRole === 'admin' ? '관리자' : '일반 사용자'}로 변경하시겠습니까?`)) return;
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const totalBooks = allBooks.length;
  const totalLibraries = allLibraries.length;
  const totalUsers = userStats.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a href="/dashboard" className="hover:text-teal-600 transition">대시보드</a>
              <span>/</span>
              <span className="text-gray-800">관리</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">관리자 패널</h1>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          {(['overview', 'books', 'libraries', 'users', 'reactions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {{ overview: '개요', books: `플립북 (${totalBooks})`, libraries: `도서관 (${totalLibraries})`, users: `사용자 (${totalUsers})`, reactions: `응원 (${reactionTotal})` }[tab]}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 개요 탭 */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">전체 플립북</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalBooks}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">전체 도서관</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalLibraries}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">전체 사용자</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-6">
              <p className="text-sm text-amber-700">받은 응원</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">{reactionTotal}</p>
            </div>

            <div className="col-span-2 md:col-span-4 bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">사용자별 현황 (상위 10명)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">이름</th>
                    <th className="pb-2">권한</th>
                    <th className="pb-2 text-right">플립북</th>
                    <th className="pb-2 text-right">도서관</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.slice(0, 10).map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">{u.full_name || '이름없음'}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
                          {u.role === 'admin' ? '관리자' : '사용자'}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-800">{u.book_count}</td>
                      <td className="py-2 text-right text-gray-800">{u.library_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 플립북 관리 탭 */}
        {activeTab === 'books' && (
          <div className="space-y-3">
            {allBooks.map((book) => (
              <div key={book.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-14 bg-gradient-to-br from-amber-50 to-orange-100 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 text-sm">{book.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {book.owner_name} · {new Date(book.created_at).toLocaleDateString('ko-KR')}
                      {book.library_id && <span className="ml-2 text-teal-500">도서관 포함</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/book/${book.id}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">보기</a>
                  <button onClick={() => deleteBook(book)} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">삭제</button>
                </div>
              </div>
            ))}
            {allBooks.length === 0 && (
              <p className="text-center py-20 text-gray-400">등록된 플립북이 없습니다.</p>
            )}
          </div>
        )}

        {/* 도서관 관리 탭 */}
        {activeTab === 'libraries' && (
          <div className="space-y-3">
            {allLibraries.map((lib) => (
              <div key={lib.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800 text-sm">{lib.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lib.owner_name} · {lib.book_items?.length ?? 0}권 · {new Date(lib.created_at).toLocaleDateString('ko-KR')}
                    {!lib.is_public && <span className="ml-2 text-amber-500">비공개</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/library/${lib.share_code}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">보기</a>
                  <button onClick={() => deleteLibrary(lib)} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">삭제</button>
                </div>
              </div>
            ))}
            {allLibraries.length === 0 && (
              <p className="text-center py-20 text-gray-400">등록된 도서관이 없습니다.</p>
            )}
          </div>
        )}

        {/* 사용자 관리 탭 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">권한</th>
                  <th className="px-4 py-3 text-right">플립북</th>
                  <th className="px-4 py-3 text-right">도서관</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{u.full_name || '이름없음'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role === 'admin' ? '관리자' : '사용자'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">{u.book_count}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{u.library_count}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleUserRole(u.id, u.role)}
                        disabled={u.id === user?.id}
                        className="text-xs text-teal-600 hover:underline disabled:text-gray-300 disabled:no-underline"
                      >
                        {u.role === 'admin' ? '사용자로 변경' : '관리자로 변경'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 응원 탭 — 도서관·책별 카운트 ranking */}
        {activeTab === 'reactions' && (
          <div className="space-y-8">
            {/* 도서관 ranking */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">공개 도서관 응원 ranking</h3>
                <span className="text-xs text-gray-400">응원 합계 많은 순</span>
              </div>
              {(() => {
                const rows = allLibraries
                  .map((lib) => {
                    const counts = reactionsByLibrary[lib.id] ?? {};
                    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
                    return { lib, counts, sum };
                  })
                  .filter((r) => r.sum > 0)
                  .sort((a, b) => b.sum - a.sum);
                if (rows.length === 0) {
                  return <p className="text-center py-12 text-sm text-gray-400">아직 도서관에 도착한 응원이 없어요.</p>;
                }
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500 text-xs">
                        <th className="px-4 py-2 w-10">#</th>
                        <th className="px-4 py-2">도서관</th>
                        <th className="px-4 py-2">소유자</th>
                        <th className="px-4 py-2 text-right">반응</th>
                        <th className="px-4 py-2 text-right">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.lib.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <a href={`/library/${r.lib.share_code}`} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-teal-700 transition">{r.lib.title}</a>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{r.lib.owner_name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {EMOJIS.map(({ key, emoji }) => {
                                const count = r.counts[key] ?? 0;
                                if (count === 0) return null;
                                return (
                                  <span key={key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded-full text-xs">
                                    <span>{emoji}</span>
                                    <span className="font-semibold">{count}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">{r.sum}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* 책 ranking */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">개별 책 응원 ranking</h3>
                <span className="text-xs text-gray-400">응원 합계 많은 순</span>
              </div>
              {(() => {
                const rows = allBooks
                  .map((book) => {
                    const counts = reactionsByBook[book.id] ?? {};
                    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
                    return { book, counts, sum };
                  })
                  .filter((r) => r.sum > 0)
                  .sort((a, b) => b.sum - a.sum);
                if (rows.length === 0) {
                  return <p className="text-center py-12 text-sm text-gray-400">아직 책에 도착한 응원이 없어요.</p>;
                }
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500 text-xs">
                        <th className="px-4 py-2 w-10">#</th>
                        <th className="px-4 py-2">책</th>
                        <th className="px-4 py-2">소유자</th>
                        <th className="px-4 py-2 text-right">반응</th>
                        <th className="px-4 py-2 text-right">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.book.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <a href={`/book/${r.book.id}`} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-teal-700 transition">{r.book.title}</a>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{r.book.owner_name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {EMOJIS.map(({ key, emoji }) => {
                                const count = r.counts[key] ?? 0;
                                if (count === 0) return null;
                                return (
                                  <span key={key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded-full text-xs">
                                    <span>{emoji}</span>
                                    <span className="font-semibold">{count}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">{r.sum}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <p className="text-xs text-gray-400 text-center">
              voter 식별 정보는 저장되지 않아요(IP+UA 해시만). 위 카운트는 집계 결과예요.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
