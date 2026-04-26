'use client';

import Link from 'next/link';
import type { Library } from '@/types';
import { findTemplate, isTemplateValue, templateKey, type LibraryTemplate } from '@/lib/library-templates';

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
  size = 'thumb',
}: {
  library: Library;
  className?: string;
  size?: 'thumb' | 'preview' | 'option';
}) {
  const cover = library.cover_image;
  const bookCount = library.book_items?.length ?? 0;

  // 1) 템플릿
  if (isTemplateValue(cover)) {
    const tpl = findTemplate(templateKey(cover));
    if (tpl) {
      return <TemplateCover template={tpl} title={library.title} bookCount={bookCount} isPublic={library.is_public} className={className} size={size} />;
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

  // 4) 기본 fallback — 책 등이 꽂힌 책장 같은 분위기
  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center ${className}`}
      style={{
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
      }}
    >
      {/* 책등이 꽂혀있는 듯한 가로 줄무늬 */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-end gap-1 px-3 pb-1 opacity-70">
        {['#7c2d12','#b45309','#a16207','#92400e','#78350f','#7c2d12','#854d0e'].map((c, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              background: c,
              height: `${50 + ((i * 37) % 40)}%`,
              boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1 mb-12 px-3 text-center">
        <h3 className="text-base font-bold text-stone-800 line-clamp-2 leading-tight" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
          {library.title}
        </h3>
        <span className="text-xs font-medium text-stone-700">{bookCount}권의 책</span>
      </div>
      {!library.is_public ? (
        <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">비공개</span>
      ) : (
        <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">공개</span>
      )}
    </div>
  );
}

// 템플릿 표지: 메시 그라디언트 + 타이포 위주의 깔끔한 디자인
// size: 'thumb'(카드 썸네일) | 'preview'(상세 미리보기) | 'option'(모달 선택지)
export function TemplateCover({
  template,
  title,
  bookCount,
  isPublic,
  className = '',
  showMeta = true,
  size = 'thumb',
}: {
  template: LibraryTemplate;
  title?: string;
  bookCount?: number;
  isPublic?: boolean;
  className?: string;
  showMeta?: boolean;
  size?: 'thumb' | 'preview' | 'option';
}) {
  // 사이즈별 타이포 (px)
  const titlePx   = size === 'preview' ? 28 : size === 'option' ? 13 : 18;
  const countPx   = size === 'preview' ? 14 : size === 'option' ? 10 : 11;

  const shadow = template.textTone === 'light'
    ? '0 1px 6px rgba(0,0,0,0.25)'
    : '0 1px 2px rgba(255,255,255,0.4)';

  // 어두운 배경엔 살짝 밝은 하이라이트, 밝은 배경엔 살짝 어두운 비넷
  const overlay = template.textTone === 'light'
    ? 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)'
    : 'radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.04) 0%, transparent 60%)';

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: template.background, color: template.textColor }}
    >
      {/* 미세한 빛/그림자 오버레이 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: overlay }} />

      {/* 메인 콘텐츠 */}
      {showMeta && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
          {title && (
            <h3
              style={{
                fontSize: `${titlePx}px`,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
                textShadow: shadow,
              }}
              className="font-bold line-clamp-3"
            >
              {title}
            </h3>
          )}
          {typeof bookCount === 'number' && (
            <span
              style={{ fontSize: `${countPx}px`, textShadow: shadow }}
              className="mt-2 opacity-80 tracking-wide"
            >
              {bookCount}권의 책
            </span>
          )}
        </div>
      )}

      {typeof isPublic === 'boolean' && (
        <span
          className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${
            isPublic ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
          }`}
        >
          {isPublic ? '공개' : '비공개'}
        </span>
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
