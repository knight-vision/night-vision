"use client";
import { useState, useEffect } from "react";

type Cast = { id: number; name: string; shop_id: number; on_today: boolean; hourly_wage: number | null };
type ShiftRequest = { id: string; cast_id: number; date: string; start_time: string; end_time: string; note: string; status: string; casts: { id: number; name: string } };
type ConfirmedShift = { id: string; cast_id: number; date: string; start_time: string; end_time: string; casts: { id: number; name: string } };
type ClosedDate = { id: string; date: string; reason: string | null };
type Allowance = { id: string; cast_id: number; date: string; label: string; amount: number };

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(getDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
function getWeekDates(baseDate: string): string[] {
  const base = new Date(baseDate + "T00:00:00");
  // その週の月曜日に合わせる
  const day = base.getDay(); // 0=日
  const monday = new Date(base);
  monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return getDateStr(d);
  });
}
function fmtFull(ds: string) {
  const d = new Date(ds+"T00:00:00");
  return `${d.getMonth()+1}月${d.getDate()}日(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function fmtShort(ds: string) {
  const d = new Date(ds+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function isWeekClosed(ds: string, closedDays: string[]): boolean {
  return closedDays.includes(["日","月","火","水","木","金","土"][new Date(ds+"T00:00:00").getDay()]);
}
function calcMinutes(start: string, end: string): number {
  const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number);
  let s=sh*60+sm, e=eh*60+em; if(e<=s) e+=24*60; return e-s;
}
function fmtH(min: number) { const h=Math.floor(min/60),m=min%60; return m>0?`${h}h${m}m`:`${h}h`; }

const CAST_COLORS = ["#ff6b9d","#00d4ff","#ffd700","#a855f7","#00e5a0","#ff9500","#00c7be","#ff3b30","#34aadc","#4cd964"];
const HOURS = Array.from({length:31},(_,i)=>i);
const MINUTES = ["00","10","20","30","40","50"];
const tLabel = (h: number) => h>=24?`翌${h-24}時`:`${h}時`;

// よく使う手当・控除の候補
const ALLOWANCE_PRESETS = ["同伴","アフター","ドリンクバック","指名料","本指名","場内指名","ヘアメイク","送迎","遅刻控除","その他"];

type DraftEntry = { cast_id: number; start_time: string; end_time: string };

type Props = {
  shopId: string; casts: Cast[];
  shiftRequests: ShiftRequest[]; setShiftRequests: (v: ShiftRequest[]) => void;
  confirmedShifts: ConfirmedShift[]; setConfirmedShifts: (v: ConfirmedShift[]) => void;
  shiftLoading: boolean; setShiftLoading: (v: boolean) => void;
  shiftMsg: string; setShiftMsg: (v: string) => void;
  castAccountEmail: Record<number,string>; setCastAccountEmail: (v: Record<number,string>) => void;
  issuingAccount: number|null; setIssuingAccount: (v: number|null) => void;
  shopName: string; shopClosedWeekDays: string[];
  sectionStyle: React.CSSProperties; inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties; btnPrimary: React.CSSProperties;
};

export default function ShiftManagementTab({
  shopId, casts, shiftRequests, setShiftRequests,
  confirmedShifts, setConfirmedShifts,
  shiftLoading, setShiftLoading, shiftMsg, setShiftMsg,
  castAccountEmail, setCastAccountEmail,
  issuingAccount, setIssuingAccount,
  shopName, shopClosedWeekDays,
  sectionStyle, inputStyle, labelStyle, btnPrimary,
}: Props) {
  const [view, setView] = useState<"calendar"|"payroll">("calendar");
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [draft, setDraft] = useState<Record<string,DraftEntry[]>>({});
  const [selectedDate, setSelectedDate] = useState<string|null>(null);
  const [loaded, setLoaded] = useState(false);

  // 給与管理
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [shopMenuNames, setShopMenuNames] = useState<string[]>([]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0,7));
  const [allowanceLoading, setAllowanceLoading] = useState(false);
  // 新規手当フォーム
  const [newA, setNewA] = useState({ cast_id:"", date: getDateStr(new Date()), label:"", sign:"+", amount:"" });
  const [showPresets, setShowPresets] = useState(false);
  const [paySelectedDate, setPaySelectedDate] = useState<string|null>(null);
  const [paySelectedCast, setPaySelectedCast] = useState<number|null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [weekBase, setWeekBase] = useState(getDateStr(new Date()));
  const dates = getWeekDates(weekBase);

  useEffect(() => { if (!loaded) { loadAll(); setLoaded(true); } }, []);
  useEffect(() => { if (loaded) { loadAll(); } }, [weekBase]);
  useEffect(() => { loadAllowances(); }, [payrollMonth]);
  useEffect(() => {
    fetch(`/api/shop-menus?shop_id=${shopId}`)
      .then(r=>r.ok?r.json():[])
      .then((data:any[])=>setShopMenuNames(data.map((m:any)=>m.name)));
  }, [shopId]);

  const loadAll = async () => {
    setShiftLoading(true);
    // weekBaseから年月を算出
    const wb = new Date(weekBase + "T00:00:00");
    const wy = wb.getFullYear(), wm = wb.getMonth() + 1;
    // 次の週も含めるため翌月も取得
    const nextWb = new Date(wb); nextWb.setDate(wb.getDate() + 6);
    const wy2 = nextWb.getFullYear(), wm2 = nextWb.getMonth() + 1;
    const [r1, r2] = await Promise.all([
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${wy}&month=${wm}`),
      wy !== wy2 || wm !== wm2 ? fetch(`/api/confirm-shift?shop_id=${shopId}&year=${wy2}&month=${wm2}`) : Promise.resolve(null),
    ]);
    let confirmed: ConfirmedShift[] = [];
    let requests: ShiftRequest[] = [];
    let closedDates: ClosedDate[] = [];
    if (r1.ok) { const d = await r1.json(); confirmed = d.confirmed||[]; requests = d.requests||[]; closedDates = d.closedDates||[]; }
    if (r2 && r2.ok) {
      const d2 = await r2.json();
      const ids = new Set(confirmed.map((s:any)=>s.id));
      confirmed = [...confirmed, ...(d2.confirmed||[]).filter((s:any)=>!ids.has(s.id))];
    }
    setShiftRequests(requests); setConfirmedShifts(confirmed); setClosedDates(closedDates);
    setShiftLoading(false);
  };

  const loadAllowances = async () => {
    setAllowanceLoading(true);
    const res = await fetch(`/api/cast-allowances?shop_id=${shopId}&month=${payrollMonth}`);
    if (res.ok) setAllowances(await res.json());
    setAllowanceLoading(false);
  };

  const addAllowance = async () => {
    const { cast_id, date, label, sign, amount } = newA;
    if (!cast_id||!date||!label||!amount) return;
    const finalAmount = sign==="-" ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
    const res = await fetch("/api/cast-allowances", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ cast_id:Number(cast_id), shop_id:Number(shopId), date, label, amount:finalAmount }),
    });
    if (res.ok) { setNewA({ cast_id:"", date: getDateStr(new Date()), label:"", sign:"+", amount:"" }); setShowPresets(false); await loadAllowances(); }
  };

  const deleteAllowance = async (id: string) => {
    await fetch("/api/cast-allowances", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
    await loadAllowances();
  };

  const deleteShiftRequest = async (id: string) => {
    const res = await fetch("/api/cast-shift-request", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
    if (res.ok) await loadAll();
    else setShiftMsg("削除に失敗しました");
  };

  const getColor = (castId: number) => CAST_COLORS[casts.findIndex(c=>c.id===castId)%CAST_COLORS.length]||"#aaa";
  const isClosedDate = (date: string) => closedDates.some(c=>c.date===date);
  const isClosed = (date: string) => isClosedDate(date)||isWeekClosed(date,shopClosedWeekDays);
  const confirmedOnDate = (date: string) => confirmedShifts.filter(s=>s.date===date);
  const requestsOnDate = (date: string) => shiftRequests.filter(s=>s.date===date&&s.status==="pending");

  const addCastToDraft = (date: string, castId: number) => {
    const req = shiftRequests.find(r=>r.cast_id===castId&&r.date===date);
    setDraft(prev=>({...prev,[date]:[...(prev[date]||[]).filter(e=>e.cast_id!==castId),{cast_id:castId,start_time:req?.start_time?.slice(0,5)||"20:00",end_time:req?.end_time?.slice(0,5)||"24:00"}]}));
  };
  const removeCastFromDraft = (date: string, castId: number) => {
    setDraft(prev=>{const n={...prev};n[date]=(n[date]||[]).filter(e=>e.cast_id!==castId);if(!n[date].length)delete n[date];return n;});
  };
  const updateDraftTime = (date: string, castId: number, field:"start_time"|"end_time", val: string) => {
    setDraft(prev=>({...prev,[date]:(prev[date]||[]).map(e=>e.cast_id===castId?{...e,[field]:val}:e)}));
  };
  const hasDraft = (date: string, castId: number) => (draft[date]||[]).some(e=>e.cast_id===castId);
  const totalDraftShifts = Object.values(draft).flat().length;

  const handleConfirm = async () => {
    const shifts = Object.entries(draft).flatMap(([date,entries])=>entries.map(e=>({cast_id:e.cast_id,date,start_time:e.start_time,end_time:e.end_time})));
    if (!shifts.length) { setShiftMsg("確定するシフトがありません"); return; }
    setShiftLoading(true); setShiftMsg("");
    const res = await fetch("/api/confirm-shift",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,shifts})});
    if (res.ok) { setShiftMsg(`${shifts.length}件のシフトを確定して通知しました。`); setDraft({}); await loadAll(); }
    else setShiftMsg("保存に失敗しました。");
    setShiftLoading(false);
  };

  const handleDeleteConfirmed = async (castId: number, date: string) => {
    await fetch("/api/confirm-shift",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({cast_id:castId,date})});
    await loadAll();
  };

  const handleIssueAccount = async (cast: Cast) => {
    const email = castAccountEmail[cast.id];
    if (!email) { setShiftMsg("メールアドレスを入力してください"); return; }
    setIssuingAccount(cast.id);
    const res = await fetch("/api/issue-cast-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cast_id:cast.id,email,shop_name:shopName})});
    if (res.ok) { setShiftMsg(`${cast.name}にアカウントを発行しました。`); setCastAccountEmail({...castAccountEmail,[cast.id]:""}); }
    else setShiftMsg("アカウント発行に失敗しました。");
    setIssuingAccount(null);
  };

  const smInput: React.CSSProperties = {...inputStyle as any, padding:"4px 8px", fontSize:12, width:"auto"};

  // 給与管理：月のカレンダー日付
  const payrollDates = (() => {
    const [y,m] = payrollMonth.split("-").map(Number);
    const result: string[] = [];
    const d = new Date(y,m-1,1);
    while (d.getMonth()===m-1) { result.push(getDateStr(d)); d.setDate(d.getDate()+1); }
    return result;
  })();

  const calcCastDay = (cast: Cast, date: string) => {
    const shift = confirmedShifts.find(s=>s.cast_id===cast.id&&s.date===date);
    const mins = shift ? calcMinutes(shift.start_time, shift.end_time) : 0;
    const baseWage = (cast.hourly_wage && mins) ? Math.round(cast.hourly_wage*mins/60) : 0;
    const dayAllowances = allowances.filter(a=>a.cast_id===cast.id&&a.date===date);
    const allowanceTotal = dayAllowances.reduce((s,a)=>s+a.amount,0);
    return { shift, mins, baseWage, allowanceTotal, total: baseWage+allowanceTotal, dayAllowances };
  };

  const calcCastMonth = (cast: Cast) => {
    return payrollDates.reduce((acc, date) => {
      const d = calcCastDay(cast, date);
      return { mins: acc.mins+d.mins, base: acc.base+d.baseWage, allowance: acc.allowance+d.allowanceTotal, total: acc.total+d.total, days: acc.days+(d.shift?1:0) };
    }, { mins:0, base:0, allowance:0, total:0, days:0 });
  };

  // CSV
  const downloadCSV = () => {
    const rows: string[][] = [["日付","キャスト","出勤時間","退勤時間","勤務時間","基本給","件名","金額","日計"]];
    for (const date of payrollDates) {
      for (const cast of casts) {
        const d = calcCastDay(cast, date);
        if (!d.shift && d.dayAllowances.length===0) continue;
        const allowanceRows = d.dayAllowances.length > 0 ? d.dayAllowances : [{ label:"", amount:0, id:"", cast_id:0, date:"" }];
        allowanceRows.forEach((a,i) => {
          rows.push([
            i===0 ? date : "",
            i===0 ? cast.name : "",
            i===0 && d.shift ? d.shift.start_time?.slice(0,5) : "",
            i===0 && d.shift ? d.shift.end_time?.slice(0,5) : "",
            i===0 && d.mins ? fmtH(d.mins) : "",
            i===0 && d.baseWage ? String(d.baseWage) : "",
            a.label,
            a.amount!==0 ? String(a.amount) : "",
            i===0 ? String(d.total) : "",
          ]);
        });
      }
    }
    // 月計
    rows.push([]);
    rows.push(["【月計】","キャスト","出勤日数","勤務時間","基本給","手当合計","合計支給"]);
    for (const cast of casts) {
      const m = calcCastMonth(cast);
      if (m.days===0) continue;
      rows.push(["",cast.name,`${m.days}日`,fmtH(m.mins),String(m.base),String(m.allowance),String(m.total)]);
    }
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`給与明細_${shopName}_${payrollMonth}.csv`; a.click();
  };

  // PDF
  const downloadPDF = () => {
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>給与明細 ${shopName} ${payrollMonth}</title>
<style>body{font-family:'Hiragino Sans',sans-serif;padding:20px;font-size:12px;color:#111}h1{font-size:16px;margin:0 0 4px}
.sub{color:#666;font-size:11px;margin-bottom:20px}
.cast-block{margin-bottom:20px;break-inside:avoid}
.cast-name{font-size:14px;font-weight:700;padding:6px 10px;background:#1a0828;color:#fff;border-radius:4px 4px 0 0;margin-bottom:0}
table{width:100%;border-collapse:collapse;margin-bottom:0}
th{background:#f0e8ff;padding:5px 8px;text-align:left;font-size:11px;border:1px solid #ddd}
td{padding:5px 8px;border:1px solid #ddd;font-size:11px}
.total-row{background:#f8f0ff;font-weight:700}
.plus{color:#059669}.minus{color:#dc2626}
.summary{margin-top:16px;padding:10px 14px;background:#1a0828;color:#fff;border-radius:6px;display:flex;justify-content:space-between}
@media print{body{padding:8px}}</style></head><body>
<h1>給与明細</h1><div class="sub">${shopName}　対象月: ${payrollMonth}</div>
${casts.map(cast=>{
  const monthData = calcCastMonth(cast);
  if (monthData.days===0) return "";
  const rows = payrollDates.filter(date=>{ const d=calcCastDay(cast,date); return d.shift||d.dayAllowances.length>0; }).map(date=>{
    const d = calcCastDay(cast,date);
    const allowStr = d.dayAllowances.map(a=>`${a.label}：<span class="${a.amount>=0?"plus":"minus"}">${a.amount>=0?"+":""}${a.amount.toLocaleString()}円</span>`).join("　");
    return `<tr>
      <td>${fmtShort(date)}</td>
      <td>${d.shift?`${d.shift.start_time?.slice(0,5)}〜${d.shift.end_time?.slice(0,5)}`:"—"}</td>
      <td>${d.mins?fmtH(d.mins):"—"}</td>
      <td>${d.baseWage?d.baseWage.toLocaleString()+"円":"—"}</td>
      <td>${allowStr||"—"}</td>
      <td style="font-weight:600">${d.total?d.total.toLocaleString()+"円":"—"}</td>
    </tr>`;
  }).join("");
  return `<div class="cast-block">
    <div class="cast-name">${cast.name}${cast.hourly_wage?`　¥${cast.hourly_wage.toLocaleString()}/h`:""}</div>
    <table><thead><tr><th>日付</th><th>勤務時間</th><th>時間</th><th>基本給</th><th>手当・控除</th><th>日計</th></tr></thead>
    <tbody>${rows}
    <tr class="total-row"><td colspan="2">${monthData.days}日出勤</td><td>${fmtH(monthData.mins)}</td><td>${monthData.base.toLocaleString()}円</td><td>${monthData.allowance!==0?(monthData.allowance>=0?"+":"")+monthData.allowance.toLocaleString()+"円":"—"}</td><td>${monthData.total.toLocaleString()}円</td></tr>
    </tbody></table></div>`;
}).join("")}
<div class="summary"><span>合計人件費（${payrollMonth}）</span><span style="font-size:16px;font-weight:700">¥${casts.reduce((s,c)=>s+calcCastMonth(c).total,0).toLocaleString()}</span></div>
<div style="margin-top:20px;font-size:10px;color:#bbb">出力: ${new Date().toLocaleDateString("ja-JP")}　釧路ナイトビジョン</div>
</body></html>`;
    const w = window.open("","_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500); }
  };

  return (
    <div>
      {/* サブナビ */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        {[
          {key:"calendar",label:"📅 出勤表（シフトカレンダー）"},
          {key:"payroll",label:"💰 給与管理"},
        ].map(v=>(
          <button key={v.key} onClick={()=>setView(v.key as any)} style={{
            padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,fontWeight:view===v.key?700:500,
            background:view===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
            border:`1px solid ${view===v.key?"transparent":"var(--border)"}`,
            color:view===v.key?"#fff":"var(--text-secondary)",
          }}>{v.label}</button>
        ))}
        <button onClick={loadAll} style={{marginLeft:"auto",padding:"8px 14px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",fontSize:12,cursor:"pointer"}}>🔄 更新</button>
      </div>

      {shiftMsg&&<div style={{background:shiftMsg.includes("失敗")?"#ff444418":"var(--online-bg)",border:`1px solid ${shiftMsg.includes("失敗")?"#ff444444":"var(--online-border)"}`,borderRadius:10,padding:"10px 16px",color:shiftMsg.includes("失敗")?"#ff4444":"var(--online)",fontSize:13,marginBottom:16}}>{shiftMsg}</div>}
      {shiftLoading&&<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>}

      {/* ===== 出勤表（シフトカレンダー） ===== */}
      {view==="calendar"&&!shiftLoading&&(
        <div>
          {/* 週ナビ */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <button onClick={()=>{const d=new Date(weekBase+"T00:00:00");d.setDate(d.getDate()-7);setWeekBase(getDateStr(d));}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前週</button>
            <span style={{fontSize:15,fontWeight:700,color:"var(--text-primary)"}}>
              {(() => { const w=getWeekDates(weekBase); return `${w[0].slice(5).replace("-","/")} 〜 ${w[6].slice(5).replace("-","/")}`;})()}
            </span>
            <button onClick={()=>{const d=new Date(weekBase+"T00:00:00");d.setDate(d.getDate()+7);setWeekBase(getDateStr(d));}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>次週 →</button>
            <button onClick={()=>setWeekBase(getDateStr(new Date()))} style={{padding:"6px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",cursor:"pointer",fontSize:12}}>今週</button>
            <span style={{fontSize:11,color:"var(--text-muted)",marginLeft:"auto"}}>📩 = 希望あり　🚫 = 定休日</span>
          </div>
          {totalDraftShifts>0&&<button onClick={handleConfirm} disabled={shiftLoading} style={{...btnPrimary as any,marginBottom:16,position:"sticky",top:8,zIndex:10,boxShadow:"0 4px 20px var(--accent)44"}}>
            📲 {totalDraftShifts}件のシフトを確定して通知
          </button>}

          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {dates.map(date=>{
              const closed=isClosed(date);
              const closedByException=isClosedDate(date);
              const closedDateReason=closedDates.find(c=>c.date===date)?.reason;
              const confirmed=confirmedOnDate(date);
              const pending=requestsOnDate(date);
              const isSelected=selectedDate===date;
              const draftEntries=draft[date]||[];
              const isToday=date===getDateStr(new Date());
              return (
                <div key={date} style={{borderBottom:"1px solid var(--border)"}}>
                  <div onClick={()=>!closed&&setSelectedDate(isSelected?null:date)} style={{
                    display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                    padding:"11px 16px",cursor:closed?"default":"pointer",
                    background:closed?"#ff444408":isSelected?"var(--accent)10":isToday?"var(--accent)06":"transparent",
                  }}>
                    <div style={{minWidth:96,fontWeight:isToday?900:600,fontSize:14,flexShrink:0,color:closed?"#ff6666":isToday?"var(--accent)":"var(--text-primary)"}}>
                      {fmtFull(date)}{isToday&&<span style={{fontSize:9,marginLeft:6,color:"var(--accent)",background:"var(--accent)22",padding:"1px 5px",borderRadius:4}}>今日</span>}
                    </div>
                    {closed&&<span style={{fontSize:11,background:"#ff444420",color:"#ff6666",border:"1px solid #ff444444",padding:"2px 8px",borderRadius:8,flexShrink:0}}>
                      {closedByException?`🚫 店休日${closedDateReason?`（${closedDateReason}）`:""}` :"🚫 定休日"}</span>}
                    {!closed&&pending.length>0&&<span style={{fontSize:11,background:"var(--accent)22",color:"var(--accent)",border:"1px solid var(--accent)55",padding:"2px 8px",borderRadius:8,flexShrink:0}}>📩 希望{pending.length}件</span>}
                    {!closed&&confirmed.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",flex:1}}>
                      {confirmed.map(s=><span key={s.id} style={{fontSize:11,padding:"2px 8px",borderRadius:8,fontWeight:600,background:getColor(s.cast_id)+"22",color:getColor(s.cast_id),border:`1px solid ${getColor(s.cast_id)}55`}}>{s.casts?.name} {s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>)}
                    </div>}
                    {!closed&&draftEntries.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {draftEntries.map(e=>{const c=casts.find(c=>c.id===e.cast_id); return <span key={e.cast_id} style={{fontSize:11,padding:"2px 8px",borderRadius:8,fontWeight:600,background:getColor(e.cast_id)+"33",color:getColor(e.cast_id),border:`2px dashed ${getColor(e.cast_id)}`}}>{c?.name} {e.start_time}〜{e.end_time}</span>;})}
                    </div>}
                    {!closed&&<span style={{marginLeft:"auto",fontSize:12,color:"var(--text-muted)",flexShrink:0}}>{isSelected?"▲":"▼"}</span>}
                    {closed&&closedByException&&<button onClick={e=>{e.stopPropagation();fetch("/api/confirm-shift",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"closed_date",shop_id:shopId,date})}).then(loadAll);}} style={{marginLeft:"auto",background:"none",border:"1px solid #ff444444",borderRadius:8,color:"#ff4444",padding:"2px 10px",fontSize:11,cursor:"pointer"}}>解除</button>}
                  </div>

                  {isSelected&&!closed&&(
                    <div style={{padding:"14px 16px 18px",background:"var(--bg-card)",borderTop:"1px solid var(--border)"}}>
                      {/* 希望シフト一覧（削除ボタン付き） */}
                      {pending.length>0&&(
                        <div style={{marginBottom:14}}>
                          <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:700,marginBottom:8}}>📩 希望シフト</div>
                          {pending.map(req=>{
                            const color=getColor(req.cast_id);
                            return <div key={req.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"8px 10px",borderRadius:8,background:`${color}11`,border:`1px solid ${color}33`}}>
                              <span style={{color,fontWeight:700,fontSize:13,minWidth:56}}>{req.casts?.name}</span>
                              <span style={{fontSize:12,color:"var(--text-secondary)"}}>{req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</span>
                              {req.note&&<span style={{fontSize:11,color:"var(--text-muted)"}}>📝{req.note}</span>}
                              <button onClick={()=>addCastToDraft(date,req.cast_id)} style={{padding:"3px 10px",borderRadius:6,background:"var(--accent)22",border:"1px solid var(--accent)55",color:"var(--accent)",fontSize:11,cursor:"pointer",marginLeft:"auto"}}>✅ 確定</button>
                              <button onClick={()=>{ if(confirm("この希望シフトを削除しますか？")) deleteShiftRequest(req.id); }} style={{padding:"3px 10px",borderRadius:6,background:"#ff444418",border:"1px solid #ff444444",color:"#ff4444",fontSize:11,cursor:"pointer"}}>削除</button>
                            </div>;
                          })}
                        </div>
                      )}

                      {/* キャスト選択 */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:700,marginBottom:8}}>出勤キャストを選択</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {casts.map(cast=>{
                            const selected=hasDraft(date,cast.id);
                            const hasReq=shiftRequests.some(r=>r.cast_id===cast.id&&r.date===date);
                            const color=getColor(cast.id);
                            return <button key={cast.id} onClick={()=>selected?removeCastFromDraft(date,cast.id):addCastToDraft(date,cast.id)} style={{padding:"7px 16px",borderRadius:20,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,fontWeight:selected?800:500,background:selected?color:"var(--bg-input)",border:`2px solid ${selected?color:hasReq?color+"88":"var(--border)"}`,color:selected?"#fff":hasReq?color:"var(--text-secondary)",boxShadow:selected?`0 0 10px ${color}66`:"none"}}>{selected?"✓ ":""}{cast.name}{hasReq&&!selected?" 📩":""}</button>;
                          })}
                        </div>
                      </div>

                      {/* 時間設定 */}
                      {(draft[date]||[]).map(entry=>{
                        const cast=casts.find(c=>c.id===entry.cast_id);
                        const color=getColor(entry.cast_id);
                        const req=shiftRequests.find(r=>r.cast_id===entry.cast_id&&r.date===date);
                        return <div key={entry.cast_id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8,padding:"10px 12px",borderRadius:10,background:`${color}11`,border:`1px solid ${color}44`}}>
                          <span style={{color,fontWeight:700,fontSize:13,minWidth:56}}>{cast?.name}</span>
                          {req&&<div style={{fontSize:11,color:"var(--accent)",display:"flex",flexDirection:"column",gap:1}}><span>希望: {req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</span>{req.note&&<span style={{color:"var(--text-muted)"}}>📝 {req.note}</span>}</div>}
                          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                            <select value={entry.start_time.split(":")[0]} onChange={e=>updateDraftTime(date,entry.cast_id,"start_time",`${e.target.value}:${entry.start_time.split(":")[1]}`)} style={smInput}>{HOURS.map(h=><option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}</select>
                            <select value={entry.start_time.split(":")[1]} onChange={e=>updateDraftTime(date,entry.cast_id,"start_time",`${entry.start_time.split(":")[0]}:${e.target.value}`)} style={smInput}>{MINUTES.map(m=><option key={m} value={m}>{m}分</option>)}</select>
                            <span style={{color:"var(--text-muted)"}}>〜</span>
                            <select value={entry.end_time.split(":")[0]} onChange={e=>updateDraftTime(date,entry.cast_id,"end_time",`${e.target.value}:${entry.end_time.split(":")[1]}`)} style={smInput}>{HOURS.map(h=><option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}</select>
                            <select value={entry.end_time.split(":")[1]} onChange={e=>updateDraftTime(date,entry.cast_id,"end_time",`${entry.end_time.split(":")[0]}:${e.target.value}`)} style={smInput}>{MINUTES.map(m=><option key={m} value={m}>{m}分</option>)}</select>
                          </div>
                        </div>;
                      })}

                      {/* 確定済み */}
                      {confirmed.length>0&&<div style={{marginTop:10}}>
                        <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:700,marginBottom:6}}>📌 確定済み（タップで時間編集）</div>
                        {confirmed.map(s=>{
                          const editKey = `edit-${s.cast_id}-${date}`;
                          const isEditing = !!draft[date]?.find(e=>e.cast_id===s.cast_id && (e as any).__editing);
                          return <div key={s.id} style={{marginBottom:6}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:13,color:getColor(s.cast_id),fontWeight:600}}>{s.casts?.name}</span>
                              <span style={{fontSize:12,color:"var(--text-secondary)"}}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>
                              <button onClick={()=>addCastToDraft(date,s.cast_id)} style={{padding:"2px 8px",borderRadius:6,background:"var(--accent)22",border:"1px solid var(--accent)55",color:"var(--accent)",fontSize:11,cursor:"pointer"}}>時間変更</button>
                              <button onClick={()=>handleDeleteConfirmed(s.cast_id,date)} style={{background:"#ff444418",border:"1px solid #ff444444",color:"#ff4444",padding:"2px 8px",borderRadius:6,fontSize:11,cursor:"pointer"}}>削除</button>
                            </div>
                          </div>;
                        })}
                      </div>}

                      <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)"}}>
                        <button onClick={()=>fetch("/api/confirm-shift",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,date})}).then(loadAll)} style={{padding:"7px 16px",borderRadius:8,background:"#ff444420",border:"1px solid #ff444444",color:"#ff4444",fontSize:12,cursor:"pointer",fontFamily:"var(--font)",fontWeight:700}}>🚫 この日を店休日に設定</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalDraftShifts>0&&<button onClick={handleConfirm} disabled={shiftLoading} style={{...btnPrimary as any,marginTop:20}}>📲 {totalDraftShifts}件のシフトを確定して通知</button>}
        </div>
      )}

      {/* ===== 給与管理 ===== */}
      {view==="payroll"&&(
        <div>
          {/* 月切り替え＋出力 */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
            <button onClick={()=>{const d=new Date(payrollMonth+"-01");d.setMonth(d.getMonth()-1);setPayrollMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前月</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{payrollMonth.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(payrollMonth+"-01");d.setMonth(d.getMonth()+1);setPayrollMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>次月 →</button>
            <div style={{marginLeft:"auto",display:"flex",gap:8}}>
              <button onClick={downloadCSV} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",fontSize:12,cursor:"pointer"}}>📄 CSV</button>
              <button onClick={downloadPDF} style={{padding:"7px 14px",borderRadius:8,background:"var(--accent)22",border:"1px solid var(--accent)55",color:"var(--accent)",fontSize:12,cursor:"pointer",fontWeight:700}}>🖨️ PDF</button>
            </div>
          </div>

          {allowanceLoading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(
            <>
              {/* 月合計サマリー（上に移動） */}
              <div style={{...sectionStyle,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>月合計</div>
                {casts.map(cast=>{
                  const m=calcCastMonth(cast); if(m.days===0) return null;
                  const color=getColor(cast.id);
                  return (
                    <div key={cast.id} style={{
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"10px 0",borderBottom:"1px solid var(--border)",
                      cursor:"pointer",
                    }} onClick={()=>setPaySelectedCast(paySelectedCast===cast.id?null:cast.id)}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}} />
                        <span style={{fontWeight:700,color:"var(--text-primary)",fontSize:14}}>{cast.name}</span>
                        <span style={{color:"var(--text-muted)",fontSize:11}}>{m.days}日 {fmtH(m.mins)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontWeight:800,color,fontSize:15}}>¥{m.total.toLocaleString()}</span>
                        <span style={{fontSize:11,color:"var(--text-muted)"}}>{paySelectedCast===cast.id?"▲":"▼"}</span>
                      </div>
                    </div>
                  );
                })}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,marginTop:4}}>
                  <span style={{fontWeight:700,color:"var(--text-muted)"}}>合計人件費</span>
                  <span style={{fontWeight:900,color:"var(--accent)",fontSize:20}}>¥{casts.reduce((s,c)=>s+calcCastMonth(c).total,0).toLocaleString()}</span>
                </div>
              </div>

              {/* 選択キャストの日別明細 */}
              {paySelectedCast&&(()=>{
                const cast = casts.find(c=>c.id===paySelectedCast);
                if (!cast) return null;
                const color = getColor(cast.id);
                const activeDates = payrollDates.filter(date=>{
                  const d=calcCastDay(cast,date); return d.shift||d.dayAllowances.length>0;
                });
                return (
                  <div style={{...sectionStyle,marginBottom:16,borderColor:color+"44"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <div style={{fontWeight:700,color,fontSize:14}}>{cast.name} の日別明細</div>
                      <button onClick={()=>{ setNewA(p=>({...p,cast_id:String(cast.id)})); }} style={{fontSize:12,color:"var(--accent)",background:"var(--accent)15",border:"1px solid var(--accent)44",borderRadius:8,padding:"4px 12px",cursor:"pointer"}}>＋ 手当を追加</button>
                    </div>
                    {activeDates.length===0?(
                      <div style={{textAlign:"center",color:"var(--text-muted)",padding:"12px 0",fontSize:13}}>この月の記録はありません</div>
                    ):activeDates.map(date=>{
                      const d=calcCastDay(cast,date);
                      const isOpen = paySelectedDate===`${cast.id}-${date}`;
                      return (
                        <div key={date} style={{borderBottom:"1px solid var(--border)"}}>
                          {/* 日付行（タップで展開） */}
                          <div
                            onClick={()=>setPaySelectedDate(isOpen?null:`${cast.id}-${date}`)}
                            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",cursor:"pointer"}}
                          >
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontWeight:600,fontSize:13,color:"var(--text-primary)"}}>{fmtShort(date)}</span>
                              {d.shift&&<span style={{fontSize:11,color:"var(--text-muted)"}}>{d.shift.start_time?.slice(0,5)}〜{d.shift.end_time?.slice(0,5)}</span>}
                              {d.dayAllowances.length>0&&<span style={{fontSize:10,background:"var(--accent)22",color:"var(--accent)",padding:"1px 6px",borderRadius:4}}>+{d.dayAllowances.length}件</span>}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontWeight:700,color,fontSize:14}}>¥{d.total.toLocaleString()}</span>
                              <span style={{fontSize:11,color:"var(--text-muted)"}}>{isOpen?"▲":"▼"}</span>
                            </div>
                          </div>

                          {/* 展開時：詳細 */}
                          {isOpen&&(
                            <div style={{background:"var(--bg-input)",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                              {/* 勤務時間・基本給 */}
                              {d.shift&&(
                                <div style={{marginBottom:d.dayAllowances.length>0?10:0}}>
                                  <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:700,marginBottom:6}}>📋 勤務</div>
                                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                                    <span style={{color:"var(--text-secondary)"}}>勤務時間</span>
                                    <span style={{color:"var(--text-primary)"}}>{d.shift.start_time?.slice(0,5)}〜{d.shift.end_time?.slice(0,5)}（{fmtH(d.mins)}）</span>
                                  </div>
                                  {d.baseWage>0&&(
                                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                                      <span style={{color:"var(--text-secondary)"}}>基本給</span>
                                      <span style={{color:"var(--text-primary)",fontWeight:600}}>¥{d.baseWage.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 手当・控除明細 */}
                              {d.dayAllowances.length>0&&(
                                <div style={{borderTop:d.shift?"1px solid var(--border)":"none",paddingTop:d.shift?10:0}}>
                                  <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:700,marginBottom:6}}>💴 手当・控除</div>
                                  {d.dayAllowances.map(a=>(
                                    <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,marginBottom:4}}>
                                      <span style={{color:"var(--text-secondary)"}}>{a.label}</span>
                                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                                        <span style={{color:a.amount>=0?"var(--online)":"#ff4444",fontWeight:600}}>{a.amount>=0?"+":""}¥{a.amount.toLocaleString()}</span>
                                        <button onClick={e=>{e.stopPropagation();deleteAllowance(a.id);}} style={{background:"#ff444418",border:"1px solid #ff444444",color:"#ff4444",padding:"1px 6px",borderRadius:4,fontSize:10,cursor:"pointer"}}>削除</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 日計 */}
                              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--border)",marginTop:6}}>
                                <span style={{fontWeight:700,color:"var(--text-muted)",fontSize:13}}>日計</span>
                                <span style={{fontWeight:900,color,fontSize:16}}>¥{d.total.toLocaleString()}</span>
                              </div>

                              {/* この日に手当追加ボタン */}
                              <button
                                onClick={e=>{e.stopPropagation();setNewA(p=>({...p,cast_id:String(cast.id),date}));}}
                                style={{marginTop:10,width:"100%",padding:"7px",background:"transparent",border:"1px dashed var(--accent)44",borderRadius:8,color:"var(--accent)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}
                              >＋ この日に手当・控除を追加</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 手当・控除追加フォーム */}
              <div style={{...sectionStyle,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:12}}>＋ 手当・控除を追加</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>キャスト</div>
                    <select value={newA.cast_id} onChange={e=>setNewA(p=>({...p,cast_id:e.target.value}))} style={{...smInput,width:"100%"}}>
                      <option value="">選択</option>
                      {casts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>日付</div>
                    <input type="date" value={newA.date} onChange={e=>setNewA(p=>({...p,date:e.target.value}))} style={{...smInput,width:"100%"}}/>
                  </div>
                </div>
                <div style={{marginBottom:10,position:"relative"}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>件名</div>
                  <input type="text" value={newA.label} onChange={e=>{setNewA(p=>({...p,label:e.target.value}));setShowPresets(true);}} onFocus={()=>setShowPresets(true)} placeholder="件名を入力（タップでプリセット）" style={{...smInput,width:"100%"}}/>
                  {showPresets&&(
                    <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,padding:4,boxShadow:"0 4px 16px #00000044"}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:4}}>
                        {[...shopMenuNames, ...ALLOWANCE_PRESETS.filter(p=>!shopMenuNames.includes(p))].filter(p=>!newA.label||p.includes(newA.label)).map(p=>(
                          <button key={p} onClick={()=>{setNewA(prev=>({...prev,label:p}));setShowPresets(false);}} style={{padding:"5px 10px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-secondary)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>{p}</button>
                        ))}
                      </div>
                      <button onClick={()=>setShowPresets(false)} style={{display:"block",width:"100%",padding:"4px",background:"none",border:"none",color:"var(--text-hint)",fontSize:11,cursor:"pointer",textAlign:"right"}}>閉じる</button>
                    </div>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,marginBottom:12,alignItems:"end"}}>
                  <div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>±</div>
                    <select value={newA.sign} onChange={e=>setNewA(p=>({...p,sign:e.target.value}))} style={{...smInput,width:"100%"}}>
                      <option value="+">＋ 手当</option>
                      <option value="-">－ 控除</option>
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>金額（円）</div>
                    <input type="number" value={newA.amount} onChange={e=>setNewA(p=>({...p,amount:e.target.value}))} placeholder="例: 3000" style={{...smInput,width:"100%"}}/>
                  </div>
                </div>
                <button onClick={addAllowance} disabled={!newA.cast_id||!newA.date||!newA.label||!newA.amount} style={{width:"100%",padding:"10px",borderRadius:10,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(!newA.cast_id||!newA.date||!newA.label||!newA.amount)?0.4:1,fontFamily:"var(--font)"}}>追加する</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
