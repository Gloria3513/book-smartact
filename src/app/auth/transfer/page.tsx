'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AuthTransferPage() {
  const [status, setStatus] = useState('로그인 연동 중...');

  useEffect(() => {
    const transfer = async () => {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        // hash에서도 확인
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const at = hashParams.get('access_token');
          const rt = hashParams.get('refresh_token');
          if (at && rt) {
            await setSessionAndRedirect(at, rt);
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      await setSessionAndRedirect(accessToken, refreshToken);
    };

    const setSessionAndRedirect = async (accessToken: string, refreshToken: string) => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setStatus('로그인 연동 실패. 다시 시도해주세요.');
          setTimeout(() => { window.location.href = '/login'; }, 2000);
          return;
        }

        setStatus('로그인 성공! 이동 중...');
        window.location.replace('/dashboard');
      } catch {
        setStatus('오류가 발생했습니다.');
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      }
    };

    transfer();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">{status}</p>
      </div>
    </div>
  );
}
