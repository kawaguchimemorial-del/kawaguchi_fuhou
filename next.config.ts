import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions の既定ボディ上限は1MB。遺影/商品画像(最大5MB)のアップロードを許可するため拡張。
    serverActions: { bodySizeLimit: "8mb" },
  },
  async redirects() {
    return [
      // 訃報管理のURL変更(/admin→/fuhou)。旧ブックマーク/ショートカット互換のため307(temporary)を恒久維持。
      { source: "/admin/:path*", destination: "/fuhou/:path*", permanent: false },
      { source: "/admin", destination: "/fuhou", permanent: false },
    ];
  },
};

export default nextConfig;
