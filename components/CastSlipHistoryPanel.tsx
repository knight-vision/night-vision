"use client";
import { useState, useEffect } from "react";

type SlipItem = { name: string; qty: number; price: number };
type SlipCastEntry = { cast_id: string | number; type: string };
type Slip = {
  id: string; date: string; payment: string;
  subtotal: number; tax: number; total: number;
  items: SlipItem[]; cast_entries: SlipCastEntry[]; memo: string | null;
};
type CastSale = { id: string; date: string; sales_type: string; amount: number; count: number };

const TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  honshimei: { label: "本指名",   icon: "⭐", color: "#f59e0b" },
  baai:      { label: "場内指名", icon: "🎯", color: "#8b5cf6" },
  douhan:    { label: "同伴",     icon: "🚗", color: "#10b981" },
  after:     { label: "アフター", icon: "🌙", color: "#3b82f6" },
  trip:      { label: "出張",     icon: "✈️",  color: "#06b6d4" },
  free:      { label: "フリー",   icon: "🆓", color: "#6b7280" },
};

const SALES_COUNT_TYPES = [
  { key: "drink",  label: "ドリンクバック", icon: "🍹" },
  { key: "shot",   label: "ショットバック", icon: "🥃" },
  { key: "bottle", label: "ボトルバック",   icon: "🍾" },
];

function fmtDate(ds: string) {
  const d = new Date(ds + "T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}

export default function CastSlipHistoryPanel({
  castId, shopId,
}: { castId: string; shopId: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [slips, setSlips] = useState<Slip[]>([]);
  const [sales, setSales] = useState<CastSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSlipId, setOpenSlipId] = useState<string | null>(null);

  useEffect(() => { load(); }, [month, castId, shopId]);

  const load = async () => {
    if (!castId || !shopId) return;
    setLoading(true);
    const [slipRes, salesRes] = await Promise.all([
      fetch(`/api/cast-slips?shop_id=${shopId}&cast_id=${castId}&month=${month}`),
      fetch(`/api/cast-sales?cast_id=${castId}&month=${month}`),
    ]);
    setSlips(slipRes.ok ? await slipRes.json() : []);
    setSales(salesRes.ok ? await salesRes.json() : []);
    setLoading(false);
  };

  // 月次集計（伝票のcast_entriesから）
  const summary = (() => {
    const counts: Record<string, number> = {};
    for (const slip of slips) {
      const myEntry = (slip.cast_entries || []).find(
        (e) => String(e.cast_id) === String(castId)
      );
      if (!myEntry) continue;
      const t = myEntry.type || "free";
      counts[t] = (counts[t] || 0) + 1;
    }
    // ドリンク・ショット・ボトルはcast_salesのcount合計
    const salesCounts: Record<string, number> = {};
    const salesAmounts: Record<string, number> = {};
    for (const s of sales) {
      salesCounts[s.sales_type] = (salesCounts[s.sales_type] || 0) + (s.count || 1);
      salesAmounts[s.sales_type] = (salesAmounts[s.sales_type] || 0) + s.amount;
    }
    return { counts, salesCounts, salesAmounts };
  })();

  const hasSummary = slips.length > 0 || sales.length > 0;

  return (
    <div>
      {/* 月ナビ */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => { const d = new Date(month+"-01"); d.setMonth(d.getMonth()-1); setMonth(d.toISOString().slice(0,7)); }}
          style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
        >← 前月</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{month.replace("-","年")}月</span>
        <button
          onClick={() => { const d = new Date(month+"-01"); d.setMonth(d.getMonth()+1); setMonth(d.toISOString().slice(0,7)); }}
          style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
        >次月 →</button>
        <button
          onClick={() => setMonth(new Date().toISOString().slice(0,7))}
          style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}
        >今月</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>読み込み中...</div>
      ) : !hasSummary ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 16px", fontSize: 13 }}>
          この月の実績データがありません
        </div>
      ) : (<>

        {/* 月次サマリーカード */}
        <div style={{ background: "linear-gradient(135deg, var(--accent)22, var(--accent2)11)", border: "1px solid var(--accent)44", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{month.replace("-","年")}月 実績サマリー</div>

          {/* 指名種別カウント */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {Object.entries(TYPE_MAP).map(([key, { label, icon, color }]) => {
              const cnt = summary.counts[key] || 0;
              if (key === "free" && cnt === 0) return null;
              return (
                <div key={key} style={{ background: "var(--bg-input)", borderRadius: 10, padding: "10px 8px", textAlign: "center", border: cnt > 0 ? `1px solid ${color}44` : "1px solid var(--border)" }}>
                  <div style={{ fontSize: 18 }}>{icon}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: cnt > 0 ? color : "var(--text-hint)", marginTop: 2 }}>{cnt}<span style={{ fontSize: 11, fontWeight: 400 }}>本</span></div>
                </div>
              );
            })}
          </div>

          {/* ドリンク・ショット・ボトル */}
          {SALES_COUNT_TYPES.some(s => summary.salesCounts[s.key]) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {SALES_COUNT_TYPES.map(({ key, label, icon }) => {
                const cnt = summary.salesCounts[key] || 0;
                const amt = summary.salesAmounts[key] || 0;
                if (!cnt) return null;
                return (
                  <div key={key} style={{ background: "var(--bg-input)", borderRadius: 10, padding: "8px 12px", border: "1px solid var(--border)", fontSize: 12 }}>
                    <span style={{ marginRight: 4 }}>{icon}</span>
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", marginLeft: 6 }}>{cnt}本</span>
                    {amt > 0 && <span style={{ color: "var(--accent)", marginLeft: 4 }}>¥{amt.toLocaleString()}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 伝票一覧 */}
        {slips.length > 0 && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              担当伝票一覧　<span style={{ fontWeight: 400 }}>{slips.length}件</span>
            </div>
            {slips.map((slip) => {
              const myEntry = (slip.cast_entries || []).find(
                (e) => String(e.cast_id) === String(castId)
              );
              const rawType = myEntry?.type || "free";
              const typeInfo = TYPE_MAP[rawType] || TYPE_MAP["free"];
              const isOpen = openSlipId === slip.id;
              return (
                <div key={slip.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* 行ヘッダー（タップで開閉） */}
                  <button
                    onClick={() => setOpenSlipId(isOpen ? null : slip.id)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{fmtDate(slip.date)}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: `${typeInfo.color}22`, color: typeInfo.color, fontWeight: 700 }}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        {slip.payment}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>¥{(slip.total||0).toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* 展開：品目・担当キャスト */}
                  {isOpen && (
                    <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                      {/* 品目 */}
                      {(slip.items || []).length > 0 && (
                        <div style={{ marginTop: 10, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>品目</div>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                            {slip.items.map((item, i) => (
                              <span key={i} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                {item.name}×{item.qty}
                                {item.price > 0 && <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>¥{(item.price*item.qty).toLocaleString()}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 金額内訳 */}
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                        <span>小計 ¥{(slip.subtotal||0).toLocaleString()}</span>
                        <span>税 ¥{(slip.tax||0).toLocaleString()}</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>合計 ¥{(slip.total||0).toLocaleString()}</span>
                      </div>
                      {/* 備考 */}
                      {slip.memo && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", padding: "6px 10px", background: "var(--bg-input)", borderRadius: 8 }}>
                          📝 {slip.memo}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>)}
    </div>
  );
}
