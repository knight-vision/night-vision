import { MetadataRoute } from "next";
import { supabase } from "@/lib/shops";
import { CITIES, GENRES, GENRES_MAINLAND } from "@/lib/cities";

const BASE = "https://www.night-vision.jp";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 店舗ページ
  const { data: shops } = await supabase.from("shops").select("slug, created_at, city").eq("hidden", false);
  const shopUrls = (shops ?? []).map(s => ({
    url: `${BASE}/shop/${s.slug}`,
    lastModified: s.created_at ? new Date(s.created_at) : now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // キャストページ
  const { data: casts } = await supabase.from("casts").select("id, created_at");
  const castUrls = (casts ?? []).map(c => ({
    url: `${BASE}/cast/${c.id}`,
    lastModified: c.created_at ? new Date(c.created_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // 都市・業種ページ
  const cityUrls: MetadataRoute.Sitemap = [];
  for (const city of CITIES) {
    const prefKey = city.prefectureKey;
    const cityKey = city.key;
    const genres = prefKey === "hokkaido" ? GENRES : GENRES_MAINLAND;

    // 都市トップ
    cityUrls.push({
      url: `${BASE}/${prefKey}/${cityKey}`,
      lastModified: now, changeFrequency: "daily", priority: 0.95,
    });
    // 都市×業種
    for (const g of genres) {
      cityUrls.push({
        url: `${BASE}/${prefKey}/${cityKey}/${g.key}`,
        lastModified: now, changeFrequency: "daily", priority: 0.85,
      });
    }
    // 都道府県トップ
    cityUrls.push({
      url: `${BASE}/${prefKey}`,
      lastModified: now, changeFrequency: "weekly", priority: 0.8,
    });
  }

  // 重複除去
  const seen = new Set<string>();
  const dedupedCityUrls = cityUrls.filter(u => {
    if (seen.has(u.url)) return false;
    seen.add(u.url);
    return true;
  });

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/map`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/ranking`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/for-owners`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // 旧URLもリダイレクト元としてサイトマップに残す
    { url: `${BASE}/hokkaido/kushiro/lounge`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE}/hokkaido/kushiro/girls-bar`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE}/hokkaido/kushiro/snack`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    ...dedupedCityUrls,
    ...shopUrls,
    ...castUrls,
  ];
}
