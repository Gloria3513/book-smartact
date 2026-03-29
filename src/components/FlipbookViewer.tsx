'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface FlipbookViewerProps {
  pdfUrl: string;
  title?: string;
  embedded?: boolean;
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

// 페이지 넘기는 소리 합성
function playFlipSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const dur = 0.55, sr = ctx.sampleRate, len = sr * dur;
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const att = 1 - Math.exp(-t * 40);
      const dec = Math.exp(-t * 4.5);
      const env = att * dec;
      const n = (Math.random() * 2 - 1);
      const sw = Math.sin(2 * Math.PI * (1800 * Math.exp(-t * 3) + 400) * t) * 0.12;
      const r = Math.sin(t * 900 + Math.sin(t * 350) * 2.5) * 0.06 * Math.exp(-t * 5);
      d[i] = (n * 0.05 + sw + r) * env * (ch === 0 ? 1 : 0.85);
    }
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.35;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
  const g = ctx.createGain(); g.gain.value = 0.45;
  src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(ctx.destination);
  src.start();
}

export default function FlipbookViewer({ pdfUrl, title, embedded = false }: FlipbookViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flipBookRef = useRef<ReturnType<typeof HTMLFlipBook> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 706 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight || window.innerHeight - 120;
      const maxPageWidth = Math.min(containerWidth / 2 - 20, 600);
      const maxPageHeight = containerHeight - 80;
      const pageWidth = Math.min(maxPageWidth, maxPageHeight / 1.414);
      const pageHeight = pageWidth * 1.414;
      setDimensions({ width: Math.max(pageWidth, 280), height: Math.max(pageHeight, 400) });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
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
        console.error('PDF 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

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
        className="flex-1 flex items-center justify-center relative px-16 py-4 overflow-hidden"
      >
        {/* 좌측 화살표 */}
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:bg-teal-500 hover:text-white hover:scale-110 disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:scale-100 transition-all text-xl"
        >
          ◂
        </button>

        {/* 플립북 */}
        <div className="shadow-2xl">
          {/* @ts-expect-error - react-pageflip 타입 이슈 */}
          <HTMLFlipBook
            ref={flipBookRef}
            width={dimensions.width}
            height={dimensions.height}
            size="stretch"
            minWidth={280}
            maxWidth={600}
            minHeight={400}
            maxHeight={850}
            showCover={true}
            maxShadowOpacity={0.5}
            drawShadow={true}
            flippingTime={800}
            usePortrait={false}
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
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:bg-teal-500 hover:text-white hover:scale-110 disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:scale-100 transition-all text-xl"
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
