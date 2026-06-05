import Header from "@/components/Header";
import OwnerCTA from "@/components/OwnerCTA";
import ShopList from "@/components/ShopList";
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
  const cityName = city.displayName || city.name;
  // 「その他」を除いた繁華街・エリア名（例: 釧路→末広・愛国、札幌→すすきの・大通…）
  const areaNames = city.areas.filter(a => a.key !== "other").map(a => a.name);
  const areaText = areaNames.length > 0 ? `${areaNames.join("・")}など` : "";
  const title = `${cityName}ナイトビジョン｜${cityName}の${genres[0].name}・ガールズバー・スナック情報`;
  const description = `${cityName}ナイトビジョンは、${city.prefecture}${cityName}（${areaText}）の${genres.map(g=>g.name).join("・")}情報を掲載。${city.description}`;
  const url = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}`;
  // エリア名 × 主要業種のロングテールキーワード（例: 「歌舞伎町 キャバクラ」「すすきの スナック」）
  const areaKeywords = areaNames.flatMap(a => [`${a} キャバクラ`, `${a} スナック`, `${a} ガールズバー`, `${a} 飲み屋`, `${a} ${cityName}`]);
  return {
    title, description,
    keywords: [
      `${cityName}ナイトビジョン`, `${cityName} ナイトビジョン`,
      `${cityName} キャバクラ`, `${cityName} ガールズバー`, `${cityName} スナック`, `${cityName} ラウンジ`, `${cityName} 夜遊び`,
      ...areaKeywords,
    ],
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "NIGHT VISION", type: "website",
      images: [{ url: "https://www.night-vision.jp/icon-512.png", width: 512, height: 512 }] },
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

  const cityName = city.displayName || city.name;
  const pageUrl = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}`;
  // 「その他」を除いた繁華街・エリア名
  const areaNames = city.areas.filter(a => a.key !== "other").map(a => a.name);

  // 構造化データ：このページが「○○ナイトビジョン」というサイト/コレクションであることを明示
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${pageUrl}#website`,
        name: `${cityName}ナイトビジョン`,
        alternateName: [`${cityName} NIGHT VISION`, "NIGHT VISION", "ナイトビジョン"],
        url: pageUrl,
        inLanguage: "ja",
        description: `${city.prefecture}${cityName}の${genres.map(g => g.name).join("・")}情報を掲載するナイトライフガイド。`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TOP", item: "https://www.night-vision.jp" },
          { "@type": "ListItem", position: 2, name: prefName, item: `https://www.night-vision.jp/${params.prefecture}` },
          { "@type": "ListItem", position: 3, name: cityName, item: pageUrl },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `${cityName}ナイトビジョン｜${cityName}の${genres[0].name}・ガールズバー・スナック情報`,
        url: pageUrl,
        about: {
          "@type": "Place",
          name: `${city.prefecture}${cityName}`,
          // 主要な繁華街・エリアを所属場所として明示（例: 歌舞伎町、すすきの、末広）
          ...(areaNames.length > 0 ? {
            containsPlace: areaNames.map(a => ({ "@type": "Place", name: `${cityName}${a}` })),
          } : {}),
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        {/* パンくず */}
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>TOP</Link>
          <span>›</span>
          <Link href={`/${params.prefecture}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>{prefName}</Link>
          <span>›</span>
          <span>{city.name}</span>
        </div>

        {/* ヒーロー */}
        <section style={{ textAlign: "center", padding: "24px 0 28px" }}>
          <h1 style={{
            fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.3,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10,
          }}>
            {city.name}の夜、今日どこ行く？
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
            {city.description}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: "掲載店舗", value: shops.length, unit: "件" },
              { label: "出勤中", value: onCount, unit: "名" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
                  {s.value}<span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2 }}>{s.unit}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

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

        {/* 店舗一覧（検索・並び替え付き） */}
        {shops.length === 0
          ? <p style={{ color: "var(--text-hint)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>現在掲載中の店舗はありません。</p>
          : <ShopList shops={shops} />
        }

        {/* SEO用テキスト（控えめ表示・エリア名を含む） */}
        {areaNames.length > 0 && (
          <p style={{ color: "var(--text-hint)", fontSize: 11, lineHeight: 1.9, marginTop: 32, textAlign: "center" }}>
            {cityName}ナイトビジョンでは、{areaNames.join("・")}エリアを中心に
            {city.prefecture}{cityName}の{genres.map(g => g.name.split("/")[0]).join("・")}・スナック・ガールズバーなど
            夜のお店情報を掲載しています。
          </p>
        )}
      </main>
      <OwnerCTA />
    </>
  );
}
