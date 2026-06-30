import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions の既定ボディ上限は1MB。遺影/商品画像(最大5MB)のアップロードを許可するため拡張。
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
