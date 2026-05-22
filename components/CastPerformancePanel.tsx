"use client";
import { useState, useEffect } from "react";

type CastSale = { id: string; date: string; sales_type: string; amount: number; count: number; memo: string };
type Shift = { date: string; start_time: string; end_time: string };
type Allowance = { date: string; label: string; amount: number };

const SALES_TYPES: Record<string, { label: string; icon: string }> = {
  honshimei: { label: "本指名", icon: "⭐" },
  baai: { label: "場内指名", icon: "🎯" },
  douhan: { label: "同伴", icon: "🚗" },
  bottle: { label: "ボトルバック", icon: "🍾" },
  other: { label: "その他", icon: "📝" },
};

function calcMinutes(start: string, end: string) {
  const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number);
  let s=sh*60+sm, e=eh*60+em; if(e<=s) e+=24*60; return e-s;
}
function fmtH(min: number) { return `${Math.floor(min/60)}h${min%60>0?min%60+"m":""}`; }

export default function CastPerformancePanel({ castId, shopId, castName }: { castId: string; shopId: string; castName: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [sales, setSales] = useState<CastSale[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [hourlyWage, setHourlyWage] = useState<number|null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [month]);

  const load = async () => {
    setLoading(true);
    const [y,m] = month.split("-").map(Number);
    const [salesRes, shiftsRes, allowRes, wageRes] = await Promise.all([
      fetch(`/api/cast-sales?cast_id=${castId}&shop_id=${shopId}&month=${month}`),
      fetch(`/api/cast-confirmed-shifts?cast_id=${castId}`),
      fetch(`/api/cast-allowances?cast_id=${castId}&month=${month}`),
      fetch(`/api/cast-wage?cast_id=${castId}`),
    ]);
    if (salesRes.ok) setSales(await salesRes.json());
    if (shiftsRes.ok) {
      const data = await shiftsRes.json();
      setShifts(data.filter((s: Shift) => s.date.startsWith(month)));
    }
    if (allowRes.ok) setAllowances(await allowRes.json());
    if (wageRes.ok) { const w = await wageRes.json(); setHourlyWage(w.hourly_wage); }
    setLoading(false);
  };

  // 集計
  const totalMins = shifts.reduce((s,sh)=>s+calcMinutes(sh.start_time,sh.end_time),0);
  const baseWage = hourlyWage ? Math.round(hourlyWage*totalMins/60) : 0;
  const allowanceTotal = allowances.reduce((s,a)=>s+a.amount,0);
  const bottleBack = sales.filter(s=>s.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
  const totalPay = baseWage + allowanceTotal + bottleBack;
  const salesTotal = sales.reduce((s,c)=>s+c.amount,0);
  const ratio = totalPay>0 ? (salesTotal/totalPay*100).toFixed(0) : null;

  // 種別ごとの集計
  const byType = Object.entries(SALES_TYPES).map(([key,info])=>({
    ...info, key,
    total: sales.filter(s=>s.sales_type===key).reduce((s,c)=>s+c.amount,0),
    count: sales.filter(s=>s.sales_type===key).reduce((s,c)=>s+c.count,0),
  })).filter(t=>t.total>0);

  return (
    <div>
      {/* 月ナビ */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前月</button>
        <span style={{fontSize:15,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
        <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>次月 →</button>
      </div>

      {loading ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div> : (
        <>
          {/* 成績サマリー */}
          <div style={{background:"linear-gradient(135deg,var(--accent)22,var(--accent2)11)",border:"1px solid var(--accent)44",borderRadius:16,padding:20,marginBottom:16}}>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>{month.replace("-","年")}月の成績</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>売上合計</div>
                <div style={{fontSize:24,fontWeight:900,color:"var(--accent)"}}>¥{salesTotal.toLocaleString()}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>出勤</div>
                <div style={{fontSize:24,fontWeight:900,color:"var(--text-primary)"}}>{shifts.length}日</div>
              </div>
            </div>
            {ratio && (
              <div style={{padding:"10px 14px",background:"var(--bg-card)",borderRadius:10}}>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>売上/給与 比率</div>
                <div style={{fontSize:22,fontWeight:900,color:Number(ratio)>=100?"var(--online)":Number(ratio)>=70?"#f59e0b":"#ff4444"}}>
                  {ratio}%
                </div>
                <div style={{fontSize:11,color:"var(--text-hint)",marginTop:2}}>
                  {Number(ratio)>=100?"✅ 目標達成！":Number(ratio)>=70?"📈 あと少し！":"⚡ 売上アップを目指そう！"}
                </div>
              </div>
            )}
          </div>

          {/* 売上内訳 */}
          {byType.length>0&&(
            <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:16,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>売上内訳</div>
              {byType.map(t=>(
                <div key={t.key} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                  <span>{t.icon} {t.label}</span>
                  <div style={{textAlign:"right"}}>
                    <span style={{color:"var(--text-muted)",fontSize:11,marginRight:8}}>{t.count}件</span>
                    <span style={{fontWeight:700,color:"var(--accent)"}}>¥{t.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 給与明細 */}
          <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>💰 給与明細</div>
            {[
              {label:"基本給",value:baseWage,sub:`${shifts.length}日 ${fmtH(totalMins)}${hourlyWage?` (時給¥${hourlyWage.toLocaleString()})`:""}`},
              {label:"手当・控除",value:allowanceTotal,sub:allowances.map(a=>a.label).join("・")},
              {label:"ボトルバック",value:bottleBack},
            ].map(row=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                <div>
                  <div>{row.label}</div>
                  {row.sub&&<div style={{fontSize:11,color:"var(--text-muted)"}}>{row.sub}</div>}
                </div>
                <span style={{fontWeight:700,color:row.value>=0?"var(--text-primary)":"#ff4444"}}>
                  {row.value>=0?"":"-"}¥{Math.abs(row.value).toLocaleString()}
                </span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontSize:15,fontWeight:900}}>
              <span style={{color:"var(--text-primary)"}}>支払合計</span>
              <span style={{color:"var(--accent)"}}>¥{totalPay.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
