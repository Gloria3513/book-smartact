import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // OAuth 에러 시 로그인 페이지로
  if (error) {
    return NextResponse.redirect(`${origin}/login?auth_error=${error}`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(`${origin}/login?auth_error=exchange_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
