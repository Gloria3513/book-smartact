// 도서관 표지 템플릿
// cover_image 컬럼에 'template:<key>' 형식으로 저장
// (빈 값이면 첫 책의 cover_image를 자동 사용, http로 시작하면 일반 이미지 URL)
//
// 그라디언트는 인라인 CSS로 (Tailwind 동적 클래스 purge 회피)

export const TEMPLATE_PREFIX = 'template:';

export type TemplateCategory = 'preschool' | 'youth' | 'adult' | 'season';

export interface LibraryTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  background: string;        // CSS background (그라디언트)
  textColor: string;
  mainEmoji: string;          // 가운데 큰 이모지
  decorEmojis: string[];      // 배경에 흩뿌릴 보조 이모지들 (3~4개 권장)
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  preschool: '유아용',
  youth: '청소년용',
  adult: '성인용',
  season: '계절·테마',
};

export const CATEGORY_ORDER: TemplateCategory[] = ['preschool', 'youth', 'adult', 'season'];

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  // ─────────────────────────────────────────── 유아용
  {
    key: 'cotton', name: '솜사탕', category: 'preschool',
    background: 'linear-gradient(135deg, #fbcfe8 0%, #ddd6fe 50%, #bae6fd 100%)',
    textColor: '#831843', mainEmoji: '🦄', decorEmojis: ['⭐', '💫', '🌸', '✨'],
  },
  {
    key: 'dino', name: '공룡친구', category: 'preschool',
    background: 'linear-gradient(135deg, #bbf7d0 0%, #99f6e4 50%, #fef9c3 100%)',
    textColor: '#14532d', mainEmoji: '🦕', decorEmojis: ['🌿', '🥚', '🍃', '🌱'],
  },
  {
    key: 'rainbow', name: '무지개', category: 'preschool',
    background: 'linear-gradient(135deg, #fda4af 0%, #fcd34d 25%, #86efac 50%, #93c5fd 75%, #c4b5fd 100%)',
    textColor: '#ffffff', mainEmoji: '🌈', decorEmojis: ['☀️', '☁️', '💖', '⭐'],
  },
  {
    key: 'animalfriends', name: '동물친구', category: 'preschool',
    background: 'linear-gradient(135deg, #fed7aa 0%, #fde68a 100%)',
    textColor: '#7c2d12', mainEmoji: '🐻', decorEmojis: ['🐰', '🦊', '🐼', '🐯'],
  },

  // ─────────────────────────────────────────── 청소년용
  {
    key: 'cyber', name: '사이버', category: 'youth',
    background: 'linear-gradient(135deg, #4c1d95 0%, #1e3a8a 50%, #0c4a6e 100%)',
    textColor: '#a5f3fc', mainEmoji: '🎮', decorEmojis: ['⚡', '💎', '🔮', '✨'],
  },
  {
    key: 'sporty', name: '스포티', category: 'youth',
    background: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #db2777 100%)',
    textColor: '#ffffff', mainEmoji: '⚽', decorEmojis: ['🏆', '🔥', '💪', '🥇'],
  },
  {
    key: 'music', name: '뮤직', category: 'youth',
    background: 'linear-gradient(135deg, #1e293b 0%, #be185d 60%, #f472b6 100%)',
    textColor: '#ffffff', mainEmoji: '🎧', decorEmojis: ['🎵', '🎶', '✨', '🎤'],
  },
  {
    key: 'cosmos', name: '우주탐험', category: 'youth',
    background: 'linear-gradient(135deg, #0c0a2e 0%, #312e81 50%, #6b21a8 100%)',
    textColor: '#fde047', mainEmoji: '🚀', decorEmojis: ['🌌', '⭐', '💫', '🪐'],
  },

  // ─────────────────────────────────────────── 성인용
  {
    key: 'classic', name: '클래식', category: 'adult',
    background: 'linear-gradient(135deg, #7f1d1d 0%, #581c1c 60%, #1c1917 100%)',
    textColor: '#fde68a', mainEmoji: '📚', decorEmojis: ['🍷', '🕯️', '✨', '🪶'],
  },
  {
    key: 'modern', name: '모던', category: 'adult',
    background: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #a8a29e 100%)',
    textColor: '#1c1917', mainEmoji: '✒️', decorEmojis: ['◆', '◇', '▪︎', '⬜'],
  },
  {
    key: 'natural', name: '내추럴', category: 'adult',
    background: 'linear-gradient(135deg, #d6c2a4 0%, #a8a29e 60%, #57534e 100%)',
    textColor: '#fef3c7', mainEmoji: '🌿', decorEmojis: ['🍂', '🌾', '🪴', '🌱'],
  },
  {
    key: 'cafe', name: '북카페', category: 'adult',
    background: 'linear-gradient(135deg, #fef3c7 0%, #d6a574 50%, #78350f 100%)',
    textColor: '#fffbeb', mainEmoji: '☕', decorEmojis: ['🥐', '📖', '🌰', '🍪'],
  },

  // ─────────────────────────────────────────── 계절·테마
  {
    key: 'spring', name: '봄', category: 'season',
    background: 'linear-gradient(135deg, #fce7f3 0%, #d9f99d 100%)',
    textColor: '#831843', mainEmoji: '🌸', decorEmojis: ['🌷', '🐝', '🦋', '🌼'],
  },
  {
    key: 'summer', name: '여름', category: 'season',
    background: 'linear-gradient(135deg, #67e8f9 0%, #fde047 100%)',
    textColor: '#0c4a6e', mainEmoji: '🌊', decorEmojis: ['☀️', '🍉', '🐚', '🏖️'],
  },
  {
    key: 'autumn', name: '가을', category: 'season',
    background: 'linear-gradient(135deg, #fb923c 0%, #b45309 60%, #7c2d12 100%)',
    textColor: '#fff7ed', mainEmoji: '🍁', decorEmojis: ['🌰', '🎃', '🍂', '🦔'],
  },
  {
    key: 'winter', name: '겨울', category: 'season',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 60%, #1e1b4b 100%)',
    textColor: '#ffffff', mainEmoji: '❄️', decorEmojis: ['⛄', '🎄', '✨', '🦌'],
  },
  {
    key: 'storybook', name: '동화', category: 'season',
    background: 'linear-gradient(135deg, #fef3c7 0%, #ffe4e6 50%, #ddd6fe 100%)',
    textColor: '#7c2d12', mainEmoji: '📖', decorEmojis: ['🏰', '🧚', '🌟', '🦋'],
  },
  {
    key: 'night', name: '별밤', category: 'season',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)',
    textColor: '#fde68a', mainEmoji: '🌙', decorEmojis: ['⭐', '✨', '💫', '🌟'],
  },
];

// 카드 위에 데코 이모지를 배치할 위치 슬롯
// sizeEm: 메인 이모지 폰트 크기 대비 비율 (1em = 메인 이모지 사이즈)
export const DECOR_SLOTS = [
  { top: '8%',     left: '8%',   rotate: -14, sizeEm: 0.42, opacity: 0.55 },
  { top: '12%',    right: '10%', rotate: 18,  sizeEm: 0.48, opacity: 0.5  },
  { bottom: '14%', left: '12%',  rotate: 10,  sizeEm: 0.38, opacity: 0.55 },
  { bottom: '18%', right: '8%',  rotate: -18, sizeEm: 0.45, opacity: 0.5  },
  { top: '50%',    left: '4%',   rotate: 24,  sizeEm: 0.32, opacity: 0.4  },
  { top: '42%',    right: '5%',  rotate: -22, sizeEm: 0.36, opacity: 0.45 },
] as const;

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
