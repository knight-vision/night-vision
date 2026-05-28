import Header from "@/components/Header";
import ShopList from "@/components/ShopList";
import { getShops } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NIGHT VISION｜釧路の飲み屋・キャバクラ・スナック・ガールズバー・ラウンジ情報",
  description: "釧路の飲み屋・キャバクラ・スナック・ガールズバー・ラウンジ情報ならナイトビジョン。末広・愛国エリアの全店舗を掲載。今夜行きたいお店がすぐ見つかる釧路ナイトライフガイド。",
  keywords: ["釧路 飲み屋", "釧路 キャバクラ", "釧路 スナック", "釧路 ガールズバー", "釧路 ラウンジ", "釧路 ニュークラ", "末広 スナック", "釧路 夜遊び", "釧路 ナイトライフ", "釧路 バー"],
  alternates: { canonical: "https://www.night-vision.jp" },
  openGraph: {
    title: "NIGHT VISION｜釧路の飲み屋・キャバクラ・スナック情報",
    description: "釧路の飲み屋・キャバクラ・スナック・ガールズバー・ラウンジ情報。末広・愛国エリア全店舗掲載。",
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

        <ShopList shops={shops} areas={[
          { label: "📍 末広", value: "末広" },
          { label: "📍 愛国", value: "愛国" },
          { label: "📍 その他", value: "その他" },
        ]} />

        <section style={{ textAlign: "center", padding: "32px 0 28px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 300, height: 200, background: "radial-gradient(ellipse, #ff6b9d12 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            釧路のナイトライフ情報
          </h2>
          <p style={{ color: "var(--text-hint)", fontSize: 12, lineHeight: 2 }}>
            NIGHT VISIONは、北海道釧路市のスナック・ガールズバー・ラウンジ・飲み屋の情報を
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
            釧路の飲み屋・キャバクラ・スナック情報ガイド
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 2, marginBottom: 16 }}>
            NIGHT VISIONは、北海道釧路市の飲み屋・キャバクラ・スナック・ガールズバー・ラウンジ・ニュークラブなど夜のお店情報を一か所にまとめたナイトライフガイドです。末広エリア・愛国エリアを中心に、地元で人気のお店を厳選して掲載しています。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { href: "/hokkaido/kushiro/snack", label: "釧路のスナック一覧", desc: "アットホームな雰囲気のスナック" },
              { href: "/hokkaido/kushiro/girls-bar", label: "釧路のガールズバー一覧", desc: "気軽に入れるガールズバー" },
              { href: "/hokkaido/kushiro/lounge", label: "釧路のラウンジ・ニュークラ", desc: "上質な時間を過ごせるお店" },
              { href: "/hokkaido/kushiro/casual-bar", label: "釧路のカジュアルバー一覧", desc: "一人でも入りやすいバー" },
              { href: "/hokkaido/kushiro/area/suehiro", label: "末広エリアの飲み屋", desc: "釧路最大の繁華街" },
              { href: "/hokkaido/kushiro/area/aikoku", label: "愛国エリアの飲み屋", desc: "地元に根付いたお店が集まるエリア" },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                display: "block", padding: "12px 14px",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, textDecoration: "none",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.desc}</div>
              </a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.9 }}>
            「釧路 飲み屋」「釧路 キャバクラ」「釧路 スナック」などでお探しの方はぜひご活用ください。各店舗のキャスト情報・営業時間・予算目安・アクセスを掲載しています。掲載情報は随時更新しています。
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