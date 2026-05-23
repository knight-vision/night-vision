"use client";
import { useState } from "react";

type CastSale = { id?: string; cast_id: number; date: string; sales_type: string; amount: number; count: number };
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string };
type Cast = { id: number; name: string; hourly_wage: number | null };

type Period = "daily" | "weekly" | "monthly";
type Props = {
  cast: Cast;
  allCastSales: CastSale[];
  allShifts: ConfirmedShift[];
  month: string;
  dailyDate: string;
  weekBase: string;
  period: Period;
  getWeekDates: (base: string) => string[];
  fmtDate: (ds: string) => string;
  onClose: () => void;
  sectionStyle: React.CSSProperties;
};

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  honshimei: { label: "本指名", icon: "⭐", color: "#f59e0b" },
  baai:      { label: "場内指名", icon: "🎯", color: "#8b5cf6" },
  douhan:    { label: "同伴", icon: "🚗", color: "#06b6d4" },
  bottle:    { label: "ボトルバック", icon: "🍾", color: "#10b981" },
  other:     { label: "その他", icon: "📝", color: "#6b7280" },
};
const TYPE_KEYS = ["honshimei", "baai", "douhan", "bottle"];

function getDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function addDays(ds: string, n: number) { const d = new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return getDateStr(d); }

export default function CastSalesDetail({ cast, allCastSales, allShifts, month, dailyDate, weekBase, period, getWeekDates, fmtDate, onClose, sectionStyle }: Props) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const mySales = allCastSales.filter(s => s.cast_id === cast.id);
  const myShifts = allShifts.filter(s => s.cast_id === cast.id);

  // 期間フィルタ
  const weekDates = getWeekDates(weekBase);
  const filtered = period === "daily" ? mySales.filter(s => s.date === dailyDate)
    : period === "weekly" ? mySales.filter(s => weekDates.includes(s.date))
    : mySales;

  // 月の日付一覧（月次グラフ用）
  const [y, m] = month.split("-").map(Number);
  const monthDates: string[] = [];
  const dd = new Date(y, m-1, 1);
  while(dd.getMonth()===m-1){ monthDates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }

  // グラフデータ
  const chartDates = period === "daily" ? [dailyDate]
    : period === "weekly" ? weekDates
    : monthDates.filter(d => myShifts.some(s=>s.date===d) || mySales.some(s=>s.date===d));

  // 種別ごとの合計
  const totals = TYPE_KEYS.map(key => ({
    key, ...TYPE_LABELS[key],
    total: filtered.filter(s=>s.sales_type===key).reduce((a,b)=>a+b.amount, 0),
    count: filtered.filter(s=>s.sales_type===key).length,
  }));
  const grandTotal = filtered.reduce((a,b)=>a+b.amount, 0);

  // グラフ最大値
  const displayType = activeType || "honshimei";
  const barData = chartDates.map(date => ({
    date,
    value: filtered.filter(s=>s.date===date && s.sales_type===displayType).reduce((a,b)=>a+b.amount,0),
    count: filtered.filter(s=>s.date===date && s.sales_type===displayType).length,
  }));
  const maxVal = Math.max(...barData.map(d=>d.value), 1);

  const DAY_LABEL = (ds: string) => {
    const d = new Date(ds+"T00:00:00");
    if (period === "monthly") return `${d.getDate()}`;
    return ["日","月","火","水","木","金","土"][d.getDay()];
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"flex-end" }}
      onClick={onClose}>
      <div style={{ width:"100%", maxHeight:"90vh", overflowY:"auto", background:"var(--bg)", borderRadius:"20px 20px 0 0", padding:"20px 16px 40px" }}
        onClick={e=>e.stopPropagation()}>

        {/* ヘッダー */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:18, fontWeight:900, color:"var(--text-primary)" }}>{cast.name}</div>
          <button onClick={onClose} style={{ background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:20, padding:"4px 14px", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>閉じる</button>
        </div>

        {/* 合計サマリー */}
        <div style={{ background:"linear-gradient(135deg,var(--accent)22,var(--accent2)11)", border:"1px solid var(--accent)33", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>期間合計売上</div>
          <div style={{ fontSize:28, fontWeight:900, color:"var(--accent)" }}>¥{grandTotal.toLocaleString()}</div>
        </div>

        {/* 種別サマリーカード */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {totals.map(t => (
            <button key={t.key} onClick={()=>setActiveType(t.key===activeType?null:t.key)}
              style={{ padding:"10px 12px", borderRadius:12, textAlign:"left", cursor:"pointer", fontFamily:"var(--font)",
                background: activeType===t.key ? t.color+"22" : "var(--bg-card)",
                border: `1px solid ${activeType===t.key ? t.color+"66" : "var(--border)"}`,
              }}>
              <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:3 }}>{t.icon} {t.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color: t.total>0 ? t.color : "var(--text-hint)" }}>
                {t.total>0 ? `¥${t.total.toLocaleString()}` : "—"}
              </div>
              {t.count>0 && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{t.count}件</div>}
            </button>
          ))}
        </div>

        {/* グラフ（種別選択で切替） */}
        {period !== "daily" && (
          <div style={{ ...sectionStyle, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)" }}>
                {TYPE_LABELS[displayType]?.icon} {TYPE_LABELS[displayType]?.label}
                <span style={{ marginLeft:6, fontWeight:400 }}>（カードをタップで切替）</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:period==="monthly"?2:6, alignItems:"flex-end", height:80 }}>
              {barData.map((d, i) => {
                const pct = d.value / maxVal;
                const color = TYPE_LABELS[displayType]?.color || "var(--accent)";
                return (
                  <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    {d.value>0 && <div style={{ fontSize:9, color:"var(--text-muted)" }}>{d.count}件</div>}
                    <div style={{
                      width:"100%", borderRadius:"4px 4px 0 0",
                      height: Math.max(pct*60, d.value>0?4:0),
                      background: d.value>0 ? color : "var(--bg-input)",
                      transition:"height 0.3s",
                    }}/>
                    <div style={{ fontSize: period==="monthly"?9:11, color:"var(--text-muted)", fontWeight:500 }}>
                      {DAY_LABEL(d.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 日別明細 */}
        {filtered.length > 0 && (
          <div style={sectionStyle}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:10 }}>明細</div>
            {filtered.slice().sort((a,b)=>a.date.localeCompare(b.date)).map((s,i) => {
              const t = TYPE_LABELS[s.sales_type];
              return (
                <div key={s.id||i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                  <span style={{ color:"var(--text-secondary)" }}>
                    {period!=="daily" && <span style={{ marginRight:6, color:"var(--text-muted)" }}>{fmtDate(s.date)}</span>}
                    <span style={{ color:t?.color }}>{t?.icon} {t?.label}</span>
                  </span>
                  <span style={{ fontWeight:700, color:"var(--accent)" }}>¥{s.amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
