import Link from "next/link";

// 地域ページ下部に表示する「店舗オーナーの方へ」導線
export default function OwnerCTA() {
  return (
    <section style={{
      maxWidth: 720, margin: "40px auto 0", padding: "0 16px",
    }}>
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: 18, padding: "28px 24px",
        background: "linear-gradient(135deg, rgba(232,180,200,0.10), rgba(196,168,240,0.08))",
        border: "1px solid var(--border)",
        textAlign: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle at 20% 0%, rgba(232,180,200,0.18), transparent 55%), radial-gradient(circle at 90% 100%, rgba(196,168,240,0.14), transparent 55%)",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: "var(--accent2)", marginBottom: 8 }}>
            FOR SHOP OWNERS
          </div>
          <h2 style={{
            fontSize: 19, fontWeight: 900, color: "var(--text-primary)",
            letterSpacing: "-0.01em", marginBottom: 8, lineHeight: 1.5,
          }}>
            お店を掲載しませんか？
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 20 }}>
            無料で掲載スタート。集客・シフト管理・売上管理まで、お店の運営をまるごとサポートします。
          </p>
          <Link href="/for-owners" style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 999,
            background: "linear-gradient(135deg, #e8b4c8, #c4a8f0)", color: "#1a1126",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            店舗会員登録・掲載お申し込み →
          </Link>
        </div>
      </div>
    </section>
  );
}
