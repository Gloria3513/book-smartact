# Cloudflare R2 세팅 가이드

플립북 이미지 CDN을 Cloudflare R2에 구축합니다. 설정 시간 약 **10-15분**.

## 왜 R2인가

- **egress(송신) 무료** — 사용자가 플립북 아무리 많이 봐도 대역폭 비용 0원
- **저장 $0.015/GB** — Supabase($0.021) 보다 저렴
- **10GB 저장 + API 요청 무료 tier**
- S3 호환 API라 코드 재사용성 높음

---

## 1. Cloudflare 계정 + R2 활성화 (5분)

1. [dash.cloudflare.com](https://dash.cloudflare.com) 접속 (계정 없으면 가입)
2. 좌측 메뉴 → **R2 Object Storage** 클릭
3. **Purchase R2 Plan** 또는 **Enable R2** 클릭
   - 신용카드 등록 필요 (10GB 이하는 무료, 단 카드는 필수)
4. Plan: "Pay as you go" 선택 → Subscribe

## 2. 버킷 생성 (1분)

1. R2 대시보드 → **Create bucket** 클릭
2. Bucket name: `flipbooks`
3. Location: **Asia-Pacific (APAC)** 선택 (한국 사용자 속도)
4. **Create bucket**

## 3. 커스텀 도메인 연결 (3분)

> 먼저 smartact.kr 의 DNS가 Cloudflare 네임서버를 쓰고 있는지 확인. (이미 그렇다면 바로 진행)

1. 생성한 `flipbooks` 버킷 클릭 → **Settings** 탭
2. **Public access** → **Custom Domains** → **Connect Domain**
3. Domain: `flipbooks.smartact.kr` 입력 → Continue
4. Cloudflare가 자동으로 DNS 레코드 추가 (CNAME)
5. **Connect domain** 확정
6. 1-2분 후 `https://flipbooks.smartact.kr/test` 접속해 버킷 응답 확인

> smartact.kr이 Cloudflare DNS를 안 쓰고 있다면: 도메인을 Cloudflare로 이전하거나, 수동으로 CNAME 추가 필요. 이미 다른 서비스도 Cloudflare 쓰시면 이미 된 상태.

## 4. API 토큰 발급 (2분)

1. R2 대시보드 우측 상단 **Manage R2 API Tokens** 클릭 (또는 Account ID 표시된 곳 근처)
2. **Create API Token** 클릭
3. 설정:
   - **Token name**: `book-smartact-prod`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket(s)**: `flipbooks` 만 선택 (최소 권한 원칙)
   - **TTL**: Forever (또는 1년 후 로테이션 계획)
4. **Create API Token**
5. 표시되는 값 **모두 복사** (한 번만 표시됨, 닫으면 다시 못 봄):
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (상단 우측에 항상 표시됨)

## 5. 로컬 .env.local에 입력

```
R2_ACCOUNT_ID=<Account ID>
R2_ACCESS_KEY_ID=<Access Key ID>
R2_SECRET_ACCESS_KEY=<Secret Access Key>
R2_BUCKET_NAME=flipbooks
R2_PUBLIC_URL=https://flipbooks.smartact.kr
```

## 6. Vercel 환경변수 등록 (2분)

1. [vercel.com/dashboard](https://vercel.com/dashboard) → `book-smartact` 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 위 5개 변수 각각 추가 (Environment: Production + Preview + Development 전체 체크)
4. Save

## 7. DB 마이그레이션 (1분)

Supabase 대시보드 → SQL Editor → 새 쿼리 → 아래 내용 붙여넣기 → Run:

```sql
-- supabase/migration-r2-flipbooks.sql 파일 참고
ALTER TABLE book_items
  ADD COLUMN IF NOT EXISTS r2_base_url TEXT,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE book_items SET status = 'ready' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_book_items_status ON book_items(status);
```

## 8. 배포 + 동작 확인

```bash
cd ~/book-smartact
git push
```

Vercel 자동 배포 후:
1. book.smartact.kr/dashboard 에서 새 PDF 업로드
2. 잠시 후 status가 `pending` → `processing` → `ready`
3. 플립북 조회 시 이제 webp 이미지로 서빙 (네트워크 탭에서 확인 가능)

---

## 동작 방식

- **기존 책**: `r2_base_url` 없음 → PDF 뷰어(legacy) 유지
- **새 업로드**: 업로드 직후 `/api/flipbook/process` 자동 호출 → R2에 webp 저장 → 뷰어가 이미지 사용
- **변환 실패 시**: `status='failed'` + `error_message` 저장. PDF 뷰어로 자연스럽게 fallback

## 나중에 할 수 있는 것

- 기존 PDF 일괄 변환 스크립트 (Phase 3)
- 썸네일 자동 생성 (페이지 1번 → 작은 cover)
- 워터마크 자동 삽입
- Cloudflare Worker로 커스텀 캐싱/인증

## 비용 모니터링

Cloudflare R2 대시보드에서 매일 확인 가능:
- Storage used
- Class A operations (writes)
- Class B operations (reads)
- **Egress: 항상 $0** ← 이게 핵심

---

## 문제 생기면

- 변환 실패 → Supabase `book_items` 테이블의 `error_message` 확인
- R2 연결 실패 → Vercel Functions 로그에서 `/api/flipbook/process` 에러 확인
- 이미지 안 뜸 → 브라우저 Network 탭 → 404면 변환이 안 된 것, CORS면 버킷 Public access 확인

저한테 에러 메시지 보내주시면 같이 파봅니다.
