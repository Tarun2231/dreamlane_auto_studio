import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Ensures Tailwind resolves from this app when multiple lockfiles exist elsewhere (fixes unstyled UI). */
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: process.cwd(),
  /** API is served by Next.js API routes under `/pages/api`. */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
