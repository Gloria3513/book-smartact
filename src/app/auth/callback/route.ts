import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') || '/dashboard';

  if (error) {
    const params = new URLSearchParams({
      auth_error: error,
      ...(errorDescription && { auth_error_description: errorDescription }),
    });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const params = new URLSearchParams({
        auth_error: 'exchange_failed',
        auth_error_description: exchangeError.message,
      });
      return NextResponse.redirect(`${origin}/login?${params.toString()}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
