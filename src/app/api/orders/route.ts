import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { MemoirDocument } from '@/templates/render-memoir'
import { getTemplate } from '@/templates/registry'
import { MemoirData } from '@/templates/types'
import { uploadFileByUrl, orderMemoirPrint, OrderDelivery } from '@/lib/wowpress'
import React from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// 주문번호 생성
function generateOrderNumber() {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MK-${date}-${rand}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      templateId,
      packageType = 'basic',
      quantity = 1,
      paymentKey,
      ordererName,
      ordererPhone,
      deliveryName,
      deliveryPhone,
      deliveryAddress,
      deliveryZipCode,
      deliveryMemo,
    } = body

    if (!userId || !templateId || !ordererName || !deliveryAddress) {
      return NextResponse.json({ success: false, error: '필수 정보가 누락되었습니다' }, { status: 400 })
    }

    const template = getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ success: false, error: '존재하지 않는 템플릿입니다' }, { status: 404 })
    }

    // 1. 자서전 데이터 조회
    const { data: entries } = await supabase
      .from('memoir_entries')
      .select('chapter, question, answer')
      .eq('user_id', userId)
      .order('chapter')

    if (!entries || entries.length === 0) {
      return NextResponse.json({ success: false, error: '자서전 데이터가 없습니다' }, { status: 404 })
    }

    const { data: userData } = await supabase
      .from('sd_users')
      .select('name')
      .eq('id', userId)
      .single()

    // 일기 사진 조회
    const { data: diaries } = await supabase
      .from('sd_diaries')
      .select('image_url')
      .eq('user_id', userId)
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

    // 2. 주문번호 생성 + DB에 주문 레코드 생성
    const orderNumber = generateOrderNumber()
    const pageCount = Math.max(20, entries.length * 3 + 4) // 최소 20페이지, 여유있게

    const unitPrice = packageType === 'premium' ? 25000 : 15000
    const deliveryFee = quantity >= 3 ? 0 : 3000
    const totalPrice = unitPrice * quantity + deliveryFee

    const { data: order, error: orderError } = await supabase
      .from('print_orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        orderer_name: ordererName,
        orderer_phone: ordererPhone,
        delivery_name: deliveryName || ordererName,
        delivery_phone: deliveryPhone || ordererPhone,
        delivery_address: deliveryAddress,
        delivery_zip_code: deliveryZipCode || null,
        delivery_memo: deliveryMemo || null,
        template_id: templateId,
        package_type: packageType,
        quantity,
        page_count: pageCount,
        unit_price: unitPrice,
        total_price: totalPrice,
        delivery_fee: deliveryFee,
        payment_status: paymentKey ? 'paid' : 'pending',
        payment_key: paymentKey || null,
        paid_at: paymentKey ? new Date().toISOString() : null,
        status: 'paid',
      })
      .select('id, order_number')
      .single()

    if (orderError) {
      console.error('주문 생성 오류:', orderError)
      return NextResponse.json({ success: false, error: '주문 생성에 실패했습니다' }, { status: 500 })
    }

    // 상태 로그
    await supabase.from('print_order_logs').insert({
      order_id: order.id,
      status: 'paid',
      message: '결제 완료, PDF 생성 시작',
    })

    // 3. 인쇄용 PDF 생성 (워터마크 없음)
    await supabase.from('print_order_logs').insert({
      order_id: order.id,
      status: 'pdf_generating',
      message: 'PDF 생성 중',
    })

    const element = React.createElement(MemoirDocument, {
      data: memoirData,
      template,
      watermark: false,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    // 4. PDF를 Supabase Storage에 업로드
    const pdfFileName = `print-orders/${orderNumber}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('flipbooks')
      .upload(pdfFileName, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('PDF 업로드 오류:', uploadError)
      await supabase.from('print_order_logs').insert({
        order_id: order.id,
        status: 'pdf_generating',
        message: `PDF 업로드 실패: ${uploadError.message}`,
      })
    }

    const { data: pdfUrlData } = supabase.storage
      .from('flipbooks')
      .getPublicUrl(pdfFileName)
    const pdfUrl = pdfUrlData.publicUrl

    await supabase.from('print_orders').update({
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      status: 'pdf_ready',
    }).eq('id', order.id)

    await supabase.from('print_order_logs').insert({
      order_id: order.id,
      status: 'pdf_ready',
      message: 'PDF 생성 완료',
    })

    // 5. 와우프레스에 파일 업로드 + 주문 (토큰이 설정된 경우만)
    let wowpressOrderId = null
    if (process.env.WOWPRESS_JWT_TOKEN && process.env.WOWPRESS_JWT_TOKEN !== 'placeholder') {
      try {
        await supabase.from('print_order_logs').insert({
          order_id: order.id,
          status: 'uploading',
          message: '와우프레스에 파일 업로드 중',
        })

        // 파일 업로드 (URL 비동기)
        const uploadResult = await uploadFileByUrl(
          orderNumber,
          `${orderNumber}.pdf`,
          pdfUrl,
        )

        if (uploadResult.resultCode === '200') {
          // 배송지 파싱 (간단한 분리)
          const addressParts = deliveryAddress.split(' ')
          const sd = addressParts[0] || ''
          const sgg = addressParts[1] || ''
          const addr1 = addressParts.slice(0, 3).join(' ')
          const addr2 = addressParts.slice(3).join(' ') || '상세주소'

          const deliveryTo: OrderDelivery = {
            name: deliveryName || ordererName,
            tel: deliveryPhone || ordererPhone,
            sd,
            sgg,
            addr1,
            addr2,
            zipcode: deliveryZipCode || undefined,
          }

          // 주문
          const orderResult = await orderMemoirPrint({
            orderId: orderNumber,
            quantity,
            pageCount,
            packageType,
            deliveryTo,
          })

          if (orderResult.resultCode === '200' && orderResult.resultMap?.cjson_order) {
            const wowOrder = orderResult.resultMap.cjson_order
            wowpressOrderId = wowOrder.ordinfo?.[0]?.ordnum

            await supabase.from('print_orders').update({
              wowpress_order_id: wowpressOrderId,
              wowpress_status: 'ordered',
              status: 'printing',
            }).eq('id', order.id)

            await supabase.from('print_order_logs').insert({
              order_id: order.id,
              status: 'printing',
              message: `와우프레스 주문 완료: ${wowpressOrderId}`,
              metadata: orderResult.resultMap.cjson_order,
            })
          } else {
            await supabase.from('print_order_logs').insert({
              order_id: order.id,
              status: 'uploading',
              message: `와우프레스 주문 실패: ${orderResult.errMsg || JSON.stringify(orderResult)}`,
              metadata: orderResult,
            })
          }
        }
      } catch (wowError) {
        console.error('와우프레스 주문 오류:', wowError)
        await supabase.from('print_order_logs').insert({
          order_id: order.id,
          status: 'uploading',
          message: `와우프레스 연동 오류: ${wowError instanceof Error ? wowError.message : '알 수 없는 오류'}`,
        })
      }
    } else {
      // 와우프레스 토큰 미설정 - PDF만 생성된 상태로 유지
      await supabase.from('print_order_logs').insert({
        order_id: order.id,
        status: 'pdf_ready',
        message: '와우프레스 토큰 미설정 - 수동 주문 필요',
      })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        pdfUrl,
        wowpressOrderId,
        totalPrice,
        status: wowpressOrderId ? 'printing' : 'pdf_ready',
      },
    })
  } catch (error) {
    console.error('주문 처리 오류:', error)
    return NextResponse.json(
      { success: false, error: '주문 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}

// 주문 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('orderNumber')
  const orderId = searchParams.get('id')

  if (!orderNumber && !orderId) {
    return NextResponse.json({ success: false, error: '주문번호가 필요합니다' }, { status: 400 })
  }

  const query = supabase
    .from('print_orders')
    .select('*, print_order_logs(status, message, created_at)')

  if (orderNumber) query.eq('order_number', orderNumber)
  if (orderId) query.eq('id', orderId)

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ success: true, order: data })
}
