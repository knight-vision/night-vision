import Header from "@/components/Header";
import ShopList from "@/components/ShopList";
import Link from "next/link";
import { getShopsByCityAndType } from "@/lib/shops";
import { getCityByPrefecture, getGenre, PREFECTURE_NAMES, getGenresForPrefecture } from "@/lib/cities";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { prefecture: string; city: string; genre: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCityByPrefecture(params.prefecture, params.city);
  const genre = getGenre(params.genre);
  if (!city || !genre) return {};
  const title = `${city.name}の${genre.name}一覧｜料金・出勤情報｜NIGHT VISION`;
  const description = `${city.name}の${genre.name}を検索。キャスト・料金・本日の出勤情報を毎日更新。`;
  const url = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}/${genre.key}`;
  return {
    title, description,
    keywords: [`${city.name} ${genre.name}`, `${city.name} ${genre.name} 求人`, `${city.name} ${genre.name} 料金`],
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "NIGHT VISION", type: "website",
      images: [{ url: "https://www.night-vision.jp/icon-512.png", width: 512, height: 512 }] },
    twitter: { card: "summary", title, description },
  };
}

export default async function CityGenrePage({ params }: Props) {
  const city = getCityByPrefecture(params.prefecture, params.city);
  const genre = getGenre(params.genre);
  if (!city || !genre) notFound();

  const shops = await getShopsByCityAndType(city.key, genre.dbType);
  const prefName = PREFECTURE_NAMES[params.prefecture] || params.prefecture;
  const genres = getGenresForPrefecture(params.prefecture);

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>TOP</Link>
          <span>›</span>
          <Link href={`/${params.prefecture}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>{prefName}</Link>
          <span>›</span>
          <Link href={`/${city.prefectureKey}/${city.key}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>{city.name}</Link>
          <span>›</span>
          <span>{genre.name}</span>
        </div>

        <section style={{ textAlign: "center", padding: "16px 0 24px" }}>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 6 }}>{genre.englishLabel}</div>
          <h1 style={{
            fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8,
          }}>{city.name}の{genre.name}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
            {city.name}の{genre.name} {shops.length}件掲載中。
          </p>
        </section>

        {/* 他業種ナビ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Link href={`/${city.prefectureKey}/${city.key}`} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12,
            background: "var(--bg-input)", border: "1px solid var(--border)",
            color: "var(--text-muted)", textDecoration: "none",
          }}>← すべて</Link>
          {genres.filter(g => g.key !== genre.key).map(g => (
            <Link key={g.key} href={`/${city.prefectureKey}/${city.key}/${g.key}`} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12,
              background: "var(--bg-input)", border: "1px solid var(--border)",
              color: "var(--text-muted)", textDecoration: "none",
            }}>{g.name}</Link>
          ))}
        </div>

        {shops.length === 0
          ? <p style={{ color: "var(--text-hint)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>現在掲載中の店舗はありません。</p>
          : <ShopList shops={shops} defaultType={genre.dbType} hideTypeFilter={true} />
        }
      </main>
    </>
  );
}
