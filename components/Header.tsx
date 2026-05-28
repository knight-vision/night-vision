"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { getPrefecture } from "@/lib/japan";
import { getCityByPrefecture } from "@/lib/cities";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // /[prefecture]/[city]/... の場合に都市・エリア名を取得
  const segments = pathname.split("/").filter(Boolean);
  const prefKey = segments[0];
  const cityKey = segments[1];

  const genreKeys = ["lounge","girls-bar","snack","casual-bar","area"];
  const cityConfig = (prefKey && cityKey && !genreKeys.includes(cityKey))
    ? getCityByPrefecture(prefKey, cityKey) : null;

  // cities.tsにない都市はjapan.tsから検索
  const japanPref = prefKey ? getPrefecture(prefKey) : null;
  const japanCity = (!cityConfig && japanPref && cityKey && !genreKeys.includes(cityKey))
    ? japanPref.cities.find(c => c.key === cityKey) : null;

  // displayName（六本木など）> name（釧路など）> 市区町村名から「市/区」を除去
  const areaName = cityConfig?.displayName || cityConfig?.name
    || japanCity?.name?.replace(/市$|区$|町$|村$/, "")
    || null;

  const titleEn = areaName ? `${areaName.toUpperCase()} NIGHT VISION` : "NIGHT VISION";
  const titleJa = areaName ? `${areaName}ナイトビジョン` : "ナイトビジョン";

  const handleLogoClick = () => {
    router.push("/");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setMenuOpen(false);
  };

  const menuItems = [
    { label: "🗾 エリアから探す", href: "/map" },
    { label: "🍹 ガールズバー", href: "/hokkaido/kushiro/girls-bar" },
    { label: "🍶 スナック", href: "/hokkaido/kushiro/snack" },
    { label: "🍸 カジュアルバー", href: "/hokkaido/kushiro/casual-bar" },
    { label: "📍 末広エリア", href: "/hokkaido/kushiro/area/suehiro" },
    { label: "📍 愛国エリア", href: "/hokkaido/kushiro/area/aikoku" },
    { label: "⭐ ランキング", href: "/ranking" },
    { label: "📋 店舗一覧", href: "/" },
    { label: "📝 店舗会員登録はこちら", href: "/for-owners" },
    { label: "🚨 店舗情報の報告", href: "/report" },
    { label: "📩 お問い合わせ", href: "/contact" },
    { label: "🏪 店舗管理ログイン", href: "/owner/login" },
    { label: "💃 キャストポータル", href: "/cast-login" },
  ];

  return (
    <>
      <header style={{
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 20px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div onClick={handleLogoClick} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10 }}>
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
              <ellipse cx="16" cy="22" rx="8" ry="8" fill="url(#hbody)" opacity="0.2"/>
              <ellipse cx="16" cy="15" rx="8" ry="7.5" fill="var(--bg-card)"/>
              <ellipse cx="16" cy="15" rx="7.5" ry="7" fill="none" stroke="url(#hbody)" strokeWidth="1"/>
              <path d="M10 9 L8 4 L12 8Z" fill="url(#hbody)"/>
              <path d="M22 9 L24 4 L20 8Z" fill="url(#hbody)"/>
              <circle cx="12.5" cy="14.5" r="3.5" fill="var(--bg)"/>
              <circle cx="12.5" cy="14.5" r="3.2" fill="none" stroke="url(#heye)" strokeWidth="0.8"/>
              <circle cx="12.5" cy="14.5" r="2" fill="url(#heye)" opacity="0.9"/>
              <circle cx="12.5" cy="14.5" r="1.1" fill="var(--bg)"/>
              <circle cx="13.2" cy="13.8" r="0.5" fill="#fff" opacity="0.9"/>
              <circle cx="19.5" cy="14.5" r="3.5" fill="var(--bg)"/>
              <circle cx="19.5" cy="14.5" r="3.2" fill="none" stroke="url(#heye)" strokeWidth="0.8"/>
              <circle cx="19.5" cy="14.5" r="2" fill="url(#heye)" opacity="0.9"/>
              <circle cx="19.5" cy="14.5" r="1.1" fill="var(--bg)"/>
              <circle cx="20.2" cy="13.8" r="0.5" fill="#fff" opacity="0.9"/>
              <path d="M14.8 18.5 L16 20.5 L17.2 18.5Z" fill="#ffd700" opacity="0.8"/>
            </svg>
            <div>
              <div style={{
                fontSize: 18, fontWeight: 900, letterSpacing: "0.05em",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{titleEn}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginTop: 1 }}>
                {titleJa}
              </div>
            </div>
          </div>

          {/* ハンバーガーボタン */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "var(--bg-input)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "8px 12px", cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 5, alignItems: "center",
            }}
          >
            <span style={{
              display: "block", width: 20, height: 2,
              background: "var(--text-secondary)", borderRadius: 2,
              transition: "all 0.2s",
              transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none",
            }} />
            <span style={{
              display: "block", width: 20, height: 2,
              background: "var(--text-secondary)", borderRadius: 2,
              opacity: menuOpen ? 0 : 1, transition: "all 0.2s",
            }} />
            <span style={{
              display: "block", width: 20, height: 2,
              background: "var(--text-secondary)", borderRadius: 2,
              transition: "all 0.2s",
              transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none",
            }} />
          </button>
        </div>
      </header>

      {/* ドロワーメニュー */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99, display: "flex",
        }}>
          {/* 背景オーバーレイ */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "absolute", inset: 0, background: "#00000066" }}
          />
          {/* メニューパネル */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: 280, background: "var(--bg-card)",
            borderLeft: "1px solid var(--border)",
            padding: "80px 0 24px", overflowY: "auto",
            zIndex: 100,
          }}>
            <div style={{ padding: "0 20px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.15em" }}>MENU</div>
            </div>
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block", padding: "13px 20px",
                  color: "var(--text-secondary)", fontSize: 14, fontWeight: 500,
                  textDecoration: "none", borderBottom: "1px solid var(--border)",
                  transition: "background 0.1s",
                }}
              >{item.label}</a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}