import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import Link from "next/link";
import { getShopsByCityAndType } from "@/lib/shops";
import { getCityByPrefecture, getGenre, PREFECTURE_NAMES } from "@/lib/cities";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { prefecture: string; city: string; genre: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCityByPrefecture(params.prefecture, params.city);
  const genre = getGenre(params.genre);
  if (!city || !genre) return {};
  return {
    title: `${city.name}の${genre.name}一覧｜NIGHT VISION`,
    description: `${city.name}の${genre.name}情報を掲載。料金・雰囲気・キャスト情報とともに紹介。`,
    alternates: { canonical: `https://www.night-vision.jp/${city.prefectureKey}/${city.key}/${genre.key}` },
  };
}

export default async function CityGenrePage({ params }: Props) {
  const city = getCityByPrefecture(params.prefecture, params.city);
  const genre = getGenre(params.genre);
  if (!city || !genre) notFound();

  const shops = await getShopsByCityAndType(city.key, genre.dbType);
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
          <span>{genre.name}</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 6 }}>{genre.englishLabel}</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {city.name}の{genre.name}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            {city.name}の{genre.name} {shops.length}件掲載中。
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {city.genres.filter(g => g.key !== genre.key).map(g => (
            <Link key={g.key} href={`/${city.prefectureKey}/${city.key}/${g.key}`} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12,
              background: "var(--bg-input)", border: "1px solid var(--border)",
              color: "var(--text-muted)", textDecoration: "none",
            }}>{g.name}</Link>
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
