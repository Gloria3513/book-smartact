'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface FlipbookViewerProps {
  pdfUrl: string;
  title?: string;
  embedded?: boolean;
  r2BaseUrl?: string | null;
  pageCount?: number | null;
}

interface PageProps {
  pageUrl: string;
  pageNumber: number;
  totalPages: number;
}

const Page = ({ pageUrl, pageNumber, totalPages }: PageProps) => {
  return (
    <div className="bg-white flex items-center justify-center h-full w-full relative">
      {pageUrl ? (
        <img
          src={pageUrl}
          alt={`페이지 ${pageNumber}`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="flex items-center justify-center text-gray-400">
          로딩 중...
        </div>
      )}
      <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-300">
        {pageNumber} / {totalPages}
      </span>
    </div>
  );
};

// 페이지 넘기는 소리
let flipAudio: HTMLAudioElement | null = null;

function playFlipSound(enabled: boolean) {
  if (!enabled) return;
  if (!flipAudio) {
    flipAudio = new Audio('/page-flip.mp3');
  }
  flipAudio.currentTime = 0;
  flipAudio.volume = 0.5;
  flipAudio.play().catch(() => {});
}

export default function FlipbookViewer({ pdfUrl, title, embedded = false, r2BaseUrl, pageCount: r2PageCount }: FlipbookViewerProps) {
  const useR2 = !!(r2BaseUrl && r2PageCount && r2PageCount > 0);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flipBookRef = useRef<ReturnType<typeof HTMLFlipBook> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 706 });
  const [isPortrait, setIsPortrait] = useState(false);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth || window.innerWidth;
    const containerHeight = containerRef.current.offsetHeight || window.innerHeight - 120;
    // 768px 미만 → 모바일: 단면(portrait) 모드로 책 한 장만 표시
    const mobile = (typeof window !== 'undefined' ? window.innerWidth : containerWidth) < 768;
    setIsPortrait(mobile);

    if (mobile) {
      // 단면: 페이지 한 장이 화면 폭 거의 전체 (좌우 패딩 24)
      const maxPageWidth = containerWidth - 24;
      const maxPageHeight = containerHeight - 40;
      const pageWidth = Math.floor(Math.min(maxPageWidth, maxPageHeight / 1.414));
      const pageHeight = Math.floor(pageWidth * 1.414);
      setDimensions({ width: Math.max(pageWidth, 200), height: Math.max(pageHeight, 280) });
    } else {
      // 양면 펼쳐서 가로/세로 모두 여유 있게
      const maxPageWidth = (containerWidth - 160) / 2;
      const maxPageHeight = containerHeight - 60;
      const pageWidth = Math.floor(Math.min(maxPageWidth, maxPageHeight / 1.414));
      const pageHeight = Math.floor(pageWidth * 1.414);
      setDimensions({ width: Math.max(pageWidth, 280), height: Math.max(pageHeight, 400) });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    // R2 이미지 경로가 있으면 PDF 렌더링 스킵 (이미지 URL만 생성)
    if (useR2 && r2BaseUrl && r2PageCount) {
      const urls: string[] = [];
      for (let i = 1; i <= r2PageCount; i++) {
        urls.push(`${r2BaseUrl}/${String(i).padStart(3, '0')}.webp`);
      }
      setPages(urls);
      setTotalPages(r2PageCount);
      setLoading(false);
      return;
    }

    const loadPdf = async () => {
      try {
        setLoading(true);
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        setTotalPages(pdf.numPages);

        const pageImages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport, canvas } as unknown as Parameters<typeof page.render>[0]).promise;
          pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
        }

        setPages(pageImages);
      } catch (error) {
        console.error('PDF 로딩 실패:', error, 'URL:', pdfUrl);
        setError(`PDF 로딩 실패: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl, useR2, r2BaseUrl, r2PageCount]);

  // 전체화면 감지
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(updateDimensions, 100);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [updateDimensions]);

  const goToPrev = () => {
    if (flipBookRef.current) {
      (flipBookRef.current as unknown as { pageFlip: () => { flipPrev: () => void } }).pageFlip().flipPrev();
    }
  };

  const goToNext = () => {
    if (flipBookRef.current) {
      (flipBookRef.current as unknown as { pageFlip: () => { flipNext: () => void } }).pageFlip().flipNext();
    }
  };

  const onFlip = (e: { data: number }) => {
    setCurrentPage(e.data);
    playFlipSound(soundEnabled);
  };

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const progressPercent = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0;

  // 키보드
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goToNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">PDF를 불러오는 중...</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        PDF를 불러올 수 없습니다.
        {error && <p className="text-xs text-red-400 mt-2 max-w-md break-all">{error}</p>}
        <p className="text-xs text-gray-300 mt-1 max-w-md break-all">{pdfUrl}</p>
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      className={`flex flex-col h-screen ${isFullscreen ? 'bg-gray-800' : 'bg-[#e8e8e8]'}`}
    >
      {/* 상단 툴바 */}
      <div className="fixed top-4 right-4 z-50 flex gap-1 bg-white/95 backdrop-blur px-2 py-1.5 rounded-xl shadow-lg">
        {title && !embedded && (
          <span className="text-sm font-medium text-gray-600 px-3 py-1.5 hidden sm:block">{title}</span>
        )}
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition text-lg"
          title="전체화면"
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-lg ${soundEnabled ? 'text-gray-500' : 'text-gray-300'}`}
          title="효과음"
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* 메인 뷰어 */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative px-3 sm:px-16 py-2 overflow-hidden"
      >
        {/* 스마택트 로고 (좌측 하단) */}
        <a
          href="https://smartact.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-4 z-20 opacity-70 hover:opacity-100 transition"
          title="스마택트"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smartact-logo.png" alt="SMARTACT" className="h-8 sm:h-10 w-auto" />
        </a>
        {/* 좌측 화살표 */}
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 bg-white/90 sm:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:bg-teal-500 hover:text-white hover:scale-110 disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:scale-100 transition-all text-xl"
        >
          ◂
        </button>

        {/* 플립북 */}
        <div className="shadow-2xl">
          {/* @ts-expect-error - react-pageflip 타입 이슈 */}
          <HTMLFlipBook
            key={`${dimensions.width}x${dimensions.height}-${isPortrait ? 'p' : 'l'}`}
            ref={flipBookRef}
            width={dimensions.width}
            height={dimensions.height}
            size="fixed"
            minWidth={isPortrait ? 200 : 280}
            maxWidth={1400}
            minHeight={isPortrait ? 280 : 400}
            maxHeight={2000}
            showCover={true}
            maxShadowOpacity={0.5}
            drawShadow={true}
            flippingTime={800}
            usePortrait={isPortrait}
            mobileScrollSupport={true}
            showPageCorners={true}
            onFlip={onFlip}
            className=""
          >
            {pages.map((pageUrl, index) => (
              <div key={index} className="bg-white">
                <Page pageUrl={pageUrl} pageNumber={index + 1} totalPages={totalPages} />
              </div>
            ))}
          </HTMLFlipBook>
        </div>

        {/* 우측 화살표 */}
        <button
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 bg-white/90 sm:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:bg-teal-500 hover:text-white hover:scale-110 disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:scale-100 transition-all text-xl"
        >
          ▸
        </button>
      </div>

      {/* 하단 프로그레스 바 */}
      <div className="px-6 pb-4 pt-2 flex flex-col items-center gap-2">
        <div className="w-full max-w-2xl h-1.5 bg-gray-300 rounded-full relative cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const page = Math.round(pct * (totalPages - 1));
            if (flipBookRef.current) {
              (flipBookRef.current as unknown as { pageFlip: () => { turnToPage: (p: number) => void } }).pageFlip().turnToPage(page);
            }
          }}
        >
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-teal-500 rounded-full shadow transition-all duration-500 group-hover:scale-125"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">
          {currentPage + 1} / {totalPages}
        </span>
      </div>

      {embedded && (
        <a
          href={typeof window !== 'undefined' ? window.location.href.replace('/embed', '') : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center pb-3 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          book.smartact.kr에서 보기
        </a>
      )}
    </div>
  );
}
