import Link from "next/link";

export default function Header() {
  return (
    <header style={{
      background: "linear-gradient(180deg, #0d0d1f 0%, #08080f 100%)",
      borderBottom: "1px solid #ffffff0a",
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
                background: "linear-gradient(135deg, #ff6b9d, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>KUSHIRO NIGHT VISION</span>
            </div>
            <div style={{ fontSize: 10, color: "#ffffff33", letterSpacing: "0.15em", marginTop: 1 }}>
              釧路ナイトライフ情報
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}