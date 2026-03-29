-- =============================================
-- 플립북 단독 생성 지원을 위한 마이그레이션
-- book_items.library_id를 nullable로 변경
-- =============================================

-- library_id를 nullable로 변경
ALTER TABLE book_items ALTER COLUMN library_id DROP NOT NULL;

-- 단독 플립북 소유자 추적을 위한 owner_id 추가
ALTER TABLE book_items ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 기존 데이터: library의 owner_id를 book의 owner_id로 채우기
UPDATE book_items b
SET owner_id = l.owner_id
FROM book_libraries l
WHERE b.library_id = l.id AND b.owner_id IS NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_book_items_owner ON book_items(owner_id);

-- RLS 정책 업데이트: 단독 플립북 소유자 관리
DROP POLICY IF EXISTS "책 소유자 전체 관리" ON book_items;
CREATE POLICY "책 소유자 전체 관리" ON book_items
  FOR ALL USING (
    owner_id = auth.uid()
    OR library_id IN (SELECT id FROM book_libraries WHERE owner_id = auth.uid())
  );

-- 공개 단독 플립북 조회 (library 없는 것도 볼 수 있게)
DROP POLICY IF EXISTS "공개 도서관 책 누구나 조회" ON book_items;
CREATE POLICY "공개 플립북 누구나 조회" ON book_items
  FOR SELECT USING (
    library_id IS NULL
    OR library_id IN (SELECT id FROM book_libraries WHERE is_public = true)
  );
