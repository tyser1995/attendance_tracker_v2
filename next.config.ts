import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      // Restore from Backup uploads the whole JSON file through a Server Action.
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
