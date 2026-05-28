import Header from "@/components/Header";
import Link from "next/link";
import { getPrefecture } from "@/lib/japan";
import { getCitiesByPrefecture, getCity } from "@/lib/cities";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: { prefecture: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pref = getPrefecture(params.prefecture);
  if (!pref) return {};
  const title = `${pref.name}のキャバクラ・ガールズバー・スナック情報｜NIGHT VISION`;
  const description = `${pref.name}のナイトライフ情報。${pref.cities.slice(0,5).map(c=>c.name).join("・")}などのキャバクラ・ガールズバー・スナック・ラウンジを掲載。`;
  const url = `https://www.night-vision.jp/${pref.key}`;
  return {
    title,
    description,
    keywords: [`${pref.name} キャバクラ`, `${pref.name} ガールズバー`, `${pref.name} スナック`, `${pref.name} ナイトライフ`],
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "NIGHT VISION", type: "website",
      images: [{ url: "https://www.night-vision.jp/icon-512.png", width: 512, height: 512 }] },
    twitter: { card: "summary", title, description },
  };
}

export default function PrefecturePage({ params }: Props) {
  // /kushiro のように都市キーが来た場合は /hokkaido/kushiro にリダイレクト
  const cityMatch = getCity(params.prefecture);
  if (cityMatch) redirect(`/${cityMatch.prefectureKey}/${cityMatch.key}`);

  const pref = getPrefecture(params.prefecture);
  if (!pref) notFound();

  // cities.tsに登録済みの都市（掲載あり）
  const activeCities = getCitiesByPrefecture(params.prefecture);
  const activeCityKeys = new Set(activeCities.map(c => c.key));

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>TOP</Link>
          <span>›</span>
          <span>{pref.name}</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {pref.name}のナイトライフ
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            {pref.name}の繁華街・歓楽街情報。市区町村からエリアを選んでください。
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pref.cities.map(city => {
            const isActive = activeCityKeys.has(city.key);
            return (
              <div key={city.key} style={{
                background: "var(--bg-card)", border: `1px solid ${isActive ? "var(--accent)44" : "var(--border)"}`,
                borderRadius: 14, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isActive ? 8 : 0 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{city.name}</span>
                    {isActive && (
                      <Link href={`/${pref.key}/${city.key}`} style={{
                        marginLeft: 10, fontSize: 11, color: "var(--accent)",
                        border: "1px solid var(--accent)44", padding: "2px 10px",
                        borderRadius: 10, textDecoration: "none",
                      }}>掲載あり →</Link>
                    )}
                  </div>
                </div>
                {city.areas && city.areas.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {city.areas.map(area => (
                      <span key={area} style={{
                        fontSize: 11, color: "var(--text-muted)",
                        background: "var(--bg-input)", padding: "2px 8px", borderRadius: 8,
                      }}>📍 {area}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
