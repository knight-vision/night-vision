import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/owner/dashboard", "/cast/dashboard", "/api/"],
      },
    ],
    sitemap: "https://www.night-vision.jp/sitemap.xml",
  };
}
