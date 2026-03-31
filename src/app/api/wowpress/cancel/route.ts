import { NextRequest, NextResponse } from 'next/server'
import { cancelOrder } from '@/lib/wowpress'

export async function POST(request: NextRequest) {
  try {
    const { ordnum } = await request.json()

    if (!ordnum) {
      return NextResponse.json({ success: false, error: '주문번호가 필요합니다' }, { status: 400 })
    }

    const result = await cancelOrder(ordnum)

    if (result.resultCode === '200') {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({
      success: false,
      error: result.errMsg || '와우프레스 주문 취소에 실패했습니다 (접수진행 중이면 취소 불가)',
    })
  } catch (error) {
    console.error('와우프레스 취소 오류:', error)
    return NextResponse.json({ success: false, error: '와우프레스 취소 처리 중 오류' }, { status: 500 })
  }
}
