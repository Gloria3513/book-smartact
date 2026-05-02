/**
 * 강사허브(instructor-hub) 멤버십 게이트.
 * 같은 Supabase 프로젝트의 ih_membership / ih_admins 테이블을 조회한다.
 * 미승인 강사가 book.smartact.kr/dashboard 같은 강사 동선에 들어오는 것을 차단한다.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'no_record'

const HUB_PENDING_URL = 'https://hub.smartact.kr/pending'

export interface GateResult {
  status: MembershipStatus
  allowed: boolean
}

/**
 * 강사 승인 게이트.
 * - approved → 통과
 * - 그 외 (pending/rejected/suspended/no_record) → hub.smartact.kr/pending 으로 리다이렉트
 */
export async function ensureInstructorApproved(
  supabase: SupabaseClient,
  options: { redirect?: boolean } = { redirect: true }
): Promise<GateResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    if (options.redirect && typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return { status: 'no_record', allowed: false }
  }

  const { data } = await supabase
    .from('ih_membership')
    .select('status')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const status = (data?.status as MembershipStatus) ?? 'no_record'
  const allowed = status === 'approved'

  if (!allowed && options.redirect && typeof window !== 'undefined') {
    window.location.href = HUB_PENDING_URL
  }

  return { status, allowed }
}

/**
 * ih_admins 화이트리스트 체크 (관리자 화면용).
 * RLS상 본인 이메일이 ih_admins에 있을 때만 1행 SELECT 가능.
 */
export async function isIhAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return false

  const { data } = await supabase
    .from('ih_admins')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()

  return !!data
}
