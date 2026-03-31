import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import { MemoirDocument } from '@/templates/render-memoir'
import { getTemplate } from '@/templates/registry'
import { MemoirData } from '@/templates/types'
import React from 'react'

// 서비스 롤 키로 직접 접근 (공유 토큰 기반 비인증 접근 지원)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, token, templateId } = body

    if (!templateId) {
      return NextResponse.json({ success: false, error: '템플릿을 선택해주세요' }, { status: 400 })
    }

    const template = getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ success: false, error: '존재하지 않는 템플릿입니다' }, { status: 404 })
    }

    // userId 또는 token으로 자서전 데이터 조회
    let targetUserId = userId

    if (!targetUserId && token) {
      const { data: tokenData } = await supabase
        .from('memoir_share_tokens')
        .select('user_id, author_name')
        .eq('token', token)
        .eq('is_active', true)
        .single()

      if (!tokenData) {
        return NextResponse.json({ success: false, error: '유효하지 않은 공유 링크입니다' }, { status: 404 })
      }
      targetUserId = tokenData.user_id
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: '사용자 정보가 필요합니다' }, { status: 400 })
    }

    // 자서전 데이터 조회
    const { data: entries } = await supabase
      .from('memoir_entries')
      .select('chapter, question, answer')
      .eq('user_id', targetUserId)
      .order('chapter')

    if (!entries || entries.length === 0) {
      return NextResponse.json({ success: false, error: '자서전 데이터가 없습니다' }, { status: 404 })
    }

    // 사용자 이름 조회
    const { data: userData } = await supabase
      .from('sd_users')
      .select('name')
      .eq('id', targetUserId)
      .single()

    // 일기 사진 조회 (image_url이 있는 것만, 최신순)
    const { data: diaries } = await supabase
      .from('sd_diaries')
      .select('image_url')
      .eq('user_id', targetUserId)
      .not('image_url', 'is', null)
      .order('recording_date', { ascending: false })
      .limit(16)

    const photos = (diaries || [])
      .map(d => d.image_url)
      .filter((url): url is string => !!url)

    const memoirData: MemoirData = {
      authorName: userData?.name || '작성자',
      entries,
      photos,
    }

    // PDF 생성
    const element = React.createElement(MemoirDocument, {
      data: memoirData,
      template,
      watermark: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    // PDF 반환
    return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="memoir-preview.pdf"',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('PDF 미리보기 생성 실패:', error)
    return NextResponse.json(
      { success: false, error: 'PDF 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
