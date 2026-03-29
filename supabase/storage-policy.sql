-- =============================================
-- flipbooks 스토리지 버킷 정책
-- Supabase SQL Editor에서 실행
-- =============================================

-- 로그인한 사용자 누구나 업로드 가능
CREATE POLICY "로그인 사용자 업로드" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'flipbooks'
    AND auth.role() = 'authenticated'
  );

-- 본인이 올린 파일 삭제 가능
CREATE POLICY "본인 파일 삭제" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'flipbooks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 누구나 파일 조회 가능 (공개 버킷)
CREATE POLICY "누구나 파일 조회" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'flipbooks');

-- 본인 파일 업데이트 가능
CREATE POLICY "본인 파일 업데이트" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'flipbooks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
