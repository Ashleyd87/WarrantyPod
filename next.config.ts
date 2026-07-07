import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the user profile confuses workspace-root
  // inference; pin it to this project.
  outputFileTracingRoot: __dirname,
  experimental: {
    serverActions: {
      // Receipt/serial photos are attached to server actions as FormData.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
