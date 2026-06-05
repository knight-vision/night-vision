"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/shops";
import { CITIES } from "@/lib/cities";
import Link from "next/link";
import Image from "next/image";

type ShopRank = {
  id: number;
  slug: string;
  name: string;
  type: string;
  area: string;
  city?: string;
  open_hour: string;
  image: string | null;
  favorite_count: number;
  page_views: number;
  count: number;
};

type RankType = "favorite" | "views";
type Period = "daily" | "weekly" | "monthly" | "yearly" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "デイリー",
  weekly: "週間",
  monthly: "月間",
  yearly: "年間",
  all: "総合",
};

const PERIOD_INTERVALS: Record<Period, string | null> = {
  daily: "1 day",
  weekly: "7 days",
  monthly: "30 days",
  yearly: "365 days",
  all: null,
};

const TYPE_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  スナック:       { border: "#ff6b9d", text: "#ff6b9d", bg: "#ff6b9d22" },
  ガールズバー:   { border: "#00d4ff", text: "#00d4ff", bg: "#00d4ff22" },
  ラウンジ:       { border: "#ffd700", text: "#ffd700", bg: "#ffd70022" },
  カジュアルバー: { border: "#a855f7", text: "#a855f7", bg: "#a855f722" },
};

const TYPE_EMOJI: Record<string, string> = {
  スナック: "🍶", ガールズバー: "🍹", ラウンジ: "🥂", カジュアルバー: "🍸",
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

export default function RankingPage() {
  const [rankType, setRankType] = useState<RankType>("favorite");
  const [period, setPeriod] = useState<Period>("weekly");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [shops, setShops] = useState<ShopRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [rankType, period, cityFilter]);

  async function fetchAllShops(): Promise<ShopRank[]> {
    let q = supabase
      .from("shops")
      .select("id, slug, name, type, area, city, open_hour, image, favorite_count, page_views")
      .order("plan", { ascending: false })
      .order("id");
    if (cityFilter) q = (q as any).eq("city", cityFilter);
    const { data } = await q.limit(10);
    return (data ?? []).map((s) => ({ ...s, count: 0 }));
  }

  async function fetchRanking() {
    setLoading(true);
    try {
      if (period === "all") {
        const col = rankType === "favorite" ? "favorite_count" : "page_views";
        let q = supabase
          .from("shops")
          .select("id, slug, name, type, area, city, open_hour, image, favorite_count, page_views")
          .order(col, { ascending: false })
          .order("id");
        if (cityFilter) q = (q as any).eq("city", cityFilter);
        const { data } = await q.limit(10);
        const result = (data ?? []).map((s) => ({ ...s, count: s[col] ?? 0 }));
        setShops(result);
      } else {
        const table = rankType === "favorite" ? "favorite_events" : "view_events";
        const days = parseDays(PERIOD_INTERVALS[period]!);
        const since = new Date(Date.now() - days * 86400000).toISOString();

        let query = supabase
          .from(table)
          .select("shop_id")
          .gte("created_at", since);

        if (rankType === "favorite") {
          query = (query as any).eq("action", "add");
        }

        const { data: events } = await query;

        if (!events || events.length === 0) {
          const fallback = await fetchAllShops();
          setShops(fallback);
          setLoading(false);
          return;
        }

        const countMap: Record<number, number> = {};
        events.forEach((e: any) => {
          countMap[e.shop_id] = (countMap[e.shop_id] ?? 0) + 1;
        });

        const topIds = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id]) => parseInt(id));

        const { data: shopData } = await supabase
          .from("shops")
          .select("id, slug, name, type, area, city, open_hour, image, favorite_count, page_views")
          .in("id", topIds);

        const result = (shopData ?? [])
          .filter((s) => !cityFilter || (s.city || "kushiro") === cityFilter)
          .map((s) => ({ ...s, count: countMap[s.id] ?? 0 }))
          .sort((a, b) => b.count - a.count);

        if (result.length < 10) {
          // 足りない分をデフォルト順で補完
          const existingIds = new Set(result.map((s) => s.id));
          let eq = supabase
            .from("shops")
            .select("id, slug, name, type, area, city, open_hour, image, favorite_count, page_views")
            .not("id", "in", `(${[...existingIds].join(",") || 0})`)
            .order("plan", { ascending: false })
            .order("id");
          if (cityFilter) eq = (eq as any).eq("city", cityFilter);
          const { data: extra } = await eq.limit(10 - result.length);
          const extraMapped = (extra ?? []).map((s) => ({ ...s, count: 0 }));
          setShops([...result, ...extraMapped]);
        } else {
          setShops(result);
        }
      }
    } catch (err) {
      console.error(err);
      const fallback = await fetchAllShops();
      setShops(fallback);
    }
    setLoading(false);
  }

  function parseDays(interval: string): number {
    const match = interval.match(/(\d+)/);
    return match ? parseInt(match[1]) : 7;
  }

  return (
    <div>
      <head><link rel="canonical" href="https://www.night-vision.jp/ranking" /></head>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#ffd700", letterSpacing: "0.15em", marginBottom: 6 }}>RANKING</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            ランキング
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
            人気のお店をチェック。
          </p>
        </div>

        {/* ランキング種別タブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "favorite", label: "⭐ お気に入り" },
            { key: "views",    label: "👁 アクセス数" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setRankType(t.key as RankType); setPeriod("weekly"); }}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer",
                fontWeight: rankType === t.key ? 700 : 500, fontSize: 13,
                fontFamily: "var(--font)", transition: "all 0.15s",
                background: rankType === t.key ? "#ffd70022" : "var(--bg-input)",
                border: "1.5px solid " + (rankType === t.key ? "#ffd700" : "var(--border)"),
                color: rankType === t.key ? "#ffd700" : "var(--text-secondary)",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* 期間タブ */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, minWidth: 60, padding: "7px 6px", borderRadius: 10, cursor: "pointer",
                fontWeight: period === p ? 700 : 500, fontSize: 12,
                fontFamily: "var(--font)", transition: "all 0.15s",
                background: period === p ? "var(--accent)22" : "var(--bg-input)",
                border: "1.5px solid " + (period === p ? "var(--accent)" : "var(--border)"),
                color: period === p ? "var(--accent)" : "var(--text-secondary)",
              }}
            >{PERIOD_LABELS[p]}</button>
          ))}
        </div>

        {/* 都市フィルター */}
        <div style={{ marginBottom: 24 }}>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              fontSize: 13, fontFamily: "var(--font)", cursor: "pointer",
              background: "var(--bg-input)", border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="">🗾 全国すべて</option>
            {CITIES.map((c) => (
              <option key={c.key} value={c.key}>{c.prefecture} {c.displayName || c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>読み込み中...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shops.map((shop, index) => {
              const tc = TYPE_COLORS[shop.type] ?? { border: "#ffffff33", text: "#ffffff88", bg: "#ffffff11" };
              const isTop3 = index < 3 && shop.count > 0;
              const rankColor = RANK_COLORS[index] ?? "var(--text-muted)";

              return (
                <Link key={shop.id} href={"/shop/" + shop.slug} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid " + (isTop3 ? rankColor + "44" : "var(--border)"),
                    borderRadius: 14, padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 14,
                    cursor: "pointer",
                    boxShadow: isTop3 ? "0 2px 16px " + rankColor + "18" : "var(--card-shadow)",
                  }}>
                    {/* 順位 */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: isTop3 ? rankColor + "22" : "var(--bg-input)",
                      border: "1.5px solid " + (isTop3 ? rankColor : "var(--border)"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: isTop3 ? 18 : 14, fontWeight: 900,
                      color: isTop3 ? rankColor : "var(--text-muted)",
                    }}>
                      {isTop3 ? RANK_MEDALS[index] : index + 1}
                    </div>

                    {/* サムネイル */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                      background: `linear-gradient(135deg, ${tc.border}33, var(--bg-card2))`,
                      border: `1.5px solid ${tc.border}44`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>
                      {shop.image
                        ? <Image src={shop.image} alt={shop.name + "のサムネイル"} width={44} height={44} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : TYPE_EMOJI[shop.type] ?? "🍺"
                      }
                    </div>

                    {/* 店舗情報 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                          background: tc.bg, border: "1px solid " + tc.border, color: tc.text,
                        }}>{shop.type}</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {shop.area}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                        {shop.name}
                      </div>
                      {shop.open_hour && (
                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{shop.open_hour}</div>
                      )}
                    </div>

                    {/* ランクアイコンのみ（数字非表示） */}
                    <div style={{ flexShrink: 0 }}>
                      {shop.count > 0 && (
                        <span style={{ fontSize: 16 }}>
                          {rankType === "favorite" ? "⭐" : "👁"}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "var(--text-muted)", fontSize: 13,
            border: "1px solid var(--border)", padding: "8px 20px", borderRadius: 20,
          }}>← 店舗一覧に戻る</Link>
        </div>
      </main>
    </div>
  );
}