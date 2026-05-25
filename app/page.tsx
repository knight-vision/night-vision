import Header from "@/components/Header";
import ShopList from "@/components/ShopList";
import { getShops } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路ナイトビジョン｜釧路の飲み屋・スナック・ガールズバー・ラウンジ情報",
  description: "釧路の飲み屋・スナック・ガールズバー・ラウンジ・キャバクラ情報ならここ。地域密着のナイトガイドで今夜のお店を見つけよう。",
  alternates: { canonical: "https://www.night-vision.jp" },
};

export const revalidate = 60;

export default async function HomePage() {
  const shops = await getShops();
  const onTotal = shops.reduce((a, s) => a + s.casts.filter((c) => c.on_today).length, 0);

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
            釧路の夜、今日どこ行く？
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
            釧路のスナック・ガールズバー・ラウンジ情報を一か所に。<br />
            地元を知り尽くす、本当のナイトライフガイド。
          </p>

          {/* 統計バッジ */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "掲載店舗", value: shops.length, unit: "件" },
              { label: "エリア", value: "2", unit: "区域" },
              { label: "ジャンル", value: "4", unit: "種類" },
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

        <ShopList shops={shops} />

        <section style={{ textAlign: "center", padding: "32px 0 28px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 300, height: 200, background: "radial-gradient(ellipse, #ff6b9d12 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            釧路のナイトライフ情報
          </h2>
          <p style={{ color: "var(--text-hint)", fontSize: 12, lineHeight: 2 }}>
            釧路ナイトビジョンは、北海道釧路市のスナック・ガールズバー・ラウンジ・飲み屋の情報を
            地域密着でお届けするナイトガイドです。末広・愛国エリアを中心に、
            初めての方でも安心して入れるお店を厳選して掲載しています。
          </p>
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
            釧路ナイトビジョンに掲載して集客アップ。<br />
            フリープランは無料で始められます。
          </p>
          <a href="/apply" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            color: "#fff", padding: "10px 28px", borderRadius: 25,
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            掲載申し込みはこちら →
          </a>
        </section>
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 16px 40px",
        color: "var(--text-hint)", fontSize: 11,
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          <a href="/ranking" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>⭐ ランキング</a>
          <a href="/apply" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>掲載申し込み</a>
          <a href="/report" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>🚨 店舗情報の報告</a>
          <a href="/contact" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>お問い合わせ</a>
        </div>
        <div>© 2025 釧路ナイトビジョン · 掲載情報は公開情報をもとに作成しています</div>
      </footer>
    </>
  );
}