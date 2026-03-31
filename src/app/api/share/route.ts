import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, authorName } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: '사용자 정보가 필요합니다' }, { status: 400 })
    }

    // 기존 활성 토큰이 있으면 재사용
    const { data: existing } = await supabase
      .from('memoir_share_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        token: existing.token,
        url: `https://book.smartact.kr/memoir/${existing.token}`,
      })
    }

    // 새 토큰 생성
    const { data, error } = await supabase
      .from('memoir_share_tokens')
      .insert({
        user_id: userId,
        author_name: authorName || null,
      })
      .select('token')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      token: data.token,
      url: `https://book.smartact.kr/memoir/${data.token}`,
    })
  } catch (error) {
    console.error('공유 토큰 생성 실패:', error)
    return NextResponse.json(
      { success: false, error: '공유 링크 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
