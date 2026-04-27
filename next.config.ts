import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  // Vercel serverless에 pdfjs-dist worker 파일이 누락되면
  // fake worker가 'Cannot find module pdf.worker.mjs' 에러를 던짐.
  // legacy/build 전체를 deploy bundle에 강제 포함시킨다.
  outputFileTracingIncludes: {
    '/api/flipbook/process': [
      './node_modules/pdfjs-dist/legacy/build/**/*',
      // 한중일 cmap (글자 깨짐 방지)
      './node_modules/pdfjs-dist/cmaps/**/*',
      // standard fonts (폰트 임베딩 안 된 PDF의 fallback)
      './node_modules/pdfjs-dist/standard_fonts/**/*',
      // 한글 시스템 폰트 (서버에 한글 폰트가 없으면 □□□ 깨짐)
      './node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff',
    ],
  },
};

export default nextConfig;
