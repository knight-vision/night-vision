import Header from "@/components/Header";
import Link from "next/link";
import { getShops } from "@/lib/shops";
import { CITIES, getGenresForPrefecture } from "@/lib/cities";
import { REGION_ORDER, getPrefecturesByRegion } from "@/lib/japan";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NIGHT VISION｜全国のキャバクラ・ガールズバー・スナック・ラウンジ情報",
  description: "全国のキャバクラ・ガールズバー・スナック・ラウンジ情報ならナイトビジョン。札幌・新宿・六本木・釧路など各エリアのナイトライフ情報を掲載。今夜行きたいお店がすぐ見つかる夜遊びガイド。",
  keywords: ["キャバクラ", "ガールズバー", "スナック", "ラウンジ", "ナイトライフ", "夜遊び", "札幌 キャバクラ", "新宿 キャバクラ", "六本木 ラウンジ", "釧路 スナック"],
  alternates: { canonical: "https://www.night-vision.jp" },
  openGraph: {
    title: "NIGHT VISION｜全国のキャバクラ・ガールズバー・スナック情報",
    description: "全国のキャバクラ・ガールズバー・スナック・ラウンジ情報。各エリアのナイトライフを掲載。",
    url: "https://www.night-vision.jp",
    siteName: "NIGHT VISION",
    locale: "ja_JP",
    type: "website",
  },
};

export const revalidate = 60;

export default async function HomePage() {
  const shops = await getShops();
  const onTotal = shops.reduce((a, s) => a + s.casts.filter((c) => c.on_today).length, 0);

  // 掲載都市ごとの店舗数を集計
  const cityShopCount: Record<string, number> = {};
  for (const s of shops as any[]) {
    const c = s.city || "kushiro";
    cityShopCount[c] = (cityShopCount[c] || 0) + 1;
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <section style={{ textAlign: "center", padding: "32px 0 28px" }}>
          <h1 style={{
            fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.3,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 10,
          }}>
            今夜、どこ行く？
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
            全国のキャバクラ・ガールズバー・スナック・ラウンジ情報を一か所に。<br />
            その街を知り尽くす、本当のナイトライフガイド。
          </p>

          {/* 統計バッジ */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "掲載店舗", value: shops.length, unit: "件" },
              { label: "掲載エリア", value: CITIES.length, unit: "都市" },
              { label: "出勤中", value: onTotal, unit: "名" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "8px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
                  {s.value}<span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2 }}>{s.unit}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 掲載エリアから探す */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
            エリアから探す
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {CITIES.map(city => (
              <Link key={city.key} href={`/${city.prefectureKey}/${city.key}`} style={{
                display: "block", padding: "14px 16px",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 12, textDecoration: "none",
              }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
                  {city.displayName || city.name}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                    {city.prefecture}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--accent)" }}>
                  {cityShopCount[city.key] ? `${cityShopCount[city.key]}件掲載中` : "掲載店舗募集中"}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <Link href="/map" style={{
              display: "inline-block", padding: "8px 20px", borderRadius: 20,
              fontSize: 13, fontWeight: 600, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: "var(--text-secondary)", textDecoration: "none",
            }}>
              🗾 全国の都道府県から探す →
            </Link>
          </div>
        </section>

        <section style={{
          marginTop: 24,
          background: "linear-gradient(135deg, var(--accent)15, var(--accent2)15)",
          border: "1px solid var(--accent)33",
          borderRadius: 16, padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>🌃</div>
          <h2 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
            お店を掲載しませんか？
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
            NIGHT VISIONに掲載して集客アップ。<br />
            フリープランは無料で始められます。
          </p>
          <a href="/for-owners" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            color: "#fff", padding: "10px 28px", borderRadius: 25,
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            店舗会員登録はこちら →
          </a>
        </section>
      </main>

      {/* SEOテキストブロック */}
      <section style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 40px" }}>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
            全国のキャバクラ・ガールズバー・スナック情報ガイド
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 2, marginBottom: 16 }}>
            NIGHT VISIONは、全国のキャバクラ・ガールズバー・スナック・ラウンジ・ニュークラブなど夜のお店情報を一か所にまとめたナイトライフガイドです。北海道釧路市からスタートし、札幌・新宿・六本木・上野・立川・帯広など各エリアへ展開中。地元で人気のお店を厳選して掲載しています。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {CITIES.slice(0, 6).map(city => {
              const g = getGenresForPrefecture(city.prefectureKey)[0];
              return (
                <a key={city.key} href={`/${city.prefectureKey}/${city.key}`} style={{
                  display: "block", padding: "12px 14px",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 10, textDecoration: "none",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
                    {city.displayName || city.name}ナイトビジョン
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{city.prefecture}の{g.name.split("/")[0]}・スナック・ガールズバー情報</div>
                </a>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.9 }}>
            「キャバクラ」「ガールズバー」「スナック」などでお探しの方はぜひご活用ください。各店舗のキャスト情報・営業時間・予算目安・アクセスを掲載しています。掲載情報は随時更新しています。
          </p>
        </div>
      </section>

      <footer style={{
        textAlign: "center", padding: "24px 16px 40px",
        color: "var(--text-hint)", fontSize: 11,
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          <a href="/ranking" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>⭐ ランキング</a>
          <a href="/for-owners" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>掲載お申し込み</a>
          <a href="/report" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>🚨 店舗情報の報告</a>
          <a href="/contact" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>お問い合わせ</a>
        </div>
        <div>© 2025 NIGHT VISION · 掲載情報は公開情報をもとに作成しています</div>
      </footer>
    </>
  );
}
