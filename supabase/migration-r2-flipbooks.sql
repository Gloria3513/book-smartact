-- R2 기반 페이지 이미지 CDN 마이그레이션
-- 기존 pdf_url은 원본 보관용으로 유지, 새 컬럼은 조회용 이미지 경로

ALTER TABLE book_items
  ADD COLUMN IF NOT EXISTS r2_base_url TEXT,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- status 값:
--   'pending'    : 업로드 직후, 변환 대기
--   'processing' : 변환 중
--   'ready'      : 이미지 준비 완료 (또는 레거시 PDF만 있는 경우)
--   'failed'     : 변환 실패 (error_message 참고)

-- 기존 레코드는 모두 'ready' (PDF 뷰어로 서빙)
UPDATE book_items SET status = 'ready' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_book_items_status ON book_items(status);
