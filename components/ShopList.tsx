"use client";
import { useState, useEffect } from "react";
import ShopCard from "@/components/ShopCard";
import { Shop } from "@/lib/shops";
import { useFavorites } from "./useFavorites";

const TYPES = [
  { label: "🥂 ラウンジ/ニュークラ", value: "ラウンジ",      dark: "#ffd700", light: "#aa8800" },
  { label: "🍹 ガールズバー",         value: "ガールズバー",  dark: "#00d4ff", light: "#007ab8" },
  { label: "🍶 スナック",             value: "スナック",      dark: "#ff6b9d", light: "#cc2266" },
  { label: "🍸 カジュアルバー",       value: "カジュアルバー", dark: "#a855f7", light: "#7722cc" },
  { label: "🍺 その他",               value: "その他",        dark: "#aaaaaa", light: "#666666" },
];

const AREAS = [
  { label: "📍 末広",   value: "末広",  dark: "#ff6b9d", light: "#cc2266" },
  { label: "📍 愛国",   value: "愛国",  dark: "#00d4ff", light: "#007ab8" },
  { label: "📍 その他", value: "その他", dark: "#aaaaaa", light: "#666666" },
];

const PER_PAGE = 20;

export default function ShopList({ shops }: { shops: Shop[] }) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  });
  const { isFavorite } = useFavorites();

  useEffect(() => {
    setPage(1);
    document.documentElement.scrollTop = 0;
  }, []);

  const filtered = shops.filter((shop) => {
    const typeMatch = !selectedType || shop.type === selectedType ||
      (selectedType === "その他" && !["ラウンジ", "ガールズバー", "スナック", "カジュアルバー"].includes(shop.type));
    const areaMatch = !selectedArea || (shop.area_category ?? "その他") === selectedArea;
    const favMatch = !favOnly || isFavorite(shop.id);
    const searchMatch = !searchQuery ||
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.area ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && areaMatch && favMatch && searchMatch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const goToPage = (p: number) => {
    setPage(p);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleFilter = (value: string, current: string, setter: (v: string) => void) => {
    setter(current === value ? "" : value);
    setPage(1);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const hasFilter = selectedType !== "" || selectedArea !== "" || searchQuery !== "";

  return (
    <div>
      {/* 検索ボックス */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="店名・エリアで検索..."
          style={{
            width: "100%", padding: "11px 40px 11px 40px",
            background: "var(--bg-input)", border: "1.5px solid var(--border)",
            borderRadius: 12, color: "var(--text-primary)", fontSize: 14,
            outline: "none", fontFamily: "var(--font)",
            boxSizing: "border-box",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => handleSearch("")}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 16, padding: 4,
            }}
          >✕</button>
        )}
      </div>

      {/* ジャンルフィルター */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>
          GENRE · ジャンル
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TYPES.map((type) => {
            const active = selectedType === type.value;
            const color = isLight ? type.light : type.dark;
            return (
              <button
                key={type.value}
                onClick={() => handleFilter(type.value, selectedType, setSelectedType)}
                style={{
                  flex: 1, minWidth: 80, padding: "10px 8px", borderRadius: 12,
                  textAlign: "center", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 12,
                  fontFamily: "var(--font)", transition: "all 0.15s",
                  background: active ? color + "20" : "var(--bg-input)",
                  border: "1.5px solid " + (active ? color : "var(--border)"),
                  color: active ? color : "var(--text-secondary)",
                }}
              >{type.label}</button>
            );
          })}
        </div>
      </div>

      {/* エリアフィルター */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>
          AREA · エリア
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {AREAS.map((area) => {
            const active = selectedArea === area.value;
            const color = isLight ? area.light : area.dark;
            return (
              <button
                key={area.value}
                onClick={() => handleFilter(area.value, selectedArea, setSelectedArea)}
                style={{
                  flex: 1, minWidth: 80, padding: "10px 8px", borderRadius: 12,
                  textAlign: "center", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 12,
                  fontFamily: "var(--font)", transition: "all 0.15s",
                  background: active ? color + "20" : "var(--bg-input)",
                  border: "1.5px solid " + (active ? color : "var(--border)"),
                  color: active ? color : "var(--text-secondary)",
                }}
              >{area.label}</button>
            );
          })}
        </div>
      </div>

      {/* お気に入りフィルター */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => { setFavOnly(!favOnly); setPage(1); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 20, cursor: "pointer",
            fontWeight: favOnly ? 700 : 500, fontSize: 13,
            fontFamily: "var(--font)", transition: "all 0.15s",
            background: favOnly ? "#ffd70022" : "var(--bg-input)",
            border: "1.5px solid " + (favOnly ? "#ffd700" : "var(--border)"),
            color: favOnly ? "#ffd700" : "var(--text-secondary)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={favOnly ? "#ffd700" : "none"} stroke={favOnly ? "#ffd700" : "currentColor"} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          お気に入りのみ表示
        </button>
      </div>

      {/* 件数表示 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {filtered.length}件中 {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}〜{Math.min(page * PER_PAGE, filtered.length)}件表示
          {selectedType && <span style={{ color: "var(--text-secondary)" }}> · {selectedType}</span>}
          {selectedArea && <span style={{ color: "var(--text-secondary)" }}> · {selectedArea}エリア</span>}
          {searchQuery && <span style={{ color: "var(--text-secondary)" }}> · 「{searchQuery}」</span>}
          {favOnly && <span style={{ color: "#ffd700" }}> · お気に入り</span>}
        </div>
        {(hasFilter || favOnly) && (
          <button onClick={() => { setSelectedType(""); setSelectedArea(""); setFavOnly(false); setSearchQuery(""); setPage(1); }} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
            padding: "3px 10px", borderRadius: 10, fontSize: 11, cursor: "pointer",
            fontFamily: "var(--font)",
          }}>リセット</button>
        )}
      </div>

      {/* 店舗一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>
            {favOnly ? "お気に入りに登録されたお店がありません" : "条件に合う店舗が見つかりませんでした"}
          </div>
        ) : (
          paginated.map((shop) => <ShopCard key={shop.id} shop={shop} />)
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32, flexWrap: "wrap" }}>
          <button
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: page === 1 ? "var(--text-hint)" : "var(--text-secondary)",
              cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "var(--font)",
            }}
          >← 前へ</button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: "1.5px solid " + (p === page ? "var(--accent)" : "var(--border)"),
                background: p === page ? "var(--accent)" : "var(--bg-input)",
                color: p === page ? "#fff" : "var(--text-secondary)",
                cursor: "pointer", fontSize: 13, fontWeight: p === page ? 700 : 400,
                fontFamily: "var(--font)",
              }}
            >{p}</button>
          ))}

          <button
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: page === totalPages ? "var(--text-hint)" : "var(--text-secondary)",
              cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "var(--font)",
            }}
          >次へ →</button>
        </div>
      )}
    </div>
  );
}