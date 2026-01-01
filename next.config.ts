import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Increase body size limit for API routes (10MB for pin uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.tebi.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.tebi.io',
        pathname: '/**',
      },
      {
        // Vercel Blob for fonts
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
  // Bundle fonts for serverless functions (needed for canvas text rendering)
  outputFileTracingIncludes: {
    '/api/v1/generate': ['./public/fonts/**/*', './fonts.conf'],
  },
  // Prevent bundling of native modules
  serverExternalPackages: ['canvas'],
};

export default nextConfig;

