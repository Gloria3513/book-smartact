-- =============================================
-- 개별 플립북 공개/비공개 + 공개 갤러리 지원
-- book_items에도 is_public을 두어, 도서관 소속 여부와 무관하게 공개 가능하게 함
-- =============================================

ALTER TABLE book_items
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_book_items_is_public ON book_items(is_public);

-- 기존 RLS 조회 정책 교체
-- 1) 공개 플립북(is_public=true) 누구나 조회
-- 2) 공개 도서관에 속한 책도 누구나 조회 (기존 동작 유지)
DROP POLICY IF EXISTS "공개 도서관 책 누구나 조회" ON book_items;
DROP POLICY IF EXISTS "공개 플립북 누구나 조회" ON book_items;
CREATE POLICY "공개 플립북 누구나 조회" ON book_items
  FOR SELECT USING (
    is_public = true
    OR library_id IN (SELECT id FROM book_libraries WHERE is_public = true)
  );
