"use client";
import { useRouter } from "next/navigation";
import { Shop } from "@/lib/shops";

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

const TYPE_COLORS_LIGHT: Record<string, { bg: string; border: string; text: string }> = {
  スナック:       { bg: "#cc226618", border: "#cc2266", text: "#cc2266" },
  ガールズバー:   { bg: "#007ab818", border: "#007ab8", text: "#007ab8" },
  ラウンジ:       { bg: "#aa880018", border: "#aa8800", text: "#aa8800" },
  カジュアルバー: { bg: "#7722cc18", border: "#7722cc", text: "#7722cc" },
};

const TYPE_EMOJI: Record<string, string> = {
  スナック: "🍶",
  ガールズバー: "🍹",
  ラウンジ: "🥂",
  カジュアルバー: "🍸",
};

export default function ShopCard({ shop }: { shop: Shop }) {
  const router = useRouter();
  const isLight = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;
  const colors = isLight ? TYPE_COLORS_LIGHT : TYPE_COLORS;
  const tc = colors[shop.type] ?? { bg: "#ffffff11", border: "#ffffff33", text: "#ffffff88" };
  const onCount = shop.casts.filter((c) => c.on_today).length;
  const hasBanner = shop.plan === "premium" || shop.referred;
  const isStandard = shop.plan === "standard";
  const openStatus = isOpenNow(shop.open_hour, shop.closed_days);

  return (
    <div
      onClick={() => router.push("/shop/" + shop.slug)}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: "var(--card-shadow)",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "var(--card-shadow)";
      }}
    >
      {hasBanner && (
        <div style={{ position: "relative", width: "100%", height: 140, overflow: "hidden" }}>
          {shop.image ? (
            <img src={shop.image} alt={shop.name + "の店内"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(135deg, " + tc.border + "22, var(--bg-card2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-hint)", fontSize: 13,
            }}>写真準備中</div>
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, var(--bg-card), transparent)" }} />
        </div>
      )}

      {isStandard && (
        <div style={{
          width: "100%", height: 56,
          background: "var(--bg-input)",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderBottom: "1px solid var(--border)", gap: 8,
        }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>プレミアムで写真掲載できます</span>
        </div>
      )}

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{
            padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: tc.bg, border: "1.5px solid " + tc.border, color: tc.text,
          }}>{shop.type}</span>
          <span style={{
            fontSize: 11, color: "var(--text-muted)",
            background: "var(--bg-input)", border: "1px solid var(--border)",
            padding: "2px 10px", borderRadius: 10,
          }}>{shop.area_category ?? shop.area}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
            border: "1.5px solid var(--border)",
            background: "var(--bg-card2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>
            {hasBanner && shop.image
              ? <img src={shop.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : TYPE_EMOJI[shop.type]}
          </div>
          <div>
            <div style={{ color: "var(--text-primary)", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2, fontFamily: "var(--font)" }}>
              {shop.name}
            </div>
            {shop.open_hour && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>{shop.open_hour}</div>
            )}
            {shop.area && (
              <div style={{ color: "var(--text-hint)", fontSize: 11, marginTop: 2 }}>📍 {shop.area}</div>
            )}
          </div>
        </div>

        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12, lineHeight: 1.7 }}>
          {shop.description}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {shop.tags.map((t) => (
            <span key={t} style={{
              fontSize: 11, color: "var(--text-muted)",
              background: "var(--bg-input)", border: "1px solid var(--border)",
              padding: "2px 10px", borderRadius: 20,
            }}>{t}</span>
          ))}
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid var(--border)", paddingTop: 12,
        }}>
          <span style={{ color: tc.text, fontWeight: 700, fontSize: 13 }}>{shop.budget}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              {openStatus === true ? (
                <span style={{ color: "var(--online)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--online)", boxShadow: "0 0 6px var(--online)" }} />
                  現在営業中
                </span>
              ) : onCount > 0 ? (
                <span style={{ color: "var(--text-muted)" }}>
                  本日 <strong>{onCount}</strong>名出勤
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}