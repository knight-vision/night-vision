"use client";
import { useFavorites } from "./useFavorites";

export default function FavoriteButton({ shopId, size = 20 }: { shopId: number; size?: number }) {
  const { toggle, isFavorite } = useFavorites();
  const active = isFavorite(shopId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(shopId); }}
      title={active ? "お気に入り解除" : "お気に入り登録"}
      style={{
        background: active ? "#ffd70022" : "var(--bg-input)",
        border: "1.5px solid " + (active ? "#ffd700" : "var(--border)"),
        borderRadius: "50%",
        width: size + 16,
        height: size + 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "#ffd700" : "none"} stroke={active ? "#ffd700" : "var(--text-muted)"} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  );
}