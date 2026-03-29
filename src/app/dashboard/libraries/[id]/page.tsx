'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Library, Book, User } from '@/types';

export default function LibraryDetailPage() {
  const params = useParams();
  const libraryId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
      const fileName = `${libraryId}/${Date.now()}_${file.name}`;
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
      console.error('업로드 실패:', error);
      alert('업로드에 실패했습니다.');
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{library.title}</h1>
            <div className="flex gap-2">
              <button
                onClick={copyShareLink}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                도서관 링크 복사
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
                  <div>
                    <h3 className="font-medium text-gray-800">{book.title}</h3>
                    {book.page_count && (
                      <p className="text-sm text-gray-500">{book.page_count}페이지</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
    </div>
  );
}
