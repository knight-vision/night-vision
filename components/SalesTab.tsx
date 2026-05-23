"use client";
import { useState, useEffect, useCallback } from "react";

type Cast = { id: number; name: string; hourly_wage: number | null };
type DailySales = { id?: string; date: string; cash_sales: number; card_sales: number; cost: number; memo: string };
type CastSale = { id?: string; cast_id: number; date: string; sales_type: string; amount: number; count: number; memo: string };
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string };
type Allowance = { cast_id: number; date: string; amount: number; label: string };
type ShopMenu = { id: string; name: string; price: number };
type SlipItem = { name: string; qty: number; price: number };
type SlipCast = { cast_id: string; type: string };

const DEFAULT_PRESETS: ShopMenu[] = [
  { id: "p1", name: "セット料金", price: 3000 },
  { id: "p2", name: "ビール", price: 800 },
  { id: "p3", name: "ハイボール", price: 800 },
  { id: "p4", name: "ソフトドリンク", price: 600 },
  { id: "p5", name: "シャンパン（モエ）", price: 35000 },
  { id: "p6", name: "場内指名料", price: 1000 },
  { id: "p7", name: "同伴料", price: 2000 },
  { id: "p8", name: "延長料", price: 3000 },
];
const SHIMEI_TYPES = ["フリー", "場内指名", "本指名"];
const PAYMENT_TYPES = ["現金", "カード"];
const TAX_RATE = 0.1;
const SALES_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  honshimei: { label: "本指名", icon: "⭐" },
  baai: { label: "場内指名", icon: "🎯" },
  douhan: { label: "同伴", icon: "🚗" },
  bottle: { label: "ボトルバック", icon: "🍾" },
  other: { label: "その他", icon: "📝" },
};

function getDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtDate(ds: string) { const d = new Date(ds+"T00:00:00"); return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`; }
function fmtDateLong(ds: string) { const d = new Date(ds+"T00:00:00"); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`; }
function addDays(ds: string, n: number) { const d = new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return getDateStr(d); }
function calcMinutes(s: string, e: string) { const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number); let a=sh*60+sm,b=eh*60+em; if(b<=a)b+=1440; return b-a; }

type Props = { shopId: string; casts: Cast[]; sectionStyle: React.CSSProperties; inputStyle: React.CSSProperties; labelStyle: React.CSSProperties; btnPrimary: React.CSSProperties };

export default function SalesTab({ shopId, casts, sectionStyle, inputStyle, labelStyle, btnPrimary }: Props) {
  const [view, setView] = useState<"slip"|"sales"|"cast_sales"|"menu">("slip");
  const [salesPeriod, setSalesPeriod] = useState<"daily"|"monthly">("daily");
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [dailyDate, setDailyDate] = useState(getDateStr(new Date()));

  // データ
  const [shopMenus, setShopMenus] = useState<ShopMenu[]>([]);
  const [allDailySales, setAllDailySales] = useState<DailySales[]>([]);
  const [allCastSales, setAllCastSales] = useState<CastSale[]>([]);
  const [allShifts, setAllShifts] = useState<ConfirmedShift[]>([]);
  const [allAllowances, setAllAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // メニュー管理
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuPrice, setNewMenuPrice] = useState("");

  // 伝票
  const [slipDate, setSlipDate] = useState(getDateStr(new Date()));
  const [payment, setPayment] = useState("現金");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([{ name:"", qty:1, price:0 }]);
  const [slipCasts, setSlipCasts] = useState<SlipCast[]>([{ cast_id:"", type:"フリー" }]);
  const [slipSaving, setSlipSaving] = useState(false);
  const [slipSaved, setSlipSaved] = useState(false);
  const [slipMemo, setSlipMemo] = useState("");
  const [editingSlipId, setEditingSlipId] = useState<string|null>(null);
  const [todaySlips, setTodaySlips] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  // 品名管理
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const slipSubtotal = slipItems.reduce((s,i)=>s+i.qty*i.price, 0);
  const slipTax = Math.floor(slipSubtotal*TAX_RATE);
  const slipTotal = slipSubtotal + slipTax;

  // 全品名はDBから（初回は自動でデフォルト登録される）
  const allPresets = shopMenus;

  const loadMenus = useCallback(async () => {
    const res = await fetch(`/api/shop-menus?shop_id=${shopId}`);
    if (res.ok) {
      const data = await res.json();
      const existingNames = data.map((d: any) => d.name);
      // デフォルト品名でDBにないものを追加
      const missing = DEFAULT_PRESETS.filter(p => !existingNames.includes(p.name));
      if (missing.length > 0) {
        await Promise.all(missing.map((p, i) =>
          fetch("/api/shop-menus", { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ shop_id: shopId, name: p.name, price: p.price, sort_order: i }) })
        ));
        const res2 = await fetch(`/api/shop-menus?shop_id=${shopId}`);
        if (res2.ok) setShopMenus(await res2.json());
      } else {
        setShopMenus(data);
      }
    }
  }, [shopId]);

  const loadSales = useCallback(async (m: string) => {
    setLoading(true);
    const [y, mo] = m.split("-").map(Number);
    const [dsRes, csRes, shiftRes, allowRes] = await Promise.all([
      fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`),
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${m}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${mo}`),
      fetch(`/api/cast-allowances?shop_id=${shopId}&month=${m}`),
    ]);
    if (dsRes.ok) setAllDailySales(await dsRes.json());
    if (csRes.ok) setAllCastSales(await csRes.json());
    if (shiftRes.ok) { const d = await shiftRes.json(); setAllShifts(d.confirmed||[]); }
    if (allowRes.ok) setAllAllowances(await allowRes.json());
    setLoading(false);
  }, [shopId]);

  const loadTodaySlips = useCallback(async (date: string) => {
    const res = await fetch(`/api/slips?shop_id=${shopId}&date=${date}`);
    if (res.ok) setTodaySlips(await res.json());
  }, [shopId]);

  useEffect(() => { loadMenus(); }, [loadMenus]);
  useEffect(() => { loadTodaySlips(slipDate); }, [slipDate, loadTodaySlips]);
  useEffect(() => { if (view==="sales") loadSales(month); }, [view, month, loadSales]);

  // 伝票保存
  const saveSlip = async () => {
    setSlipSaving(true); setMsg("");
    try {
      const m = slipDate.slice(0,7);

      if (editingSlipId) {
        // === 編集モード：既存伝票を更新 ===
        // まず古い伝票の金額をdaily_salesから引く
        const oldSlip = todaySlips.find(s => s.id === editingSlipId);
        if (oldSlip) {
          const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
          const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slipDate) : null;
          if (existing) {
            await fetch("/api/daily-sales", { method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ shop_id:shopId, date:slipDate, opening_cash:0,
                cash_sales: Math.max(0,(existing.cash_sales||0) - (oldSlip.payment==="現金"?oldSlip.total:0) + (payment==="現金"?slipTotal:0)),
                card_sales: Math.max(0,(existing.card_sales||0) - (oldSlip.payment==="カード"?oldSlip.total:0) + (payment==="カード"?slipTotal:0)),
                invoice_sales:0, cost:existing.cost||0, memo:existing.memo||"" }),
            });
          }
        }
        await fetch("/api/slips", { method:"PATCH", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ id:editingSlipId, payment, subtotal:slipSubtotal, tax:slipTax, total:slipTotal, items:slipItems, cast_entries:slipCasts, memo:slipMemo }),
        });
        setMsg("✅ 伝票を更新しました");
        setEditingSlipId(null);
      } else {
        // === 新規保存 ===
        const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
        const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slipDate) : null;
        await fetch("/api/daily-sales", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ shop_id:shopId, date:slipDate, opening_cash:0,
            cash_sales:(existing?.cash_sales||0)+(payment==="現金"?slipTotal:0),
            card_sales:(existing?.card_sales||0)+(payment==="カード"?slipTotal:0),
            invoice_sales:0, cost:existing?.cost||0, memo:existing?.memo||"" }),
        });
        // slipsテーブルに記録
        await fetch("/api/slips", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ shop_id:shopId, date:slipDate, payment, subtotal:slipSubtotal, tax:slipTax, total:slipTotal, items:slipItems, cast_entries:slipCasts, memo:slipMemo }),
        });
        // キャスト売上反映
        for (const c of slipCasts) {
          if (!c.cast_id) continue;
          const salesType = c.type==="本指名"?"honshimei":c.type==="場内指名"?"baai":null;
          if (salesType) {
            const fee = slipItems.find(i=>i.name.includes("指名"));
            await fetch("/api/cast-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,cast_id:Number(c.cast_id),date:slipDate,sales_type:salesType,amount:fee?fee.qty*fee.price:(salesType==="honshimei"?16000:1000),count:1,memo:""})});
          }
          const douhan = slipItems.find(i=>i.name.includes("同伴"));
          if (douhan) await fetch("/api/cast-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,cast_id:Number(c.cast_id),date:slipDate,sales_type:"douhan",amount:douhan.qty*douhan.price,count:1,memo:""})});
          const bottle = slipItems.find(i=>i.name.includes("モエ")||i.name.includes("ドンペリ")||i.name.includes("シャンパン")||i.name.includes("シャン"));
          if (bottle) await fetch("/api/cast-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,cast_id:Number(c.cast_id),date:slipDate,sales_type:"bottle",amount:Math.floor(bottle.qty*bottle.price*0.1),count:1,memo:`${bottle.name}(10%バック)`})});
        }
        setMsg(`✅ 保存しました（¥${slipTotal.toLocaleString()}）`);
      }

      setSlipSaved(true);
      await loadTodaySlips(slipDate);
      setTimeout(()=>{ setSlipSaved(false); resetForm(); }, 1200);
    } catch(e:any) { setMsg("保存失敗: "+e.message); }
    setSlipSaving(false);
  };

  const resetForm = () => {
    setSlipItems([{name:"",qty:1,price:0}]);
    setSlipCasts([{cast_id:"",type:"フリー"}]);
    setPayment("現金"); setSlipMemo(""); setEditingSlipId(null);
  };

  const startEdit = (slip: any) => {
    setSlipItems(slip.items || [{name:"",qty:1,price:0}]);
    setSlipCasts(slip.cast_entries || [{cast_id:"",type:"フリー"}]);
    setPayment(slip.payment || "現金");
    setSlipMemo(slip.memo || "");
    setEditingSlipId(slip.id);
    setSlipDate(slip.date);
    window.scrollTo({top:0, behavior:"smooth"});
  };

  const deleteSlip = async (slip: any) => {
    if (!confirm("この伝票を削除しますか？")) return;
    // daily_salesから金額を引く
    const m = slip.date.slice(0,7);
    const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
    const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slip.date) : null;
    if (existing) {
      await fetch("/api/daily-sales", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ shop_id:shopId, date:slip.date, opening_cash:0,
          cash_sales: Math.max(0,(existing.cash_sales||0)-(slip.payment==="現金"?slip.total:0)),
          card_sales: Math.max(0,(existing.card_sales||0)-(slip.payment==="カード"?slip.total:0)),
          invoice_sales:0, cost:existing.cost||0, memo:existing.memo||"" }),
      });
    }
    await fetch("/api/slips",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:slip.id})});
    await loadTodaySlips(slip.date);
    setMsg("伝票を削除しました");
  };

  // 月次計算
  const calcCastMonthly = (cast: Cast) => {
    const myShifts = allShifts.filter(s=>s.cast_id===cast.id);
    const mins = myShifts.reduce((s,sh)=>s+calcMinutes(sh.start_time,sh.end_time),0);
    const base = cast.hourly_wage ? Math.round(cast.hourly_wage*mins/60) : 0;
    const allow = allAllowances.filter(a=>a.cast_id===cast.id).reduce((s,a)=>s+a.amount,0);
    const bottle = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
    const honshimei = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="honshimei").reduce((s,c)=>s+c.amount,0);
    const baai = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="baai").reduce((s,c)=>s+c.amount,0);
    const douhan = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="douhan").reduce((s,c)=>s+c.amount,0);
    const sales = allCastSales.filter(c=>c.cast_id===cast.id).reduce((s,c)=>s+c.amount,0);
    return { days:myShifts.length, mins, base, allow, bottle, honshimei, baai, douhan, totalPay:base+allow+bottle, sales };
  };

  const totalMonthlySales = allDailySales.reduce((s,d)=>s+(d.cash_sales||0)+(d.card_sales||0),0);
  const totalMonthlyPayroll = casts.reduce((s,c)=>s+calcCastMonthly(c).totalPay,0);
  const totalMonthlyCost = allDailySales.reduce((s,d)=>s+(d.cost||0),0);

  const printPayslips = () => {
    const [y, m] = month.split("-").map(Number);
    const monthDatesAll: string[] = [];
    const dd = new Date(y, m-1, 1);
    while(dd.getMonth()===m-1){ monthDatesAll.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }

    const rows = casts.map(cast => {
      const d = calcCastMonthly(cast);
      const myShifts = allShifts.filter(s=>s.cast_id===cast.id);
      const dayRows = monthDatesAll.map(date=>{
        const shift = myShifts.find(s=>s.date===date);
        if (!shift) return null;
        const mins = calcMinutes(shift.start_time, shift.end_time);
        const base = cast.hourly_wage ? Math.round(cast.hourly_wage*mins/60) : 0;
        const allows = allAllowances.filter(a=>a.cast_id===cast.id&&a.date===date);
        const bottles = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="bottle");
        const honshimeis = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="honshimei");
        const baais = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="baai");
        const douhans = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="douhan");
        const dayTotal = base + allows.reduce((s:number,a:any)=>s+a.amount,0) + bottles.reduce((s:number,b:any)=>s+b.amount,0);
        return { date, shift, mins, base, allows, bottles, honshimeis, baais, douhans, dayTotal };
      }).filter(Boolean) as any[];
      return { cast, d, dayRows };
    }).filter(r => r.dayRows.length > 0);

    const fmtD = (ds: string) => { const x=new Date(ds+"T00:00:00"); return `${x.getMonth()+1}/${x.getDate()}`; };

    const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>${month}月 給与明細</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif; font-size:11px; color:#000; }
.page { width:100%; padding:16px; page-break-after:always; }
.page:last-child { page-break-after:auto; }
.header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px; border-bottom:2px solid #333; padding-bottom:6px; }
.title { font-size:16px; font-weight:bold; }
.subtitle { font-size:12px; color:#555; }
table { width:100%; border-collapse:collapse; margin-bottom:12px; }
th,td { border:1px solid #bbb; padding:4px 6px; font-size:10px; }
th { background:#f5f5f5; text-align:center; font-weight:bold; }
.num { text-align:right; }
.center { text-align:center; }
.summary { border:2px solid #333; padding:10px 14px; margin-top:8px; }
.srow { display:flex; justify-content:space-between; padding:4px 0; font-size:11px; border-bottom:1px solid #e0e0e0; }
.srow:last-child { border-bottom:none; }
.total { display:flex; justify-content:space-between; padding:8px 0 0; font-weight:bold; font-size:15px; border-top:2px solid #333; margin-top:4px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
${rows.map(({ cast, d, dayRows }) => `
<div class="page">
  <div class="header">
    <div class="title">${cast.name}　給与明細書</div>
    <div class="subtitle">${month.replace("-","年")}月分${cast.hourly_wage ? `　時給 ¥${cast.hourly_wage.toLocaleString()}` : ""}</div>
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
        const bottleAmt = row.bottles.reduce((s:number,x:any)=>s+x.amount,0);
        const allowAmt = row.allows.reduce((s:number,x:any)=>s+x.amount,0);
        return `<tr>
          <td class="center">${fmtD(row.date)}</td>
          <td class="center">${row.shift.start_time.slice(0,5)}〜${row.shift.end_time.slice(0,5)}</td>
          <td class="num">${row.base>0?"¥"+row.base.toLocaleString():""}</td>
          <td class="num">${honAmt>0?"¥"+honAmt.toLocaleString():""}</td>
          <td class="num">${baaiAmt>0?"¥"+baaiAmt.toLocaleString():""}</td>
          <td class="num">${douAmt>0?"¥"+douAmt.toLocaleString():""}</td>
          <td class="num">${bottleAmt>0?"¥"+bottleAmt.toLocaleString():""}</td>
          <td class="num">${allowAmt!==0?(allowAmt>0?"+":"-")+"¥"+Math.abs(allowAmt).toLocaleString():""}</td>
          <td class="num"><strong>¥${row.dayTotal.toLocaleString()}</strong></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="summary">
    ${[
      ["出勤日数", `${d.days}日`],
      ["基本給合計", `¥${d.base.toLocaleString()}`],
      ["ボトルバック", `¥${d.bottle.toLocaleString()}`],
      ["手当・控除", `${d.allow>=0?"+":""}¥${d.allow.toLocaleString()}`],
    ].map(([l,v])=>`<div class="srow"><span>${l}</span><span>${v}</span></div>`).join("")}
    <div class="total"><span>支払合計</span><span>¥${d.totalPay.toLocaleString()}</span></div>
  </div>
</div>`).join("")}
</body></html>`;

    const w = window.open("","_blank","width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(), 800); }
  };

  // 日次データ
  const dailyRecord = allDailySales.find(d=>d.date===dailyDate);
  const dailySalesTotal = (dailyRecord?.cash_sales||0) + (dailyRecord?.card_sales||0);
  const dailyShifts = allShifts.filter(s=>s.date===dailyDate);
  const dailyPayroll = casts.reduce((s,c)=>{
    const sh = dailyShifts.find(x=>x.cast_id===c.id);
    if (!sh) return s;
    const mins = calcMinutes(sh.start_time, sh.end_time);
    const base = c.hourly_wage ? Math.round(c.hourly_wage*mins/60) : 0;
    const allow = allAllowances.filter(a=>a.cast_id===c.id&&a.date===dailyDate).reduce((t,a)=>t+a.amount,0);
    const bottle = allCastSales.filter(cs=>cs.cast_id===c.id&&cs.date===dailyDate&&cs.sales_type==="bottle").reduce((t,cs)=>t+cs.amount,0);
    return s + base + allow + bottle;
  }, 0);

  // 月の日付
  const [y,m2] = month.split("-").map(Number);
  const monthDates: string[] = [];
  const dd = new Date(y,m2-1,1);
  while(dd.getMonth()===m2-1){ monthDates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }
  const activeDates = monthDates.filter(d=>allDailySales.some(s=>s.date===d&&((s.cash_sales||0)+(s.card_sales||0))>0));

  const inp: React.CSSProperties = { ...inputStyle as any, fontSize:13, boxSizing:"border-box" as const, width:"100%" };
  const sec = { ...sectionStyle, marginBottom:12 };

  return (
    <div>
      {/* サブナビ */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[{key:"slip",label:"📋 伝票入力"},{key:"cast_sales",label:"⭐ キャスト売上"},{key:"sales",label:"📊 店舗売上"},{key:"menu",label:"🍽 品名管理"}].map(v=>(
          <button key={v.key} onClick={()=>{ setView(v.key as any); if(v.key==="sales"||v.key==="cast_sales") loadSales(month); }} style={{
            padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,fontWeight:view===v.key?700:500,
            background:view===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
            border:`1px solid ${view===v.key?"transparent":"var(--border)"}`,
            color:view===v.key?"#fff":"var(--text-secondary)",
          }}>{v.label}</button>
        ))}
      </div>

      {msg&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,fontSize:13,background:msg.includes("失敗")?"#ff444418":"var(--online-bg)",border:`1px solid ${msg.includes("失敗")?"#ff444444":"var(--online-border)"}`,color:msg.includes("失敗")?"#ff4444":"var(--online)"}}>{msg}</div>}

      {/* ===== 伝票入力 ===== */}
      {view==="slip"&&(
        <div>
          {/* 編集モードバナー */}
          {editingSlipId && (
            <div style={{background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>✏️ 伝票を編集中</span>
              <button onClick={resetForm} style={{background:"none",border:"1px solid #f59e0b44",borderRadius:8,color:"#f59e0b",padding:"4px 12px",fontSize:12,cursor:"pointer"}}>キャンセル</button>
            </div>
          )}

          <div style={sec}>
          {/* 日付・支払方法 */}
          <div style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div>
              <label style={labelStyle}>日付</label>
              <input type="date" value={slipDate} onChange={e=>setSlipDate(e.target.value)} style={{...inp,width:"auto"}}/>
            </div>
            <div>
              <label style={labelStyle}>支払方法</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {PAYMENT_TYPES.map(p=>(
                  <button key={p} onClick={()=>setPayment(p)} style={{
                    padding:"9px 18px",borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,whiteSpace:"nowrap",
                    background:payment===p?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
                    color:payment===p?"#fff":"var(--text-secondary)",
                    border:payment===p?"1px solid transparent":"1px solid var(--border)",
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* キャスト */}
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8,letterSpacing:"0.08em"}}>キャスト</div>
          {slipCasts.map((c,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
              <div>
                <label style={labelStyle}>キャスト名</label>
                <select value={c.cast_id} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,cast_id:e.target.value}:x))} style={inp}>
                  <option value="">選択...</option>
                  {casts.map(cc=><option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>指名種別</label>
                <select value={c.type} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,type:e.target.value}:x))} style={inp}>
                  {SHIMEI_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {slipCasts.length>1&&<button onClick={()=>setSlipCasts(slipCasts.filter((_,idx)=>idx!==i))} style={{padding:"9px 12px",background:"#ff444418",border:"1px solid #ff444444",borderRadius:10,color:"#ff4444",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
            </div>
          ))}
          <button onClick={()=>setSlipCasts([...slipCasts,{cast_id:"",type:"フリー"}])} style={{width:"100%",padding:"9px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)",marginBottom:14}}>＋ キャストを追加</button>

          {/* 品目 */}
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8,letterSpacing:"0.08em"}}>注文品目</div>
          {slipItems.map((item,i)=>(
            <div key={i} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
              {/* プリセット */}
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                {allPresets.map(p=>(
                  <button key={p.id} onClick={()=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,name:p.name,price:p.price}:x))} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-muted)",fontSize:11,padding:"3px 8px",cursor:"pointer",whiteSpace:"nowrap"}}>{p.name}</button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 72px 110px",gap:8}}>
                <div>
                  <label style={labelStyle}>品目名</label>
                  <input value={item.name} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="品目を入力" style={inp}/>
                </div>
                <div>
                  <label style={labelStyle}>数量</label>
                  <input type="number" min={1} value={item.qty} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,qty:Number(e.target.value)}:x))} style={{...inp,textAlign:"center"}}/>
                </div>
                <div>
                  <label style={labelStyle}>単価（¥）</label>
                  <input type="number" min={0} value={item.price||""} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,price:Number(e.target.value)}:x))} style={{...inp,textAlign:"right"}}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                <span style={{color:"var(--accent)",fontSize:12,fontWeight:600}}>小計: ¥{(item.qty*item.price).toLocaleString()}</span>
                {slipItems.length>1&&<button onClick={()=>setSlipItems(slipItems.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:13}}>削除</button>}
              </div>
            </div>
          ))}
          <button onClick={()=>setSlipItems([...slipItems,{name:"",qty:1,price:0}])} style={{width:"100%",padding:"9px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)",marginBottom:14}}>＋ 品目を追加</button>

          {/* 合計 */}
          <div style={{background:"var(--bg-input)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
              <span style={{color:"var(--text-muted)"}}>小計</span><span style={{color:"var(--text-secondary)"}}>¥{slipSubtotal.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
              <span style={{color:"var(--text-muted)"}}>消費税（10%）</span><span style={{color:"var(--text-secondary)"}}>¥{slipTax.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid var(--border)"}}>
              <span style={{fontWeight:700,fontSize:15}}>合計</span>
              <span style={{color:"var(--accent)",fontSize:22,fontWeight:900}}>¥{slipTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* メモ */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>メモ（任意）</label>
            <input value={slipMemo} onChange={e=>setSlipMemo(e.target.value)} placeholder="客名・備考など" style={inp}/>
          </div>

          <button onClick={saveSlip} disabled={slipSaving} style={{...btnPrimary as any,background:slipSaved?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,var(--accent),var(--accent2))"}}>
            {slipSaved?"✓ 完了":slipSaving?"保存中...":editingSlipId?"✏️ 伝票を更新する":"伝票を保存する"}
          </button>
          </div>{/* sec close */}

          {/* 本日の伝票履歴 */}
          <div style={{marginTop:16}}>
            <button onClick={()=>setShowHistory(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 14px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",fontFamily:"var(--font)"}}>
              <span style={{fontWeight:700,fontSize:13,color:"var(--text-primary)"}}>
                📋 {slipDate === getDateStr(new Date()) ? "本日" : slipDate}の伝票履歴
                {todaySlips.length > 0 && <span style={{marginLeft:8,fontSize:12,color:"var(--accent)"}}>
                  {todaySlips.length}件 ¥{todaySlips.reduce((s:number,sl:any)=>s+sl.total,0).toLocaleString()}
                </span>}
              </span>
              <span style={{color:"var(--text-muted)"}}>{showHistory?"▲":"▼"}</span>
            </button>

            {showHistory && (
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
                {todaySlips.length === 0 ? (
                  <div style={{textAlign:"center",color:"var(--text-muted)",padding:"20px 0",fontSize:13}}>まだ伝票がありません</div>
                ) : todaySlips.map((slip:any, idx:number) => {
                  const castNames = (slip.cast_entries||[]).map((c:any)=>{
                    const cast = casts.find(x=>String(x.id)===String(c.cast_id));
                    return cast ? `${cast.name}(${c.type})` : null;
                  }).filter(Boolean).join("・");
                  const timeStr = new Date(slip.created_at).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
                  return (
                    <div key={slip.id} style={{background:"var(--bg-card)",border:`1px solid ${editingSlipId===slip.id?"var(--accent)":"var(--border)"}`,borderRadius:12,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <span style={{fontSize:12,color:"var(--text-muted)",marginRight:8}}>#{todaySlips.length-idx}</span>
                          <span style={{fontSize:12,color:"var(--text-muted)"}}>{timeStr}</span>
                          <span style={{marginLeft:8,fontSize:12,background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"1px 8px",color:"var(--text-secondary)"}}>{slip.payment}</span>
                        </div>
                        <span style={{fontWeight:900,fontSize:16,color:"var(--accent)"}}>¥{slip.total.toLocaleString()}</span>
                      </div>
                      {castNames && <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:4}}>👤 {castNames}</div>}
                      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:8}}>
                        {(slip.items||[]).map((item:any)=>`${item.name}×${item.qty}`).join("　")}
                      </div>
                      {slip.memo && <div style={{fontSize:11,color:"var(--text-hint)",marginBottom:8}}>📝 {slip.memo}</div>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>startEdit(slip)} style={{flex:1,padding:"6px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-secondary)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>✏️ 修正</button>
                        <button onClick={()=>deleteSlip(slip)} style={{padding:"6px 12px",background:"#ff444418",border:"1px solid #ff444444",borderRadius:8,color:"#ff4444",fontSize:12,cursor:"pointer"}}>削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== キャスト売上 ===== */}
      {view==="cast_sales"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>→</button>
          </div>
          {loading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(
            <>
              {/* キャスト別売上カード */}
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                {casts.map(cast=>{
                  const d = calcCastMonthly(cast);
                  const ratio = d.totalPay>0 ? d.sales/d.totalPay*100 : 0;
                  const mySales = allCastSales.filter(s=>s.cast_id===cast.id);
                  return (
                    <div key={cast.id} style={{...sectionStyle,marginBottom:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontWeight:700,fontSize:15,color:"var(--text-primary)"}}>{cast.name}</span>
                        <span style={{fontSize:11,padding:"2px 10px",borderRadius:10,fontWeight:700,
                          background:ratio>=100?"var(--online-bg)":ratio>=70?"#f59e0b22":"#ff444418",
                          color:ratio>=100?"var(--online)":ratio>=70?"#f59e0b":"#ff4444",
                          border:`1px solid ${ratio>=100?"var(--online-border)":ratio>=70?"#f59e0b44":"#ff444444"}`}}>
                          {d.totalPay>0?`売上/給与 ${ratio.toFixed(0)}%`:"記録なし"}
                        </span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:d.days>0?10:0}}>
                        {[["出勤",`${d.days}日`],["本指名",`¥${d.honshimei.toLocaleString()}`],["場内",`¥${d.baai.toLocaleString()}`],["同伴",`¥${d.douhan.toLocaleString()}`]].map(([l,v])=>(
                          <div key={l} style={{background:"var(--bg-input)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{l}</div>
                            <div style={{fontSize:13,fontWeight:700,color:"var(--text-secondary)"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {mySales.length>0&&(
                        <div style={{fontSize:12}}>
                          {mySales.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(s=>{
                            const t = SALES_TYPE_LABELS[s.sales_type];
                            return (
                              <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:"1px solid var(--border)",color:"var(--text-muted)"}}>
                                <span>{fmtDate(s.date)} {t?.icon} {t?.label}</span>
                                <span style={{color:"var(--accent)",fontWeight:600}}>¥{s.amount.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== 売上表 ===== */}
      {view==="sales"&&(
        <div>
          {/* 月ナビ + 日次/月次切替 */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>→</button>
            <div style={{marginLeft:"auto",display:"flex",gap:6}}>
              {(["daily","monthly"] as const).map(p=>(
                <button key={p} onClick={()=>setSalesPeriod(p)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"var(--font)",background:salesPeriod===p?"var(--accent)":"var(--bg-input)",color:salesPeriod===p?"#fff":"var(--text-secondary)",border:`1px solid ${salesPeriod===p?"transparent":"var(--border)"}`}}>
                  {p==="daily"?"日次":"月次"}
                </button>
              ))}
            </div>
          </div>

          {loading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(
            <>
              {/* 月次サマリー（常に表示） */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
                {[
                  {label:"月次売上",value:totalMonthlySales,color:"var(--accent)"},
                  {label:"純利益",value:totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll,color:(totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll)>=0?"var(--online)":"#ff4444"},
                  {label:"人件費",value:totalMonthlyPayroll,color:"#f59e0b"},
                  {label:"仕入・経費",value:totalMonthlyCost,color:"#f59e0b"},
                ].map(s=>(
                  <div key={s.label} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{s.label}</div>
                    <div style={{fontSize:16,fontWeight:900,color:s.color}}>¥{s.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* 日次表示 */}
              {salesPeriod==="daily"&&(
                <div>
                  {/* 日次ナビ */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <button onClick={()=>setDailyDate(addDays(dailyDate,-1))} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前日</button>
                    <span style={{flex:1,textAlign:"center",fontWeight:700,color:"var(--text-primary)"}}>{fmtDateLong(dailyDate)}</span>
                    <button onClick={()=>setDailyDate(addDays(dailyDate,1))} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>翌日 →</button>
                    <button onClick={()=>setDailyDate(getDateStr(new Date()))} style={{padding:"7px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>今日</button>
                  </div>

                  {/* 日次売上 */}
                  <div style={{...sectionStyle,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>売上詳細</div>
                    {dailyRecord ? (
                      <div style={{fontSize:13}}>
                        {[["現金売上",dailyRecord.cash_sales||0],["カード売上",dailyRecord.card_sales||0],["仕入・経費",-(dailyRecord.cost||0)],["キャスト給与",-dailyPayroll]].map(([l,v])=>(
                          <div key={l as string} style={{display:"flex",justifyContent:"space-between",marginBottom:6,color:(v as number)<0?"#f59e0b":"var(--text-secondary)"}}>
                            <span>{l as string}</span><span style={{fontWeight:600}}>{(v as number)>=0?"":"-"}¥{Math.abs(v as number).toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid var(--border)",fontWeight:700}}>
                          <span>純利益</span>
                          <span style={{color:dailySalesTotal-dailyPayroll-(dailyRecord.cost||0)>=0?"var(--online)":"#ff4444",fontSize:15}}>¥{(dailySalesTotal-(dailyRecord.cost||0)-dailyPayroll).toLocaleString()}</span>
                        </div>
                      </div>
                    ):<div style={{textAlign:"center",color:"var(--text-muted)",padding:"16px 0",fontSize:13}}>この日の記録はありません</div>}
                  </div>

                  {/* 日次キャスト売上表 */}
                  {allCastSales.filter(s=>s.date===dailyDate).length>0&&(
                    <div style={sectionStyle}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>キャスト売上</div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:"var(--bg-input)"}}>
                              {["キャスト","種別","金額","メモ"].map((h,i)=>(
                                <th key={h} style={{padding:"8px",textAlign:i===0?"left":"right",color:"var(--text-muted)",borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allCastSales.filter(s=>s.date===dailyDate).map(s=>{
                              const cast = casts.find(c=>c.id===s.cast_id);
                              const t = SALES_TYPE_LABELS[s.sales_type];
                              return (
                                <tr key={s.id} style={{borderBottom:"1px solid var(--border)"}}>
                                  <td style={{padding:"8px",fontWeight:700,color:"var(--text-primary)"}}>{cast?.name||"—"}</td>
                                  <td style={{padding:"8px",textAlign:"right",color:"var(--text-secondary)"}}>{t?.icon} {t?.label}</td>
                                  <td style={{padding:"8px",textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥{s.amount.toLocaleString()}</td>
                                  <td style={{padding:"8px",textAlign:"right",color:"var(--text-muted)",fontSize:11}}>{s.memo}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 月次表示 */}
              {salesPeriod==="monthly"&&(
                <div>
                  {/* 日次一覧 */}
                  <div style={{...sectionStyle,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>日次売上一覧</div>
                    {activeDates.length===0?<div style={{textAlign:"center",color:"var(--text-muted)",padding:"16px 0",fontSize:13}}>記録なし</div>:
                      activeDates.map(date=>{
                        const d = allDailySales.find(s=>s.date===date)!;
                        const total = (d.cash_sales||0)+(d.card_sales||0);
                        return (
                          <div key={date} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                            <span style={{color:"var(--text-primary)",fontWeight:600}}>{fmtDate(date)}</span>
                            <div style={{display:"flex",gap:12,alignItems:"center"}}>
                              {(d.cash_sales||0)>0&&<span style={{color:"var(--text-muted)",fontSize:11}}>現 ¥{d.cash_sales.toLocaleString()}</span>}
                              {(d.card_sales||0)>0&&<span style={{color:"var(--text-muted)",fontSize:11}}>カ ¥{d.card_sales.toLocaleString()}</span>}
                              <span style={{color:"var(--accent)",fontWeight:700}}>¥{total.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>

                  {/* キャスト別成績表 */}
                  <div style={{...sectionStyle,overflowX:"auto"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)"}}>キャスト売上・給与</div>
                      <button onClick={()=>printPayslips()} style={{padding:"6px 14px",borderRadius:8,background:"var(--accent)22",border:"1px solid var(--accent)44",color:"var(--accent)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        🖨️ 給与明細を印刷
                      </button>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:520}}>
                      <thead>
                        <tr style={{background:"var(--bg-input)"}}>
                          {["キャスト","出勤","本指名","場内","同伴","売上計","給与","比率"].map((h,i)=>(
                            <th key={h} style={{padding:"8px",textAlign:i===0?"left":"right",color:"var(--text-muted)",fontWeight:700,whiteSpace:"nowrap",borderBottom:"1px solid var(--border)"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {casts.map(cast=>{
                          const d = calcCastMonthly(cast);
                          const ratio = d.totalPay>0 ? d.sales/d.totalPay*100 : 0;
                          return (
                            <tr key={cast.id} style={{borderBottom:"1px solid var(--border)"}}>
                              <td style={{padding:"9px 8px",fontWeight:700,color:"var(--text-primary)"}}>{cast.name}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>{d.days}日</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.honshimei.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.baai.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.douhan.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥{d.sales.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"#f59e0b",fontWeight:700}}>¥{d.totalPay.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",fontWeight:800,color:ratio>=100?"var(--online)":ratio>=70?"#f59e0b":"#ff4444"}}>
                                {d.totalPay>0?`${ratio.toFixed(0)}%`:"—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== 品名管理 ===== */}
      {view==="menu"&&(
        <div>
          {/* 追加フォーム */}
          <div style={sec}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.08em"}}>品名を追加</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr auto",gap:8,alignItems:"end"}}>
              <div>
                <label style={labelStyle}>品名</label>
                <input value={newMenuName} onChange={e=>setNewMenuName(e.target.value)} placeholder="例: 赤ワイン" style={inp}/>
              </div>
              <div>
                <label style={labelStyle}>単価（¥）</label>
                <input type="number" value={newMenuPrice} onChange={e=>setNewMenuPrice(e.target.value)} placeholder="0" style={inp}/>
              </div>
              <button onClick={async()=>{
                if(!newMenuName) return;
                const res = await fetch("/api/shop-menus",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,name:newMenuName,price:Number(newMenuPrice)||0})});
                if(res.ok){setNewMenuName("");setNewMenuPrice("");await loadMenus();setMsg("追加しました");}
              }} style={{...btnPrimary as any,width:"auto",padding:"10px 16px",fontSize:13}}>追加</button>
            </div>
          </div>

          {/* 品名一覧（DB + デフォルト統合表示） */}
          <div style={sec}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10,letterSpacing:"0.08em"}}>品名一覧</div>
            {/* DB品名（デフォルト含む） */}
            {shopMenus.map(m=>(
              <div key={m.id} style={{borderBottom:"1px solid var(--border)",padding:"6px 0"}}>
                {editingId===m.id ? (
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr auto auto",gap:6,alignItems:"center"}}>
                    <input value={editName} onChange={e=>setEditName(e.target.value)} style={{...inp,fontSize:12}}/>
                    <input type="number" value={editPrice} onChange={e=>setEditPrice(e.target.value)} style={{...inp,fontSize:12}}/>
                    <button onClick={async()=>{
                      await fetch("/api/shop-menus",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:m.id,name:editName,price:Number(editPrice)||0})});
                      await loadMenus(); setEditingId(null);
                    }} style={{padding:"6px 10px",background:"var(--online-bg)",border:"1px solid var(--online-border)",borderRadius:6,color:"var(--online)",fontSize:11,cursor:"pointer"}}>保存</button>
                    <button onClick={()=>setEditingId(null)} style={{padding:"6px 10px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-muted)",fontSize:11,cursor:"pointer"}}>✕</button>
                  </div>
                ) : (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                    <span style={{color:"var(--text-primary)"}}>{m.name}</span>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{color:"var(--text-muted)"}}>¥{m.price.toLocaleString()}</span>
                      <button onClick={()=>{setEditingId(m.id);setEditName(m.name);setEditPrice(String(m.price));}} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-muted)",padding:"2px 8px",fontSize:11,cursor:"pointer"}}>編集</button>
                      <button onClick={async()=>{
                        await fetch("/api/shop-menus",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:m.id})});
                        await loadMenus();
                      }} style={{background:"#ff444418",border:"1px solid #ff444444",color:"#ff4444",padding:"2px 8px",borderRadius:6,fontSize:11,cursor:"pointer"}}>削除</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
