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
    title, description,
    keywords: [`${pref.name} キャバクラ`, `${pref.name} ガールズバー`, `${pref.name} スナック`, `${pref.name} ナイトライフ`],
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "NIGHT VISION", type: "website",
      images: [{ url: "https://www.night-vision.jp/icon-512.png", width: 512, height: 512 }] },
    twitter: { card: "summary", title, description },
  };
}

export default function PrefecturePage({ params }: Props) {
  const cityMatch = getCity(params.prefecture);
  if (cityMatch) redirect(`/${cityMatch.prefectureKey}/${cityMatch.key}`);

  const pref = getPrefecture(params.prefecture);
  if (!pref) notFound();

  const activeCities = getCitiesByPrefecture(params.prefecture);
  const activeCityKeys = new Set(activeCities.map(c => c.key));

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/map" style={{ color: "var(--text-muted)", textDecoration: "none" }}>エリア一覧</Link>
          <span>›</span>
          <span>{pref.name}</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {pref.name}のナイトライフ
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            市区町村を選んでください
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {pref.cities.map(city => {
            const isActive = activeCityKeys.has(city.key);
            return (
              <Link
                key={city.key}
                href={`/${pref.key}/${city.key}`}
                style={{
                  padding: "12px 20px",
                  borderRadius: 14,
                  border: `1px solid ${isActive ? "var(--accent)66" : "var(--border)"}`,
                  background: isActive ? "var(--accent)0d" : "var(--bg-input)",
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  textDecoration: "none",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {city.name}
                {isActive && <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>●</span>}
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
