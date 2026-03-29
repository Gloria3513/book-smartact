-- =============================================
-- book.smartact.kr DB Schema
-- 스마택트 Supabase 프로젝트에 추가 실행
-- 기존 user_profiles, auth.users 활용
-- =============================================

-- 도서관 (여러 책을 묶는 단위)
CREATE TABLE IF NOT EXISTS book_libraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  share_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 책 (개별 플립북)
CREATE TABLE IF NOT EXISTS book_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  library_id UUID NOT NULL REFERENCES book_libraries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_image TEXT,
  pdf_url TEXT NOT NULL,
  page_count INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_book_libraries_owner ON book_libraries(owner_id);
CREATE INDEX IF NOT EXISTS idx_book_libraries_share_code ON book_libraries(share_code);
CREATE INDEX IF NOT EXISTS idx_book_items_library ON book_items(library_id);
CREATE INDEX IF NOT EXISTS idx_book_items_sort_order ON book_items(library_id, sort_order);

-- RLS (Row Level Security) 활성화
ALTER TABLE book_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_items ENABLE ROW LEVEL SECURITY;

-- 도서관 정책
CREATE POLICY "도서관 본인 것 전체 관리" ON book_libraries
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "공개 도서관 누구나 조회" ON book_libraries
  FOR SELECT USING (is_public = true);

-- 책 정책
CREATE POLICY "책 소유자 전체 관리" ON book_items
  FOR ALL USING (
    library_id IN (SELECT id FROM book_libraries WHERE owner_id = auth.uid())
  );

CREATE POLICY "공개 도서관 책 누구나 조회" ON book_items
  FOR SELECT USING (
    library_id IN (SELECT id FROM book_libraries WHERE is_public = true)
  );

-- Storage 버킷 (Supabase 대시보드 → Storage에서 'flipbooks' 버킷 생성, public으로 설정)
