import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * 와우프레스 주문상태 콜백
 * 주문 상태가 변경될 때마다 와우프레스가 이 URL로 POST 요청
 *
 * OrdStat: 0=입금대기, 1=접수대기, 10=접수진행, 20=생산진행,
 *          30=생산완료, 70=출고대기, 80=출고완료, 90=주문취소
 */
export async function POST(request: NextRequest) {
  try {
    // content-type에 따라 파싱
    const contentType = request.headers.get('content-type') || ''
    let data: Record<string, string>

    if (contentType.includes('application/json')) {
      data = await request.json()
    } else {
      const formData = await request.formData()
      data = Object.fromEntries(formData.entries()) as Record<string, string>
    }

    const { ordnum, ordstat, jobstat, shipnum, cbkmsg } = data

    if (!ordnum) {
      return NextResponse.json({ error: 'ordnum required' }, { status: 400 })
    }

    // 와우프레스 주문번호로 내부 주문 조회
    const { data: order } = await supabase
      .from('print_orders')
      .select('id, order_number, status')
      .eq('wowpress_order_id', ordnum)
      .single()

    if (!order) {
      console.warn(`와우프레스 콜백: 알 수 없는 주문번호 ${ordnum}`)
      return new NextResponse('OK', { status: 200 })
    }

    // 상태 매핑
    const ordStatNum = Number(ordstat)
    let newStatus = order.status
    let message = ''

    switch (ordStatNum) {
      case 0:
        newStatus = 'printing'
        message = '입금대기'
        break
      case 1:
        newStatus = 'printing'
        message = '접수대기'
        break
      case 10:
        newStatus = 'printing'
        message = `접수진행 (작업상태: ${jobstat})`
        break
      case 20:
        newStatus = 'printing'
        message = '생산진행'
        break
      case 30:
        newStatus = 'printing'
        message = '생산완료'
        break
      case 70:
        newStatus = 'printing'
        message = '출고대기'
        break
      case 80:
        newStatus = 'shipped'
        message = `출고완료${shipnum ? ` (송장: ${shipnum})` : ''}`
        break
      case 84:
        newStatus = 'shipped'
        message = `배송중${shipnum ? ` (송장: ${shipnum})` : ''}`
        break
      case 85:
        newStatus = 'delivered'
        message = '배송완료'
        break
      case 90:
        newStatus = 'cancelled'
        message = '주문취소'
        break
      default:
        message = `상태변경: ordstat=${ordstat}, jobstat=${jobstat}`
    }

    // 주문 상태 업데이트
    const updateData: Record<string, unknown> = {
      wowpress_status: `${ordstat}-${jobstat}`,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // 송장번호가 있으면 저장
    if (shipnum) {
      updateData.tracking_number = shipnum
      updateData.tracking_company = '택배' // 와우프레스에서 택배사 정보 별도 확인
    }

    await supabase.from('print_orders').update(updateData).eq('id', order.id)

    // 상태 로그 기록
    let cbkMsgParsed = null
    try {
      if (cbkmsg) cbkMsgParsed = JSON.parse(cbkmsg)
    } catch { /* cbkmsg가 JSON이 아닐 수 있음 */ }

    await supabase.from('print_order_logs').insert({
      order_id: order.id,
      status: newStatus,
      message,
      metadata: {
        ordnum,
        ordstat,
        jobstat,
        shipnum,
        cbkmsg: cbkMsgParsed,
        raw: data,
      },
    })

    // TODO: 상태별 알림 발송 (카카오 알림톡 등)
    // if (newStatus === 'shipped') { /* 발송 알림 */ }
    // if (newStatus === 'delivered') { /* 배송완료 알림 */ }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('와우프레스 콜백 처리 오류:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
