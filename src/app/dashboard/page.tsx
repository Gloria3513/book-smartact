'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import LibraryCard from '@/components/LibraryCard';
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
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const supabase = createClient();
  const MAX_BOOKS = 10;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://book.smartact.kr';

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    // 스마택트에서 토큰 전달받은 경우 세션 설정
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      // URL에서 토큰 제거 (깔끔하게)
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

      await supabase.from('book_items').insert({
        title: file.name.replace('.pdf', ''),
        pdf_url: publicUrl,
        owner_id: authUser.id,
        sort_order: 0,
      });

      loadData();
    } catch (error) {
      console.error('업로드 실패:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      console.error('업로드 상세 에러:', JSON.stringify(error, null, 2));
      alert(`업로드 실패: ${msg}\n\n브라우저 콘솔(F12)에서 상세 에러를 확인하세요.`);
    } finally {
      setUploading(false);
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
      setShowGroupModal(false);
      loadData();
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!canAddMore && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            무료 플립북 {MAX_BOOKS}개를 모두 사용했습니다. 추가 등록이 필요하면 관리자에게 문의하세요.
          </div>
        )}

        {/* 플립북 탭 */}
        {activeTab === 'books' && (
          <>
            {standaloneBooks.length > 0 && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => { setSelectedBooks([]); setShowGroupModal(true); }}
                  className="px-4 py-2 border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 transition text-sm"
                >
                  선택해서 도서관 만들기
                </button>
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
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {showGroupModal && !book.library_id && (
                        <input
                          type="checkbox"
                          checked={selectedBooks.includes(book.id)}
                          onChange={() => toggleBookSelection(book.id)}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      )}
                      <div className="w-12 h-16 bg-gradient-to-br from-amber-50 to-orange-100 rounded flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">{book.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {book.library_id ? (
                            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded">
                              도서관에 포함됨
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              단독
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                  </div>
                ))}
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
                  <LibraryCard key={lib.id} library={lib} isOwner />
                ))}
              </div>
            )}
          </>
        )}
      </main>

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

      {/* 도서관으로 묶기 모달 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">도서관으로 묶기</h2>
            <p className="text-sm text-gray-500 mb-4">위 목록에서 플립북을 선택한 후, 도서관 이름을 입력하세요.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">도서관 이름 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 시니어 교육 자료"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
              <p className="text-sm text-teal-600">{selectedBooks.length}개 선택됨</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowGroupModal(false); setSelectedBooks([]); setNewTitle(''); setNewDescription(''); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">취소</button>
              <button onClick={groupBooksToLibrary} disabled={!newTitle.trim() || selectedBooks.length === 0} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50">도서관 만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
