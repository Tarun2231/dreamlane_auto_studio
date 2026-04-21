import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /** Ensures Tailwind resolves from this app when multiple lockfiles exist elsewhere (fixes unstyled UI). */
  turbopack: {
    root: path.join(process.cwd(), ".."),
  },
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  /** API is served by Next.js API routes under `/pages/api`. */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
