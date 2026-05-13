import { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/shops";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllSlugs();
  const shopUrls = slugs.map((slug) => ({
    url: `https://www.night-vision.jp/shop/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    { url: "https://www.night-vision.jp", lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: "https://www.night-vision.jp/snack", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: "https://www.night-vision.jp/girls-bar", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: "https://www.night-vision.jp/lounge", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: "https://www.night-vision.jp/casual-bar", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: "https://www.night-vision.jp/area/suehiro", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: "https://www.night-vision.jp/area/aikoku", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: "https://www.night-vision.jp/apply", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    ...shopUrls,
  ];
}