import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import Link from "next/link";
import { getShopsByCity } from "@/lib/shops";
import { getCityByPrefecture, PREFECTURE_NAMES, getGenresForPrefecture } from "@/lib/cities";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { prefecture: string; city: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCityByPrefecture(params.prefecture, params.city);
  if (!city) return {};
  const genres = getGenresForPrefecture(params.prefecture);
  const genreNames = genres.map(g => g.name).join("・");
  const title = `${city.name}の${genres[0].name}・ガールズバー・スナック一覧｜NIGHT VISION`;
  const description = `${city.name}の${genreNames}情報を掲載。${city.description}料金・キャスト情報・出勤情報を毎日更新。`;
  const url = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}`;
  return {
    title,
    description,
    keywords: [
      `${city.name} キャバクラ`, `${city.name} ガールズバー`, `${city.name} スナック`,
      `${city.name} ラウンジ`, `${city.name} 夜遊び`, `${city.name} ナイトライフ`,
      `${city.name} キャバ 求人`, `${city.name} 飲み屋`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title, description, url,
      siteName: "NIGHT VISION",
      type: "website",
      images: [{ url: "https://www.night-vision.jp/icon-512.png", width: 512, height: 512 }],
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function CityPage({ params }: Props) {
  const city = getCityByPrefecture(params.prefecture, params.city);
  if (!city) notFound();

  const shops = await getShopsByCity(city.key);
  const onCount = shops.reduce((a, s) => a + s.casts.filter(c => c.on_today).length, 0);
  const prefName = PREFECTURE_NAMES[params.prefecture] || params.prefecture;
  const genres = getGenresForPrefecture(params.prefecture);

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        {/* パンくず */}
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6, alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>TOP</Link>
          <span>›</span>
          <span>{prefName}</span>
          <span>›</span>
          <span>{city.name}</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 6 }}>
            {prefName} / NIGHT VISION
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {city.name}のナイトライフ
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            {city.name} {shops.length}店舗掲載中。{onCount > 0 && `現在 ${onCount}名が出勤中。`}
          </p>
        </div>

        {/* 業種ナビ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {genres.map(g => (
            <Link key={g.key} href={`/${city.prefectureKey}/${city.key}/${g.key}`} style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", textDecoration: "none",
            }}>{g.name}</Link>
          ))}
        </div>

        {/* エリアナビ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {city.areas.map(a => (
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
