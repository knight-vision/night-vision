"use client";
import { useState } from "react";
import ShopCard from "@/components/ShopCard";
import { Shop } from "@/lib/shops";

const TYPES = ["ラウンジ", "ガールズバー", "スナック", "カジュアルバー"];
const AREAS = ["末広", "愛国", "その他"];

export default function ShopList({ shops }: { shops: Shop[] }) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const filtered = shops.filter((shop) => {
    const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(shop.type);
    const areaMatch = selectedAreas.length === 0 || selectedAreas.includes(shop.area_category ?? "その他");
    return typeMatch && areaMatch;
  });

  const TYPE_COLORS: Record<string, string> = {
    ラウンジ: "#ffd700",
    ガールズバー: "#00d4ff",
    スナック: "#ff6b9d",
    カジュアルバー: "#a855f7",
  };

  const AREA_COLORS: Record<string, string> = {
    末広: "#ff6b9d",
    愛国: "#00d4ff",
    その他: "#ffffff55",
  };

  return (
    <div>
      {/* 業種フィルター */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#ffffff33", letterSpacing: "0.12em", marginBottom: 6 }}>ジャンル</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TYPES.map((type) => {
            const active = selectedTypes.includes(type);
            const color = TYPE_COLORS[type];
            return (
              <button key={type} onClick={() => toggleType(type)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                fontWeight: active ? 700 : 400,
                background: active ? color + "22" : "#ffffff06",
                border: "1px solid " + (active ? color : "#ffffff15"),
                color: active ? color : "#ffffff55",
                transition: "all 0.15s",
              }}>{type}</button>
            );
          })}
        </div>
      </div>

      {/* エリアフィルター */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#ffffff33", letterSpacing: "0.12em", marginBottom: 6 }}>エリア</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {AREAS.map((area) => {
            const active = selectedAreas.includes(area);
            const color = AREA_COLORS[area];
            return (
              <button key={area} onClick={() => toggleArea(area)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                fontWeight: active ? 700 : 400,
                background: active ? color + "22" : "#ffffff06",
                border: "1px solid " + (active ? color : "#ffffff15"),
                color: active ? color : "#ffffff55",
                transition: "all 0.15s",
              }}>📍 {area}</button>
            );
          })}
        </div>
      </div>

      {/* 選択中の状態表示 */}
      {(selectedTypes.length > 0 || selectedAreas.length > 0) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#ffffff44" }}>
            {filtered.length}件表示中
            {selectedTypes.length > 0 && (
              <span style={{ color: "#ffffff66" }}> · {selectedTypes.join("・")}</span>
            )}
            {selectedAreas.length > 0 && (
              <span style={{ color: "#ffffff66" }}> · {selectedAreas.join("・")}エリア</span>
            )}
          </div>
          <button onClick={() => { setSelectedTypes([]); setSelectedAreas([]); }} style={{
            background: "none", border: "1px solid #ffffff15", color: "#ffffff44",
            padding: "3px 10px", borderRadius: 10, fontSize: 11, cursor: "pointer",
          }}>リセット</button>
        </div>
      )}

      {!selectedTypes.length && !selectedAreas.length && (
        <div style={{ color: "#ffffff33", fontSize: 12, marginBottom: 14 }}>
          掲載店舗 {shops.length}件
        </div>
      )}

      {/* 店舗一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#ffffff33", padding: 40, fontSize: 14 }}>
            条件に合う店舗が見つかりませんでした
          </div>
        ) : (
          filtered.map((shop) => <ShopCard key={shop.id} shop={shop} />)
        )}
      </div>
    </div>
  );
}