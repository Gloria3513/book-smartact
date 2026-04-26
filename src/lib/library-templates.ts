// 도서관 표지 템플릿
// cover_image 컬럼에 'template:<key>' 형식으로 저장
// (빈 값이면 첫 책의 cover_image를 자동 사용, http로 시작하면 일반 이미지 URL)
//
// 그라디언트는 인라인 CSS로 (Tailwind 동적 클래스 purge 회피)

export const TEMPLATE_PREFIX = 'template:';

export interface LibraryTemplate {
  key: string;
  name: string;
  background: string; // 유효한 CSS background 값
  textColor: string;
  emoji: string;
}

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  { key: 'ocean',     name: '바다',     background: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 50%, #2dd4bf 100%)',  textColor: '#ffffff', emoji: '🌊' },
  { key: 'sunset',    name: '노을',     background: 'linear-gradient(135deg, #fb923c 0%, #f472b6 50%, #fb7185 100%)',  textColor: '#ffffff', emoji: '🌅' },
  { key: 'forest',    name: '숲',       background: 'linear-gradient(135deg, #34d399 0%, #4ade80 50%, #a3e635 100%)',  textColor: '#ffffff', emoji: '🌲' },
  { key: 'lavender',  name: '라벤더',   background: 'linear-gradient(135deg, #c4b5fd 0%, #d8b4fe 50%, #f0abfc 100%)',  textColor: '#ffffff', emoji: '💜' },
  { key: 'sunny',     name: '햇살',     background: 'linear-gradient(135deg, #fde68a 0%, #fcd34d 50%, #fdba74 100%)',  textColor: '#7c2d12', emoji: '☀️' },
  { key: 'mint',      name: '민트',     background: 'linear-gradient(135deg, #99f6e4 0%, #a7f3d0 50%, #a5f3fc 100%)',  textColor: '#134e4a', emoji: '🌿' },
  { key: 'berry',     name: '베리',     background: 'linear-gradient(135deg, #e879f9 0%, #f472b6 50%, #fb7185 100%)',  textColor: '#ffffff', emoji: '🍓' },
  { key: 'sky',       name: '하늘',     background: 'linear-gradient(135deg, #bfdbfe 0%, #7dd3fc 50%, #a5b4fc 100%)',  textColor: '#1e3a8a', emoji: '☁️' },
  { key: 'storybook', name: '동화',     background: 'linear-gradient(135deg, #fef3c7 0%, #ffe4e6 50%, #ddd6fe 100%)',  textColor: '#7c2d12', emoji: '📖' },
  { key: 'night',     name: '밤',       background: 'linear-gradient(135deg, #312e81 0%, #6b21a8 50%, #0f172a 100%)',  textColor: '#ffffff', emoji: '🌙' },
  { key: 'crayon',    name: '크레용',   background: 'linear-gradient(135deg, #fca5a5 0%, #fcd34d 25%, #86efac 50%, #93c5fd 75%, #c4b5fd 100%)', textColor: '#ffffff', emoji: '🎨' },
  { key: 'kraft',     name: '크라프트', background: 'linear-gradient(135deg, #d6c2a4 0%, #c4a574 100%)',                textColor: '#3f2d1a', emoji: '📓' },
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
