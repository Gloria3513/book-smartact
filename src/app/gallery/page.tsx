import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Library, Book } from '@/types';
import GalleryView from './GalleryView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GalleryPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: publicBooks }, { data: publicLibraries }] = await Promise.all([
    supabase
      .from('book_items')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('book_libraries')
      .select('*, book_items(id, title, cover_image, page_count, sort_order)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">구경하기</h1>
            <p className="text-sm text-gray-500 mt-0.5">누구나 둘러볼 수 있는 공개 플립북과 공개도서관</p>
          </div>
          <a
            href="/dashboard"
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            내 대시보드
          </a>
        </div>
      </header>

      <GalleryView
        books={(publicBooks as Book[]) ?? []}
        libraries={(publicLibraries as Library[]) ?? []}
      />

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <a href="https://book.smartact.kr" className="hover:text-teal-500 transition">
          book.smartact.kr
        </a>
      </footer>
    </div>
  );
}
