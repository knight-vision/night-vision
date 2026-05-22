"use client";
import { useState, useEffect } from "react";

type Cast = { id: number; name: string; hourly_wage: number | null };
type DailySales = {
  id?: string; date: string; opening_cash: number; cash_sales: number;
  card_sales: number; invoice_sales: number; cost: number; memo: string;
};
type CastSale = {
  id?: string; cast_id: number; date: string; sales_type: string;
  amount: number; count: number; memo: string;
};
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string };
type Allowance = { cast_id: number; date: string; amount: number; label: string };

// 伝票入力
type SlipItem = { name: string; qty: number; price: number };
type SlipCast = { cast_id: string; type: string; timeFrom: string; timeTo: string };

const MENU_PRESETS = [
  { name: "セット料金", price: 3000 },
  { name: "ビール", price: 800 },
  { name: "ハイボール", price: 800 },
  { name: "ソフトドリンク", price: 600 },
  { name: "シャンパン（モエ）", price: 35000 },
  { name: "ドンペリ（白）", price: 80000 },
  { name: "ドンペリ（黒）", price: 120000 },
  { name: "場内指名料", price: 1000 },
  { name: "同伴料", price: 2000 },
  { name: "延長料", price: 3000 },
];
const SHIMEI_TYPES = ["フリー", "場内指名", "本指名"];
const PAYMENT_TYPES = ["現金", "カード", "請求書"];
const TAX_RATE = 0.1;

const SALES_TYPES = [
  { key: "honshimei", label: "本指名", icon: "⭐" },
  { key: "baai", label: "場内指名", icon: "🎯" },
  { key: "douhan", label: "同伴", icon: "🚗" },
  { key: "bottle", label: "ボトルバック", icon: "🍾" },
  { key: "other", label: "その他", icon: "📝" },
];

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtDate(ds: string) {
  const d = new Date(ds+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function calcMinutes(start: string, end: string) {
  const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number);
  let s=sh*60+sm, e=eh*60+em; if(e<=s) e+=24*60; return e-s;
}

type Props = {
  shopId: string; casts: Cast[];
  sectionStyle: React.CSSProperties; inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties; btnPrimary: React.CSSProperties;
};

export default function SalesTab({ shopId, casts, sectionStyle, inputStyle, labelStyle, btnPrimary }: Props) {
  const [view, setView] = useState<"slip"|"daily"|"cast"|"monthly">("slip");
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [selectedDate, setSelectedDate] = useState(getDateStr(new Date()));
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [castSales, setCastSales] = useState<CastSale[]>([]);
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 伝票入力state
  const [slipDate, setSlipDate] = useState(getDateStr(new Date()));
  const [tableNo, setTableNo] = useState("");
  const [payment, setPayment] = useState("現金");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([{ name: "", qty: 1, price: 0 }]);
  const [slipCasts, setSlipCasts] = useState<SlipCast[]>([{ cast_id: "", type: "フリー", timeFrom: "", timeTo: "" }]);
  const [slipMemo, setSlipMemo] = useState("");
  const [slipSaving, setSlipSaving] = useState(false);
  const [slipSaved, setSlipSaved] = useState(false);

  // 日次入力フォーム
  const [form, setForm] = useState<DailySales>({ date: getDateStr(new Date()), opening_cash:0, cash_sales:0, card_sales:0, invoice_sales:0, cost:0, memo:"" });
  // キャスト売上入力
  const [castForm, setCastForm] = useState({ cast_id:"", sales_type:"honshimei", amount:"", count:"1", memo:"", date: getDateStr(new Date()) });

  // 伝票の計算
  const slipSubtotal = slipItems.reduce((s,i) => s + i.qty * i.price, 0);
  const slipTax = Math.floor(slipSubtotal * TAX_RATE);
  const slipTotal = slipSubtotal + slipTax;

  const addSlipItem = () => setSlipItems([...slipItems, { name: "", qty: 1, price: 0 }]);
  const removeSlipItem = (i: number) => setSlipItems(slipItems.filter((_,idx)=>idx!==i));
  const updateSlipItem = (i: number, field: keyof SlipItem, val: any) => setSlipItems(slipItems.map((item,idx)=>idx===i?{...item,[field]:val}:item));
  const applyPreset = (i: number, preset: typeof MENU_PRESETS[number]) => setSlipItems(slipItems.map((item,idx)=>idx===i?{...item,name:preset.name,price:preset.price}:item));

  const addSlipCast = () => setSlipCasts([...slipCasts, { cast_id: "", type: "フリー", timeFrom: "", timeTo: "" }]);
  const removeSlipCast = (i: number) => setSlipCasts(slipCasts.filter((_,idx)=>idx!==i));
  const updateSlipCast = (i: number, field: keyof SlipCast, val: string) => setSlipCasts(slipCasts.map((c,idx)=>idx===i?{...c,[field]:val}:c));

  const saveSlip = async () => {
    setSlipSaving(true); setMsg("");
    try {
      // 日次売上に加算
      const res = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${slipDate.slice(0,7)}`);
      const existing = res.ok ? (await res.json()).find((d: DailySales) => d.date === slipDate) : null;
      const newCash = (existing?.cash_sales||0) + (payment==="現金" ? slipTotal : 0);
      const newCard = (existing?.card_sales||0) + (payment==="カード" ? slipTotal : 0);
      const newInvoice = (existing?.invoice_sales||0) + (payment==="請求書" ? slipTotal : 0);
      await fetch("/api/daily-sales", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ shop_id: shopId, date: slipDate, opening_cash: existing?.opening_cash||0, cash_sales: newCash, card_sales: newCard, invoice_sales: newInvoice, cost: existing?.cost||0, memo: existing?.memo||"" }),
      });

      // キャスト売上に反映
      for (const c of slipCasts) {
        if (!c.cast_id) continue;
        const salesType = c.type==="本指名"?"honshimei":c.type==="場内指名"?"baai":null;
        if (salesType) {
          const shimeiFee = slipItems.find(i=>i.name.includes("指名"));
          await fetch("/api/cast-sales", { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ shop_id: shopId, cast_id: Number(c.cast_id), date: slipDate, sales_type: salesType, amount: shimeiFee ? shimeiFee.qty*shimeiFee.price : (salesType==="honshimei"?16000:1000), count: 1, memo: `テーブル${tableNo}` }) });
        }
        const douhanItem = slipItems.find(i=>i.name.includes("同伴"));
        if (douhanItem) {
          await fetch("/api/cast-sales", { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ shop_id: shopId, cast_id: Number(c.cast_id), date: slipDate, sales_type: "douhan", amount: douhanItem.qty*douhanItem.price, count: 1, memo: `テーブル${tableNo}` }) });
        }
        const bottleItem = slipItems.find(i=>i.name.includes("モエ")||i.name.includes("ドンペリ")||i.name.includes("シャンパン"));
        if (bottleItem) {
          const back = Math.floor(bottleItem.qty*bottleItem.price*0.1);
          await fetch("/api/cast-sales", { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ shop_id: shopId, cast_id: Number(c.cast_id), date: slipDate, sales_type: "bottle", amount: back, count: 1, memo: `${bottleItem.name}(10%バック)` }) });
        }
      }

      setSlipSaved(true);
      setMsg(`✅ 伝票を保存しました（¥${slipTotal.toLocaleString()}）`);
      setTimeout(()=>{ setSlipSaved(false); setSlipItems([{name:"",qty:1,price:0}]); setSlipCasts([{cast_id:"",type:"フリー",timeFrom:"",timeTo:""}]); setTableNo(""); setSlipMemo(""); setPayment("現金"); }, 1500);
      await loadAll();
    } catch(e: any) { setMsg("保存に失敗しました: " + e.message); }
    setSlipSaving(false);
  };

  const loadAll = async () => {
    setLoading(true);
    const [y,m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const end = `${month}-31`;
    const [dsRes, csRes, shiftRes, allowRes] = await Promise.all([
      fetch(`/api/daily-sales?shop_id=${shopId}&month=${month}`),
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${month}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`),
      fetch(`/api/cast-allowances?shop_id=${shopId}&month=${month}`),
    ]);
    if (dsRes.ok) setDailySales(await dsRes.json());
    if (csRes.ok) setCastSales(await csRes.json());
    if (shiftRes.ok) { const d = await shiftRes.json(); setShifts(d.confirmed||[]); }
    if (allowRes.ok) setAllowances(await allowRes.json());
    setLoading(false);
  };

  const saveDailySales = async () => {
    const res = await fetch("/api/daily-sales", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, shop_id: shopId }),
    });
    if (res.ok) { setMsg("保存しました"); await loadAll(); }
    else setMsg("保存に失敗しました");
  };

  const saveCastSale = async () => {
    if (!castForm.cast_id || !castForm.amount) { setMsg("キャストと金額を入力してください"); return; }
    const res = await fetch("/api/cast-sales", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...castForm, shop_id: shopId, amount: Number(castForm.amount), count: Number(castForm.count) }),
    });
    if (res.ok) { setMsg("追加しました"); setCastForm(p => ({...p, amount:"", memo:"", count:"1"})); await loadAll(); }
    else setMsg("追加に失敗しました");
  };

  const deleteCastSale = async (id: string) => {
    await fetch("/api/cast-sales", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({id}) });
    await loadAll();
  };

  // 月の日付一覧
  const [y,m2] = month.split("-").map(Number);
  const monthDates: string[] = [];
  const dd = new Date(y, m2-1, 1);
  while (dd.getMonth()===m2-1) { monthDates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }

  // キャスト別集計
  const calcCastMonthly = (cast: Cast) => {
    const myShifts = shifts.filter(s=>s.cast_id===cast.id);
    const totalMins = myShifts.reduce((s,sh)=>s+calcMinutes(sh.start_time,sh.end_time),0);
    const baseWage = cast.hourly_wage ? Math.round(cast.hourly_wage * totalMins / 60) : 0;
    const myAllowances = allowances.filter(a=>a.cast_id===cast.id);
    const allowanceTotal = myAllowances.reduce((s,a)=>s+a.amount,0);
    const mySales = castSales.filter(s=>s.cast_id===cast.id);
    const salesTotal = mySales.reduce((s,c)=>s+c.amount,0);
    const bottleBack = mySales.filter(s=>s.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
    const totalPay = baseWage + allowanceTotal + bottleBack;
    const days = myShifts.length;
    return { days, totalMins, baseWage, allowanceTotal, bottleBack, salesTotal, totalPay, mySales };
  };

  // 月次合計
  const totalDailySales = dailySales.reduce((s,d)=>s+(d.cash_sales||0)+(d.card_sales||0)+(d.invoice_sales||0),0);
  const totalCost = dailySales.reduce((s,d)=>s+(d.cost||0),0);
  const totalPayroll = casts.reduce((s,c)=>s+calcCastMonthly(c).totalPay,0);
  const profit = totalDailySales - totalCost - totalPayroll;

  const inp: React.CSSProperties = {...inputStyle as any, padding:"8px 10px", fontSize:13};
  const today = getDateStr(new Date());

  // 日次入力フォームを選択日付で初期化
  const loadDayForm = (date: string) => {
    const existing = dailySales.find(d=>d.date===date);
    setForm(existing || { date, opening_cash:0, cash_sales:0, card_sales:0, invoice_sales:0, cost:0, memo:"" });
    setCastForm(p=>({...p, date}));
    setSelectedDate(date);
  };

  return (
    <div>
      {/* サブナビ */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[
          {key:"slip",label:"📋 伝票入力"},
          {key:"daily",label:"📊 日次入力"},
          {key:"cast",label:"⭐ キャスト売上"},
          {key:"monthly",label:"💹 月次集計"},
        ].map(v=>(
          <button key={v.key} onClick={()=>setView(v.key as any)} style={{
            padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,
            fontWeight:view===v.key?700:500,
            background:view===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
            border:`1px solid ${view===v.key?"transparent":"var(--border)"}`,
            color:view===v.key?"#fff":"var(--text-secondary)",
          }}>{v.label}</button>
        ))}
        {/* 月ナビ */}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>←</button>
          <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
          <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>→</button>
        </div>
      </div>

      {msg && <div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,fontSize:13,background:msg.includes("失敗")?"#ff444418":"var(--online-bg)",border:`1px solid ${msg.includes("失敗")?"#ff444444":"var(--online-border)"}`,color:msg.includes("失敗")?"#ff4444":"var(--online)"}}>{msg}</div>}

      {loading && <div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>}

      {/* ===== 伝票入力 ===== */}
      {view==="slip"&&(
        <div>
          {/* 基本情報 */}
          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>基本情報</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={labelStyle}>日付</label><input type="date" value={slipDate} onChange={e=>setSlipDate(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>テーブル No.</label><input value={tableNo} onChange={e=>setTableNo(e.target.value)} placeholder="例: A-3" style={inputStyle}/></div>
            </div>
            <div>
              <label style={labelStyle}>支払方法</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {PAYMENT_TYPES.map(p=>(
                  <button key={p} onClick={()=>setPayment(p)} style={{
                    padding:"8px 20px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,
                    background:payment===p?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
                    color:payment===p?"#fff":"var(--text-secondary)",
                    border:payment===p?"1px solid transparent":"1px solid var(--border)",
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* キャスト */}
          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>キャスト</div>
            {slipCasts.map((c,i)=>(
              <div key={i} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:8,position:"relative"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <label style={labelStyle}>キャスト名</label>
                    <select value={c.cast_id} onChange={e=>updateSlipCast(i,"cast_id",e.target.value)} style={inputStyle}>
                      <option value="">選択...</option>
                      {casts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>指名種別</label>
                    <select value={c.type} onChange={e=>updateSlipCast(i,"type",e.target.value)} style={inputStyle}>
                      {SHIMEI_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>入店時刻</label>
                    <input type="time" value={c.timeFrom} onChange={e=>updateSlipCast(i,"timeFrom",e.target.value)} style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>退店時刻</label>
                    <input type="time" value={c.timeTo} onChange={e=>updateSlipCast(i,"timeTo",e.target.value)} style={inputStyle}/>
                  </div>
                </div>
                {slipCasts.length>1&&<button onClick={()=>removeSlipCast(i)} style={{position:"absolute",top:8,right:12,background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:18}}>×</button>}
              </div>
            ))}
            <button onClick={addSlipCast} style={{width:"100%",padding:"10px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)"}}>＋ キャストを追加</button>
          </div>

          {/* 注文品目 */}
          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>注文品目</div>
            {slipItems.map((item,i)=>(
              <div key={i} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:8,position:"relative"}}>
                {/* プリセット */}
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {MENU_PRESETS.map(p=>(
                    <button key={p.name} onClick={()=>applyPreset(i,p)} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:5,color:"var(--text-muted)",fontSize:11,padding:"3px 8px",cursor:"pointer",whiteSpace:"nowrap"}}>{p.name}</button>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"2fr 70px 110px",gap:10}}>
                  <div>
                    <label style={labelStyle}>品目名</label>
                    <input value={item.name} onChange={e=>updateSlipItem(i,"name",e.target.value)} placeholder="品目を入力" style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>数量</label>
                    <input type="number" min={1} value={item.qty} onChange={e=>updateSlipItem(i,"qty",Number(e.target.value))} style={{...inputStyle,textAlign:"center"}}/>
                  </div>
                  <div>
                    <label style={labelStyle}>単価（¥）</label>
                    <input type="number" min={0} value={item.price||""} onChange={e=>updateSlipItem(i,"price",Number(e.target.value))} style={{...inputStyle,textAlign:"right"}}/>
                  </div>
                </div>
                <div style={{textAlign:"right",marginTop:6,color:"var(--accent)",fontSize:12,fontWeight:600}}>小計: ¥{(item.qty*item.price).toLocaleString()}</div>
                {slipItems.length>1&&<button onClick={()=>removeSlipItem(i)} style={{position:"absolute",top:8,right:12,background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:18}}>×</button>}
              </div>
            ))}
            <button onClick={addSlipItem} style={{width:"100%",padding:"10px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)"}}>＋ 品目を追加</button>
          </div>

          {/* 合計 */}
          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
              <span style={{color:"var(--text-muted)"}}>小計</span><span style={{color:"var(--text-secondary)"}}>¥{slipSubtotal.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:13}}>
              <span style={{color:"var(--text-muted)"}}>消費税（10%）</span><span style={{color:"var(--text-secondary)"}}>¥{slipTax.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--border)"}}>
              <span style={{color:"var(--text-primary)",fontSize:16,fontWeight:700}}>合計</span>
              <span style={{color:"var(--accent)",fontSize:24,fontWeight:900}}>¥{slipTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* メモ */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>メモ</label>
            <textarea value={slipMemo} onChange={e=>setSlipMemo(e.target.value)} placeholder="特記事項など..." rows={2} style={{...inputStyle,resize:"vertical",fontFamily:"var(--font)"}}/>
          </div>

          {/* 保存ボタン */}
          <button onClick={saveSlip} disabled={slipSaving} style={{
            ...btnPrimary as any, width:"100%", fontSize:15,
            background:slipSaved?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,var(--accent),var(--accent2))",
          }}>
            {slipSaved?"✓ 保存しました":slipSaving?"保存中...":"伝票を保存する"}
          </button>
        </div>
      )}

      {/* ===== 日次入力 ===== */}
      {view==="daily"&&!loading&&(
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {/* 日付リスト */}
          <div style={{flex:"0 0 160px",display:"flex",flexDirection:"column",gap:4}}>
            {monthDates.map(date=>{
              const ds = dailySales.find(d=>d.date===date);
              const isToday = date===today;
              return (
                <button key={date} onClick={()=>loadDayForm(date)} style={{
                  padding:"8px 10px",borderRadius:8,textAlign:"left",cursor:"pointer",
                  background:selectedDate===date?"var(--accent)22":"var(--bg-input)",
                  border:`1px solid ${selectedDate===date?"var(--accent)":"var(--border)"}`,
                  color:selectedDate===date?"var(--accent)":isToday?"var(--accent)":"var(--text-secondary)",
                  fontFamily:"var(--font)",fontSize:12,fontWeight:isToday?700:400,
                }}>
                  {fmtDate(date)}
                  {ds && <span style={{display:"block",fontSize:10,color:"var(--online)",marginTop:1}}>
                    ¥{((ds.cash_sales||0)+(ds.card_sales||0)+(ds.invoice_sales||0)).toLocaleString()}
                  </span>}
                </button>
              );
            })}
          </div>

          {/* 入力フォーム */}
          <div style={{flex:1,minWidth:280}}>
            <div style={{...sectionStyle,marginBottom:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:14}}>
                📋 {fmtDate(form.date)} の日次入力
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                {[
                  {key:"opening_cash",label:"開始金"},
                  {key:"cash_sales",label:"現金売上"},
                  {key:"card_sales",label:"カード売上"},
                  {key:"invoice_sales",label:"請求書"},
                  {key:"cost",label:"仕入・経費"},
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{...labelStyle,fontSize:11}}>{f.label}</label>
                    <input type="number" value={(form as any)[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:Number(e.target.value)||0}))} style={inp} />
                  </div>
                ))}
                <div>
                  <label style={{...labelStyle,fontSize:11}}>メモ</label>
                  <input type="text" value={form.memo} onChange={e=>setForm(p=>({...p,memo:e.target.value}))} style={inp} placeholder="備考など" />
                </div>
              </div>
              {/* 日次サマリー */}
              <div style={{background:"var(--bg-input)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"var(--text-muted)"}}>売上合計</span>
                  <span style={{color:"var(--text-primary)",fontWeight:700}}>¥{((form.cash_sales||0)+(form.card_sales||0)+(form.invoice_sales||0)).toLocaleString()}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"var(--text-muted)"}}>仕入・経費</span>
                  <span style={{color:"#ff4444"}}>-¥{(form.cost||0).toLocaleString()}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid var(--border)",paddingTop:6,marginTop:4}}>
                  <span style={{color:"var(--text-muted)",fontWeight:700}}>純利益（仕入除く）</span>
                  <span style={{color:"var(--accent)",fontWeight:800}}>¥{((form.cash_sales||0)+(form.card_sales||0)+(form.invoice_sales||0)-(form.cost||0)).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={saveDailySales} style={btnPrimary as any}>💾 保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== キャスト売上入力 ===== */}
      {view==="cast"&&!loading&&(
        <div>
          {/* 入力フォーム */}
          <div style={{...sectionStyle,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:14}}>⭐ キャスト売上を追加</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div>
                <label style={{...labelStyle,fontSize:11}}>日付</label>
                <input type="date" value={castForm.date} onChange={e=>setCastForm(p=>({...p,date:e.target.value}))} style={{...inp,minWidth:130}} />
              </div>
              <div>
                <label style={{...labelStyle,fontSize:11}}>キャスト</label>
                <select value={castForm.cast_id} onChange={e=>setCastForm(p=>({...p,cast_id:e.target.value}))} style={{...inp,minWidth:90}}>
                  <option value="">選択</option>
                  {casts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{...labelStyle,fontSize:11}}>種別</label>
                <select value={castForm.sales_type} onChange={e=>setCastForm(p=>({...p,sales_type:e.target.value}))} style={{...inp,minWidth:110}}>
                  {SALES_TYPES.map(t=><option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{...labelStyle,fontSize:11}}>件数</label>
                <input type="number" value={castForm.count} onChange={e=>setCastForm(p=>({...p,count:e.target.value}))} style={{...inp,width:60}} min="1" />
              </div>
              <div>
                <label style={{...labelStyle,fontSize:11}}>金額（円）</label>
                <input type="number" value={castForm.amount} onChange={e=>setCastForm(p=>({...p,amount:e.target.value}))} style={{...inp,minWidth:100}} placeholder="例: 5000" />
              </div>
              <div>
                <label style={{...labelStyle,fontSize:11}}>メモ</label>
                <input type="text" value={castForm.memo} onChange={e=>setCastForm(p=>({...p,memo:e.target.value}))} style={{...inp,minWidth:100}} placeholder="客名など" />
              </div>
              <button onClick={saveCastSale} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>追加</button>
            </div>
          </div>

          {/* 日別キャスト売上一覧 */}
          {monthDates.filter(date=>castSales.some(s=>s.date===date)).map(date=>(
            <div key={date} style={{...sectionStyle,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:8}}>{fmtDate(date)}</div>
              {castSales.filter(s=>s.date===date).map(sale=>{
                const cast = casts.find(c=>c.id===sale.cast_id);
                const typeLabel = SALES_TYPES.find(t=>t.key===sale.sales_type);
                return (
                  <div key={sale.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                    <span style={{fontWeight:700,color:"var(--accent)",minWidth:60,fontSize:13}}>{cast?.name}</span>
                    <span style={{fontSize:12,color:"var(--text-muted)",minWidth:80}}>{typeLabel?.icon} {typeLabel?.label}</span>
                    <span style={{fontSize:12,color:"var(--text-secondary)"}}>×{sale.count}件</span>
                    <span style={{fontWeight:700,color:"var(--text-primary)",flex:1}}>¥{sale.amount.toLocaleString()}</span>
                    {sale.memo&&<span style={{fontSize:11,color:"var(--text-hint)"}}>{sale.memo}</span>}
                    <button onClick={()=>sale.id&&deleteCastSale(sale.id)} style={{background:"#ff444418",border:"1px solid #ff444444",color:"#ff4444",padding:"2px 8px",borderRadius:6,fontSize:11,cursor:"pointer"}}>削除</button>
                  </div>
                );
              })}
            </div>
          ))}
          {castSales.length===0&&<div style={{textAlign:"center",color:"var(--text-muted)",padding:"32px 0",fontSize:13}}>キャスト売上データがありません</div>}
        </div>
      )}

      {/* ===== 月次集計 ===== */}
      {view==="monthly"&&!loading&&(
        <div>
          {/* 月次サマリーカード */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
            {[
              {label:"月次売上",value:totalDailySales,color:"var(--accent)"},
              {label:"人件費",value:totalPayroll,color:"#f59e0b"},
              {label:"利益（仕入・人件費除く）",value:profit,color:profit>=0?"var(--online)":"#ff4444"},
            ].map(s=>(
              <div key={s.label} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:20,fontWeight:900,color:s.color}}>¥{s.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* キャスト別成績表 */}
          <div style={sectionStyle}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12}}>キャスト別成績・給与</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"var(--bg-input)"}}>
                    {["キャスト","出勤","基本給","手当","ボトルバック","支払合計","売上合計","売上/給与"].map(h=>(
                      <th key={h} style={{padding:"8px 10px",textAlign:"right",color:"var(--text-muted)",fontWeight:700,whiteSpace:"nowrap",borderBottom:"1px solid var(--border)"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {casts.map(cast=>{
                    const d = calcCastMonthly(cast);
                    const ratio = d.totalPay>0 ? (d.salesTotal/d.totalPay*100).toFixed(0) : "—";
                    const ratioNum = d.totalPay>0 ? d.salesTotal/d.totalPay*100 : 0;
                    return (
                      <tr key={cast.id} style={{borderBottom:"1px solid var(--border)"}}>
                        <td style={{padding:"10px",fontWeight:700,color:"var(--text-primary)",textAlign:"left"}}>{cast.name}</td>
                        <td style={{padding:"10px",textAlign:"right",color:"var(--text-secondary)"}}>{d.days}日</td>
                        <td style={{padding:"10px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.baseWage.toLocaleString()}</td>
                        <td style={{padding:"10px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.allowanceTotal.toLocaleString()}</td>
                        <td style={{padding:"10px",textAlign:"right",color:"#a855f7"}}>¥{d.bottleBack.toLocaleString()}</td>
                        <td style={{padding:"10px",textAlign:"right",color:"#f59e0b",fontWeight:700}}>¥{d.totalPay.toLocaleString()}</td>
                        <td style={{padding:"10px",textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥{d.salesTotal.toLocaleString()}</td>
                        <td style={{padding:"10px",textAlign:"right",fontWeight:800,color:ratioNum>=100?"var(--online)":ratioNum>=70?"#f59e0b":"#ff4444"}}>
                          {ratio}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:11,color:"var(--text-hint)",marginTop:8}}>
              売上/給与が100%以上のキャストは収益貢献、低いキャストは要改善
            </div>
          </div>

          {/* 日次売上詳細 */}
          <div style={{...sectionStyle,marginTop:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12}}>日次売上詳細</div>
            {dailySales.length===0 ? (
              <div style={{textAlign:"center",color:"var(--text-muted)",padding:"24px 0",fontSize:13}}>日次データがありません</div>
            ) : dailySales.map(d=>(
              <div key={d.date} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:12,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,color:"var(--text-primary)",minWidth:80}}>{fmtDate(d.date)}</span>
                <span style={{color:"var(--text-muted)"}}>現金 ¥{d.cash_sales?.toLocaleString()}</span>
                <span style={{color:"var(--text-muted)"}}>カード ¥{d.card_sales?.toLocaleString()}</span>
                {d.invoice_sales>0&&<span style={{color:"var(--text-muted)"}}>請求 ¥{d.invoice_sales?.toLocaleString()}</span>}
                {d.cost>0&&<span style={{color:"#ff4444"}}>仕入 -¥{d.cost?.toLocaleString()}</span>}
                <span style={{fontWeight:700,color:"var(--accent)",marginLeft:"auto"}}>¥{((d.cash_sales||0)+(d.card_sales||0)+(d.invoice_sales||0)).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
