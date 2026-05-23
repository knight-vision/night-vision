"use client";
import { useState } from "react";

type Props = { castId: number; castName: string; shopId: string };

function getDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function calcMinutes(s: string, e: string) { const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number); let a=sh*60+sm,b=eh*60+em; if(b<=a)b+=1440; return b-a; }

export default function PrintPayslipButton({ castId, castName, shopId }: Props) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(false);

  const print = async () => {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const [csRes, shiftRes, allowRes, wageRes] = await Promise.all([
      fetch(`/api/cast-sales?shop_id=${shopId}&cast_id=${castId}&month=${month}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`),
      fetch(`/api/cast-allowances?cast_id=${castId}&month=${month}`),
      fetch(`/api/cast-wage?cast_id=${castId}`),
    ]);
    const castSales = csRes.ok ? await csRes.json() : [];
    const shiftData = shiftRes.ok ? await shiftRes.json() : {};
    const allShifts = (shiftData.confirmed || []).filter((s: any) => s.cast_id === castId);
    const allowances = allowRes.ok ? await allowRes.json() : [];
    const wageData = wageRes.ok ? await wageRes.json() : {};
    const hourlyWage = wageData.hourly_wage || null;

    const monthDates: string[] = [];
    const dd = new Date(y, m-1, 1);
    while(dd.getMonth()===m-1){ monthDates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }

    const dayRows = monthDates.map(date => {
      const shift = allShifts.find((s: any) => s.date === date);
      if (!shift) return null;
      const mins = calcMinutes(shift.start_time, shift.end_time);
      const base = hourlyWage ? Math.round(hourlyWage * mins / 60) : 0;
      const allows = allowances.filter((a: any) => a.date === date);
      const bottles = castSales.filter((s: any) => s.date === date && s.sales_type === "bottle");
      const honshimeis = castSales.filter((s: any) => s.date === date && s.sales_type === "honshimei");
      const baais = castSales.filter((s: any) => s.date === date && s.sales_type === "baai");
      const douhans = castSales.filter((s: any) => s.date === date && s.sales_type === "douhan");
      const allowAmt = allows.reduce((s: number, a: any) => s + a.amount, 0);
      const bottleAmt = bottles.reduce((s: number, b: any) => s + b.amount, 0);
      const dayTotal = base + allowAmt + bottleAmt;
      return { date, shift, mins, base, allows, allowAmt, bottles, bottleAmt, honshimeis, baais, douhans, dayTotal };
    }).filter(Boolean) as any[];

    if (dayRows.length === 0) { alert("この月の出勤記録がありません"); setLoading(false); return; }

    const days = dayRows.length;
    const totalBase = dayRows.reduce((s: number, r: any) => s + r.base, 0);
    const totalBottle = dayRows.reduce((s: number, r: any) => s + r.bottleAmt, 0);
    const totalAllow = dayRows.reduce((s: number, r: any) => s + r.allowAmt, 0);
    const totalPay = totalBase + totalBottle + totalAllow;

    const fmtD = (ds: string) => { const x = new Date(ds+"T00:00:00"); return `${x.getMonth()+1}/${x.getDate()}`; };

    const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>${castName} ${month}月 給与明細</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif; font-size:11px; color:#000; padding:20px; }
.header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; border-bottom:2px solid #333; padding-bottom:8px; }
.title { font-size:18px; font-weight:bold; }
.subtitle { font-size:12px; color:#555; }
table { width:100%; border-collapse:collapse; margin-bottom:14px; }
th,td { border:1px solid #bbb; padding:5px 7px; font-size:10px; }
th { background:#f5f5f5; text-align:center; font-weight:bold; }
.num { text-align:right; }
.center { text-align:center; }
.summary { border:2px solid #333; padding:12px 16px; max-width:300px; margin-left:auto; }
.srow { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; border-bottom:1px solid #e0e0e0; }
.srow:last-child { border-bottom:none; }
.total { display:flex; justify-content:space-between; padding:8px 0 0; font-weight:bold; font-size:16px; border-top:2px solid #333; margin-top:6px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:12px; } }
</style></head><body>
<div class="header">
  <div class="title">${castName}　給与明細書</div>
  <div class="subtitle">${month.replace("-","年")}月分${hourlyWage ? `　時給 ¥${hourlyWage.toLocaleString()}` : ""}</div>
</div>
<table>
  <thead><tr>
    <th>日付</th><th>勤務時間</th><th>基本給</th><th>本指名</th><th>場内</th><th>同伴</th><th>ボトルバック</th><th>手当・控除</th><th>日計</th>
  </tr></thead>
  <tbody>
    ${dayRows.map((row: any) => {
      const honAmt = row.honshimeis.reduce((s:number,x:any)=>s+x.amount,0);
      const baaiAmt = row.baais.reduce((s:number,x:any)=>s+x.amount,0);
      const douAmt = row.douhans.reduce((s:number,x:any)=>s+x.amount,0);
      return `<tr>
        <td class="center">${fmtD(row.date)}</td>
        <td class="center">${row.shift.start_time.slice(0,5)}〜${row.shift.end_time.slice(0,5)}</td>
        <td class="num">${row.base>0?"¥"+row.base.toLocaleString():""}</td>
        <td class="num">${honAmt>0?"¥"+honAmt.toLocaleString():""}</td>
        <td class="num">${baaiAmt>0?"¥"+baaiAmt.toLocaleString():""}</td>
        <td class="num">${douAmt>0?"¥"+douAmt.toLocaleString():""}</td>
        <td class="num">${row.bottleAmt>0?"¥"+row.bottleAmt.toLocaleString():""}</td>
        <td class="num">${row.allowAmt!==0?(row.allowAmt>0?"+":"-")+"¥"+Math.abs(row.allowAmt).toLocaleString():""}</td>
        <td class="num"><strong>¥${row.dayTotal.toLocaleString()}</strong></td>
      </tr>`;
    }).join("")}
  </tbody>
</table>
<div class="summary">
  ${[
    ["出勤日数", `${days}日`],
    ["基本給合計", `¥${totalBase.toLocaleString()}`],
    ["ボトルバック", `¥${totalBottle.toLocaleString()}`],
    ["手当・控除", `${totalAllow>=0?"+":""}¥${totalAllow.toLocaleString()}`],
  ].map(([l,v])=>`<div class="srow"><span>${l}</span><span>${v}</span></div>`).join("")}
  <div class="total"><span>支払合計</span><span>¥${totalPay.toLocaleString()}</span></div>
</div>
</body></html>`;

    const w = window.open("","_blank","width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(), 600); }
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.08em" }}>🖨️ 給与明細出力</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
        <button onClick={print} disabled={loading} style={{
          padding: "8px 16px", borderRadius: 8, background: "var(--accent)22", border: "1px solid var(--accent)44",
          color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? "準備中..." : "印刷・PDF"}
        </button>
      </div>
    </div>
  );
}
