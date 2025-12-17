import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
    ],
  },
};

export default nextConfig;
