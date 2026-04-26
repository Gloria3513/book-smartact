'use client';

import Link from 'next/link';
import type { Book } from '@/types';

interface BookCardProps {
  book: Book;
  // 책 상세에서 돌아갈 곳 (예: 도서관 공유 페이지)
  backHref?: string;
  backLabel?: string;
}

// 제목으로부터 일관된 색감 톤을 뽑아 책마다 살짝 다른 표지 분위기를 줌
const SPINE_TONES = [
  { bg: 'linear-gradient(135deg, #fde68a 0%, #fb923c 100%)', text: '#7c2d12', spine: '#92400e' },
  { bg: 'linear-gradient(135deg, #bbf7d0 0%, #14b8a6 100%)', text: '#064e3b', spine: '#115e59' },
  { bg: 'linear-gradient(135deg, #ddd6fe 0%, #8b5cf6 100%)', text: '#3b0764', spine: '#5b21b6' },
  { bg: 'linear-gradient(135deg, #fbcfe8 0%, #ec4899 100%)', text: '#831843', spine: '#9f1239' },
  { bg: 'linear-gradient(135deg, #bae6fd 0%, #3b82f6 100%)', text: '#1e3a8a', spine: '#1d4ed8' },
  { bg: 'linear-gradient(135deg, #fed7aa 0%, #ef4444 100%)', text: '#7f1d1d', spine: '#991b1b' },
  { bg: 'linear-gradient(135deg, #d9f99d 0%, #65a30d 100%)', text: '#365314', spine: '#3f6212' },
  { bg: 'linear-gradient(135deg, #fef3c7 0%, #d97706 100%)', text: '#78350f', spine: '#92400e' },
];

function pickTone(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return SPINE_TONES[Math.abs(h) % SPINE_TONES.length];
}

export default function BookCard({ book, backHref, backLabel }: BookCardProps) {
  const tone = pickTone(book.id || book.title);

  const href = backHref
    ? `/book/${book.id}?from=${encodeURIComponent(backHref)}${backLabel ? `&fromLabel=${encodeURIComponent(backLabel)}` : ''}`
    : `/book/${book.id}`;

  return (
    <Link
      href={href}
      className="group block transition-transform duration-300 hover:-translate-y-1.5"
    >
      <div className="relative">
        {/* 책 옆면(spine) — 카드 좌측에 살짝 노출되는 두께감 */}
        <div
          aria-hidden
          className="absolute -left-1 top-1 bottom-1 w-1.5 rounded-l-sm opacity-80"
          style={{ background: tone.spine }}
        />

        <div
          className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-md group-hover:shadow-xl transition-shadow"
          style={{
            // 책 표지 입체감을 위한 미세한 안쪽 그림자
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.08), 0 8px 18px -8px rgba(0,0,0,0.25), inset 6px 0 12px -6px rgba(0,0,0,0.18)',
          }}
        >
          {book.cover_image ? (
            <img
              src={book.cover_image}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            // 표지 이미지가 아직 없을 때 — 책 제목을 표지 안에 크게 (진짜 책처럼)
            <div
              className="w-full h-full flex flex-col justify-between p-4"
              style={{ background: tone.bg, color: tone.text }}
            >
              {/* 상단 가는 띠 */}
              <div className="flex items-center gap-2 opacity-70">
                <div className="h-px flex-1" style={{ background: tone.text }} />
                <span className="text-[10px] tracking-widest font-semibold">BOOK</span>
                <div className="h-px flex-1" style={{ background: tone.text }} />
              </div>

              {/* 가운데: 제목 */}
              <div className="flex-1 flex items-center justify-center text-center">
                <h3
                  className="font-bold leading-tight line-clamp-4"
                  style={{
                    fontSize: '14px',
                    letterSpacing: '-0.01em',
                    textShadow: '0 1px 2px rgba(255,255,255,0.25)',
                  }}
                >
                  {book.title}
                </h3>
              </div>

              {/* 하단 가는 띠 + 페이지 수 */}
              <div className="flex items-center gap-2 opacity-70">
                <div className="h-px flex-1" style={{ background: tone.text }} />
                {book.page_count && (
                  <span className="text-[10px] font-medium">{book.page_count}p</span>
                )}
                <div className="h-px flex-1" style={{ background: tone.text }} />
              </div>
            </div>
          )}

          {/* 페이지 수 배지 (cover_image가 있을 때만) */}
          {book.cover_image && book.page_count && (
            <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              {book.page_count}p
            </span>
          )}

          {/* 책 표지 좌측 안쪽의 미세한 결(그림자 라인) */}
          <div
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-2 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.18), transparent)' }}
          />
        </div>
      </div>

      {/* 카드 아래 제목 — 책에 가린 것 같은 작은 폰트로 */}
      <h4 className="mt-3 text-sm font-medium text-stone-700 group-hover:text-teal-700 transition-colors truncate">
        {book.title}
      </h4>
    </Link>
  );
}
