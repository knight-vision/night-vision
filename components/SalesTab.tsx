"use client";
import { useState, useEffect } from "react";

type Cast = { id: number; name: string; hourly_wage: number | null };
type DailySales = { id?: string; date: string; cash_sales: number; card_sales: number; cost: number; memo: string; };
type CastSale = { id?: string; cast_id: number; date: string; sales_type: string; amount: number; count: number; memo: string; };
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string; };
type Allowance = { cast_id: number; date: string; amount: number; label: string; };
type SlipItem = { name: string; qty: number; price: number; };
type SlipCast = { cast_id: string; type: string; timeFrom: string; timeTo: string; };

const MENU_PRESETS = [
  { name: "セット料金", price: 3000 }, { name: "ビール", price: 800 },
  { name: "ハイボール", price: 800 }, { name: "ソフトドリンク", price: 600 },
  { name: "シャンパン（モエ）", price: 35000 }, { name: "ドンペリ（白）", price: 80000 },
  { name: "ドンペリ（黒）", price: 120000 }, { name: "場内指名料", price: 1000 },
  { name: "同伴料", price: 2000 }, { name: "延長料", price: 3000 },
];
const SHIMEI_TYPES = ["フリー", "場内指名", "本指名"];
const PAYMENT_TYPES = ["現金", "カード"];
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
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function calcMinutes(start: string, end: string) {
  const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number);
  let s=sh*60+sm, e=eh*60+em; if(e<=s) e+=24*60; return e-s;
}
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr+"T00:00:00"); d.setDate(d.getDate()+n); return getDateStr(d);
}

type Props = { shopId: string; casts: Cast[]; sectionStyle: React.CSSProperties; inputStyle: React.CSSProperties; labelStyle: React.CSSProperties; btnPrimary: React.CSSProperties; };

export default function SalesTab({ shopId, casts, sectionStyle, inputStyle, labelStyle, btnPrimary }: Props) {
  const [view, setView] = useState<"slip"|"daily"|"monthly">("slip");
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));

  // 日次入力state
  const [dailyDate, setDailyDate] = useState(getDateStr(new Date()));
  const [dailyData, setDailyData] = useState<DailySales>({ date: getDateStr(new Date()), cash_sales:0, card_sales:0, cost:0, memo:"" });
  const [dailyCastSales, setDailyCastSales] = useState<CastSale[]>([]);
  const [dailyShifts, setDailyShifts] = useState<ConfirmedShift[]>([]);
  const [dailyAllowances, setDailyAllowances] = useState<Allowance[]>([]);

  // 月次用
  const [allDailySales, setAllDailySales] = useState<DailySales[]>([]);
  const [allCastSales, setAllCastSales] = useState<CastSale[]>([]);
  const [allShifts, setAllShifts] = useState<ConfirmedShift[]>([]);
  const [allAllowances, setAllAllowances] = useState<Allowance[]>([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 伝票state
  const [slipDate, setSlipDate] = useState(getDateStr(new Date()));
  const [tableNo, setTableNo] = useState("");
  const [payment, setPayment] = useState("現金");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([{ name:"", qty:1, price:0 }]);
  const [slipCasts, setSlipCasts] = useState<SlipCast[]>([{ cast_id:"", type:"フリー", timeFrom:"", timeTo:"" }]);
  const [slipMemo, setSlipMemo] = useState("");
  const [slipSaving, setSlipSaving] = useState(false);
  const [slipSaved, setSlipSaved] = useState(false);

  const slipSubtotal = slipItems.reduce((s,i)=>s+i.qty*i.price,0);
  const slipTax = Math.floor(slipSubtotal*TAX_RATE);
  const slipTotal = slipSubtotal+slipTax;

  useEffect(() => { loadDaily(dailyDate); }, [dailyDate]);
  useEffect(() => { if(view==="monthly") loadMonthly(); }, [view, month]);

  const loadDaily = async (date: string) => {
    setLoading(true);
    const m = date.slice(0,7);
    const [y,mo] = m.split("-").map(Number);
    const [dsRes, csRes, shiftRes, allowRes] = await Promise.all([
      fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`),
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${m}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${mo}`),
      fetch(`/api/cast-allowances?shop_id=${shopId}&month=${m}`),
    ]);
    if (dsRes.ok) {
      const all = await dsRes.json();
      const d = all.find((x: DailySales) => x.date === date);
      setDailyData(d || { date, cash_sales:0, card_sales:0, cost:0, memo:"" });
    }
    if (csRes.ok) { const all = await csRes.json(); setDailyCastSales(all.filter((x: CastSale)=>x.date===date)); }
    if (shiftRes.ok) { const d = await shiftRes.json(); setDailyShifts((d.confirmed||[]).filter((x: ConfirmedShift)=>x.date===date)); }
    if (allowRes.ok) { const all = await allowRes.json(); setDailyAllowances(all.filter((x: Allowance)=>x.date===date)); }
    setLoading(false);
  };

  const loadMonthly = async () => {
    setLoading(true);
    const [y,m] = month.split("-").map(Number);
    const [dsRes, csRes, shiftRes, allowRes] = await Promise.all([
      fetch(`/api/daily-sales?shop_id=${shopId}&month=${month}`),
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${month}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`),
      fetch(`/api/cast-allowances?shop_id=${shopId}&month=${month}`),
    ]);
    if (dsRes.ok) setAllDailySales(await dsRes.json());
    if (csRes.ok) setAllCastSales(await csRes.json());
    if (shiftRes.ok) { const d = await shiftRes.json(); setAllShifts(d.confirmed||[]); }
    if (allowRes.ok) setAllAllowances(await allowRes.json());
    setLoading(false);
  };

  const saveDailySales = async () => {
    const res = await fetch("/api/daily-sales", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ shop_id:shopId, date:dailyDate, cash_sales:dailyData.cash_sales||0, card_sales:dailyData.card_sales||0, invoice_sales:0, cost:dailyData.cost||0, memo:dailyData.memo||"", opening_cash:0 }),
    });
    if (res.ok) { setMsg("保存しました"); }
    else setMsg("保存に失敗しました");
  };

  // 日次キャスト給与計算
  const calcDayCastPay = (cast: Cast, date: string, shifts: ConfirmedShift[], allowances: Allowance[], castSales: CastSale[]) => {
    const shift = shifts.find(s=>s.cast_id===cast.id && s.date===date);
    const mins = shift ? calcMinutes(shift.start_time, shift.end_time) : 0;
    const base = cast.hourly_wage ? Math.round(cast.hourly_wage*mins/60) : 0;
    const allow = allowances.filter(a=>a.cast_id===cast.id && a.date===date).reduce((s,a)=>s+a.amount,0);
    const bottle = castSales.filter(c=>c.cast_id===cast.id && c.date===date && c.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
    return { shift, mins, base, allow, bottle, total: base+allow+bottle };
  };

  const todayPayroll = casts.reduce((s,c)=>s+calcDayCastPay(c,dailyDate,dailyShifts,dailyAllowances,dailyCastSales).total,0);
  const dailySalesTotal = (dailyData.cash_sales||0)+(dailyData.card_sales||0);
  const dailyProfit = dailySalesTotal - (dailyData.cost||0) - todayPayroll;

  // 月次集計
  const calcCastMonthly = (cast: Cast) => {
    const myShifts = allShifts.filter(s=>s.cast_id===cast.id);
    const mins = myShifts.reduce((s,sh)=>s+calcMinutes(sh.start_time,sh.end_time),0);
    const base = cast.hourly_wage ? Math.round(cast.hourly_wage*mins/60) : 0;
    const allow = allAllowances.filter(a=>a.cast_id===cast.id).reduce((s,a)=>s+a.amount,0);
    const bottle = allCastSales.filter(c=>c.cast_id===cast.id && c.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
    const sales = allCastSales.filter(c=>c.cast_id===cast.id).reduce((s,c)=>s+c.amount,0);
    return { days:myShifts.length, mins, base, allow, bottle, totalPay:base+allow+bottle, sales };
  };
  const totalMonthlySales = allDailySales.reduce((s,d)=>s+(d.cash_sales||0)+(d.card_sales||0),0);
  const totalMonthlyPayroll = casts.reduce((s,c)=>s+calcCastMonthly(c).totalPay,0);
  const totalMonthlyCost = allDailySales.reduce((s,d)=>s+(d.cost||0),0);
  const monthlyProfit = totalMonthlySales - totalMonthlyCost - totalMonthlyPayroll;

  // 伝票保存
  const saveSlip = async () => {
    setSlipSaving(true); setMsg("");
    try {
      const m = slipDate.slice(0,7);
      const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
      const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slipDate) : null;
      await fetch("/api/daily-sales", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ shop_id:shopId, date:slipDate, opening_cash:0,
          cash_sales:(existing?.cash_sales||0)+(payment==="現金"?slipTotal:0),
          card_sales:(existing?.card_sales||0)+(payment==="カード"?slipTotal:0),
          invoice_sales:0, cost:existing?.cost||0, memo:existing?.memo||"",
        }),
      });
      for (const c of slipCasts) {
        if (!c.cast_id) continue;
        const salesType = c.type==="本指名"?"honshimei":c.type==="場内指名"?"baai":null;
        if (salesType) {
          const fee = slipItems.find(i=>i.name.includes("指名"));
          await fetch("/api/cast-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,cast_id:Number(c.cast_id),date:slipDate,sales_type:salesType,amount:fee?fee.qty*fee.price:(salesType==="honshimei"?16000:1000),count:1,memo:`テーブル${tableNo}`})});
        }
        const douhan = slipItems.find(i=>i.name.includes("同伴"));
        if (douhan) await fetch("/api/cast-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,cast_id:Number(c.cast_id),date:slipDate,sales_type:"douhan",amount:douhan.qty*douhan.price,count:1,memo:`テーブル${tableNo}`})});
        const bottle = slipItems.find(i=>i.name.includes("モエ")||i.name.includes("ドンペリ")||i.name.includes("シャンパン"));
        if (bottle) await fetch("/api/cast-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,cast_id:Number(c.cast_id),date:slipDate,sales_type:"bottle",amount:Math.floor(bottle.qty*bottle.price*0.1),count:1,memo:`${bottle.name}(10%バック)`})});
      }
      setSlipSaved(true);
      setMsg(`✅ 伝票を保存しました（¥${slipTotal.toLocaleString()}）`);
      setTimeout(()=>{ setSlipSaved(false); setSlipItems([{name:"",qty:1,price:0}]); setSlipCasts([{cast_id:"",type:"フリー",timeFrom:"",timeTo:""}]); setTableNo(""); setSlipMemo(""); setPayment("現金"); }, 1500);
      if(view==="daily") loadDaily(dailyDate);
    } catch(e:any) { setMsg("保存に失敗しました: "+e.message); }
    setSlipSaving(false);
  };

  const inp: React.CSSProperties = { ...inputStyle as any, padding:"8px 10px", fontSize:13, boxSizing:"border-box" };

  return (
    <div>
      {/* サブナビ */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        {[{key:"slip",label:"📋 伝票入力"},{key:"daily",label:"📊 日次入力"},{key:"monthly",label:"💹 月次集計"}].map(v=>(
          <button key={v.key} onClick={()=>setView(v.key as any)} style={{
            padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,
            fontWeight:view===v.key?700:500,
            background:view===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
            border:`1px solid ${view===v.key?"transparent":"var(--border)"}`,
            color:view===v.key?"#fff":"var(--text-secondary)",
          }}>{v.label}</button>
        ))}
        {view==="monthly"&&(
          <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>→</button>
          </div>
        )}
      </div>

      {msg&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,fontSize:13,background:msg.includes("失敗")?"#ff444418":"var(--online-bg)",border:`1px solid ${msg.includes("失敗")?"#ff444444":"var(--online-border)"}`,color:msg.includes("失敗")?"#ff4444":"var(--online)"}}>{msg}</div>}

      {/* ===== 伝票入力 ===== */}
      {view==="slip"&&(
        <div>
          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>基本情報</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
              <div style={{flex:"1 1 130px"}}>
                <label style={labelStyle}>日付</label>
                <input type="date" value={slipDate} onChange={e=>setSlipDate(e.target.value)} style={inp}/>
              </div>
              <div style={{flex:"1 1 100px"}}>
                <label style={labelStyle}>テーブル No.</label>
                <input value={tableNo} onChange={e=>setTableNo(e.target.value)} placeholder="例: A-3" style={inp}/>
              </div>
            </div>
            <div>
              <label style={labelStyle}>支払方法</label>
              <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
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

          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>キャスト</div>
            {slipCasts.map((c,i)=>(
              <div key={i} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:8,position:"relative"}}>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 120px"}}>
                    <label style={labelStyle}>キャスト名</label>
                    <select value={c.cast_id} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,cast_id:e.target.value}:x))} style={inp}>
                      <option value="">選択...</option>
                      {casts.map(cc=><option key={cc.id} value={cc.id}>{cc.name}</option>)}
                    </select>
                  </div>
                  <div style={{flex:"1 1 100px"}}>
                    <label style={labelStyle}>指名種別</label>
                    <select value={c.type} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,type:e.target.value}:x))} style={inp}>
                      {SHIMEI_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{flex:"1 1 90px"}}>
                    <label style={labelStyle}>入店</label>
                    <input type="time" value={c.timeFrom} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,timeFrom:e.target.value}:x))} style={inp}/>
                  </div>
                  <div style={{flex:"1 1 90px"}}>
                    <label style={labelStyle}>退店</label>
                    <input type="time" value={c.timeTo} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,timeTo:e.target.value}:x))} style={inp}/>
                  </div>
                </div>
                {slipCasts.length>1&&<button onClick={()=>setSlipCasts(slipCasts.filter((_,idx)=>idx!==i))} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>}
              </div>
            ))}
            <button onClick={()=>setSlipCasts([...slipCasts,{cast_id:"",type:"フリー",timeFrom:"",timeTo:""}])} style={{width:"100%",padding:"10px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)"}}>＋ キャストを追加</button>
          </div>

          <div style={{...sectionStyle,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>注文品目</div>
            {slipItems.map((item,i)=>(
              <div key={i} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:8,position:"relative"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {MENU_PRESETS.map(p=>(
                    <button key={p.name} onClick={()=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,name:p.name,price:p.price}:x))} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:5,color:"var(--text-muted)",fontSize:11,padding:"3px 8px",cursor:"pointer",whiteSpace:"nowrap"}}>{p.name}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:"2 1 160px"}}>
                    <label style={labelStyle}>品目名</label>
                    <input value={item.name} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} placeholder="品目を入力" style={inp}/>
                  </div>
                  <div style={{flex:"0 1 70px"}}>
                    <label style={labelStyle}>数量</label>
                    <input type="number" min={1} value={item.qty} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,qty:Number(e.target.value)}:x))} style={{...inp,textAlign:"center"}}/>
                  </div>
                  <div style={{flex:"1 1 110px"}}>
                    <label style={labelStyle}>単価（¥）</label>
                    <input type="number" min={0} value={item.price||""} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,price:Number(e.target.value)}:x))} style={{...inp,textAlign:"right"}}/>
                  </div>
                </div>
                <div style={{textAlign:"right",marginTop:6,color:"var(--accent)",fontSize:12,fontWeight:600}}>小計: ¥{(item.qty*item.price).toLocaleString()}</div>
                {slipItems.length>1&&<button onClick={()=>setSlipItems(slipItems.filter((_,idx)=>idx!==i))} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>}
              </div>
            ))}
            <button onClick={()=>setSlipItems([...slipItems,{name:"",qty:1,price:0}])} style={{width:"100%",padding:"10px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)"}}>＋ 品目を追加</button>
          </div>

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

          <div style={{marginBottom:16}}>
            <label style={labelStyle}>メモ</label>
            <textarea value={slipMemo} onChange={e=>setSlipMemo(e.target.value)} placeholder="特記事項など..." rows={2} style={{...inp,width:"100%",resize:"vertical",fontFamily:"var(--font)"}}/>
          </div>

          <button onClick={saveSlip} disabled={slipSaving} style={{...btnPrimary as any,width:"100%",fontSize:15,background:slipSaved?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,var(--accent),var(--accent2))"}}>
            {slipSaved?"✓ 保存しました":slipSaving?"保存中...":"伝票を保存する"}
          </button>
        </div>
      )}

      {/* ===== 日次入力 ===== */}
      {view==="daily"&&(
        <div>
          {/* 日付ナビ */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <button onClick={()=>setDailyDate(addDays(dailyDate,-1))} style={{padding:"8px 16px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前日</button>
            <span style={{flex:1,textAlign:"center",fontSize:15,fontWeight:700,color:"var(--text-primary)"}}>{fmtDate(dailyDate)}</span>
            <button onClick={()=>setDailyDate(addDays(dailyDate,1))} style={{padding:"8px 16px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>翌日 →</button>
            <button onClick={()=>setDailyDate(getDateStr(new Date()))} style={{padding:"8px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",cursor:"pointer",fontSize:12}}>今日</button>
          </div>

          {loading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(
            <>
              {/* 売上入力 */}
              <div style={{...sectionStyle,marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>売上・経費</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
                  <div style={{flex:"1 1 120px"}}>
                    <label style={labelStyle}>現金売上</label>
                    <input type="number" value={dailyData.cash_sales||""} onChange={e=>setDailyData(p=>({...p,cash_sales:Number(e.target.value)||0}))} style={inp} placeholder="0"/>
                  </div>
                  <div style={{flex:"1 1 120px"}}>
                    <label style={labelStyle}>カード売上</label>
                    <input type="number" value={dailyData.card_sales||""} onChange={e=>setDailyData(p=>({...p,card_sales:Number(e.target.value)||0}))} style={inp} placeholder="0"/>
                  </div>
                  <div style={{flex:"1 1 120px"}}>
                    <label style={labelStyle}>仕入・経費</label>
                    <input type="number" value={dailyData.cost||""} onChange={e=>setDailyData(p=>({...p,cost:Number(e.target.value)||0}))} style={inp} placeholder="0"/>
                  </div>
                  <div style={{flex:"2 1 200px"}}>
                    <label style={labelStyle}>メモ</label>
                    <input value={dailyData.memo||""} onChange={e=>setDailyData(p=>({...p,memo:e.target.value}))} style={inp} placeholder="備考"/>
                  </div>
                </div>

                {/* 日次サマリー */}
                <div style={{background:"var(--bg-input)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  {[
                    {label:"売上合計", value:dailySalesTotal, color:"var(--text-primary)"},
                    {label:"仕入・経費", value:-(dailyData.cost||0), color:"#f59e0b"},
                    {label:"キャスト給与", value:-todayPayroll, color:"#f59e0b"},
                  ].map(row=>(
                    <div key={row.label} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <span style={{color:"var(--text-muted)"}}>{row.label}</span>
                      <span style={{color:row.color,fontWeight:600}}>{row.value>=0?"":"-"}¥{Math.abs(row.value).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid var(--border)",marginTop:4}}>
                    <span style={{color:"var(--text-muted)",fontWeight:700}}>純利益</span>
                    <span style={{color:dailyProfit>=0?"var(--online)":"#ff4444",fontWeight:800,fontSize:16}}>¥{dailyProfit.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={saveDailySales} style={btnPrimary as any}>💾 保存</button>
              </div>

              {/* その日のキャスト給与 */}
              {dailyShifts.length>0&&(
                <div style={sectionStyle}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12,letterSpacing:"0.1em"}}>本日のキャスト給与</div>
                  {casts.filter(c=>dailyShifts.some(s=>s.cast_id===c.id)).map(cast=>{
                    const p = calcDayCastPay(cast, dailyDate, dailyShifts, dailyAllowances, dailyCastSales);
                    const shift = p.shift!;
                    const mySales = dailyCastSales.filter(s=>s.cast_id===cast.id);
                    return (
                      <div key={cast.id} style={{padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                          <div>
                            <span style={{fontWeight:700,color:"var(--text-primary)",fontSize:14}}>{cast.name}</span>
                            <span style={{fontSize:12,color:"var(--text-muted)",marginLeft:10}}>{shift.start_time?.slice(0,5)}〜{shift.end_time?.slice(0,5)}</span>
                          </div>
                          <span style={{fontWeight:800,color:"var(--accent)",fontSize:16}}>¥{p.total.toLocaleString()}</span>
                        </div>
                        <div style={{display:"flex",gap:12,fontSize:12,color:"var(--text-muted)",flexWrap:"wrap"}}>
                          {p.base>0&&<span>基本給 ¥{p.base.toLocaleString()}</span>}
                          {p.allow!==0&&<span>手当 {p.allow>=0?"+":""}{p.allow.toLocaleString()}</span>}
                          {p.bottle>0&&<span>🍾 ¥{p.bottle.toLocaleString()}</span>}
                          {mySales.filter(s=>s.sales_type!=="bottle").map(s=>{
                            const t = SALES_TYPES.find(x=>x.key===s.sales_type);
                            return <span key={s.id}>{t?.icon} {t?.label} ¥{s.amount.toLocaleString()}</span>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {casts.filter(c=>dailyShifts.some(s=>s.cast_id===c.id)).length===0&&(
                    <div style={{color:"var(--text-muted)",fontSize:13,textAlign:"center",padding:"16px 0"}}>本日の確定シフトがありません</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== 月次集計 ===== */}
      {view==="monthly"&&(
        <div>
          {loading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(
            <>
              {/* サマリーカード */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
                {[
                  {label:"月次売上",value:totalMonthlySales,color:"var(--accent)"},
                  {label:"人件費",value:totalMonthlyPayroll,color:"#f59e0b"},
                  {label:"仕入・経費",value:totalMonthlyCost,color:"#f59e0b"},
                  {label:"純利益",value:monthlyProfit,color:monthlyProfit>=0?"var(--online)":"#ff4444"},
                ].map(s=>(
                  <div key={s.label} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 12px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:18,fontWeight:900,color:s.color}}>¥{s.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* キャスト別成績表 */}
              <div style={{...sectionStyle,overflowX:"auto"}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12}}>キャスト別成績・給与</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}>
                  <thead>
                    <tr style={{background:"var(--bg-input)"}}>
                      {["キャスト","出勤","基本給","手当","ボトルバック","支払合計","売上合計","売上/給与"].map(h=>(
                        <th key={h} style={{padding:"8px",textAlign:"right",color:"var(--text-muted)",fontWeight:700,whiteSpace:"nowrap",borderBottom:"1px solid var(--border)",":firstChild":{textAlign:"left"}}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {casts.map(cast=>{
                      const d = calcCastMonthly(cast);
                      const ratio = d.totalPay>0 ? d.sales/d.totalPay*100 : 0;
                      return (
                        <tr key={cast.id} style={{borderBottom:"1px solid var(--border)"}}>
                          <td style={{padding:"10px 8px",fontWeight:700,color:"var(--text-primary)",textAlign:"left"}}>{cast.name}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",color:"var(--text-secondary)"}}>{d.days}日</td>
                          <td style={{padding:"10px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.base.toLocaleString()}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.allow.toLocaleString()}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",color:"#a855f7"}}>¥{d.bottle.toLocaleString()}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",color:"#f59e0b",fontWeight:700}}>¥{d.totalPay.toLocaleString()}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥{d.sales.toLocaleString()}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",fontWeight:800,color:ratio>=100?"var(--online)":ratio>=70?"#f59e0b":"#ff4444"}}>
                            {d.totalPay>0?`${ratio.toFixed(0)}%`:"—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
