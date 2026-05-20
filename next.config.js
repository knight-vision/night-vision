/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // night-vision.jp → www.night-vision.jp への301リダイレクト
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
