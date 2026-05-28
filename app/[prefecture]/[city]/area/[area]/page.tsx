import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import Link from "next/link";
import { getShopsByCityAndArea } from "@/lib/shops";
import { getCityByPrefecture, getArea, areaKeyToName, PREFECTURE_NAMES } from "@/lib/cities";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { prefecture: string; city: string; area: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCityByPrefecture(params.prefecture, params.city);
  if (!city) return {};
  const area = getArea(city, params.area);
  if (!area) return {};
  const title = `${area.name}の飲み屋・ナイトライフ｜${city.name}${area.name}エリア｜NIGHT VISION`;
  const description = `${city.name}${area.name}エリアの飲み屋・キャバクラ・ガールズバー・スナック情報。${area.description}`;
  const url = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}/area/${area.key}`;
  return {
    title,
    description,
    keywords: [
      `${area.name} 飲み屋`, `${area.name} キャバクラ`, `${area.name} ガールズバー`,
      `${area.name} スナック`, `${city.name} ${area.name}`, `${area.name} ナイトライフ`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title, description, url,
      siteName: "NIGHT VISION", type: "website",
      images: [{ url: "https://www.night-vision.jp/icon-512.png", width: 512, height: 512 }],
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function CityAreaPage({ params }: Props) {
  const city = getCityByPrefecture(params.prefecture, params.city);
  if (!city) notFound();
  const area = getArea(city, params.area);
  if (!area) notFound();

  const areaName = areaKeyToName(params.area);
  const shops = await getShopsByCityAndArea(city.key, areaName);
  const prefName = PREFECTURE_NAMES[params.prefecture] || params.prefecture;

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6, alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>TOP</Link>
          <span>›</span>
          <Link href={`/${city.prefectureKey}/${city.key}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>{city.name}</Link>
          <span>›</span>
          <span>{area.name}</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 6 }}>
            {prefName} {city.name} / AREA
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {area.name}エリア
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            {area.description}　{shops.length}件掲載。
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {city.areas.filter(a => a.key !== area.key).map(a => (
            <Link key={a.key} href={`/${city.prefectureKey}/${city.key}/area/${a.key}`} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12,
              background: "var(--bg-input)", border: "1px solid var(--border)",
              color: "var(--text-muted)", textDecoration: "none",
            }}>📍 {a.name}</Link>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shops.length === 0
            ? <p style={{ color: "var(--text-hint)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>現在掲載中の店舗はありません。</p>
            : shops.map(shop => <ShopCard key={shop.id} shop={shop} />)
          }
        </div>
      </main>
    </>
  );
}
