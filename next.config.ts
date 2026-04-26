import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  // Vercel serverless에 pdfjs-dist worker 파일이 누락되면
  // fake worker가 'Cannot find module pdf.worker.mjs' 에러를 던짐.
  // legacy/build 전체를 deploy bundle에 강제 포함시킨다.
  outputFileTracingIncludes: {
    '/api/flipbook/process': [
      './node_modules/pdfjs-dist/legacy/build/**/*',
    ],
  },
};

export default nextConfig;
