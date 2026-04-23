import type { NextConfig } from "next";

console.log('[next.config] ENABLE_REWRITE:', process.env.ENABLE_REWRITE);
console.log('[next.config] API_URL:', process.env.API_URL);

const nextConfig: NextConfig = {
  output: "standalone",
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allow all HTTPS origins
      },
      {
        protocol: "http",
        hostname: "**", // Allow all HTTP origins
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year for versioned images
  },
  async rewrites() {
    if (process.env.ENABLE_REWRITE !== 'true') {
      return [];
    }
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
