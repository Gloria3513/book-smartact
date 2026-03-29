'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AuthTransferPage() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // #access_token=xxx&refresh_token=xxx 형태로 들어옴
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const supabase = createClient();
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(() => {
          window.location.href = '/dashboard';
        });
        return;
      }
    }

    // URL 파라미터로 받는 경우
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(() => {
        window.location.href = '/dashboard';
      });
    } else {
      // 토큰 없으면 로그인 페이지로
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">로그인 연동 중...</p>
      </div>
    </div>
  );
}
