import path from "path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(
  typeof __dirname !== "undefined"
    ? path.join(__dirname, "..")
    : process.cwd().endsWith("frontend")
      ? path.join(process.cwd(), "..")
      : process.cwd()
);

const nextConfig: NextConfig = {
  /** Ensures Tailwind resolves from this app when multiple lockfiles exist elsewhere (fixes unstyled UI). */
  turbopack: {
    root: repoRoot,
  },
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: repoRoot,
  /** API is served by Next.js API routes under `/pages/api`. */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
