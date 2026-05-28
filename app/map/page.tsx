import Header from "@/components/Header";
import Link from "next/link";
import { PREFECTURES, REGION_ORDER, getPrefecturesByRegion } from "@/lib/japan";
import { CITIES } from "@/lib/cities";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "エリアから探す｜NIGHT VISION",
  description: "都道府県からナイトライフ情報を探す。全国のラウンジ・ガールズバー・スナック情報。",
};

export default function MapPage() {
  const regions = getPrefecturesByRegion();
  const activePrefKeys = new Set(CITIES.map(c => c.prefectureKey));

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
            エリアから探す
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            都道府県を選んでください
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--online)", display: "inline-block" }} />
              掲載あり
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--border)", display: "inline-block" }} />
              準備中
            </span>
          </div>
        </div>

        {REGION_ORDER.map(regionName => {
          const prefs = regions[regionName];
          if (!prefs) return null;
          return (
            <div key={regionName} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 8 }}>
                {regionName}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {prefs.map(pref => {
                  const isActive = activePrefKeys.has(pref.key);
                  return (
                    <Link
                      key={pref.key}
                      href={`/${pref.key}`}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 400,
                        border: `1px solid ${isActive ? "var(--online)" : "var(--border)"}`,
                        background: isActive ? "#10b98115" : "var(--bg-input)",
                        color: isActive ? "var(--online)" : "var(--text-muted)",
                        textDecoration: "none",
                      }}
                    >
                      {pref.name}
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
