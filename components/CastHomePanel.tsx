"use client";
import { useState, useEffect } from "react";

type Props = {
  castId: string;
  shopId: string;
  castName: string;
  castAccountId: string;
  setPortalView: (v: string) => void;
};

function getDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function calcMinutes(s: string, e: string) { const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number); let a=sh*60+sm,b=eh*60+em; if(b<=a)b+=1440; return b-a; }
function fmtH(m: number) { return m>=60?`${Math.floor(m/60)}時間${m%60>0?m%60+"分":""}` : `${m}分`; }

export default function CastHomePanel({ castId, shopId, castName, castAccountId, setPortalView }: Props) {
  const today = getDateStr(new Date());
  const month = today.slice(0,7);
  const [todayShift, setTodayShift] = useState<any>(null);
  const [monthShifts, setMonthShifts] = useState<any[]>([]);
  const [castSales, setCastSales] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [hourlyWage, setHourlyWage] = useState<number|null>(null);
  const [lineConnected, setLineConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    load();
    const t = setInterval(()=>setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    const [y, m] = month.split("-").map(Number);
    const [shiftRes, salesRes, allowRes, wageRes, lineRes] = await Promise.all([
      fetch(`/api/cast-confirmed-shifts?cast_id=${castId}`),
      fetch(`/api/cast-sales?cast_id=${castId}&shop_id=${shopId}&month=${month}`),
      fetch(`/api/cast-allowances?cast_id=${castId}&month=${month}`),
      fetch(`/api/cast-wage?cast_id=${castId}`),
      castAccountId ? fetch(`/api/cast-line?cast_account_id=${castAccountId}`) : Promise.resolve(null),
    ]);
    if (shiftRes.ok) {
      const all = await shiftRes.json();
      setTodayShift(all.find((s: any) => s.date === today) || null);
      setMonthShifts(all.filter((s: any) => s.date.startsWith(month)));
    }
    if (salesRes.ok) setCastSales(await salesRes.json());
    if (allowRes.ok) setAllowances(await allowRes.json());
    if (wageRes.ok) { const w = await wageRes.json(); setHourlyWage(w.hourly_wage); }
    if (lineRes?.ok) { const d = await lineRes.json(); setLineConnected(d.connected); }
    setLoading(false);
  };

  // 月次集計
  const totalMins = monthShifts.reduce((s,sh)=>s+calcMinutes(sh.start_time,sh.end_time),0);
  const baseWage = hourlyWage ? Math.round(hourlyWage*totalMins/60) : 0;
  const allowTotal = allowances.reduce((s,a)=>s+a.amount,0);
  const bottleTotal = castSales.filter(s=>s.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
  const totalPay = baseWage + allowTotal + bottleTotal;
  const salesTotal = castSales.reduce((s,c)=>s+c.amount,0);
  const ratio = totalPay > 0 ? Math.round(salesTotal/totalPay*100) : null;

  // 今日のシフト情報
  const todayMins = todayShift ? calcMinutes(todayShift.start_time, todayShift.end_time) : 0;
  const todayBase = hourlyWage ? Math.round(hourlyWage*todayMins/60) : 0;

  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
  const dateStr = `${now.getMonth()+1}月${now.getDate()}日(${["日","月","火","水","木","金","土"][now.getDay()]})`;

  const card = (label: string, value: string, color = "var(--text-primary)", sub?: string) => (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 12px", textAlign:"center" as const }}>
      <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{sub}</div>}
    </div>
  );

  if (loading) return <div style={{ textAlign:"center", color:"var(--text-muted)", padding:40 }}>読み込み中...</div>;

  return (
    <div>
      {/* 時刻 */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>{dateStr}</div>
        <div style={{ fontSize:44, fontWeight:900, color:"var(--text-primary)", letterSpacing:2, fontVariantNumeric:"tabular-nums" }}>{timeStr}</div>
        <div style={{ fontSize:13, color:"var(--text-secondary)", marginTop:4 }}>こんにちは、{castName}さん</div>
      </div>

      {/* 今日のシフト */}
      <div style={{ background: todayShift ? "var(--online-bg)" : "var(--bg-card)", border:`1px solid ${todayShift?"var(--online-border)":"var(--border)"}`, borderRadius:16, padding:16, marginBottom:16, textAlign:"center" as const }}>
        {todayShift ? (
          <>
            <div style={{ fontSize:12, color:"var(--online)", marginBottom:4, fontWeight:700 }}>✅ 本日の確定シフト</div>
            <div style={{ fontSize:22, fontWeight:900, color:"var(--text-primary)" }}>
              {todayShift.start_time.slice(0,5)} 〜 {todayShift.end_time.slice(0,5)}
            </div>
            {todayBase > 0 && <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:4 }}>本日給与（予定）¥{todayBase.toLocaleString()}</div>}
          </>
        ) : (
          <>
            <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>本日の確定シフトはありません</div>
            <button onClick={()=>setPortalView("shift")} style={{ padding:"8px 20px", borderRadius:10, background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              シフト希望を出す →
            </button>
          </>
        )}
      </div>

      {/* 月次サマリー */}
      <div style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", marginBottom:8 }}>{month.replace("-","年")}月の実績</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
        {card("出勤日数", `${monthShifts.length}日`, "var(--text-primary)", totalMins>0?fmtH(totalMins):undefined)}
        {card("今月給与", totalPay>0?`¥${totalPay.toLocaleString()}`:"—", "var(--accent)")}
        {card("売上合計", salesTotal>0?`¥${salesTotal.toLocaleString()}`:"—", "var(--text-primary)")}
        {card("売上/給与", ratio!=null?`${ratio}%`:"—", ratio==null?"var(--text-muted)":ratio>=100?"var(--online)":ratio>=70?"#f59e0b":"#ff4444")}
      </div>

      {/* クイックアクセス */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
        {[
          { icon:"📅", label:"シフト希望", view:"shift" },
          { icon:"💰", label:"給与・実績", view:"payroll" },
          { icon:"📷", label:"写真管理", view:"photos" },
          { icon:"⚙️", label:"設定", view:"settings" },
        ].map(item=>(
          <button key={item.view} onClick={()=>setPortalView(item.view)} style={{
            padding:"14px 12px", borderRadius:12, background:"var(--bg-card)", border:"1px solid var(--border)",
            color:"var(--text-secondary)", fontSize:13, cursor:"pointer", fontFamily:"var(--font)", fontWeight:600,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{fontSize:18}}>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      {/* LINE未連携の案内 */}
      {!lineConnected && castAccountId && (
        <div style={{ background:"#06c75518", border:"1px solid #06c75544", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#06c755" }}>💬 LINE通知を有効にしよう</div>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>確定シフトなどをLINEで受け取れます</div>
          </div>
          <button onClick={()=>setPortalView("settings")} style={{ padding:"7px 14px", borderRadius:10, background:"#06c755", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" as const }}>
            設定する
          </button>
        </div>
      )}
    </div>
  );
}
