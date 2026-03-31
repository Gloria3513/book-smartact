// 자서전 데이터 구조 (memoir_entries에서 조회)
export interface MemoirEntry {
  chapter: number
  question: string
  answer: string
}

export interface MemoirData {
  authorName: string
  entries: MemoirEntry[]
  photos?: string[] // 일기 사진 URL (향후)
}

// 챕터 메타데이터
export const CHAPTER_TITLES: Record<number, { title: string; icon: string }> = {
  1: { title: '어린 시절', icon: '👶' },
  2: { title: '학창 시절', icon: '📚' },
  3: { title: '청춘 시절', icon: '💪' },
  4: { title: '결혼과 가정', icon: '💒' },
  5: { title: '일과 삶', icon: '🏢' },
  6: { title: '가족 이야기', icon: '👨‍👩‍👧‍👦' },
  7: { title: '지금의 나', icon: '🌅' },
  8: { title: '후손에게', icon: '💌' },
}

// 템플릿 설정
export interface TemplateColors {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
}

export interface TemplateConfig {
  id: string
  name: string
  description: string
  thumbnail: string
  category: 'nature' | 'traditional' | 'modern' | 'classic'
  font: string
  colors: TemplateColors
}
