import { MetadataRoute } from "next";
import { getAllSlugs, supabase } from "@/lib/shops";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 店舗スラッグ＋作成日
  const { data: shops } = await supabase
    .from("shops")
    .select("slug, created_at");

  const shopUrls = (shops ?? []).map((shop) => ({
    url: `https://www.night-vision.jp/shop/${shop.slug}`,
    lastModified: shop.created_at ? new Date(shop.created_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // キャストページ
  const { data: casts } = await supabase
    .from("casts")
    .select("id");

  const castUrls = (casts ?? []).map((cast) => ({
    url: `https://www.night-vision.jp/cast/${cast.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: "https://www.night-vision.jp",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: "https://www.night-vision.jp/ranking",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: "https://www.night-vision.jp/snack",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: "https://www.night-vision.jp/girls-bar",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: "https://www.night-vision.jp/lounge",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: "https://www.night-vision.jp/casual-bar",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: "https://www.night-vision.jp/area/suehiro",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: "https://www.night-vision.jp/area/aikoku",
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: "https://www.night-vision.jp/apply",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: "https://www.night-vision.jp/report",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    ...shopUrls,
    ...castUrls,
  ];
}
