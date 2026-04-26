'use client';

import Link from 'next/link';
import type { Library } from '@/types';
import { findTemplate, isTemplateValue, templateKey } from '@/lib/library-templates';

interface LibraryCardProps {
  library: Library;
  isOwner?: boolean;
  onTogglePublic?: () => void;
}

export default function LibraryCard({ library, isOwner = false, onTogglePublic }: LibraryCardProps) {
  const bookCount = library.book_items?.length ?? 0;

  return (
    <Link
      href={isOwner ? `/dashboard/libraries/${library.id}` : `/library/${library.share_code}`}
      className="group block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden"
    >
      <LibraryCover library={library} className="aspect-[3/2]" />

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition truncate">
          {library.title}
        </h3>
        {library.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{library.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>{bookCount}권의 책</span>
          {isOwner && onTogglePublic && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePublic();
              }}
              className={`px-2 py-1 rounded border transition ${
                library.is_public
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {library.is_public ? '🌐 공개 중' : '🔒 비공개'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

// 표지 우선순위:
// 1) cover_image가 'template:키' → 템플릿 그라디언트 + 이모지
// 2) cover_image가 일반 URL → 이미지
// 3) 비어있으면 첫 책(sort_order/created 기준)의 cover_image
// 4) 그것도 없으면 기본 그라디언트
export function LibraryCover({
  library,
  className = '',
}: {
  library: Library;
  className?: string;
}) {
  const cover = library.cover_image;
  const bookCount = library.book_items?.length ?? 0;

  // 1) 템플릿
  if (isTemplateValue(cover)) {
    const tpl = findTemplate(templateKey(cover));
    if (tpl) {
      return (
        <div
          className={`flex items-center justify-center relative ${className}`}
          style={{ background: tpl.background }}
        >
          <div className="flex flex-col items-center gap-2" style={{ color: tpl.textColor }}>
            <span className="text-5xl drop-shadow-sm">{tpl.emoji}</span>
            <span className="text-sm font-semibold drop-shadow-sm">{library.title}</span>
            <span className="text-xs opacity-90">{bookCount}권</span>
          </div>
          {!library.is_public ? (
            <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">비공개</span>
          ) : (
            <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">공개</span>
          )}
        </div>
      );
    }
  }

  // 2) 일반 이미지 URL
  if (cover && /^https?:\/\//i.test(cover)) {
    return (
      <div className={`bg-gray-100 relative ${className}`}>
        <img src={cover} alt={library.title} className="w-full h-full object-cover" />
        {!library.is_public ? (
          <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">비공개</span>
        ) : (
          <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">공개</span>
        )}
      </div>
    );
  }

  // 3) 첫 책의 표지 자동 사용
  const firstCover = pickFirstBookCover(library);
  if (firstCover) {
    return (
      <div className={`bg-gray-100 relative ${className}`}>
        <img src={firstCover} alt={library.title} className="w-full h-full object-cover" />
        {!library.is_public ? (
          <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">비공개</span>
        ) : (
          <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">공개</span>
        )}
      </div>
    );
  }

  // 4) 기본 그라디언트
  return (
    <div className={`bg-gradient-to-br from-blue-50 to-teal-100 flex items-center justify-center relative ${className}`}>
      <div className="flex flex-col items-center gap-2 text-teal-400">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="text-sm font-medium">{bookCount}권</span>
      </div>
      {!library.is_public ? (
        <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">비공개</span>
      ) : (
        <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">공개</span>
      )}
    </div>
  );
}

function pickFirstBookCover(library: Library): string | null {
  const items = library.book_items ?? [];
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const b of sorted) {
    if (b.cover_image) return b.cover_image;
  }
  return null;
}
