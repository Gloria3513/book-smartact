'use client';

import Link from 'next/link';
import type { Library } from '@/types';

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
      <div className="aspect-[3/2] bg-gradient-to-br from-blue-50 to-teal-100 flex items-center justify-center relative">
        {library.cover_image ? (
          <img
            src={library.cover_image}
            alt={library.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-teal-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-medium">{bookCount}권</span>
          </div>
        )}
        {library.is_public ? (
          <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
            공개
          </span>
        ) : (
          <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
            비공개
          </span>
        )}
      </div>

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
