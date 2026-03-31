import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { MemoirData, CHAPTER_TITLES, TemplateConfig } from './types'

// A5 사이즈 (mm → pt: 1mm = 2.835pt)
const A5_WIDTH = 148 * 2.835
const A5_HEIGHT = 210 * 2.835

// ─── 폰트 등록 ───

Font.register({
  family: 'NanumMyeongjo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/nanummyeongjo/v22/9Btx3DZF0dXLMZlywRbVRNhxy1LreHQ8juyl.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/nanummyeongjo/v22/9Btx3DZF0dXLMZlywRbVRNhxy2LseHQ8juyl.ttf', fontWeight: 700 },
  ],
})

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/nanumgothic/v23/PN_3Rfi-oW3hYwmKDpxS7F_z-7r_xFtIsPV5MbNOyrVj67GNOmSMLsB5LR3v5w.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/nanumgothic/v23/PN_3Rfi-oW3hYwmKDpxS7F_z-7rPx1tIsPV5MbNOyrVj67GNOmSMLsB5LR3v5w.ttf', fontWeight: 700 },
  ],
})

Font.register({
  family: 'NanumPenScript',
  src: 'https://fonts.gstatic.com/s/nanumpenscript/v19/daaDSSYiLGqEal3MvdA_FOL_3FkN2z7-aMFCcTU.ttf',
})

Font.registerHyphenationCallback((word) => [word])

// 템플릿 ID → 폰트 패밀리 매핑
const FONT_MAP: Record<string, string> = {
  'warm-spring': 'NanumMyeongjo',
  'ink-painting': 'NanumMyeongjo',
  'modern-minimal': 'NanumGothic',
  'autumn-study': 'NanumGothic',
  'sky-letter': 'NanumPenScript',
  'golden-album': 'NanumMyeongjo',
  'wildflower': 'NanumMyeongjo',
  'retro-diary': 'NanumGothic',
  'moonlight': 'NanumMyeongjo',
  'pure-white': 'NanumGothic',
}

// 템플릿별 표지 부제목
const COVER_SUBTITLE: Record<string, string> = {
  'warm-spring': '봄날처럼 따뜻한',
  'ink-painting': '먹향 가득한',
  'modern-minimal': 'A Story of',
  'autumn-study': '가을 서재에서 펼치는',
  'sky-letter': '하늘빛 편지에 담은',
  'golden-album': '빛나는 한 권의',
  'wildflower': '들꽃처럼 소박한',
  'retro-diary': '그 시절 나의',
  'moonlight': '달빛 아래 적은',
  'pure-white': '담백하게 기록한',
}

// 템플릿별 챕터 구분선 스타일
type DecoStyle = 'line' | 'dots' | 'double' | 'wave' | 'none'
const CHAPTER_DECO: Record<string, DecoStyle> = {
  'warm-spring': 'dots',
  'ink-painting': 'line',
  'modern-minimal': 'none',
  'autumn-study': 'double',
  'sky-letter': 'wave',
  'golden-album': 'double',
  'wildflower': 'dots',
  'retro-diary': 'line',
  'moonlight': 'dots',
  'pure-white': 'line',
}

// ─── 스타일 생성 ───

function createStyles(colors: TemplateConfig['colors'], fontFamily: string) {
  return StyleSheet.create({
    page: {
      width: A5_WIDTH,
      height: A5_HEIGHT,
      fontFamily,
      backgroundColor: colors.background,
      color: colors.text,
    },
    cover: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      backgroundColor: colors.primary,
    },
    coverTitle: {
      fontSize: 28,
      fontWeight: 700,
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: 20,
    },
    coverSubtitle: {
      fontSize: 14,
      color: '#FFFFFF',
      opacity: 0.85,
      textAlign: 'center',
      marginBottom: 8,
    },
    coverAuthor: {
      fontSize: 18,
      fontWeight: 700,
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: 40,
    },
    coverDeco: {
      width: 60,
      height: 2,
      backgroundColor: '#FFFFFF',
      opacity: 0.5,
      marginVertical: 20,
    },
    chapterCover: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 50,
      backgroundColor: colors.background,
    },
    chapterNumber: {
      fontSize: 12,
      color: colors.secondary,
      letterSpacing: 3,
      marginBottom: 12,
    },
    chapterTitle: {
      fontSize: 22,
      fontWeight: 700,
      color: colors.primary,
      textAlign: 'center',
    },
    chapterLine: {
      width: 40,
      height: 1.5,
      backgroundColor: colors.accent,
      marginTop: 16,
    },
    chapterDots: {
      marginTop: 16,
      fontSize: 14,
      color: colors.accent,
      letterSpacing: 6,
    },
    chapterDouble: {
      width: 50,
      height: 0,
      borderTop: `1.5pt solid ${colors.accent}`,
      borderBottom: `1.5pt solid ${colors.accent}`,
      marginTop: 16,
      paddingVertical: 2,
    },
    content: {
      flex: 1,
      padding: 40,
      paddingTop: 50,
      paddingBottom: 60,
    },
    question: {
      fontSize: 11,
      fontWeight: 700,
      color: colors.accent,
      marginBottom: 10,
      lineHeight: 1.5,
    },
    answer: {
      fontSize: 12,
      lineHeight: 1.8,
      color: colors.text,
      marginBottom: 24,
      textAlign: 'justify',
    },
    pageNumber: {
      position: 'absolute',
      bottom: 25,
      left: 0,
      right: 0,
      fontSize: 9,
      color: colors.secondary,
      textAlign: 'center',
    },
    // 사진 페이지
    photoPage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
      backgroundColor: colors.background,
    },
    photo: {
      width: A5_WIDTH - 80,
      maxHeight: A5_HEIGHT - 120,
      objectFit: 'contain' as const,
      borderRadius: 4,
    },
    photoCaption: {
      fontSize: 9,
      color: colors.secondary,
      textAlign: 'center',
      marginTop: 12,
    },
    // 뒷표지
    backCover: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 50,
      backgroundColor: colors.primary,
    },
    backCoverText: {
      fontSize: 13,
      color: '#FFFFFF',
      opacity: 0.7,
      textAlign: 'center',
      lineHeight: 1.8,
    },
    // 헤더 라인 (일부 템플릿용)
    headerLine: {
      width: '100%',
      height: 1,
      backgroundColor: colors.accent,
      opacity: 0.3,
      marginBottom: 20,
    },
  })
}

// ─── 챕터 구분선 컴포넌트 ───

function ChapterDeco({ type, styles }: { type: DecoStyle; styles: ReturnType<typeof createStyles> }) {
  switch (type) {
    case 'dots':
      return <Text style={styles.chapterDots}>• • •</Text>
    case 'double':
      return <View style={styles.chapterDouble} />
    case 'wave':
      return <Text style={{ ...styles.chapterDots, fontSize: 10 }}>〰〰〰</Text>
    case 'none':
      return null
    default:
      return <View style={styles.chapterLine} />
  }
}

// ─── 메인 문서 컴포넌트 ───

interface MemoirDocumentProps {
  data: MemoirData
  template: TemplateConfig
  watermark?: boolean
}

export function MemoirDocument({ data, template, watermark = false }: MemoirDocumentProps) {
  const fontFamily = FONT_MAP[template.id] || 'NanumMyeongjo'
  const styles = createStyles(template.colors, fontFamily)
  const subtitle = COVER_SUBTITLE[template.id] || '나의 이야기'
  const decoType = CHAPTER_DECO[template.id] || 'line'
  const { authorName, entries, photos = [] } = data

  // 챕터별 그룹핑
  const chapters = new Map<number, typeof entries>()
  for (const entry of entries) {
    const list = chapters.get(entry.chapter) || []
    list.push(entry)
    chapters.set(entry.chapter, list)
  }

  // 사진을 챕터 사이에 분배 (최대 챕터 수만큼)
  const chapterNums = Array.from(chapters.keys())
  const photosPerChapter = photos.length > 0
    ? Math.ceil(photos.length / chapterNums.length)
    : 0

  return (
    <Document>
      {/* ─── 표지 ─── */}
      <Page size={[A5_WIDTH, A5_HEIGHT]} style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverSubtitle}>{subtitle}</Text>
          <View style={styles.coverDeco} />
          <Text style={styles.coverTitle}>{authorName}님의{'\n'}자서전</Text>
          <View style={styles.coverDeco} />
          <Text style={styles.coverAuthor}>{authorName}</Text>
          <Text style={{ ...styles.coverSubtitle, marginTop: 30, fontSize: 10 }}>
            메모리콕으로 기록한 소중한 이야기
          </Text>
          {watermark && (
            <Text style={{ position: 'absolute', top: 20, right: 20, fontSize: 8, color: '#FFFFFF', opacity: 0.4 }}>
              미리보기
            </Text>
          )}
        </View>
      </Page>

      {/* ─── 챕터별 페이지 ─── */}
      {chapterNums.map((chapterNum, chapterIdx) => {
        const chapterEntries = chapters.get(chapterNum) || []
        const meta = CHAPTER_TITLES[chapterNum]
        if (!meta) return null

        // 이 챕터에 배치할 사진들
        const startPhoto = chapterIdx * photosPerChapter
        const chapterPhotos = photos.slice(startPhoto, startPhoto + photosPerChapter)

        return (
          <React.Fragment key={chapterNum}>
            {/* 챕터 표지 */}
            <Page size={[A5_WIDTH, A5_HEIGHT]} style={styles.page}>
              <View style={styles.chapterCover}>
                <Text style={styles.chapterNumber}>제 {chapterNum} 장</Text>
                <Text style={styles.chapterTitle}>{meta.title}</Text>
                <ChapterDeco type={decoType} styles={styles} />
              </View>
            </Page>

            {/* 챕터 본문 */}
            <Page size={[A5_WIDTH, A5_HEIGHT]} style={styles.page}>
              <View style={styles.content}>
                {chapterEntries.map((entry, i) => (
                  <View key={i} wrap={false}>
                    <Text style={styles.question}>Q. {entry.question}</Text>
                    <Text style={styles.answer}>{entry.answer}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
            </Page>

            {/* 챕터 뒤에 사진 페이지 삽입 */}
            {chapterPhotos.map((photoUrl, pi) => (
              <Page key={`photo-${chapterNum}-${pi}`} size={[A5_WIDTH, A5_HEIGHT]} style={styles.page}>
                <View style={styles.photoPage}>
                  <Image src={photoUrl} style={styles.photo} />
                  <Text style={styles.photoCaption}>
                    {authorName}님의 추억
                  </Text>
                </View>
              </Page>
            ))}
          </React.Fragment>
        )
      })}

      {/* ─── 뒷표지 ─── */}
      <Page size={[A5_WIDTH, A5_HEIGHT]} style={styles.page}>
        <View style={styles.backCover}>
          <Text style={styles.backCoverText}>
            이 책은 {authorName}님이{'\n'}
            메모리콕에 기록한{'\n'}
            소중한 이야기를 모아{'\n'}
            만든 자서전입니다.
          </Text>
          <View style={{ ...styles.coverDeco, marginTop: 30 }} />
          <Text style={{ ...styles.backCoverText, fontSize: 9, marginTop: 10 }}>
            memorykok.smartact.kr
          </Text>
        </View>
      </Page>
    </Document>
  )
}
