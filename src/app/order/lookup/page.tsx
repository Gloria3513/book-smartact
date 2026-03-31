'use client'

import { useState } from 'react'

interface OrderInfo {
  order_number: string
  orderer_name: string
  template_id: string
  quantity: number
  total_price: number
  status: string
  tracking_number: string | null
  tracking_company: string | null
  created_at: string
  print_order_logs: Array<{
    status: string
    message: string | null
    created_at: string
  }>
}

const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  created: { label: '주문 접수', emoji: '📋' },
  paid: { label: '결제 완료', emoji: '💳' },
  pdf_generating: { label: 'PDF 만드는 중', emoji: '📄' },
  pdf_ready: { label: 'PDF 완성', emoji: '✅' },
  uploading: { label: '인쇄소 전송 중', emoji: '📤' },
  printing: { label: '제작 중', emoji: '🖨️' },
  shipped: { label: '발송 완료', emoji: '🚚' },
  delivered: { label: '배송 완료', emoji: '📦' },
  cancelled: { label: '취소됨', emoji: '❌' },
}

export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!orderNumber.trim()) return
    setLoading(true)
    setError('')
    setOrder(null)

    try {
      const res = await fetch(`/api/orders?orderNumber=${encodeURIComponent(orderNumber.trim())}`)
      const data = await res.json()

      if (data.success) {
        setOrder(data.order)
      } else {
        setError(data.error || '주문을 찾을 수 없습니다')
      }
    } catch {
      setError('조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto mt-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">📦 주문 조회</h1>
          <p className="text-sm text-gray-500 mt-1">주문번호를 입력하면 배송 상태를 확인할 수 있어요</p>
        </div>

        {/* 검색 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">주문번호</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="MK-20260401-XXXX"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '...' : '조회'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 결과 */}
        {order && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* 상태 헤더 */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <p className="text-xs text-gray-500 mb-1">{order.order_number}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{STATUS_LABELS[order.status]?.emoji || '📋'}</span>
                <span className="text-lg font-bold text-gray-900">
                  {STATUS_LABELS[order.status]?.label || order.status}
                </span>
              </div>
              {order.tracking_number && (
                <p className="text-sm text-blue-700 mt-2 font-medium">
                  🚚 {order.tracking_company} {order.tracking_number}
                </p>
              )}
            </div>

            {/* 주문 정보 */}
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">주문자</span>
                <span className="font-medium">{order.orderer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">수량</span>
                <span className="font-medium">{order.quantity}부</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">결제금액</span>
                <span className="font-bold text-blue-700">{order.total_price.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">주문일</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>

            {/* 진행 이력 */}
            {order.print_order_logs && order.print_order_logs.length > 0 && (
              <div className="p-6 border-t">
                <p className="text-sm font-bold text-gray-700 mb-3">진행 이력</p>
                <div className="space-y-3">
                  {order.print_order_logs
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((log, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="text-sm text-gray-800">{log.message || STATUS_LABELS[log.status]?.label || log.status}</p>
                          <p className="text-xs text-gray-400">{formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
