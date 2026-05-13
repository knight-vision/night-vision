"use client";
import { useState } from "react";
import ShopCard from "@/components/ShopCard";
import { Shop } from "@/lib/shops";

const TYPES = [
  { label: "🥂 ラウンジ",       value: "ラウンジ",      color: "#ffd700" },
  { label: "🍹 ガールズバー",   value: "ガールズバー",  color: "#00d4ff" },
  { label: "🍶 スナック",       value: "スナック",      color: "#ff6b9d" },
  { label: "🍸 カジュアルバー", value: "カジュアルバー", color: "#a855f7" },
  { label: "🍺 その他",         value: "その他",        color: "#888888" },
];

const AREAS = [
  { label: "📍 末広",   value: "末広",  color: "#ff6b9d" },
  { label: "📍 愛国",   value: "愛国",  color: "#00d4ff" },
  { label: "📍 その他", value: "その他", color: "#888888" },
];

export default function ShopList({ shops }: { shops: Shop[] }) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");

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
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(active ? "" : type.value)}
                style={{
                  flex: 1, minWidth: 80, padding: "10px 8px", borderRadius: 12,
                  textAlign: "center", cursor: "pointer",
                  fontWeight: active ? 700 : 600, fontSize: 12,
                  transition: "all 0.15s",
                  background: active ? type.color + "22" : "var(--bg-input)",
                  border: "1px solid " + (active ? type.color : "var(--border)"),
                  color: active ? type.color : "var(--text-muted)",
                  boxShadow: active ? "0 0 12px " + type.color + "22" : "none",
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
            return (
              <button
                key={area.value}
                onClick={() => setSelectedArea(active ? "" : area.value)}
                style={{
                  flex: 1, minWidth: 80, padding: "10px 8px", borderRadius: 12,
                  textAlign: "center", cursor: "pointer",
                  fontWeight: active ? 700 : 600, fontSize: 12,
                  transition: "all 0.15s",
                  background: active ? area.color + "22" : "var(--bg-input)",
                  border: "1px solid " + (active ? area.color : "var(--border)"),
                  color: active ? area.color : "var(--text-muted)",
                  boxShadow: active ? "0 0 12px " + area.color + "22" : "none",
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