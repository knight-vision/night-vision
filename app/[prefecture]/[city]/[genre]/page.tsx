import Header from "@/components/Header";
import OwnerCTA from "@/components/OwnerCTA";
import ShopList from "@/components/ShopList";
import Link from "next/link";
import { getShopsByCityAndType } from "@/lib/shops";
import { getCityByPrefecture, getGenre, PREFECTURE_NAMES, getGenresForPrefecture } from "@/lib/cities";
import { getGenreSeo } from "@/lib/seo-content";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { prefecture: string; city: string; genre: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCityByPrefecture(params.prefecture, params.city);
  const genre = getGenre(params.genre);
  if (!city || !genre) return {};
  const cityName = city.displayName || city.name;
  // 「その他」を除いた繁華街・エリア名
  const areaNames = city.areas.filter(a => a.key !== "other").map(a => a.name);
  const areaText = areaNames.length > 0 ? `${areaNames.join("・")}など${cityName}各エリアの` : `${cityName}の`;
  const title = `${cityName}の${genre.name}一覧｜料金・出勤情報｜NIGHT VISION`;
  const description = `${areaText}${genre.name}を検索。キャスト・料金・本日の出勤情報を毎日更新。`;
  const url = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}/${genre.key}`;
  // エリア × 業種のロングテールキーワード（例: 「歌舞伎町 キャバクラ」「すすきの ガールズバー」）
  const areaKeywords = areaNames.map(a => `${a} ${genre.name}`);
  return {
    title, description,
    keywords: [
      `${cityName} ${genre.name}`, `${cityName} ${genre.name} 求人`, `${cityName} ${genre.name} 料金`,
      ...areaKeywords,
    ],
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

  const cityName = city.displayName || city.name;
  const pageUrl = `https://www.night-vision.jp/${city.prefectureKey}/${city.key}/${genre.key}`;
  const areaNames = city.areas.filter(a => a.key !== "other").map(a => a.name);
  const areaText = areaNames.join("・");

  // SEO本文・FAQ
  const seo = getGenreSeo(genre.key);
  const seoCtx = { cityName, prefecture: city.prefecture, genreName: genre.name, areaText, shopCount: shops.length };
  const seoParagraphs = seo ? seo.paragraphs(seoCtx) : [];
  const faqItems = seo ? seo.faq(seoCtx) : [];

  // 構造化データ（パンくず・FAQ・店舗リスト）
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TOP", item: "https://www.night-vision.jp" },
          { "@type": "ListItem", position: 2, name: prefName, item: `https://www.night-vision.jp/${params.prefecture}` },
          { "@type": "ListItem", position: 3, name: cityName, item: `https://www.night-vision.jp/${city.prefectureKey}/${city.key}` },
          { "@type": "ListItem", position: 4, name: genre.name, item: pageUrl },
        ],
      },
      ...(faqItems.length > 0 ? [{
        "@type": "FAQPage",
        mainEntity: faqItems.map(f => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }] : []),
      ...(shops.length > 0 ? [{
        "@type": "ItemList",
        name: `${cityName}の${genre.name}一覧`,
        numberOfItems: shops.length,
        itemListElement: shops.slice(0, 30).map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://www.night-vision.jp/shop/${(s as any).slug}`,
          name: s.name,
        })),
      }] : []),
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

        {/* SEO本文（独自説明文） */}
        {seoParagraphs.length > 0 && (
          <section style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>
              {cityName}の{genre.name}について
            </h2>
            {seoParagraphs.map((p, i) => (
              <p key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 2, marginBottom: 14 }}>
                {p}
              </p>
            ))}
          </section>
        )}

        {/* FAQ */}
        {faqItems.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>
              よくある質問
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {faqItems.map((f, i) => (
                <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                    Q. {f.q}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    A. {f.a}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <OwnerCTA />
    </>
  );
}
