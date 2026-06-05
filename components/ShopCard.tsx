"use client";
import { useRouter } from "next/navigation";
import { Shop } from "@/lib/shops";
import { canUsePremium } from "@/lib/plan";
import FavoriteButton from "./FavoriteButton";

function isOpenNow(openHour: string | null, closedDays: string | null): boolean | null {
  if (!openHour) return null;
  const now = new Date();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const todayName = dayNames[now.getDay()];
  if (closedDays && closedDays.includes(todayName)) return false;
  const match = openHour.match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const openH = parseInt(match[1]);
  const openM = parseInt(match[2]);
  const closeH = parseInt(match[3]);
  const closeM = parseInt(match[4]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  let closeMin = closeH * 60 + closeM;
  if (closeMin < openMin) closeMin += 24 * 60;
  const nowAdj = nowMin < openMin ? nowMin + 24 * 60 : nowMin;
  return nowAdj >= openMin && nowAdj <= closeMin;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  スナック:       { bg: "#ff6b9d22", border: "#ff6b9d", text: "#ff6b9d" },
  ガールズバー:   { bg: "#00d4ff22", border: "#00d4ff", text: "#00d4ff" },
  ラウンジ:       { bg: "#ffd70022", border: "#ffd700", text: "#ffd700" },
  カジュアルバー: { bg: "#a855f722", border: "#a855f7", text: "#a855f7" },
};

const DEFAULT_DESC: Record<string, string> = {
  スナック: "地元に愛されるアットホームなスナック。カラオケや会話を楽しめます。",
  ガールズバー: "気軽に立ち寄れるガールズバー。お酒とトークを楽しもう。",
  ラウンジ: "落ち着いた雰囲気のラウンジ。特別な夜のひとときに。",
  カジュアルバー: "地元の男女が集まるカジュアルなバー。新しい出会いの場。",
};

const BG_GRADIENTS: Record<string, string> = {
  スナック: "radial-gradient(ellipse at 30% 50%, #ff6b9d18 0%, transparent 70%), radial-gradient(ellipse at 80% 20%, #a855f712 0%, transparent 60%)",
  ガールズバー: "radial-gradient(ellipse at 70% 50%, #00d4ff15 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, #0099bb10 0%, transparent 60%)",
  ラウンジ: "radial-gradient(ellipse at 50% 30%, #ffd70018 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, #aa880010 0%, transparent 60%)",
  カジュアルバー: "radial-gradient(ellipse at 40% 60%, #a855f718 0%, transparent 70%)",
};

function cardTagStyle(color: string): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
    backdropFilter: "blur(8px)", background: "rgba(13,13,24,0.55)",
    border: "1px solid rgba(255,255,255,0.12)", color,
  };
}

function openBadgeStyle(open: boolean): React.CSSProperties {
  return {
    position: "absolute", bottom: 12, right: 12, zIndex: 2,
    fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
    backdropFilter: "blur(8px)", background: "rgba(13,13,24,0.6)",
    color: open ? "#9be8b4" : "#8a85a0",
    border: `1px solid ${open ? "rgba(155,232,180,0.35)" : "rgba(255,255,255,0.12)"}`,
  };
}

const liveBadgeStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 12, zIndex: 2,
  display: "flex", alignItems: "center", gap: 5,
  background: "rgba(13,13,24,0.6)", backdropFilter: "blur(8px)",
  border: "1px solid rgba(232,180,200,0.4)", borderRadius: 999,
  padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#e8b4c8",
};

const liveDotStyle: React.CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "#ff7b9c", boxShadow: "0 0 8px #ff7b9c",
};

export default function ShopCard({ shop, tweet }: { shop: Shop; tweet?: { message: string; created_at: string } | null }) {
  const router = useRouter();
  const tc = TYPE_COLORS[shop.type] ?? { bg: "#ffffff11", border: "#ffffff33", text: "#ffffff88" };
  const onCount = (shop.casts ?? []).filter((c) => c.on_today === true).length;
  // 写真掲載はプレミアム・プロのみ（または手動掲載フラグ）。料金プランの差別化要因。
  const canPhoto = canUsePremium(shop.plan ?? "") || shop.referred;
  const hasBanner = canPhoto && !!shop.image;
  const openStatus = isOpenNow(shop.open_hour, shop.closed_days);
  const desc = shop.description || DEFAULT_DESC[shop.type] || "";
  const bg = BG_GRADIENTS[shop.type] ?? "";

  return (
    <div
      onClick={() => router.push("/shop/" + shop.slug)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${tc.border}22`,
        borderRadius: 16,
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: `var(--card-shadow), 0 4px 20px ${tc.border}10`,
        transition: "transform 0.18s, box-shadow 0.18s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `var(--card-shadow-hover), 0 8px 32px ${tc.border}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = `var(--card-shadow), 0 4px 20px ${tc.border}10`;
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "var(--card-glow, " + bg + ")", pointerEvents: "none", borderRadius: 16 }} />

      {/* バナー写真：プレミアム・プロのみ */}
      {hasBanner && (
        <div style={{ position: "relative", width: "100%", height: 150, overflow: "hidden" }}>
          <img src={shop.image ?? ""} alt={shop.name + "の店内"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, #0f0f1a, transparent)" }} />
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
            <span style={cardTagStyle(tc.text)}>{shop.type}</span>
            <span style={cardTagStyle("#c4a8f0")}>{shop.area_category ?? shop.area}</span>
          </div>
          {openStatus === true && <span style={openBadgeStyle(true)}>● 営業中</span>}
          {openStatus === false && <span style={openBadgeStyle(false)}>○ 営業時間外</span>}
          {onCount > 0 && (
            <div style={liveBadgeStyle}>
              <span style={liveDotStyle} />{onCount}名出勤中
            </div>
          )}
        </div>
      )}

      <div style={{ padding: 16, position: "relative" }}>
        {/* ジャンル・エリア・営業状態の行（写真なし店舗用） */}
        {!hasBanner && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
              background: tc.bg, border: `1px solid ${tc.border}55`, color: tc.text,
            }}>{shop.type}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999,
              background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)",
            }}>{shop.area_category ?? shop.area}</span>
            {openStatus === true && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9be8b4", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9be8b4", boxShadow: "0 0 6px #9be8b4" }} />営業中
              </span>
            )}
            {openStatus === false && (
              <span style={{ fontSize: 11, color: "var(--text-hint)" }}>営業時間外</span>
            )}
            {onCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#e8b4c8" }}>本日 {onCount}名出勤</span>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "var(--text-primary)", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2, fontFamily: "var(--font)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shop.name}
            </div>
            {shop.open_hour && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>{shop.open_hour}</div>
            )}
            {shop.area && (
              <div style={{ color: "var(--text-hint)", fontSize: 11, marginTop: 2 }}>📍 {shop.area}</div>
            )}
          </div>
          <div style={{ flexShrink: 0, marginLeft: 8 }}>
            <FavoriteButton shopId={shop.id} size={16} />
          </div>
        </div>

        {tweet && (
          <div style={{
            background: "#1a0a2e", color: "#f0eeff", fontSize: 11, fontWeight: 600,
            padding: "6px 10px", borderRadius: 10, border: `1px solid ${tc.border}66`,
            display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
            overflow: "hidden",
          }}>
            <span style={{ color: tc.border, fontSize: 9, flexShrink: 0 }}>
              {(() => { const d=(Date.now()-new Date(tweet.created_at).getTime())/60000; return d<1?"今":""+Math.floor(d)+"分前"; })()}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {tweet.message}</span>
          </div>
        )}

        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {desc}
        </div>

        {(shop.tags ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {(shop.tags ?? []).map((t) => (
              <span key={t} style={{
                fontSize: 11, color: "var(--text-muted)",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                padding: "2px 10px", borderRadius: 20,
              }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: `1px solid ${tc.border}22`, paddingTop: 10,
        }}>
          <span style={{ color: tc.text, fontWeight: 700, fontSize: 13 }}>
            {shop.budget ?? "料金未設定"}
          </span>
          {shop.instagram && (
            <a
              href={"https://instagram.com/" + shop.instagram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 11, color: "var(--accent2)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @{shop.instagram}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
