'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface PrintOrder {
  id: string
  order_number: string
  user_id: string
  orderer_name: string
  orderer_phone: string
  delivery_name: string
  delivery_phone: string
  delivery_address: string
  delivery_memo: string | null
  template_id: string
  package_type: string
  quantity: number
  page_count: number
  pdf_url: string | null
  unit_price: number
  total_price: number
  delivery_fee: number
  payment_status: string
  payment_key: string | null
  wowpress_order_id: string | null
  wowpress_status: string | null
  status: string
  tracking_number: string | null
  tracking_company: string | null
  created_at: string
  updated_at: string
}

interface OrderLog {
  id: string
  status: string
  message: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: '주문생성', color: 'bg-gray-100 text-gray-700' },
  paid: { label: '결제완료', color: 'bg-blue-100 text-blue-700' },
  pdf_generating: { label: 'PDF생성중', color: 'bg-yellow-100 text-yellow-700' },
  pdf_ready: { label: 'PDF완료', color: 'bg-indigo-100 text-indigo-700' },
  uploading: { label: '업로드중', color: 'bg-purple-100 text-purple-700' },
  printing: { label: '제작중', color: 'bg-orange-100 text-orange-700' },
  shipped: { label: '발송완료', color: 'bg-teal-100 text-teal-700' },
  delivered: { label: '배송완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-700' },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<PrintOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null)
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const supabase = createClient()

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      alert('관리자만 접근할 수 있습니다')
      window.location.href = '/dashboard'
      return
    }
    setIsAdmin(true)
  }, [supabase])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('print_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }, [supabase, filterStatus])

  const loadOrderLogs = useCallback(async (orderId: string) => {
    const { data } = await supabase
      .from('print_order_logs')
      .select('id, status, message, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    setOrderLogs(data || [])
  }, [supabase])

  useEffect(() => { checkAdmin() }, [checkAdmin])
  useEffect(() => { if (isAdmin) loadOrders() }, [isAdmin, loadOrders])

  const handleSelectOrder = (order: PrintOrder) => {
    setSelectedOrder(order)
    loadOrderLogs(order.id)
  }

  const handleCancelOrder = async (order: PrintOrder) => {
    if (!confirm(`주문 ${order.order_number}을 취소하시겠습니까?`)) return
    setCancelling(true)

    try {
      // 와우프레스 주문 취소 (주문번호가 있는 경우)
      if (order.wowpress_order_id) {
        await fetch('/api/wowpress/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ordnum: order.wowpress_order_id }),
        })
      }

      // 토스페이먼츠 결제 취소
      if (order.payment_key) {
        await fetch('/api/payments/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey: order.payment_key,
            cancelReason: '관리자 주문 취소',
          }),
        })
      }

      // DB 상태 업데이트
      await supabase.from('print_orders').update({
        status: 'cancelled',
        payment_status: order.payment_key ? 'refunded' : 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('id', order.id)

      await supabase.from('print_order_logs').insert({
        order_id: order.id,
        status: 'cancelled',
        message: '관리자에 의한 주문 취소',
      })

      loadOrders()
      setSelectedOrder(null)
      alert('주문이 취소되었습니다')
    } catch (error) {
      alert('취소 처리 중 오류: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    } finally {
      setCancelling(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><p>권한 확인 중...</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🖨️ 인쇄 주문 관리</h1>
            <p className="text-sm text-gray-500">자서전 인쇄 주문 현황</p>
          </div>
          <a href="/dashboard/admin" className="text-sm text-blue-600 hover:underline">← 관리자 홈</a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* 상태 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all', label: '전체' },
            { value: 'paid', label: '결제완료' },
            { value: 'pdf_ready', label: 'PDF완료' },
            { value: 'printing', label: '제작중' },
            { value: 'shipped', label: '발송완료' },
            { value: 'delivered', label: '배송완료' },
            { value: 'cancelled', label: '취소' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterStatus === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* 주문 목록 */}
          <div className="flex-1">
            {loading ? (
              <p className="text-gray-500 text-center py-12">불러오는 중...</p>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border">
                <p className="text-gray-400">주문이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const st = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full bg-white rounded-xl p-4 border text-left transition hover:shadow-md ${
                        selectedOrder?.id === order.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-gray-900">{order.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{order.orderer_name} · {order.quantity}부</span>
                        <span>{order.total_price.toLocaleString()}원</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 주문 상세 */}
          {selectedOrder && (
            <div className="w-96 bg-white rounded-xl border p-6 sticky top-6 self-start">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">{selectedOrder.order_number}</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {/* 상태 */}
              <div className="mb-4">
                {(() => {
                  const st = STATUS_LABELS[selectedOrder.status] || { label: selectedOrder.status, color: 'bg-gray-100' }
                  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${st.color}`}>{st.label}</span>
                })()}
              </div>

              {/* 주문 정보 */}
              <div className="space-y-3 text-sm mb-6">
                <div className="border-b pb-3">
                  <p className="font-bold text-gray-700 mb-1">주문자</p>
                  <p>{selectedOrder.orderer_name} · {selectedOrder.orderer_phone}</p>
                </div>
                <div className="border-b pb-3">
                  <p className="font-bold text-gray-700 mb-1">배송지</p>
                  <p>{selectedOrder.delivery_name} · {selectedOrder.delivery_phone}</p>
                  <p className="text-gray-500">{selectedOrder.delivery_address}</p>
                  {selectedOrder.delivery_memo && <p className="text-gray-400">메모: {selectedOrder.delivery_memo}</p>}
                </div>
                <div className="border-b pb-3">
                  <p className="font-bold text-gray-700 mb-1">상품</p>
                  <p>템플릿: {selectedOrder.template_id}</p>
                  <p>패키지: {selectedOrder.package_type === 'premium' ? '프리미엄' : '기본'}</p>
                  <p>수량: {selectedOrder.quantity}부 · {selectedOrder.page_count}페이지</p>
                </div>
                <div className="border-b pb-3">
                  <p className="font-bold text-gray-700 mb-1">결제</p>
                  <p>상품: {(selectedOrder.unit_price * selectedOrder.quantity).toLocaleString()}원</p>
                  <p>배송비: {selectedOrder.delivery_fee === 0 ? '무료' : `${selectedOrder.delivery_fee.toLocaleString()}원`}</p>
                  <p className="font-bold">합계: {selectedOrder.total_price.toLocaleString()}원</p>
                  <p className="text-gray-400">결제: {selectedOrder.payment_status}</p>
                </div>
                {selectedOrder.wowpress_order_id && (
                  <div className="border-b pb-3">
                    <p className="font-bold text-gray-700 mb-1">와우프레스</p>
                    <p>주문번호: {selectedOrder.wowpress_order_id}</p>
                    <p>상태: {selectedOrder.wowpress_status || '-'}</p>
                  </div>
                )}
                {selectedOrder.tracking_number && (
                  <div className="border-b pb-3">
                    <p className="font-bold text-gray-700 mb-1">배송</p>
                    <p>{selectedOrder.tracking_company}: {selectedOrder.tracking_number}</p>
                  </div>
                )}
                {selectedOrder.pdf_url && (
                  <div>
                    <a
                      href={selectedOrder.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📄 PDF 다운로드
                    </a>
                  </div>
                )}
              </div>

              {/* 상태 이력 */}
              <div className="mb-6">
                <p className="font-bold text-gray-700 mb-2 text-sm">상태 이력</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orderLogs.map(log => (
                    <div key={log.id} className="flex gap-2 text-xs">
                      <span className="text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</span>
                      <span className="text-gray-700">{log.message || log.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 액션 버튼 */}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <button
                  onClick={() => handleCancelOrder(selectedOrder)}
                  disabled={cancelling}
                  className="w-full py-3 rounded-lg text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  {cancelling ? '취소 처리 중...' : '주문 취소'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
