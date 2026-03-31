-- 메모리콕 자서전 인쇄 서비스 테이블

-- 1. 공유 링크 관리
CREATE TABLE IF NOT EXISTS memoir_share_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(32) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  author_name VARCHAR(100),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memoir_share_tokens_token ON memoir_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_memoir_share_tokens_user ON memoir_share_tokens(user_id);

-- 2. 인쇄 템플릿
CREATE TABLE IF NOT EXISTS print_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 템플릿 데이터
INSERT INTO print_templates (id, name, description, category, sort_order, config) VALUES
  ('warm-spring', '따뜻한 봄날', '수채화 꽃과 함께하는 따뜻한 자서전', 'nature', 1, '{"font": "NanumMyeongjo", "primary": "#E8A87C", "secondary": "#D4A574"}'),
  ('ink-painting', '고요한 수묵', '전통 수묵화 느낌의 고즈넉한 자서전', 'traditional', 2, '{"font": "KoPubBatang", "primary": "#4A4A4A", "secondary": "#8B7355"}'),
  ('modern-minimal', '모던 미니멀', '깔끔하고 현대적인 디자인', 'modern', 3, '{"font": "Pretendard", "primary": "#2C3E50", "secondary": "#7F8C8D"}'),
  ('autumn-study', '가을 서재', '따뜻한 갈색톤의 서재 느낌', 'classic', 4, '{"font": "NanumBarunGothic", "primary": "#8B4513", "secondary": "#D2691E"}'),
  ('sky-letter', '하늘빛 편지', '밝고 맑은 하늘색 편지지 스타일', 'nature', 5, '{"font": "NanumPen", "primary": "#5DADE2", "secondary": "#85C1E9"}'),
  ('golden-album', '골든 앨범', '금색 테두리의 고급스러운 디자인', 'classic', 6, '{"font": "NanumMyeongjo", "primary": "#D4AC0D", "secondary": "#F4D03F"}'),
  ('wildflower', '들꽃 산책', '자연의 들꽃과 함께하는 보타니컬 디자인', 'nature', 7, '{"font": "MaruBuri", "primary": "#27AE60", "secondary": "#82E0AA"}'),
  ('retro-diary', '청춘 일기', '복고풍 레트로 감성의 일기장', 'classic', 8, '{"font": "Gothic", "primary": "#6C3483", "secondary": "#AF7AC5"}'),
  ('moonlight', '달빛 이야기', '밤하늘과 달빛의 몽환적 디자인', 'nature', 9, '{"font": "KoPubBatang", "primary": "#1A237E", "secondary": "#5C6BC0"}'),
  ('pure-white', '순백의 기록', '깨끗한 화이트 배경의 심플 디자인', 'modern', 10, '{"font": "Pretendard", "primary": "#2C3E50", "secondary": "#ECF0F1"}')
ON CONFLICT (id) DO NOTHING;

-- 3. 인쇄 주문
CREATE TABLE IF NOT EXISTS print_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  share_token_id UUID REFERENCES memoir_share_tokens(id),
  user_id UUID REFERENCES auth.users(id),

  orderer_name VARCHAR(100) NOT NULL,
  orderer_phone VARCHAR(20) NOT NULL,
  orderer_email VARCHAR(255),

  delivery_name VARCHAR(100) NOT NULL,
  delivery_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_zip_code VARCHAR(10),
  delivery_memo TEXT,

  template_id VARCHAR(50) NOT NULL REFERENCES print_templates(id),
  package_type VARCHAR(20) NOT NULL DEFAULT 'basic',
  quantity INTEGER NOT NULL DEFAULT 1,
  page_count INTEGER NOT NULL,

  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0,

  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_key VARCHAR(200),
  payment_method VARCHAR(50),
  paid_at TIMESTAMPTZ,

  wowpress_order_id VARCHAR(100),
  wowpress_file_id VARCHAR(100),
  wowpress_status VARCHAR(50),

  status VARCHAR(30) DEFAULT 'created',
  tracking_number VARCHAR(100),
  tracking_company VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_orders_number ON print_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_print_orders_share_token ON print_orders(share_token_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_user ON print_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON print_orders(status);

-- 4. 주문 상태 이력
CREATE TABLE IF NOT EXISTS print_order_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_order_logs_order ON print_order_logs(order_id, created_at);

-- RLS 정책
ALTER TABLE memoir_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_order_logs ENABLE ROW LEVEL SECURITY;

-- 템플릿은 누구나 조회 가능
CREATE POLICY "public_read_templates" ON print_templates FOR SELECT USING (is_active = true);

-- 공유 토큰은 본인이 생성, 활성 토큰은 누구나 조회
CREATE POLICY "owner_insert_tokens" ON memoir_share_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_manage_tokens" ON memoir_share_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public_read_active_tokens" ON memoir_share_tokens FOR SELECT USING (is_active = true);
