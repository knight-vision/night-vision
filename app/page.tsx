import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShops } from "@/lib/shops";
import type { Metadata } from "next";
import ShopList from "@/components/ShopList";

export const metadata: Metadata = {
  title: "釧路ナイトビジョン｜釧路の飲み屋・スナック・ガールズバー・ラウンジ情報",
  description:
    "釧路の飲み屋・スナック・ガールズバー・ラウンジ・キャバクラ情報ならここ。地域密着のナイトガイドで今夜のお店を見つけよう。",
};

export const revalidate = 60;

export default async function HomePage() {
  const shops = await getShops();
  const onTotal = shops.reduce(
    (a, s) => a + s.casts.filter((c) => c.on_today).length,
    0
  );

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <section style={{ textAlign: "center", padding: "32px 0 28px" }}>
          <h1 style={{
            fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.3,
            background: "linear-gradient(135deg, #ff6b9d, #a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 10,
          }}>
            釧路の夜を、もっと近くに。
          </h1>
          <p style={{ color: "#ffffff66", fontSize: 14, lineHeight: 1.8 }}>
            釧路のスナック・ガールズバー・ラウンジ情報を一か所に。<br />
            地元だから知っている、本当のナイトライフガイド。
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 16, padding: "6px 16px", borderRadius: 20,
            background: "#00ff8812", border: "1px solid #00ff8830",
            fontSize: 13, color: "#00ff88",
          }}>
            <span style={{
              display: "inline-block", width: 7, height: 7, borderRadius: "50%",
              background: "#00ff88", boxShadow: "0 0 6px #00ff88",
            }} />
            現在 {onTotal}名 出勤中
          </div>
        </section>

        {/* ジャンル */}
        <section style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "🥂 ラウンジ",       href: "/lounge",       color: "#ffd700" },
            { label: "🍹 ガールズバー",   href: "/girls-bar",    color: "#00d4ff" },
            { label: "🍶 スナック",       href: "/snack",        color: "#ff6b9d" },
            { label: "🍸 カジュアルバー", href: "/casual-bar",   color: "#a855f7" },
          ].map((cat) => (
            <a key={cat.href} href={cat.href} style={{
              flex: 1, minWidth: 100, padding: "10px 8px", borderRadius: 12,
              textAlign: "center", background: "#ffffff06", border: "1px solid #ffffff12",
              color: cat.color, fontWeight: 700, fontSize: 12, cursor: "pointer",
              textDecoration: "none",
            }}>{cat.label}</a>
          ))}
        </section>

        {/* エリア */}
        <section style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "📍 末広エリア",  href: "/area/suehiro",  color: "#ff6b9d" },
            { label: "📍 愛国エリア",  href: "/area/aikoku",   color: "#00d4ff" },
            { label: "📍 その他エリア", href: "/area/other",   color: "#ffffff55" },
          ].map((area) => (
            <a key={area.href} href={area.href} style={{
              flex: 1, minWidth: 100, padding: "8px 8px", borderRadius: 10,
              textAlign: "center", background: "#ffffff04", border: "1px solid #ffffff0a",
              color: area.color, fontWeight: 600, fontSize: 11, cursor: "pointer",
              textDecoration: "none",
            }}>{area.label}</a>
          ))}
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "釧路ナイトビジョン",
              url: "https://night-vision.jp",
              description: "釧路のスナック・ガールズバー・ラウンジ・飲み屋さん情報サイト",
            }),
          }}
        />

        <ShopList shops={shops} />

        <section style={{
          marginTop: 48, padding: 24,
          background: "#ffffff04", borderRadius: 12, border: "1px solid #ffffff08",
        }}>
          <h2 style={{ color: "#ffffff44", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            釧路のナイトライフ情報
          </h2>
          <p style={{ color: "#ffffff33", fontSize: 12, lineHeight: 2 }}>
            釧路ナイトビジョンは、北海道釧路市のスナック・ガールズバー・ラウンジ・飲み屋の情報を
            地域密着でお届けするナイトガイドです。末広・愛国エリアを中心に、
            初めての方でも安心して入れるお店を厳選して掲載しています。
          </p>
        </section>
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 16px 40px",
        color: "#ffffff22", fontSize: 11,
        borderTop: "1px solid #ffffff08",
      }}>
        © 2026 釧路ナイトビジョン · 掲載・お問い合わせはDMにてどうぞ
      </footer>
    </>
  );
}