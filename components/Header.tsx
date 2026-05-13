import Link from "next/link";

export default function Header() {
  return (
    <header style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "16px 20px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.05em" }}>
              <span style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>KUSHIRO NIGHT VISION</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginTop: 1 }}>
              釧路ナイトビジョン
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}