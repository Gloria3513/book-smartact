'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ensureInstructorApproved } from '@/lib/ih-gate';
import LibraryCard from '@/components/LibraryCard';
import { EMOJIS } from '@/components/EmojiReactions';
import type { Library, Book, User } from '@/types';

type Tab = 'books' | 'libraries';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('books');
  const [uploading, setUploading] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [bookReactions, setBookReactions] = useState<Record<string, Record<string, number>>>({});

  const supabase = createClient();
  const MAX_BOOKS = 10;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://book.smartact.kr';

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      window.history.replaceState({}, '', '/dashboard');
    }

    loadData();
  };

  const loadData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      window.location.href = '/login';
      return;
    }

    // 강사허브 멤버십 게이트: 미승인이면 hub.smartact.kr/pending 으로 리다이렉트
    const gate = await ensureInstructorApproved(supabase);
    if (!gate.allowed) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single<User>();
    setUser(profile);

    const { data: bookList } = await supabase
      .from('book_items')
      .select('*')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false });
    setBooks((bookList as Book[]) ?? []);

    const { data: libs } = await supabase
      .from('book_libraries')
      .select('*, book_items(*)')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false });
    setLibraries((libs as Library[]) ?? []);

    // 작가만 볼 수 있는 책별 이모지 반응 카운트 (RLS가 owner만 SELECT 허용)
    const myBookIds = ((bookList as Book[]) ?? []).map(b => b.id);
    if (myBookIds.length > 0) {
      const { data: reacts } = await supabase
        .from('reactions')
        .select('target_id, emoji_key')
        .eq('target_type', 'book')
        .in('target_id', myBookIds);
      const grouped: Record<string, Record<string, number>> = {};
      for (const r of (reacts ?? []) as { target_id: string; emoji_key: string }[]) {
        if (!grouped[r.target_id]) grouped[r.target_id] = {};
        grouped[r.target_id][r.emoji_key] = (grouped[r.target_id][r.emoji_key] ?? 0) + 1;
      }
      setBookReactions(grouped);
    } else {
      setBookReactions({});
    }

    setLoading(false);
  };

  const isNotAdmin = user?.role !== 'admin';
  const canAddMore = !isNotAdmin || books.length < MAX_BOOKS;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }
    if (!canAddMore) {
      alert(`무료 플립북 ${MAX_BOOKS}개를 모두 사용했습니다.`);
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${authUser.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('flipbooks')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('flipbooks')
        .getPublicUrl(fileName);

      const { data: inserted } = await supabase.from('book_items').insert({
        title: file.name.replace('.pdf', ''),
        pdf_url: publicUrl,
        owner_id: authUser.id,
        sort_order: 0,
        status: 'pending',
      }).select().single();

      loadData();

      if (inserted?.id) {
        fetch('/api/flipbook/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: inserted.id }),
        }).then(() => loadData()).catch(() => {});
      }
    } catch (error) {
      console.error('업로드 실패:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      console.error('업로드 상세 에러:', JSON.stringify(error, null, 2));
      alert(`업로드 실패: ${msg}\n\n브라우저 콘솔(F12)에서 상세 에러를 확인하세요.`);
    } finally {
      setUploading(false);
    }
  };

  const reprocessBook = async (book: Book) => {
    // 이미 처리 중이면 중복 호출 방지
    if (book.status === 'processing') return;

    // 즉시 UI에 처리 중 표시
    setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, status: 'processing' } : b)));

    try {
      const res = await fetch('/api/flipbook/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      // 완료 후 목록 새로고침 (cover_image, page_count 등 갱신)
      loadData();
    } catch (err) {
      console.error('표지 변환 실패:', err);
      alert(`표지 변환에 실패했어요. 잠시 후 다시 시도해주세요.\n${err instanceof Error ? err.message : ''}`);
      loadData();
    }
  };

  const deleteBook = async (book: Book) => {
    if (!confirm('이 플립북을 삭제하시겠습니까?')) return;
    const path = book.pdf_url.split('/flipbooks/')[1];
    if (path) await supabase.storage.from('flipbooks').remove([path]);
    await supabase.from('book_items').delete().eq('id', book.id);
    loadData();
  };

  const copyEmbedCode = (bookId: string) => {
    const code = `<iframe src="${siteUrl}/book/${bookId}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(code);
    alert('임베드 코드가 복사되었습니다!');
  };

  const copyBookLink = (bookId: string) => {
    navigator.clipboard.writeText(`${siteUrl}/book/${bookId}`);
    alert('링크가 복사되었습니다!');
  };

  const createLibrary = async () => {
    if (!newTitle.trim()) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: lib, error } = await supabase.from('book_libraries').insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      owner_id: authUser.id,
    }).select().single();

    if (!error && lib) {
      setNewTitle('');
      setNewDescription('');
      setShowLibraryModal(false);
      loadData();
    }
  };

  const groupBooksToLibrary = async () => {
    if (!newTitle.trim() || selectedBooks.length === 0) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: lib, error } = await supabase.from('book_libraries').insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      owner_id: authUser.id,
    }).select().single();

    if (!error && lib) {
      await supabase
        .from('book_items')
        .update({ library_id: lib.id })
        .in('id', selectedBooks);

      setNewTitle('');
      setNewDescription('');
      setSelectedBooks([]);
      setSelectionMode(false);
      setShowGroupModal(false);
      loadData();
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const enterSelectionMode = () => {
    setSelectedBooks([]);
    setSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedBooks([]);
    setNewTitle('');
    setNewDescription('');
    setShowGroupModal(false);
  };

  const startRename = (book: Book) => {
    setEditingBookId(book.id);
    setEditingTitle(book.title);
  };

  const cancelRename = () => {
    setEditingBookId(null);
    setEditingTitle('');
  };

  const saveRename = async (book: Book) => {
    const next = editingTitle.trim();
    if (!next || next === book.title) {
      cancelRename();
      return;
    }
    setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, title: next } : b)));
    cancelRename();
    const { error } = await supabase
      .from('book_items')
      .update({ title: next })
      .eq('id', book.id);
    if (error) {
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, title: book.title } : b)));
      alert('이름 변경에 실패했습니다.');
    }
  };

  const toggleBookPublic = async (book: Book) => {
    const next = !book.is_public;
    setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, is_public: next } : b)));
    const { error } = await supabase
      .from('book_items')
      .update({ is_public: next })
      .eq('id', book.id);
    if (error) {
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, is_public: !next } : b)));
      alert('공개 설정 변경에 실패했습니다.');
    }
  };

  const toggleLibraryPublic = async (library: Library) => {
    const next = !library.is_public;
    setLibraries(prev => prev.map(l => (l.id === library.id ? { ...l, is_public: next } : l)));
    const { error } = await supabase
      .from('book_libraries')
      .update({ is_public: next })
      .eq('id', library.id);
    if (error) {
      setLibraries(prev => prev.map(l => (l.id === library.id ? { ...l, is_public: !next } : l)));
      alert('공개 설정 변경에 실패했습니다.');
    }
  };

  const standaloneBooks = books.filter(b => !b.library_id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-500">
              {user?.full_name || '사용자'} · {user?.role === 'admin' ? '관리자' : '강사'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/gallery"
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              구경하기
            </a>
            {user?.role === 'admin' && (
              <a
                href="/dashboard/admin"
                className="px-4 py-2 border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 transition text-sm"
              >
                관리
              </a>
            )}
            {isNotAdmin && (
              <span className="text-sm text-gray-500">
                {books.length} / {MAX_BOOKS}권
              </span>
            )}
            <label className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition cursor-pointer text-sm">
              {uploading ? '업로드 중...' : '+ PDF 업로드'}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading || !canAddMore}
              />
            </label>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setActiveTab('books')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'books'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            내 플립북 ({books.length})
          </button>
          <button
            onClick={() => setActiveTab('libraries')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'libraries'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            도서관 ({libraries.length})
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-32">
        {!canAddMore && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            무료 플립북 {MAX_BOOKS}개를 모두 사용했습니다. 추가 등록이 필요하면 관리자에게 문의하세요.
          </div>
        )}

        {/* 플립북 탭 */}
        {activeTab === 'books' && (
          <>
            {standaloneBooks.length > 0 && !selectionMode && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={enterSelectionMode}
                  className="px-4 py-2 border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 transition text-sm"
                >
                  선택해서 도서관 만들기
                </button>
              </div>
            )}

            {selectionMode && (
              <div className="mb-6 p-3 bg-teal-50 border border-teal-100 rounded-lg text-sm text-teal-800">
                묶을 플립북을 체크하세요. (단독 플립북만 묶을 수 있어요)
              </div>
            )}

            {books.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 mb-4">PDF를 업로드해서 플립북을 만들어보세요</p>
                <label className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition cursor-pointer">
                  첫 PDF 업로드
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {books.map((book) => {
                  const selectable = selectionMode && !book.library_id;
                  const checked = selectedBooks.includes(book.id);
                  return (
                    <div
                      key={book.id}
                      onClick={selectable ? () => toggleBookSelection(book.id) : undefined}
                      className={`bg-white rounded-xl border p-4 flex items-center justify-between transition ${
                        selectable
                          ? checked
                            ? 'border-teal-500 ring-2 ring-teal-200 cursor-pointer'
                            : 'border-gray-200 hover:border-teal-300 cursor-pointer'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!selectable}
                            onChange={() => toggleBookSelection(book.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 text-teal-600 rounded disabled:opacity-30"
                          />
                        )}
                        <div className="w-12 h-16 bg-gradient-to-br from-amber-50 to-orange-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          {editingBookId === book.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename(book);
                                  if (e.key === 'Escape') cancelRename();
                                }}
                                autoFocus
                                className="px-2 py-1 border border-teal-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              />
                              <button
                                onClick={() => saveRename(book)}
                                className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                              >
                                저장
                              </button>
                              <button
                                onClick={cancelRename}
                                className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-medium text-gray-800 truncate">{book.title}</h3>
                              {!selectionMode && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); startRename(book); }}
                                  className="text-gray-400 hover:text-teal-600 transition text-sm"
                                  title="이름 변경"
                                >
                                  ✏️
                                </button>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {book.library_id ? (
                              <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded">
                                도서관에 포함됨
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                단독
                              </span>
                            )}
                            {book.is_public ? (
                              <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">
                                공개 중
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                비공개
                              </span>
                            )}
                          </div>
                          {book.status === 'failed' && book.error_message && (
                            <p
                              className="mt-1 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 max-w-md truncate"
                              title={book.error_message}
                            >
                              변환 실패: {book.error_message}
                            </p>
                          )}
                          {bookReactions[book.id] && Object.values(bookReactions[book.id]).some(v => v > 0) && (
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600" title="이 책에 도착한 응원 (작가만 보임)">
                              {EMOJIS.map(({ key, emoji }) => {
                                const count = bookReactions[book.id]?.[key] ?? 0;
                                if (count === 0) return null;
                                return (
                                  <span key={key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded-full">
                                    <span>{emoji}</span>
                                    <span className="font-semibold">{count}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {!selectionMode && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            onClick={() => toggleBookPublic(book)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                              book.is_public
                                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                            title={book.is_public ? '비공개로 전환' : '갤러리에 공개'}
                          >
                            {book.is_public ? '🌐 공개' : '🔒 비공개'}
                          </button>
                          <button
                            onClick={() => reprocessBook(book)}
                            disabled={book.status === 'processing'}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                              !book.cover_image || book.status !== 'ready'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                            title="PDF 첫 페이지를 표지로, 모든 페이지를 이미지로 다시 변환합니다"
                          >
                            {book.status === 'processing'
                              ? '⏳ 변환 중...'
                              : !book.cover_image
                                ? '🖼️ 표지 만들기'
                                : '🔄 표지 갱신'}
                          </button>
                          <a
                            href={`/book/${book.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                          >
                            보기
                          </a>
                          <button
                            onClick={() => copyBookLink(book.id)}
                            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                          >
                            링크
                          </button>
                          <button
                            onClick={() => copyEmbedCode(book.id)}
                            className="px-3 py-1.5 text-sm border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 transition"
                          >
                            임베드
                          </button>
                          <button
                            onClick={() => deleteBook(book)}
                            className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 도서관 탭 */}
        {activeTab === 'libraries' && (
          <>
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowLibraryModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
              >
                + 새 도서관
              </button>
            </div>

            {libraries.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-gray-500 mb-4">플립북을 묶어서 도서관을 만들어보세요</p>
                <button
                  onClick={() => setShowLibraryModal(true)}
                  className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                >
                  첫 도서관 만들기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {libraries.map((lib) => (
                  <LibraryCard
                    key={lib.id}
                    library={lib}
                    isOwner
                    onTogglePublic={() => toggleLibraryPublic(lib)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 선택 모드 하단 액션 바 */}
      {selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-teal-600">{selectedBooks.length}권</span> 선택됨
              {selectedBooks.length === 0 && <span className="text-gray-400 ml-2">위 목록에서 체크하세요</span>}
            </p>
            <div className="flex gap-2">
              <button
                onClick={exitSelectionMode}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                취소
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                disabled={selectedBooks.length === 0}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                도서관으로 묶기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도서관 생성 모달 */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 도서관 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">도서관 이름 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 디지털 리터러시 교재"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="도서관에 대한 간단한 설명"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowLibraryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">취소</button>
              <button onClick={createLibrary} disabled={!newTitle.trim()} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50">만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* 도서관으로 묶기 모달 (선택 후 이름 입력) */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">도서관으로 묶기</h2>
            <p className="text-sm text-teal-600 mb-4">{selectedBooks.length}권 선택됨</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">도서관 이름 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 경기도어린이박물관 그림책"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="도서관에 대한 간단한 설명"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGroupModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                뒤로
              </button>
              <button
                onClick={groupBooksToLibrary}
                disabled={!newTitle.trim() || selectedBooks.length === 0}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                도서관 만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
