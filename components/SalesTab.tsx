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
  const [view, setView] = useState<"daily"|"cast"|"monthly">("daily");
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [selectedDate, setSelectedDate] = useState(getDateStr(new Date()));
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [castSales, setCastSales] = useState<CastSale[]>([]);
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 日次入力フォーム
  const [form, setForm] = useState<DailySales>({ date: getDateStr(new Date()), opening_cash:0, cash_sales:0, card_sales:0, invoice_sales:0, cost:0, memo:"" });
  // キャスト売上入力
  const [castForm, setCastForm] = useState({ cast_id:"", sales_type:"honshimei", amount:"", count:"1", memo:"", date: getDateStr(new Date()) });

  useEffect(() => { loadAll(); }, [month]);

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
          {key:"daily",label:"📋 日次入力"},
          {key:"cast",label:"⭐ キャスト売上"},
          {key:"monthly",label:"📊 月次集計"},
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
