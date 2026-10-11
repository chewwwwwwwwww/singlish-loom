import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Native Next powers the Vercel frontend. The existing Vite/Sites build
  // continues importing the Cloudflare implementation directly.
  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "../_loom$": path.join(process.cwd(), "lib/vercel-loom.ts"),
        "../api/_loom$": path.join(process.cwd(), "lib/vercel-loom.ts"),
      };
    }
    return config;
  },
};

export default nextConfig;
