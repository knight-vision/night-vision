"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push("/");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  return (
    <header style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "12px 20px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div onClick={handleLogoClick} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10 }}>
          {/* フクロウロゴ */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="36" height="36">
            <defs>
              <linearGradient id="hbody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 1 }}/>
                <stop offset="100%" style={{ stopColor: "var(--accent2)", stopOpacity: 1 }}/>
              </linearGradient>
              <linearGradient id="heye" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#ffd700", stopOpacity: 1 }}/>
                <stop offset="100%" style={{ stopColor: "#ff9900", stopOpacity: 1 }}/>
              </linearGradient>
            </defs>

            {/* ボディ */}
            <ellipse cx="16" cy="22" rx="8" ry="8" fill="url(#hbody)" opacity="0.2"/>
            {/* 頭 */}
            <ellipse cx="16" cy="15" rx="8" ry="7.5" fill="var(--bg-card)"/>
            <ellipse cx="16" cy="15" rx="7.5" ry="7" fill="none" stroke="url(#hbody)" strokeWidth="1"/>
            {/* 耳羽 */}
            <path d="M10 9 L8 4 L12 8Z" fill="url(#hbody)"/>
            <path d="M22 9 L24 4 L20 8Z" fill="url(#hbody)"/>
            {/* 左目 */}
            <circle cx="12.5" cy="14.5" r="3.5" fill="var(--bg)"/>
            <circle cx="12.5" cy="14.5" r="3.2" fill="none" stroke="url(#heye)" strokeWidth="0.8"/>
            <circle cx="12.5" cy="14.5" r="2" fill="url(#heye)" opacity="0.9"/>
            <circle cx="12.5" cy="14.5" r="1.1" fill="var(--bg)"/>
            <circle cx="13.2" cy="13.8" r="0.5" fill="#fff" opacity="0.9"/>
            {/* 右目 */}
            <circle cx="19.5" cy="14.5" r="3.5" fill="var(--bg)"/>
            <circle cx="19.5" cy="14.5" r="3.2" fill="none" stroke="url(#heye)" strokeWidth="0.8"/>
            <circle cx="19.5" cy="14.5" r="2" fill="url(#heye)" opacity="0.9"/>
            <circle cx="19.5" cy="14.5" r="1.1" fill="var(--bg)"/>
            <circle cx="20.2" cy="13.8" r="0.5" fill="#fff" opacity="0.9"/>
            {/* くちばし */}
            <path d="M14.8 18.5 L16 20.5 L17.2 18.5Z" fill="#ffd700" opacity="0.8"/>
          </svg>

          <div>
            <div style={{
              fontSize: 18, fontWeight: 900, letterSpacing: "0.05em",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>KUSHIRO NIGHT VISION</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginTop: 1 }}>
              釧路ナイトビジョン
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}