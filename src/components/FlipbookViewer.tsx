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
}

const Page = ({ pageUrl, pageNumber }: PageProps) => {
  return (
    <div className="bg-white flex items-center justify-center h-full w-full">
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
    </div>
  );
};

export default function FlipbookViewer({ pdfUrl, title, embedded = false }: FlipbookViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const flipBookRef = useRef<ReturnType<typeof HTMLFlipBook> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 560 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const pageWidth = Math.min(containerWidth / 2, 500);
      const pageHeight = pageWidth * 1.4;
      setDimensions({ width: pageWidth, height: pageHeight });
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
  };

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
      ref={containerRef}
      className={`flex flex-col items-center gap-4 ${embedded ? '' : 'py-8'}`}
    >
      {title && !embedded && (
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      )}

      <div className="relative">
        {/* @ts-expect-error - react-pageflip 타입 이슈 */}
        <HTMLFlipBook
          ref={flipBookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="stretch"
          minWidth={280}
          maxWidth={500}
          minHeight={400}
          maxHeight={700}
          showCover={true}
          maxShadowOpacity={0.5}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className="shadow-2xl"
        >
          {pages.map((pageUrl, index) => (
            <div key={index} className="bg-white">
              <Page pageUrl={pageUrl} pageNumber={index + 1} />
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-30 hover:bg-gray-700 transition"
        >
          ← 이전
        </button>
        <span className="text-gray-600 font-medium">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-30 hover:bg-gray-700 transition"
        >
          다음 →
        </button>
      </div>

      {embedded && (
        <a
          href={typeof window !== 'undefined' ? window.location.href.replace('/embed', '') : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          book.smartact.kr에서 보기
        </a>
      )}
    </div>
  );
}
