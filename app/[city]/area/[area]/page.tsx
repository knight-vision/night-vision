import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import Link from "next/link";
import { getShopsByCityAndArea } from "@/lib/shops";
import { getCity, getArea, areaKeyToName } from "@/lib/cities";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { city: string; area: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCity(params.city);
  if (!city) return {};
  const area = getArea(city, params.area);
  if (!area) return {};
  return {
    title: `${area.name}エリアの飲み屋・ナイトライフ｜${city.name}｜NIGHT VISION`,
    description: area.description,
    alternates: { canonical: `https://www.night-vision.jp/${city.key}/area/${area.key}` },
  };
}

export default async function CityAreaPage({ params }: Props) {
  const city = getCity(params.city);
  if (!city) notFound();
  const area = getArea(city, params.area);
  if (!area) notFound();

  const areaName = areaKeyToName(params.area);
  const shops = await getShopsByCityAndArea(city.key, areaName);

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ marginBottom: 8 }}>
          <Link href={`/${city.key}`} style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>
            ← {city.name}トップ
          </Link>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 6 }}>
            AREA / {area.name.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {area.name}エリア
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            {area.description}　{shops.length}件掲載。
          </p>
        </div>

        {/* 他エリアナビ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {city.areas.filter(a => a.key !== area.key).map(a => (
            <Link key={a.key} href={`/${city.key}/area/${a.key}`} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12,
              background: "var(--bg-input)", border: "1px solid var(--border)",
              color: "var(--text-muted)", textDecoration: "none",
            }}>
              📍 {a.name}エリア
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shops.length === 0
            ? <p style={{ color: "var(--text-hint)", fontSize: 14 }}>現在掲載中の店舗はありません。</p>
            : shops.map(shop => <ShopCard key={shop.id} shop={shop} />)
          }
        </div>
      </main>
    </>
  );
}
