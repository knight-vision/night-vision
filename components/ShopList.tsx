"use client";
import { useState, useEffect } from "react";
import ShopCard from "@/components/ShopCard";
import { Shop } from "@/lib/shops";
import { useFavorites } from "./useFavorites";

function isOpenNow(openHour: string | null, closedDays: string | null): boolean | null {
  if (!openHour) return null;
  const now = new Date();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const todayName = dayNames[now.getDay()];
  if (closedDays && closedDays.includes(todayName)) return false;
  const match = openHour.match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const openH = parseInt(match[1]), openM = parseInt(match[2]);
  const closeH = parseInt(match[3]), closeM = parseInt(match[4]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  let closeMin = closeH * 60 + closeM;
  if (closeMin < openMin) closeMin += 24 * 60;
  const nowAdj = nowMin < openMin ? nowMin + 24 * 60 : nowMin;
  return nowAdj >= openMin && nowAdj <= closeMin;
}

const TYPES = [
  { label: "🥂 ラウンジ/ニュークラ", value: "ラウンジ",      dark: "#ffd700", light: "#aa8800" },
  { label: "🍹 ガールズバー",         value: "ガールズバー",  dark: "#00d4ff", light: "#007ab8" },
  { label: "🍶 スナック",             value: "スナック",      dark: "#ff6b9d", light: "#cc2266" },
  { label: "🍸 カジュアルバー",       value: "カジュアルバー", dark: "#a855f7", light: "#7722cc" },
  { label: "🍺 その他",               value: "その他",        dark: "#aaaaaa", light: "#666666" },
];

const PER_PAGE = 20;

export default function ShopList({ shops, areas: areasProp, defaultType, hideTypeFilter }: {
  shops: Shop[];
  areas?: { label: string; value: string }[];
  defaultType?: string;
  hideTypeFilter?: boolean;
}) {
  const [selectedType, setSelectedType] = useState<string>(defaultType || "");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [sortKey, setSortKey] = useState<string>("default");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  });
  const { isFavorite } = useFavorites();
  const [tweets, setTweets] = useState<Record<number, { message: string; created_at: string } | null>>({});

  useEffect(() => {
    // 全店舗のつぶやきを取得
    const fetchTweets = async () => {
      const shopIds = shops.map(s => s.id);
      const results: Record<number, { message: string; created_at: string } | null> = {};
      await Promise.all(
        shopIds.map(async (id) => {
          try {
            const res = await fetch(`/api/tweet?shop_id=${id}`);
            if (res.ok) { const d = await res.json(); results[id] = d; }
            else results[id] = null;
          } catch { results[id] = null; }
        })
      );
      setTweets(results);
    };
    fetchTweets();
    // 5分ごとに更新
    const interval = setInterval(fetchTweets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPage(1);
    document.documentElement.scrollTop = 0;
  }, []);

  const filtered = shops.filter((shop) => {
    const typeMatch = !selectedType || shop.type === selectedType ||
      (selectedType === "その他" && !["ラウンジ", "ガールズバー", "スナック", "カジュアルバー"].includes(shop.type));
    const areaMatch = !selectedArea || (shop.area_category ?? "その他") === selectedArea;
    const favMatch = !favOnly || isFavorite(shop.id);
    const openMatch = !openOnly || isOpenNow(shop.open_hour, shop.closed_days) === true;
    const searchMatch = !searchQuery ||
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.area ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && areaMatch && favMatch && openMatch && searchMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "created_at":
        return dir * (new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
      case "open_early": {
        const ah = parseInt((a.open_time ?? "99:00").slice(0, 2));
        const bh = parseInt((b.open_time ?? "99:00").slice(0, 2));
        return dir * (ah - bh);
      }
      case "close_late": {
        const ah = parseInt((a.close_time ?? "00:00").slice(0, 2));
        const bh = parseInt((b.close_time ?? "00:00").slice(0, 2));
        return dir * (ah - bh);
      }
      case "budget": {
        const parse = (s: string | null) => parseInt((s ?? "0").replace(/[^0-9]/g, "")) || 0;
        return dir * (parse(a.budget) - parse(b.budget));
      }
      case "seats":
        return dir * ((a.seats ?? 0) - (b.seats ?? 0));
      case "casts":
        return dir * ((a.casts ?? []).length - (b.casts ?? []).length);
      case "age": {
        const avg = (shop: any) => {
          const casts = shop.casts ?? [];
          if (casts.length === 0) return 999;
          return casts.reduce((s: number, c: any) => s + (c.age ?? 0), 0) / casts.length;
        };
        return dir * (avg(a) - avg(b));
      }
      case "favorite":
        return dir * ((a.favorite_count ?? 0) - (b.favorite_count ?? 0));
      case "views":
        return dir * ((a.page_views ?? 0) - (b.page_views ?? 0));
      default:
        return (a.display_order ?? 0) - (b.display_order ?? 0);
    }
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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

  const hasFilter = selectedType !== "" || selectedArea !== "" || searchQuery !== "" || openOnly || favOnly;

  return (
    <div>

      {/* ジャンルフィルター */}
      {!hideTypeFilter && (
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
      )}

      {/* エリアフィルター */}
      {areasProp && areasProp.length > 0 && (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>
          AREA · エリア
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {areasProp.map((area) => {
            const active = selectedArea === area.value;
            const color = isLight ? "#007ab8" : "#00d4ff";
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
      )}

{/* お気に入り・営業中フィルター・並び替え */}
<div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
          お気に入りのみ
        </button>
        <button
          onClick={() => { setOpenOnly(!openOnly); setPage(1); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 20, cursor: "pointer",
            fontWeight: openOnly ? 700 : 500, fontSize: 13,
            fontFamily: "var(--font)", transition: "all 0.15s",
            background: openOnly ? "var(--online-bg)" : "var(--bg-input)",
            border: "1.5px solid " + (openOnly ? "var(--online)" : "var(--border)"),
            color: openOnly ? "var(--online)" : "var(--text-secondary)",
          }}
        >
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: openOnly ? "var(--online)" : "var(--border-hover)" }} />
          現在営業中のみ
        </button>

        {/* 並び替え */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 20, cursor: "pointer",
              fontSize: 13, fontFamily: "var(--font)", transition: "all 0.15s",
              background: sortKey !== "default" ? "var(--accent)22" : "var(--bg-input)",
              border: "1.5px solid " + (sortKey !== "default" ? "var(--accent)" : "var(--border)"),
              color: sortKey !== "default" ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: sortKey !== "default" ? 700 : 500,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10M11 18h2"/>
            </svg>
            並び替え
            {sortKey !== "default" && (
              <span style={{ fontSize: 11 }}>: {{
                created_at: "掲載日",
                casts: "キャスト数",
                favorite: "お気に入り",
                views: "アクセス数",
              }[sortKey]}{sortDir === "asc" ? " ↑" : " ↓"}</span>
            )}
            <span style={{ fontSize: 11 }}>{sortOpen ? "▲" : "▼"}</span>
          </button>

          {sortOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: 8, zIndex: 20,
              minWidth: 160, boxShadow: "0 4px 20px #00000044",
            }}>
              {[
                { key: "default",    label: "おすすめ順" },
                { key: "created_at", label: "掲載日順" },
                { key: "casts",      label: "キャスト数順" },
                { key: "favorite",   label: "お気に入り順" },
                { key: "views",      label: "アクセス数順" },
              ].map((s) => {
                const active = sortKey === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      if (active) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(s.key);
                        setSortDir("desc");
                      }
                      setPage(1);
                      if (s.key === "default") setSortOpen(false);
                    }}
                    style={{
                      padding: "9px 14px", borderRadius: 8, cursor: "pointer",
                      fontWeight: active ? 700 : 500, fontSize: 13,
                      fontFamily: "var(--font)", transition: "all 0.15s",
                      background: active ? "var(--accent)22" : "transparent",
                      border: "none",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", textAlign: "left", gap: 12,
                    }}
                  >
                    {s.label}
                    {active && <span style={{ fontSize: 11 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 件数表示 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {sorted.length}件中 {Math.min((page - 1) * PER_PAGE + 1, sorted.length)}〜{Math.min(page * PER_PAGE, sorted.length)}件表示
          {selectedType && <span style={{ color: "var(--text-secondary)" }}> · {selectedType}</span>}
          {selectedArea && <span style={{ color: "var(--text-secondary)" }}> · {selectedArea}エリア</span>}
          {searchQuery && <span style={{ color: "var(--text-secondary)" }}> · 「{searchQuery}」</span>}
          {favOnly && <span style={{ color: "#ffd700" }}> · お気に入り</span>}
          {openOnly && <span style={{ color: "var(--online)" }}> · 営業中</span>}
        </div>
        {hasFilter && (
          <button onClick={() => { setSelectedType(""); setSelectedArea(""); setFavOnly(false); setOpenOnly(false); setSearchQuery(""); setPage(1); }} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
            padding: "3px 10px", borderRadius: 10, fontSize: 11, cursor: "pointer",
            fontFamily: "var(--font)",
          }}>リセット</button>
        )}
      </div>

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
            boxSizing: "border-box" as const,
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

      {/* 店舗一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>
            {favOnly ? "お気に入りに登録されたお店がありません" : "条件に合う店舗が見つかりませんでした"}
          </div>
        ) : (
          paginated.map((shop) => <ShopCard key={shop.id} shop={shop} tweet={tweets[shop.id]} />)
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