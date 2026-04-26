import type { SupabaseClient } from '@supabase/supabase-js';
import type { Book } from '@/types';

// 갤러리·홈에 표시할 "공개된" 책 목록.
// (책 자체가 is_public=true) OR (속한 도서관이 is_public=true)
//
// 도서관을 공개로 전환하면 안의 책 하나하나를 일일이 공개 토글하지 않아도
// 갤러리에 자동으로 노출되도록 한 정책.
export async function fetchPublicBooks(
  supabase: SupabaseClient,
  limit = 120,
): Promise<Book[]> {
  const { data: libs } = await supabase
    .from('book_libraries')
    .select('id')
    .eq('is_public', true);

  const publicLibraryIds = (libs ?? []).map((l: { id: string }) => l.id);

  let query = supabase.from('book_items').select('*').eq('status', 'ready');

  query = publicLibraryIds.length > 0
    ? query.or(`is_public.eq.true,library_id.in.(${publicLibraryIds.join(',')})`)
    : query.eq('is_public', true);

  const { data } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as Book[];
}
