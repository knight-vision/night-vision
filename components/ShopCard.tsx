import Link from "next/link";
import { Shop } from "@/lib/shops";

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  スナック:     { bg: "#ff6b9d22", border: "#ff6b9d", text: "#ff6b9d" },
  ガールズバー: { bg: "#00d4ff22", border: "#00d4ff", text: "#00d4ff" },
  ラウンジ:     { bg: "#ffd70022", border: "#ffd700", text: "#ffd700" },
};

const PLAN_INFO: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  free:     { label: "フリー",       color: "#ffffff44", bg: "#ffffff08", border: "#ffffff15", icon: "○" },
  standard: { label: "スタンダード", color: "#00d4ff",   bg: "#00d4ff15", border: "#00d4ff44", icon: "★" },
  premium:  { label: "プレミアム",   color: "#ffd700",   bg: "#ffd70015", border: "#ffd70044", icon: "👑" },
};

const TYPE_EMOJI: Record<string, string> = {
  スナック: "🍶",
  ガールズバー: "🍹",
  ラウンジ: "🥂",
};

export default function ShopCard({ shop }: { shop: Shop }) {
  const tc = TYPE_COLORS[shop.type] ?? { bg: "#fff1", border: "#fff3", text: "#fff" };
  const onCount = shop.casts.filter((c) => c.on_today).length;
  const hasBanner = shop.plan === "premium" || shop.referred;
  const isStandard = shop.plan === "standard";
  const planInfo = shop.referred
    ? { label: "紹介プレミアム", color: "#ff6b9d", bg: "#ff6b9d15", border: "#ff6b9d44", icon: "💎" }
    : PLAN_INFO[shop.plan] ?? PLAN_INFO.free;

  return (
    <Link href={"/shop/" + shop.slug} style={{ display: "block", textDecoration: "none" }}>
      <div style={{ background: "linear-gradient(160deg, #0f0f1a 0%, #1a1028 100%)", border: "1px solid #ffffff0f", borderRadius: 16, cursor: "pointer", overflow: "hidden" }}>

        {hasBanner && (
          <div style={{ position: "relative", width: "100%", height: 140, overflow: "hidden" }}>
            {shop.image ? (
              <img src={shop.image} alt={shop.name + "の店内"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, " + tc.border + "22, #0f0f1a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff22", fontSize: 13 }}>
                写真準備中
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, #0f0f1a, transparent)" }} />
            {shop.referred && (
              <div style={{ position: "absolute", top: 10, right: 10, background: "linear-gradient(135deg, #ff6b9d, #a855f7)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>
                💎 紹介プレミアム
              </div>
            )}
          </div>
        )}

        {isStandard && (
          <div style={{ width: "100%", height: 60, background: "linear-gradient(135deg, #00d4ff08, #0f0f1a)", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #00d4ff15", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 11, color: "#00d4ff66" }}>プレミアムで写真掲載できます</span>
          </div>
        )}

        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: tc.bg, border: "1px solid " + tc.border, color: tc.text }}>
                {shop.type}
              </span>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: planInfo.bg, border: "1px solid " + planInfo.border, color: planInfo.color }}>
                {planInfo.icon} {planInfo.label}
              </span>
            </div>
            <span style={{ fontSize: 12, color: "#ffffff44", background: "#ffffff08", padding: "2px 8px", borderRadius: 10 }}>
              {shop.area}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden", border: "1.5px solid " + (hasBanner && shop.image ? tc.border + "66" : "#ffffff15"), background: "linear-gradient(135deg, #1a1a2e, #0f0f1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
              {hasBanner && shop.image
                ? <img src={shop.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : TYPE_EMOJI[shop.type]}
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {shop.name}
              </div>
              <div style={{ color: "#ffffff44", fontSize: 12, marginTop: 2 }}>{shop.open_hour}</div>
            </div>
          </div>

          <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            {shop.description}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {shop.tags.map((t) => (
              <span key={t} style={{ fontSize: 11, color: "#ffffff55", background: "#ffffff0a", border: "1px solid #ffffff15", padding: "2px 10px", borderRadius: 20 }}>
                {t}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #ffffff0a", paddingTop: 12 }}>
            <span style={{ color: tc.text, fontWeight: 700, fontSize: 13 }}>{shop.budget}</span>
            <span style={{ fontSize: 12, color: onCount > 0 ? "#00ff88" : "#666" }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: onCount > 0 ? "#00ff88" : "#444", boxShadow: onCount > 0 ? "0 0 6px #00ff88" : "none", marginRight: 5, verticalAlign: "middle" }} />
              本日 <strong>{onCount}</strong>名出勤
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}