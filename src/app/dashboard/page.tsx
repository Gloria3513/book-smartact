'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import LibraryCard from '@/components/LibraryCard';
import type { Library, User } from '@/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const supabase = createClient();

  const MAX_BOOKS_INSTRUCTOR = 10;

  useEffect(() => {
    loadData();
  }, []);

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

    const { data: libs } = await supabase
      .from('book_libraries')
      .select('*, book_items(*)')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false });

    setLibraries((libs as Library[]) ?? []);
    setLoading(false);
  };

  const totalBooks = libraries.reduce((sum, lib) => sum + (lib.book_items?.length ?? 0), 0);
  const isNotAdmin = user?.role !== 'admin';
  const canAddMore = !isNotAdmin || totalBooks < MAX_BOOKS_INSTRUCTOR;

  const createLibrary = async () => {
    if (!newTitle.trim()) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { error } = await supabase.from('book_libraries').insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      owner_id: authUser.id,
    });

    if (!error) {
      setNewTitle('');
      setNewDescription('');
      setShowCreateModal(false);
      loadData();
    }
  };

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
            <h1 className="text-xl font-bold text-gray-900">내 도서관</h1>
            <p className="text-sm text-gray-500">
              {user?.full_name || '사용자'} · {user?.role === 'admin' ? '관리자' : '강사'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isNotAdmin && (
              <span className="text-sm text-gray-500">
                {totalBooks} / {MAX_BOOKS_INSTRUCTOR}권 사용
              </span>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!canAddMore}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 새 도서관
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!canAddMore && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            무료 플립북 {MAX_BOOKS_INSTRUCTOR}개를 모두 사용했습니다. 추가 등록이 필요하면 관리자에게 문의하세요.
          </div>
        )}

        {libraries.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-500 mb-4">아직 만든 도서관이 없어요</p>
            <button
              onClick={() => setShowCreateModal(true)}
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
      </main>

      {/* 도서관 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 도서관 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  도서관 이름 *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 디지털 리터러시 교재"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
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
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={createLibrary}
                disabled={!newTitle.trim()}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
