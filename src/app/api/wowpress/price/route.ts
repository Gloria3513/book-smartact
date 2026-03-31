import { NextRequest, NextResponse } from 'next/server'
import { getPrice } from '@/lib/wowpress'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quantity, packageType = 'basic', pageCount = 40 } = body

    if (!quantity || quantity < 1 || quantity > 10) {
      return NextResponse.json({ success: false, error: '수량은 1~10부 사이입니다' }, { status: 400 })
    }

    // 패키지별 옵션 (실제 제품상세 조회 후 확인된 값으로 교체 필요)
    const packages: Record<string, { coverPaper: string; innerPaper: string; color: string }> = {
      basic: { coverPaper: '22001', innerPaper: '22010', color: '1001' },
      premium: { coverPaper: '22050', innerPaper: '22020', color: '1001' },
    }
    const pkg = packages[packageType] || packages.basic

    const result = await getPrice({
      prodno: 40196,  // 무선책자
      ordqty: String(quantity),
      ordcnt: '1',
      ordtitle: '메모리콕 자서전',
      prsjob: [
        {
          jobno: '3110',
          covercd: 1,
          sizeno: '10507',
          jobqty: String(quantity),
          paperno: pkg.coverPaper,
          colorno0: pkg.color,
        },
        {
          jobno: '3110',
          covercd: 2,
          sizeno: '10507',
          jobqty: String(pageCount),
          paperno: pkg.innerPaper,
          colorno0: pkg.color,
        },
      ],
    })

    if (result.resultCode === '200' && result.resultMap?.cjson_jobcost) {
      const cost = result.resultMap.cjson_jobcost
      return NextResponse.json({
        success: true,
        price: {
          unitPrice: cost.ordcost_bill,
          quantity,
          totalPrice: cost.ordcost_bill,
          exitDay: cost.exitday,
          exitDate: cost.exitdate,
        },
      })
    }

    // 와우프레스 가격 조회 실패 시 기본 가격 반환
    return NextResponse.json({
      success: true,
      price: {
        unitPrice: packageType === 'premium' ? 25000 : 15000,
        quantity,
        totalPrice: (packageType === 'premium' ? 25000 : 15000) * quantity,
        exitDay: 5,
        exitDate: null,
      },
      fallback: true,
    })
  } catch (error) {
    console.error('가격 조회 오류:', error)
    // 폴백 가격
    return NextResponse.json({
      success: true,
      price: {
        unitPrice: 15000,
        quantity: 1,
        totalPrice: 15000,
        exitDay: 5,
      },
      fallback: true,
    })
  }
}
