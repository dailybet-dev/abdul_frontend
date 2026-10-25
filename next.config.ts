import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    if (!backendUrl) return [];
    return [{
      source: "/api/backend/:path*",
      destination: `${backendUrl}/api/:path*`,
    }];
  },
};

export default nextConfig;
