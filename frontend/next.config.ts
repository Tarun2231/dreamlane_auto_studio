import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Ensures Tailwind resolves from this app when multiple lockfiles exist elsewhere (fixes unstyled UI). */
  turbopack: {
    root: process.cwd(),
  },
  /** API is proxied by `app/api/[[...path]]/route.ts` to Express (BACKEND_URL / :5000). */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
