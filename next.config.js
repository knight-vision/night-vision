/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // 最適化（WebP変換・リサイズ）を無効化。初回アクセス時のサーバー変換待ちをなくし、
    // 元画像を直接配信する。遅延読み込みとレイアウトシフト防止(fill/width/height)は維持される。
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async redirects() {
    return [
      // wwwなしをwwwありにリダイレクト
      {
        source: "/:path*",
        has: [{ type: "host", value: "night-vision.jp" }],
        destination: "https://www.night-vision.jp/:path*",
        permanent: true,
      },
      // 旧URL（/girls-bar など）→ 新URL（/hokkaido/kushiro/girls-bar）
      { source: "/girls-bar",   destination: "/hokkaido/kushiro/girls-bar",   permanent: true },
      { source: "/lounge",      destination: "/hokkaido/kushiro/lounge",      permanent: true },
      { source: "/snack",       destination: "/hokkaido/kushiro/snack",       permanent: true },
      { source: "/casual-bar",  destination: "/hokkaido/kushiro/casual-bar",  permanent: true },
      // 旧エリアURL（廃止済み）→ 釧路の都市トップへ集約
      { source: "/area/:slug*", destination: "/hokkaido/kushiro", permanent: true },
      { source: "/hokkaido/kushiro/area/:slug*", destination: "/hokkaido/kushiro", permanent: true },
      { source: "/:pref/:city/area/:slug*", destination: "/:pref/:city", permanent: true },
    ];
  },
};
module.exports = nextConfig;
