/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "night-vision.jp" }],
        destination: "https://www.night-vision.jp/:path*",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
