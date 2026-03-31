import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, cancelReason } = await request.json()

    if (!paymentKey) {
      return NextResponse.json({ success: false, error: 'paymentKey가 필요합니다' }, { status: 400 })
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ success: false, error: '결제 설정이 되어있지 않습니다' }, { status: 500 })
    }

    const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason: cancelReason || '주문 취소' }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || '결제 취소에 실패했습니다' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, cancels: data.cancels })
  } catch (error) {
    console.error('결제 취소 오류:', error)
    return NextResponse.json({ success: false, error: '결제 취소 처리 중 오류' }, { status: 500 })
  }
}
