"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/shops";
import Link from "next/link";

type ShopRank = {
  id: number;
  slug: string;
  name: string;
  type: string;
  area_category: string;
  area: string;
  open_hour: string;
  image: string | null;
  favorite_count: number;
  page_views: number;
  count?: number;
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
  const [shops, setShops] = useState<ShopRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [rankType, period]);

  async function fetchRanking() {
    setLoading(true);
    try {
      if (period === "all") {
        // 総合は shops テーブルから直接取得
        const col = rankType === "favorite" ? "favorite_count" : "page_views";
        const { data } = await supabase
          .from("shops")
          .select("id, slug, name, type, area_category, area, open_hour, image, favorite_count, page_views")
          .order(col, { ascending: false })
          .limit(20);
        setShops((data ?? []).map((s) => ({ ...s, count: s[col] ?? 0 })));
      } else {
        // 期間別はイベントテーブルから集計
        const table = rankType === "favorite" ? "favorite_events" : "view_events";
        const interval = PERIOD_INTERVALS[period]!;
        const since = new Date(Date.now() - parseDays(interval) * 86400000).toISOString();

        let query = supabase
          .from(table)
          .select("shop_id")
          .gte("created_at", since);

        if (rankType === "favorite") {
          query = query.eq("action", "add");
        }

        const { data: events } = await query;

        if (!events || events.length === 0) {
          setShops([]);
          setLoading(false);
          return;
        }

        // shop_id ごとに集計
        const countMap: Record<number, number> = {};
        events.forEach((e: any) => {
          countMap[e.shop_id] = (countMap[e.shop_id] ?? 0) + 1;
        });

        const topIds = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([id]) => parseInt(id));

        if (topIds.length === 0) {
          setShops([]);
          setLoading(false);
          return;
        }

        const { data: shopData } = await supabase
          .from("shops")
          .select("id, slug, name, type, area_category, area, open_hour, image, favorite_count, page_views")
          .in("id", topIds);

        const result = (shopData ?? [])
          .map((s) => ({ ...s, count: countMap[s.id] ?? 0 }))
          .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

        setShops(result);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function parseDays(interval: string): number {
    const match = interval.match(/(\d+)/);
    return match ? parseInt(match[1]) : 7;
  }

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#ffd700", letterSpacing: "0.15em", marginBottom: 6 }}>RANKING</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            ランキング
          </h1>
        </div>

        {/* ランキング種別タブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "favorite", label: "⭐ お気に入り" },
            { key: "views", label: "👁 アクセス数" },
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

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>読み込み中...</div>
        ) : shops.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60, fontSize: 14 }}>
            この期間のデータがありません
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shops.map((shop, index) => {
              const tc = TYPE_COLORS[shop.type] ?? { border: "#ffffff33", text: "#ffffff88", bg: "#ffffff11" };
              const isTop3 = index < 3;
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
                        ? <img src={shop.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{shop.area_category ?? shop.area}</span>
                      </div>
                      <div style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                        {shop.name}
                      </div>
                      {shop.open_hour && (
                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{shop.open_hour}</div>
                      )}
                    </div>

                    {/* カウント */}
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      flexShrink: 0, gap: 2,
                    }}>
                      <span style={{ fontSize: 16 }}>{rankType === "favorite" ? "⭐" : "👁"}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: isTop3 ? rankColor : "var(--text-secondary)" }}>
                        {shop.count ?? 0}
                      </span>
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