import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build for minimal Docker image
  output: "standalone",

  // Allow images from external sources
  images: {
    remotePatterns: [
      { hostname: "assets.coingecko.com" },
      { hostname: "coin-images.coingecko.com" },
    ],
  },

  // Headers for API security
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
