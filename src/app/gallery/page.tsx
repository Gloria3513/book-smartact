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
    <div
      className="min-h-screen"
      style={{
        background: [
          'radial-gradient(ellipse at top, rgba(254, 243, 199, 0.6) 0%, transparent 60%)',
          'radial-gradient(ellipse at bottom, rgba(254, 215, 170, 0.4) 0%, transparent 60%)',
          'linear-gradient(180deg, #fffbeb 0%, #fefce8 50%, #fafaf9 100%)',
        ].join(','),
      }}
    >
      {/* 책장 패턴 (얇은) */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0 18px, #78350f 18px 19px, transparent 19px 30px, #92400e 30px 31px, transparent 31px 48px)',
        }}
      />

      <header className="relative">
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-6 flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/60 border border-amber-200 text-xs font-semibold text-amber-800 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              구경하기
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900" style={{ letterSpacing: '-0.02em' }}>
              모두의 책장
            </h1>
            <p className="text-sm text-stone-500 mt-1">누구나 둘러볼 수 있는 공개 플립북과 공개도서관</p>
          </div>
          <a
            href="/dashboard"
            className="px-4 py-2 border border-stone-300 bg-white/70 backdrop-blur-sm text-stone-700 rounded-lg hover:bg-white hover:border-teal-300 hover:text-teal-700 transition text-sm font-medium shadow-sm"
          >
            내 대시보드
          </a>
        </div>
      </header>

      <GalleryView
        books={(publicBooks as Book[]) ?? []}
        libraries={(publicLibraries as Library[]) ?? []}
      />

      <footer className="py-10 text-center">
        <a
          href="https://book.smartact.kr"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-teal-600 transition"
        >
          book.smartact.kr
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </footer>
    </div>
  );
}
