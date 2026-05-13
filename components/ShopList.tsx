"use client";
import { useState } from "react";
import ShopCard from "@/components/ShopCard";
import { Shop } from "@/lib/shops";

const TYPES = [
  { label: "🥂 ラウンジ/ニュークラ", value: "ラウンジ", dark: "#ffd700", light: "#aa8800" },
  { label: "🍹 ガールズバー",   value: "ガールズバー",  dark: "#00d4ff", light: "#007ab8" },
  { label: "🍶 スナック",       value: "スナック",      dark: "#ff6b9d", light: "#cc2266" },
  { label: "🍸 カジュアルバー", value: "カジュアルバー", dark: "#a855f7", light: "#7722cc" },
  { label: "🍺 その他",         value: "その他",        dark: "#aaaaaa", light: "#666666" },
];

const AREAS = [
  { label: "📍 末広",   value: "末広",  dark: "#ff6b9d", light: "#cc2266" },
  { label: "📍 愛国",   value: "愛国",  dark: "#00d4ff", light: "#007ab8" },
  { label: "📍 その他", value: "その他", dark: "#aaaaaa", light: "#666666" },
];

export default function ShopList({ shops }: { shops: Shop[] }) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [isLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  });

  const filtered = shops.filter((shop) => {
    const typeMatch = !selectedType || shop.type === selectedType ||
      (selectedType === "その他" && !["ラウンジ", "ガールズバー", "スナック", "カジュアルバー"].includes(shop.type));
    const areaMatch = !selectedArea || (shop.area_category ?? "その他") === selectedArea;
    return typeMatch && areaMatch;
  });

  const hasFilter = selectedType !== "" || selectedArea !== "";

  return (
    <div>
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
                onClick={() => setSelectedType(active ? "" : type.value)}
                style={{
                  flex: 1, minWidth: 80, padding: "10px 8px", borderRadius: 12,
                  textAlign: "center", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 12,
                  fontFamily: "var(--font)",
                  transition: "all 0.15s",
                  background: active ? color + "20" : "var(--bg-input)",
                  border: "1.5px solid " + (active ? color : "var(--border)"),
                  color: active ? color : "var(--text-secondary)",
                }}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
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
                onClick={() => setSelectedArea(active ? "" : area.value)}
                style={{
                  flex: 1, minWidth: 80, padding: "10px 8px", borderRadius: 12,
                  textAlign: "center", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 12,
                  fontFamily: "var(--font)",
                  transition: "all 0.15s",
                  background: active ? color + "20" : "var(--bg-input)",
                  border: "1.5px solid " + (active ? color : "var(--border)"),
                  color: active ? color : "var(--text-secondary)",
                }}
              >
                {area.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasFilter && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {filtered.length}件表示中
            {selectedType && <span style={{ color: "var(--text-secondary)" }}> · {selectedType}</span>}
            {selectedArea && <span style={{ color: "var(--text-secondary)" }}> · {selectedArea}エリア</span>}
          </div>
          <button onClick={() => { setSelectedType(""); setSelectedArea(""); }} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
            padding: "3px 10px", borderRadius: 10, fontSize: 11, cursor: "pointer",
            fontFamily: "var(--font)",
          }}>リセット</button>
        </div>
      )}

      {!hasFilter && (
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>
          掲載店舗 {shops.length}件
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>
            条件に合う店舗が見つかりませんでした
          </div>
        ) : (
          filtered.map((shop) => <ShopCard key={shop.id} shop={shop} />)
        )}
      </div>
    </div>
  );
}