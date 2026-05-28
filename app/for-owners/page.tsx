import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "釧路ナイトビジョン｜店舗向けサービス - 無料から始める集客・店舗管理",
  description: "釧路の飲み屋・スナック・ガールズバー・ラウンジオーナー向け。掲載・集客・シフト管理・売上管理まで。全プラン1ヶ月無料。",
  alternates: { canonical: "https://www.night-vision.jp/for-owners" },
};

const PLANS = [
  {
    key: "light",
    name: "フリー",
    price: 0,
    priceLabel: "無料",
    desc: "まず掲載して、集客を始める",
    badge: null,
    color: "#10b981",
    features: [
      "店舗情報・営業時間の掲載",
      "キャスト情報の掲載",
      "シフト希望の受付・確定",
      "出勤カレンダー管理",
      "キャストポータル（シフト確認）",
    ],
    disabled: [
      "売上・伝票管理",
      "給与計算・明細出力",
      "キャスト成績管理",
      "バナー写真掲載",
      "おすすめ優先表示",
    ],
    cta: "無料で始める",
    href: "/join?plan=light",
  },
  {
    key: "standard",
    name: "スタンダード",
    price: 3000,
    priceLabel: "¥3,000",
    desc: "売上・給与をまるごと管理",
    badge: null,
    color: "#a78bfa",
    features: [
      "ライトプランの全機能",
      "伝票入力・日次売上管理",
      "月次売上グラフ・分析",
      "キャスト別売上・成績管理",
      "給与計算・明細PDF出力",
      "CSV・PDFエクスポート",
    ],
    disabled: [
      "バナー写真掲載",
      "おすすめ優先表示",
    ],
    cta: "1ヶ月無料で試す",
    href: "/join?plan=standard",
  },
  {
    key: "premium",
    name: "プレミアム",
    price: 5000,
    priceLabel: "¥5,000",
    desc: "検索上位・目立つ掲載で集客強化",
    badge: null,
    color: "#f472b6",
    features: [
      "ライトプランの全機能",
      "バナー写真・キャスト写真の掲載",
      "おすすめ優先表示",
      "求人情報の掲載",
    ],
    disabled: [
      "売上・伝票管理",
      "給与計算・明細出力",
      "キャスト成績管理",
    ],
    cta: "1ヶ月無料で試す",
    href: "/join?plan=premium",
  },
  {
    key: "pro",
    name: "プロ",
    price: 8000,
    priceLabel: "¥8,000",
    desc: "全機能無制限。これ一つで完結",
    badge: "おすすめ",
    color: "#fbbf24",
    features: [
      "全プランの機能をすべて含む",
      "バナー写真・キャスト写真の掲載",
      "おすすめ優先表示",
      "求人情報の掲載（無制限）",
      "伝票・売上・給与管理",
      "キャスト成績管理・グラフ",
      "CSV・PDFエクスポート",
      "優先サポート",
    ],
    disabled: [],
    cta: "1ヶ月無料で試す",
    href: "/join?plan=pro",
  },
];

export default function ForOwnersPage() {
  const s = {
    page: { background: "#08080f", minHeight: "100vh", fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color: "#e8e0f0", overflowX: "hidden" } as React.CSSProperties,
    nav: { position: "sticky", top: 0, zIndex: 100, background: "rgba(8,8,15,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(124,58,237,0.2)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
    section: (bg?: string): React.CSSProperties => ({ padding: "72px 24px", background: bg || "transparent", borderTop: bg ? "1px solid rgba(124,58,237,0.12)" : "none" }),
    inner: { maxWidth: 640, margin: "0 auto" } as React.CSSProperties,
    eyebrow: { fontSize: 11, color: "#a78bfa", letterSpacing: 4, textAlign: "center", marginBottom: 16 } as React.CSSProperties,
    h2: { fontSize: "clamp(26px,6vw,38px)", fontWeight: 900, textAlign: "center", marginBottom: 40, lineHeight: 1.3 } as React.CSSProperties,
  };

  return (
    <div style={s.page}>

      {/* ナビ */}
      <nav style={s.nav}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🦉</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd", letterSpacing: 3 }}>NIGHT VISION</span>
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/owner/login" style={{ fontSize: 12, color: "rgba(167,139,250,0.7)", textDecoration: "none" }}>ログイン</Link>
          <Link href="/join" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", padding: "8px 20px", borderRadius: 25, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>無料で始める</Link>
        </div>
      </nav>

      {/* ヒーロー */}
      <section style={{ position: "relative", padding: "80px 24px 72px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,0.2) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 85%,rgba(219,39,119,0.12) 0%,transparent 50%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>
          <div style={{ display: "inline-block", fontSize: 12, color: "#a78bfa", letterSpacing: 4, border: "1px solid rgba(167,139,250,0.35)", padding: "6px 20px", borderRadius: 20, marginBottom: 28, background: "rgba(124,58,237,0.1)" }}>
            店舗オーナー様へ
          </div>
          <h1 style={{ fontSize: "clamp(36px,9vw,64px)", fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", marginBottom: 24, color: "#fff" }}>
            釧路の夜を、<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>もっと集客できる</span>
            <br />サービス
          </h1>
          <p style={{ fontSize: "clamp(15px,3.5vw,18px)", color: "rgba(200,190,220,0.75)", lineHeight: 1.9, marginBottom: 40 }}>
            掲載・集客から、シフト管理・売上管理・<br />
            給与計算まで。釧路特化の店舗管理サービス。<br />
            <strong style={{ color: "#e8e0f0" }}>全プラン、1ヶ月無料から。</strong>
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#plans" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", padding: "14px 32px", borderRadius: 30, fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 28px rgba(124,58,237,0.4)" }}>
              プランを見る ↓
            </a>
            <Link href="/" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd", padding: "14px 28px", borderRadius: 30, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
              サイトを見る →
            </Link>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section style={{ ...s.section("rgba(124,58,237,0.05)") }}>
        <div style={s.inner}>
          <div style={s.eyebrow}>FEATURES</div>
          <h2 style={s.h2}>できること</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { icon: "📸", title: "店舗・キャスト掲載", desc: "写真・情報を掲載して検索から集客", plan: "ライト〜" },
              { icon: "📅", title: "シフト管理", desc: "希望受付・確定・出勤カレンダー", plan: "ライト〜" },
              { icon: "📊", title: "売上・伝票管理", desc: "日次〜月次の売上を自動集計・グラフ化", plan: "スタンダード〜" },
              { icon: "💴", title: "給与計算", desc: "キャスト別給与を自動計算・明細出力", plan: "スタンダード〜" },
              { icon: "⭐", title: "キャスト成績管理", desc: "指名・同伴・売上を可視化・比較", plan: "スタンダード〜" },
              { icon: "🔝", title: "優先表示・バナー", desc: "検索上位・おすすめ枠で目立つ掲載", plan: "プレミアム〜" },
              { icon: "💼", title: "求人掲載", desc: "キャスト・スタッフ募集をサイトに掲載", plan: "プレミアム〜" },
              { icon: "💬", title: "LINE通知", desc: "シフト確定・求人応募を即時通知", plan: "フリー〜" },
            ].map(f => (
              <div key={f.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 18, padding: "20px 18px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e0f0", marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(180,170,200,0.65)", lineHeight: 1.7, marginBottom: 8 }}>{f.desc}</div>
                <div style={{ fontSize: 10, color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", display: "inline-block", padding: "2px 8px", borderRadius: 8 }}>{f.plan}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* プラン */}
      <section id="plans" style={s.section()}>
        <div style={s.inner}>
          <div style={s.eyebrow}>PRICING</div>
          <h2 style={s.h2}>プランを選ぶ</h2>
          <div style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 14, padding: "12px 20px", marginBottom: 32, textAlign: "center", fontSize: 14, color: "#c4b5fd" }}>
            🎁 全プラン <strong>1ヶ月無料</strong>でお試しいただけます
          </div>

          {PLANS.map(plan => (
            <div key={plan.key} style={{
              background: plan.badge ? "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(219,39,119,0.08))" : "rgba(255,255,255,0.03)",
              border: `1px solid ${plan.badge ? "rgba(251,191,36,0.4)" : "rgba(167,139,250,0.15)"}`,
              borderRadius: 22, padding: "28px 24px", marginBottom: 16, position: "relative",
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#f59e0b,#db2777)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  ⭐ {plan.badge}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 11, color: plan.color, letterSpacing: 3, marginBottom: 4 }}>{plan.name.toUpperCase()}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>
                    {plan.priceLabel}
                    <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(200,190,220,0.6)", marginLeft: 4 }}>
                      {plan.price === 0 ? "/月" : "/月（税込）"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 28 }}>
                  {plan.key === "light" ? "⭐" : plan.key === "standard" ? "🌙" : plan.key === "premium" ? "💡" : "🌃"}
                </div>
              </div>

              <div style={{ fontSize: 13, color: "rgba(190,180,210,0.65)", marginBottom: 18 }}>{plan.desc}</div>

              <div style={{ marginBottom: 18 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7, fontSize: 13, color: "rgba(210,200,230,0.85)" }}>
                    <span style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                  </div>
                ))}
                {plan.disabled.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7, fontSize: 13, color: "rgba(150,140,170,0.4)" }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>–</span>{f}
                  </div>
                ))}
              </div>

              <Link href={plan.href} style={{
                display: "block", textAlign: "center", padding: "13px",
                background: plan.key === "light"
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : plan.badge ? "linear-gradient(135deg,#f59e0b,#db2777)" : `linear-gradient(135deg,${plan.color}44,${plan.color}22)`,
                border: plan.key === "light" ? "none" : `1px solid ${plan.color}55`,
                borderRadius: 14, fontSize: 14, fontWeight: 700,
                color: (plan.key === "light" || plan.badge) ? "#fff" : plan.color,
                textDecoration: "none",
                boxShadow: plan.key === "light" ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
              }}>
                {plan.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ステップ */}
      <section style={s.section("rgba(124,58,237,0.05)")}>
        <div style={s.inner}>
          <div style={s.eyebrow}>HOW TO START</div>
          <h2 style={s.h2}>始め方</h2>
          {[
            { n: "01", title: "プランを選ぶ", desc: "まずはライト（無料）でOK。あとからいつでも変更できます。" },
            { n: "02", title: "お店を検索・選択", desc: "すでに掲載中のお店は名前で検索してすぐ紐付けできます。" },
            { n: "03", title: "メール・PW登録のみ", desc: "名前・電話番号不要。5分で管理画面が使えます。" },
            { n: "04", title: "情報を充実させる", desc: "写真・キャスト情報・営業時間などを入力して集客スタート。" },
          ].map(s2 => (
            <div key={s2.n} style={{ display: "flex", gap: 20, marginBottom: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.13)", borderRadius: 18, padding: "20px" }}>
              <div style={{ width: 48, height: 48, flexShrink: 0, background: "linear-gradient(135deg,#7c3aed,#db2777)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>{s2.n}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0f0", marginBottom: 4 }}>{s2.title}</div>
                <div style={{ fontSize: 13, color: "rgba(190,180,210,0.7)", lineHeight: 1.7 }}>{s2.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 最終CTA */}
      <section style={{ padding: "72px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 20 }}>🦉</div>
        <h2 style={{ fontSize: "clamp(24px,5vw,34px)", fontWeight: 900, marginBottom: 14, lineHeight: 1.4 }}>今夜から始めませんか</h2>
        <p style={{ fontSize: 14, color: "rgba(200,190,220,0.65)", lineHeight: 1.9, marginBottom: 36 }}>
          釧路で一番使われる店舗情報サービスを目指しています。<br />
          まずは無料のライトプランから。
        </p>
        <Link href="/join" style={{ display: "block", maxWidth: 340, margin: "0 auto 14px", background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", padding: "17px", borderRadius: 30, fontSize: 16, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 36px rgba(124,58,237,0.38)" }}>
          無料で店舗会員登録する →
        </Link>
        <div style={{ fontSize: 12, color: "rgba(150,140,170,0.45)" }}>
          ご不明な点は <a href="mailto:info@night-vision.jp" style={{ color: "#a78bfa" }}>info@night-vision.jp</a> まで
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(124,58,237,0.12)", padding: "20px 24px", textAlign: "center", fontSize: 12, color: "rgba(150,140,170,0.4)" }}>
        <Link href="/" style={{ color: "rgba(167,139,250,0.5)", textDecoration: "none", marginRight: 20 }}>← サイトトップ</Link>
        © 2025 釧路ナイトビジョン
      </footer>
    </div>
  );
}
