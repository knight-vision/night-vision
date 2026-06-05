/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
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
      { source: "/area/suehiro", destination: "/hokkaido/kushiro/area/suehiro", permanent: true },
      { source: "/area/aikoku",  destination: "/hokkaido/kushiro/area/aikoku",  permanent: true },
      { source: "/area/:slug",   destination: "/hokkaido/kushiro/area/:slug",   permanent: true },
    ];
  },
};
module.exports = nextConfig;
