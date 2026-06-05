import Header from "@/components/Header";
import Link from "next/link";
import { REGION_ORDER, getPrefecturesByRegion } from "@/lib/japan";
import { getCitiesByPrefecture } from "@/lib/cities";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "エリアから探す｜NIGHT VISION",
  description: "都道府県からナイトライフ情報を探す。全国のラウンジ・ガールズバー・スナック情報。",
};

export default function MapPage() {
  const regions = getPrefecturesByRegion();
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>エリアから探す</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>都道府県を選んでください</p>
          <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 6 }}>● = 掲載店舗あり</p>
        </div>
        {REGION_ORDER.map(regionName => {
          const prefs = regions[regionName];
          if (!prefs) return null;
          return (
            <div key={regionName} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 8 }}>
                {regionName}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {prefs.map(pref => {
                  const hasContent = getCitiesByPrefecture(pref.key).length > 0;
                  return (
                    <Link key={pref.key} href={`/${pref.key}`} style={{
                      padding: "8px 16px", borderRadius: 20, fontSize: 13,
                      fontWeight: hasContent ? 700 : 500,
                      border: "1px solid " + (hasContent ? "var(--accent)" : "var(--border)"),
                      background: hasContent ? "var(--accent)15" : "var(--bg-input)",
                      color: hasContent ? "var(--accent)" : "var(--text-muted)",
                      textDecoration: "none",
                    }}>
                      {pref.name}{hasContent ? " ●" : ""}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}
