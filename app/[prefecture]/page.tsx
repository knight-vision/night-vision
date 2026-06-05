import Header from "@/components/Header";
import OwnerCTA from "@/components/OwnerCTA";
import Link from "next/link";
import { getPrefecture } from "@/lib/japan";
import { getCity, getCityByPrefecture } from "@/lib/cities";
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

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/map" style={{ color: "var(--text-muted)", textDecoration: "none" }}>エリア一覧</Link>
          <span>›</span>
          <span>{pref.name}</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            {pref.name}のナイトライフ
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>市区町村を選んでください</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {pref.cities.map(city => {
            const configured = !!getCityByPrefecture(pref.key, city.key);
            if (configured) {
              return (
                <Link key={city.key} href={`/${pref.key}/${city.key}`} style={{
                  padding: "9px 18px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid var(--border)", background: "var(--bg-input)",
                  color: "var(--text-secondary)", textDecoration: "none",
                }}>
                  {city.name}
                </Link>
              );
            }
            // 未掲載の市区町村（準備中）
            return (
              <span key={city.key} style={{
                padding: "9px 18px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: "1px dashed var(--border)", background: "transparent",
                color: "var(--text-hint)", cursor: "default",
              }}>
                {city.name}<span style={{ fontSize: 10, marginLeft: 4 }}>準備中</span>
              </span>
            );
          })}
        </div>
      </main>
      <OwnerCTA />
    </>
  );
}
