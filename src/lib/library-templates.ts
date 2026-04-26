// 도서관 표지 템플릿
// cover_image 컬럼에 'template:<key>' 형식으로 저장
// (빈 값이면 첫 책의 cover_image를 자동 사용, http로 시작하면 일반 이미지 URL)
//
// 디자인: 메시 그라디언트(여러 radial-gradient를 합성) 기반.
// 이모지 없이 색감과 타이포만으로 차분하고 예쁘게.

export const TEMPLATE_PREFIX = 'template:';

export type TemplateCategory = 'preschool' | 'youth' | 'adult' | 'season';

export interface LibraryTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  background: string;     // CSS background — multiple radial-gradient 합성
  textColor: string;
  textTone: 'light' | 'dark'; // 텍스트 그림자 강도/방향 결정
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  preschool: '유아용',
  youth: '청소년용',
  adult: '성인용',
  season: '계절·테마',
};

export const CATEGORY_ORDER: TemplateCategory[] = ['preschool', 'youth', 'adult', 'season'];

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  // ─────────────────────────────────────────── 유아용 (밝고 부드러운 파스텔)
  {
    key: 'cotton', name: '솜사탕', category: 'preschool',
    background: [
      'radial-gradient(at 22% 28%, #fbcfe8 0%, transparent 55%)',
      'radial-gradient(at 78% 22%, #c7d2fe 0%, transparent 55%)',
      'radial-gradient(at 50% 88%, #bae6fd 0%, transparent 55%)',
      'linear-gradient(135deg, #fdf2f8 0%, #eff6ff 100%)',
    ].join(','),
    textColor: '#831843', textTone: 'dark',
  },
  {
    key: 'meadow', name: '잔디밭', category: 'preschool',
    background: [
      'radial-gradient(at 25% 25%, #d9f99d 0%, transparent 55%)',
      'radial-gradient(at 75% 30%, #fef3c7 0%, transparent 55%)',
      'radial-gradient(at 50% 90%, #a7f3d0 0%, transparent 55%)',
      'linear-gradient(135deg, #ecfccb 0%, #f0fdfa 100%)',
    ].join(','),
    textColor: '#14532d', textTone: 'dark',
  },
  {
    key: 'peach', name: '복숭아', category: 'preschool',
    background: [
      'radial-gradient(at 20% 30%, #fed7aa 0%, transparent 55%)',
      'radial-gradient(at 80% 25%, #fecdd3 0%, transparent 55%)',
      'radial-gradient(at 60% 90%, #fef3c7 0%, transparent 55%)',
      'linear-gradient(135deg, #fff7ed 0%, #fff1f2 100%)',
    ].join(','),
    textColor: '#9a3412', textTone: 'dark',
  },
  {
    key: 'dream', name: '꿈결', category: 'preschool',
    background: [
      'radial-gradient(at 25% 30%, #ddd6fe 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #fbcfe8 0%, transparent 55%)',
      'radial-gradient(at 55% 85%, #a5f3fc 0%, transparent 55%)',
      'linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)',
    ].join(','),
    textColor: '#5b21b6', textTone: 'dark',
  },

  // ─────────────────────────────────────────── 청소년용 (비비드, 트렌디)
  {
    key: 'aurora', name: '오로라', category: 'youth',
    background: [
      'radial-gradient(at 20% 25%, #6ee7b7 0%, transparent 55%)',
      'radial-gradient(at 75% 30%, #60a5fa 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #c084fc 0%, transparent 55%)',
      'linear-gradient(135deg, #064e3b 0%, #1e3a8a 100%)',
    ].join(','),
    textColor: '#ffffff', textTone: 'light',
  },
  {
    key: 'sunset', name: '노을', category: 'youth',
    background: [
      'radial-gradient(at 20% 30%, #fb923c 0%, transparent 55%)',
      'radial-gradient(at 80% 25%, #f472b6 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #c084fc 0%, transparent 55%)',
      'linear-gradient(135deg, #fef3c7 0%, #831843 100%)',
    ].join(','),
    textColor: '#ffffff', textTone: 'light',
  },
  {
    key: 'neon', name: '네온', category: 'youth',
    background: [
      'radial-gradient(at 25% 25%, #ec4899 0%, transparent 55%)',
      'radial-gradient(at 75% 30%, #06b6d4 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #8b5cf6 0%, transparent 55%)',
      'linear-gradient(135deg, #1e1b4b 0%, #0c0a2e 100%)',
    ].join(','),
    textColor: '#fdf4ff', textTone: 'light',
  },
  {
    key: 'ocean', name: '오션', category: 'youth',
    background: [
      'radial-gradient(at 25% 30%, #22d3ee 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #38bdf8 0%, transparent 55%)',
      'radial-gradient(at 50% 88%, #34d399 0%, transparent 55%)',
      'linear-gradient(135deg, #ecfeff 0%, #1e3a8a 100%)',
    ].join(','),
    textColor: '#ffffff', textTone: 'light',
  },

  // ─────────────────────────────────────────── 성인용 (차분, 세련)
  {
    key: 'linen', name: '리넨', category: 'adult',
    background: [
      'radial-gradient(at 25% 30%, #f5f5f4 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #e7e5e4 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #d6d3d1 0%, transparent 55%)',
      'linear-gradient(135deg, #fafaf9 0%, #e7e5e4 100%)',
    ].join(','),
    textColor: '#292524', textTone: 'dark',
  },
  {
    key: 'slate', name: '슬레이트', category: 'adult',
    background: [
      'radial-gradient(at 25% 30%, #94a3b8 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #64748b 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #475569 0%, transparent 55%)',
      'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    ].join(','),
    textColor: '#f8fafc', textTone: 'light',
  },
  {
    key: 'wine', name: '와인', category: 'adult',
    background: [
      'radial-gradient(at 25% 30%, #be123c 0%, transparent 55%)',
      'radial-gradient(at 78% 25%, #7f1d1d 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #4c1d24 0%, transparent 55%)',
      'linear-gradient(135deg, #4c0519 0%, #1c1917 100%)',
    ].join(','),
    textColor: '#fef3c7', textTone: 'light',
  },
  {
    key: 'forest', name: '숲그늘', category: 'adult',
    background: [
      'radial-gradient(at 25% 30%, #14532d 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #365314 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #1c1917 0%, transparent 55%)',
      'linear-gradient(135deg, #052e16 0%, #1c1917 100%)',
    ].join(','),
    textColor: '#ecfccb', textTone: 'light',
  },

  // ─────────────────────────────────────────── 계절·테마
  {
    key: 'spring', name: '봄', category: 'season',
    background: [
      'radial-gradient(at 25% 30%, #fce7f3 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #d9f99d 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #fef9c3 0%, transparent 55%)',
      'linear-gradient(135deg, #fdf2f8 0%, #f7fee7 100%)',
    ].join(','),
    textColor: '#9d174d', textTone: 'dark',
  },
  {
    key: 'summer', name: '여름', category: 'season',
    background: [
      'radial-gradient(at 25% 30%, #67e8f9 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #fde047 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #5eead4 0%, transparent 55%)',
      'linear-gradient(135deg, #ecfeff 0%, #fefce8 100%)',
    ].join(','),
    textColor: '#0c4a6e', textTone: 'dark',
  },
  {
    key: 'autumn', name: '가을', category: 'season',
    background: [
      'radial-gradient(at 25% 30%, #fb923c 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #b45309 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #78350f 0%, transparent 55%)',
      'linear-gradient(135deg, #fef3c7 0%, #431407 100%)',
    ].join(','),
    textColor: '#fff7ed', textTone: 'light',
  },
  {
    key: 'winter', name: '겨울', category: 'season',
    background: [
      'radial-gradient(at 25% 30%, #e0e7ff 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #bae6fd 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #ddd6fe 0%, transparent 55%)',
      'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    ].join(','),
    textColor: '#1e3a8a', textTone: 'dark',
  },
  {
    key: 'dawn', name: '새벽', category: 'season',
    background: [
      'radial-gradient(at 25% 30%, #c4b5fd 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #f472b6 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #38bdf8 0%, transparent 55%)',
      'linear-gradient(135deg, #312e81 0%, #831843 100%)',
    ].join(','),
    textColor: '#ffffff', textTone: 'light',
  },
  {
    key: 'library', name: '서재', category: 'season',
    background: [
      'radial-gradient(at 25% 30%, #d6c2a4 0%, transparent 55%)',
      'radial-gradient(at 75% 25%, #b08968 0%, transparent 55%)',
      'radial-gradient(at 55% 90%, #78350f 0%, transparent 55%)',
      'linear-gradient(135deg, #fef3c7 0%, #44403c 100%)',
    ].join(','),
    textColor: '#fff7ed', textTone: 'light',
  },
];

export function isTemplateValue(value: string | null | undefined): value is string {
  return !!value && value.startsWith(TEMPLATE_PREFIX);
}

export function templateKey(value: string | null | undefined): string | null {
  if (!isTemplateValue(value)) return null;
  return value.slice(TEMPLATE_PREFIX.length);
}

export function findTemplate(key: string | null): LibraryTemplate | null {
  if (!key) return null;
  return LIBRARY_TEMPLATES.find(t => t.key === key) ?? null;
}

export function templateValue(key: string): string {
  return `${TEMPLATE_PREFIX}${key}`;
}

export function templatesByCategory(category: TemplateCategory): LibraryTemplate[] {
  return LIBRARY_TEMPLATES.filter(t => t.category === category);
}
