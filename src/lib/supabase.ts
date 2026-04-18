import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const isProd = process.env.NODE_ENV === 'production';

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: isProd
        ? { domain: '.smartact.kr', path: '/', sameSite: 'lax', secure: true }
        : { path: '/', sameSite: 'lax' },
    }
  );
}
