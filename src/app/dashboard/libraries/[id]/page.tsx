'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Library, Book, User } from '@/types';
import { LibraryCover, TemplateCover } from '@/components/LibraryCard';
import { EMOJIS } from '@/components/EmojiReactions';
import {
  templateValue,
  isTemplateValue,
  templateKey,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  templatesByCategory,
} from '@/lib/library-templates';

export default function LibraryDetailPage() {
  const params = useParams();
  const libraryId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingLibraryName, setEditingLibraryName] = useState(false);
  const [libraryNameDraft, setLibraryNameDraft] = useState('');
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showAddBooksModal, setShowAddBooksModal] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [coverUploading, setCoverUploading] = useState(false);
  const [bookReactions, setBookReactions] = useState<Record<string, Record<string, number>>>({});

  const supabase = createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://book.smartact.kr';

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single<User>();
    setUser(profile);

    const { data: lib } = await supabase
      .from('book_libraries')
      .select('*')
      .eq('id', libraryId)
      .single<Library>();
    setLibrary(lib);

    const { data: bookList } = await supabase
      .from('book_items')
      .select('*')
      .eq('library_id', libraryId)
      .order('sort_order', { ascending: true });
    setBooks((bookList as Book[]) ?? []);

    // 작가만 볼 수 있는 책별 이모지 반응 카운트
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
  }, [libraryId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // 강사 제한 체크
    if (user?.role !== 'admin') {
      const { count } = await supabase
        .from('book_items')
        .select('*', { count: 'exact', head: true })
        .in('library_id',
          (await supabase.from('book_libraries').select('id').eq('owner_id', user!.id)).data?.map(l => l.id) ?? []
        );
      if ((count ?? 0) >= 10) {
        alert('무료 플립북 10개를 모두 사용했습니다.');
        return;
      }
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${libraryId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('flipbooks')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('flipbooks')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('book_items').insert({
        library_id: libraryId,
        title: file.name.replace('.pdf', ''),
        pdf_url: publicUrl,
        sort_order: books.length,
      });

      if (insertError) throw insertError;

      loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      console.error('업로드 상세 에러:', JSON.stringify(error, null, 2));
      alert(`업로드 실패: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteBook = async (bookId: string, pdfUrl: string) => {
    if (!confirm('이 책을 삭제하시겠습니까?')) return;

    // Storage에서 파일 삭제
    const path = pdfUrl.split('/flipbooks/')[1];
    if (path) {
      await supabase.storage.from('flipbooks').remove([path]);
    }

    await supabase.from('book_items').delete().eq('id', bookId);
    loadData();
  };

  const reprocessBook = async (book: Book) => {
    if (book.status === 'processing') return;
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
      loadData();
    } catch (err) {
      console.error('표지 변환 실패:', err);
      alert(`표지 변환에 실패했어요. 잠시 후 다시 시도해주세요.\n${err instanceof Error ? err.message : ''}`);
      loadData();
    }
  };

  const openAddBooksModal = async () => {
    setSelectedToAdd([]);
    setShowAddBooksModal(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data } = await supabase
      .from('book_items')
      .select('*')
      .eq('owner_id', authUser.id)
      .is('library_id', null)
      .order('created_at', { ascending: false });
    setAvailableBooks((data as Book[]) ?? []);
  };

  const toggleBookToAdd = (bookId: string) => {
    setSelectedToAdd(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const addBooksToLibrary = async () => {
    if (selectedToAdd.length === 0) return;
    const { error } = await supabase
      .from('book_items')
      .update({ library_id: libraryId })
      .in('id', selectedToAdd);
    if (error) {
      alert('도서관 추가에 실패했습니다.');
      return;
    }
    setShowAddBooksModal(false);
    setSelectedToAdd([]);
    loadData();
  };

  const removeBookFromLibrary = async (book: Book) => {
    if (!confirm(`"${book.title}"을(를) 이 도서관에서 빼시겠습니까?\n(책 자체는 삭제되지 않고 단독 플립북으로 남습니다)`)) return;
    setBooks(prev => prev.filter(b => b.id !== book.id));
    const { error } = await supabase
      .from('book_items')
      .update({ library_id: null })
      .eq('id', book.id);
    if (error) {
      alert('도서관에서 빼기에 실패했습니다.');
      loadData();
    }
  };

  const startRenameBook = (book: Book) => {
    setEditingBookId(book.id);
    setEditingTitle(book.title);
  };

  const cancelRenameBook = () => {
    setEditingBookId(null);
    setEditingTitle('');
  };

  const saveRenameBook = async (book: Book) => {
    const next = editingTitle.trim();
    if (!next || next === book.title) {
      cancelRenameBook();
      return;
    }
    setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, title: next } : b)));
    cancelRenameBook();
    const { error } = await supabase
      .from('book_items')
      .update({ title: next })
      .eq('id', book.id);
    if (error) {
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, title: book.title } : b)));
      alert('이름 변경에 실패했습니다.');
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있어요 (jpg, png, webp 등).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지가 너무 커요. 10MB 이하로 부탁드려요.');
      return;
    }
    setCoverUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safeExt = ext.length > 0 && ext.length <= 5 ? ext : 'png';
      const filename = `library-covers/${libraryId}/${Date.now()}.${safeExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('flipbooks')
        .upload(filename, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('flipbooks').getPublicUrl(filename);
      await updateLibraryCover(publicUrl);
    } catch (err) {
      console.error('표지 이미지 업로드 실패:', err);
      alert(`표지 이미지 업로드에 실패했어요.\n${err instanceof Error ? err.message : ''}`);
    } finally {
      setCoverUploading(false);
      // 같은 파일 다시 선택할 수 있게 input value 리셋
      e.target.value = '';
    }
  };

  const updateLibraryCover = async (value: string | null) => {
    if (!library) return;
    const prevCover = library.cover_image;
    setLibrary({ ...library, cover_image: value });
    setShowCoverModal(false);
    const { error } = await supabase
      .from('book_libraries')
      .update({ cover_image: value })
      .eq('id', library.id);
    if (error) {
      setLibrary({ ...library, cover_image: prevCover });
      alert('표지 변경에 실패했습니다.');
    }
  };

  const startRenameLibrary = () => {
    if (!library) return;
    setLibraryNameDraft(library.title);
    setEditingLibraryName(true);
  };

  const cancelRenameLibrary = () => {
    setEditingLibraryName(false);
    setLibraryNameDraft('');
  };

  const saveRenameLibrary = async () => {
    if (!library) return;
    const next = libraryNameDraft.trim();
    if (!next || next === library.title) {
      cancelRenameLibrary();
      return;
    }
    const prev = library.title;
    setLibrary({ ...library, title: next });
    cancelRenameLibrary();
    const { error } = await supabase
      .from('book_libraries')
      .update({ title: next })
      .eq('id', library.id);
    if (error) {
      setLibrary({ ...library, title: prev });
      alert('도서관 이름 변경에 실패했습니다.');
    }
  };

  const copyShareLink = () => {
    if (!library) return;
    const link = `${siteUrl}/library/${library.share_code}`;
    navigator.clipboard.writeText(link);
    alert('링크가 복사되었습니다!');
  };

  const copyEmbedCode = (bookId: string) => {
    const code = `<iframe src="${siteUrl}/book/${bookId}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(code);
    alert('임베드 코드가 복사되었습니다!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!library) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        도서관을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a href="/dashboard" className="hover:text-teal-600 transition">내 도서관</a>
            <span>/</span>
            <span className="text-gray-800">{library.title}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            {editingLibraryName ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={libraryNameDraft}
                  onChange={(e) => setLibraryNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRenameLibrary();
                    if (e.key === 'Escape') cancelRenameLibrary();
                  }}
                  autoFocus
                  className="flex-1 max-w-md px-3 py-1.5 border border-teal-300 rounded-lg text-lg font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <button onClick={saveRenameLibrary} className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">저장</button>
                <button onClick={cancelRenameLibrary} className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{library.title}</h1>
                <button onClick={startRenameLibrary} className="text-gray-400 hover:text-teal-600 transition" title="도서관 이름 변경">✏️</button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={copyShareLink}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                도서관 링크 복사
              </button>
              <button
                onClick={openAddBooksModal}
                className="px-4 py-2 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 transition text-sm"
              >
                기존 플립북 추가
              </button>
              <label className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm cursor-pointer">
                {uploading ? '업로드 중...' : '+ PDF 추가'}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 표지 미리보기 + 변경 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-72 flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <LibraryCover
              library={{ ...library, book_items: books }}
              className="aspect-[3/2]"
              size="preview"
            />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">도서관 표지</h2>
            <p className="text-sm text-gray-500">
              {!library.cover_image
                ? '첫 책의 표지를 자동으로 사용 중이에요. 템플릿을 골라 분위기를 바꿀 수 있어요.'
                : isTemplateValue(library.cover_image)
                ? '템플릿 표지를 사용 중이에요.'
                : '직접 설정한 이미지를 사용 중이에요.'}
            </p>
            <button
              onClick={() => setShowCoverModal(true)}
              className="px-4 py-2 border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 transition text-sm"
            >
              표지 변경
            </button>
          </div>
        </div>

        {/* 공유 정보 */}
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-8">
          <p className="text-sm text-teal-800 font-medium mb-2">공유 링크</p>
          <code className="text-sm text-teal-600 bg-white px-3 py-1.5 rounded border block overflow-x-auto">
            {siteUrl}/library/{library.share_code}
          </code>
        </div>

        {/* 책 목록 */}
        {books.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 mb-4">PDF를 업로드해서 플립북을 만들어보세요</p>
            <label className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition cursor-pointer">
              PDF 업로드
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 bg-gradient-to-br from-amber-50 to-orange-100 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    {editingBookId === book.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRenameBook(book);
                            if (e.key === 'Escape') cancelRenameBook();
                          }}
                          autoFocus
                          className="px-2 py-1 border border-teal-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        <button onClick={() => saveRenameBook(book)} className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700">저장</button>
                        <button onClick={cancelRenameBook} className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50">취소</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-gray-800 truncate">{book.title}</h3>
                        <button
                          onClick={() => startRenameBook(book)}
                          className="text-gray-400 hover:text-teal-600 transition text-sm"
                          title="이름 변경"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    {book.page_count && (
                      <p className="text-sm text-gray-500">{book.page_count}페이지</p>
                    )}
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

                <div className="flex items-center gap-2 flex-wrap justify-end">
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
                    미리보기
                  </a>
                  <button
                    onClick={() => copyEmbedCode(book.id)}
                    className="px-3 py-1.5 text-sm border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 transition"
                  >
                    임베드 복사
                  </button>
                  <button
                    onClick={() => removeBookFromLibrary(book)}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                    title="이 책을 도서관에서만 빼고 단독 플립북으로 남김 (책은 삭제되지 않음)"
                  >
                    도서관에서 빼기
                  </button>
                  <button
                    onClick={() => deleteBook(book.id, book.pdf_url)}
                    className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 표지 선택 모달 */}
      {showCoverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">표지 선택</h2>
                <p className="text-sm text-gray-500 mt-1">
                  연령·테마별 템플릿을 고르거나, 첫 책 표지를 자동으로 쓸 수 있어요.
                </p>
              </div>
              <button
                onClick={() => setShowCoverModal(false)}
                className="text-gray-400 hover:text-gray-700 transition text-xl leading-none"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* 기본 옵션: 첫 책 자동 + 직접 업로드 */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">기본</h3>
              <div className="grid grid-cols-2 gap-3 max-w-[420px]">
                {/* 첫 책 자동 */}
                <button
                  onClick={() => updateLibraryCover(null)}
                  className={`group relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition ${
                    !library.cover_image ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-teal-300'
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center px-2">
                      <div className="text-3xl mb-1">📚</div>
                      <div className="text-xs font-semibold text-gray-700">첫 책 자동</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">책 표지 그대로</div>
                    </div>
                  </div>
                </button>

                {/* 직접 업로드 */}
                <label
                  className={`group relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    library.cover_image && /^https?:\/\//i.test(library.cover_image)
                      ? 'border-teal-500 ring-2 ring-teal-200'
                      : 'border-dashed border-gray-300 hover:border-teal-400'
                  } ${coverUploading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {library.cover_image && /^https?:\/\//i.test(library.cover_image) ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={library.cover_image} alt="업로드된 표지" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-xs font-semibold text-white">📷 다른 이미지로 교체</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
                      <div className="text-center px-2">
                        <div className="text-3xl mb-1">{coverUploading ? '⏳' : '📷'}</div>
                        <div className="text-xs font-semibold text-amber-800">
                          {coverUploading ? '업로드 중...' : '직접 업로드'}
                        </div>
                        <div className="text-[10px] text-amber-700 mt-0.5">jpg · png · webp</div>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageUpload}
                    disabled={coverUploading}
                  />
                </label>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                3:2 비율(예: 1200×800px) 권장 · 카카오톡 등 SNS 공유 썸네일에도 사용돼요 · 10MB 이하
              </p>
            </div>

            {/* 카테고리별 템플릿 */}
            {CATEGORY_ORDER.map((cat) => {
              const items = templatesByCategory(cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">{CATEGORY_LABELS[cat]}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {items.map((tpl) => {
                      const selected = isTemplateValue(library.cover_image) && templateKey(library.cover_image) === tpl.key;
                      return (
                        <button
                          key={tpl.key}
                          onClick={() => updateLibraryCover(templateValue(tpl.key))}
                          className={`group relative rounded-xl overflow-hidden border-2 transition ${
                            selected ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-teal-300'
                          }`}
                        >
                          <TemplateCover
                            template={tpl}
                            title={tpl.name}
                            className="aspect-[3/2]"
                            size="option"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 기존 플립북 추가 모달 */}
      {showAddBooksModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">기존 플립북 추가</h2>
                <p className="text-sm text-gray-500 mt-1">
                  도서관에 속하지 않은 단독 플립북을 골라서 이 도서관에 넣어요.
                </p>
              </div>
              <button
                onClick={() => setShowAddBooksModal(false)}
                className="text-gray-400 hover:text-gray-700 transition text-xl leading-none"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto -mx-2 px-2 my-3 min-h-[120px]">
              {availableBooks.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  추가할 수 있는 단독 플립북이 없어요.
                  <br />
                  <span className="text-xs text-gray-400 mt-1 inline-block">대시보드에서 PDF를 새로 업로드하면 단독 플립북으로 추가돼요.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableBooks.map((book) => {
                    const checked = selectedToAdd.includes(book.id);
                    return (
                      <label
                        key={book.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          checked
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-teal-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBookToAdd(book.id)}
                          className="w-5 h-5 text-teal-600 rounded"
                        />
                        <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-orange-100 rounded flex-shrink-0 overflow-hidden">
                          {book.cover_image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">{book.title}</div>
                          {book.page_count && (
                            <div className="text-xs text-gray-500">{book.page_count}페이지</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowAddBooksModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={addBooksToLibrary}
                disabled={selectedToAdd.length === 0}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedToAdd.length}권 추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
