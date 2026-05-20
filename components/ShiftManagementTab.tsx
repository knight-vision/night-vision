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
function getDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 35; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    dates.push(getDateStr(d));
  }
  return dates;
}
function fmtFull(ds: string) {
  const d = new Date(ds + "T00:00:00");
  return `${d.getMonth()+1}月${d.getDate()}日(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function fmtShort(ds: string) {
  const d = new Date(ds + "T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function isWeekClosed(ds: string, closedDays: string[]): boolean {
  const d = new Date(ds + "T00:00:00");
  return closedDays.includes(["日","月","火","水","木","金","土"][d.getDay()]);
}
function calcMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e <= s) e += 24 * 60;
  return e - s;
}
function fmtH(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

const CAST_COLORS = ["#ff6b9d","#00d4ff","#ffd700","#a855f7","#00e5a0","#ff9500","#00c7be","#ff3b30","#34aadc","#4cd964"];
const HOURS = Array.from({length:31},(_,i)=>i);
const MINUTES = ["00","10","20","30","40","50"];
const tLabel = (h: number) => h >= 24 ? `翌${h-24}時` : `${h}時`;

type DraftEntry = { cast_id: number; start_time: string; end_time: string };

type Props = {
  shopId: string; casts: Cast[];
  shiftRequests: ShiftRequest[]; setShiftRequests: (v: ShiftRequest[]) => void;
  confirmedShifts: ConfirmedShift[]; setConfirmedShifts: (v: ConfirmedShift[]) => void;
  shiftLoading: boolean; setShiftLoading: (v: boolean) => void;
  shiftMsg: string; setShiftMsg: (v: string) => void;
  castAccountEmail: Record<number, string>; setCastAccountEmail: (v: Record<number, string>) => void;
  issuingAccount: number | null; setIssuingAccount: (v: number | null) => void;
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
  const [view, setView] = useState<"calendar" | "payroll" | "accounts">("calendar");
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [draft, setDraft] = useState<Record<string, DraftEntry[]>>({});
  const [selectedDate, setSelectedDate] = useState<string|null>(null);
  const [loaded, setLoaded] = useState(false);

  // 給与管理
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0,7));
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [allowanceLoading, setAllowanceLoading] = useState(false);
  const [newAllowance, setNewAllowance] = useState<{ cast_id: string; date: string; label: string; amount: string }>({ cast_id: "", date: "", label: "", amount: "" });
  const [expandedCast, setExpandedCast] = useState<number|null>(null);

  // 週ナビ
  const [weekOffset, setWeekOffset] = useState(0);

  const dates = getDates();

  useEffect(() => { if (!loaded) { loadAll(); setLoaded(true); } }, []);
  useEffect(() => { loadAllowances(); }, [payrollMonth]);

  const loadAll = async () => {
    setShiftLoading(true);
    const res = await fetch(`/api/confirm-shift?shop_id=${shopId}`);
    if (res.ok) {
      const data = await res.json();
      setShiftRequests(data.requests || []);
      setConfirmedShifts(data.confirmed || []);
      setClosedDates(data.closedDates || []);
    }
    setShiftLoading(false);
  };

  const loadAllowances = async () => {
    setAllowanceLoading(true);
    const res = await fetch(`/api/cast-allowances?shop_id=${shopId}&month=${payrollMonth}`);
    if (res.ok) setAllowances(await res.json());
    setAllowanceLoading(false);
  };

  const addAllowance = async () => {
    const { cast_id, date, label, amount } = newAllowance;
    if (!cast_id || !date || !label || !amount) return;
    const res = await fetch("/api/cast-allowances", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: Number(cast_id), shop_id: Number(shopId), date, label, amount: Number(amount) }),
    });
    if (res.ok) {
      setNewAllowance({ cast_id: "", date: "", label: "", amount: "" });
      await loadAllowances();
    }
  };

  const deleteAllowance = async (id: string) => {
    await fetch("/api/cast-allowances", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadAllowances();
  };

  const getColor = (castId: number) => CAST_COLORS[casts.findIndex(c => c.id === castId) % CAST_COLORS.length] || "#aaa";
  const isClosedDate = (date: string) => closedDates.some(c => c.date === date);
  const isClosed = (date: string) => isClosedDate(date) || isWeekClosed(date, shopClosedWeekDays);
  const confirmedOnDate = (date: string) => confirmedShifts.filter(s => s.date === date);
  const requestsOnDate = (date: string) => shiftRequests.filter(s => s.date === date && s.status === "pending");

  const addCastToDraft = (date: string, castId: number) => {
    const req = shiftRequests.find(r => r.cast_id === castId && r.date === date);
    setDraft(prev => ({ ...prev, [date]: [...(prev[date]||[]).filter(e=>e.cast_id!==castId), { cast_id: castId, start_time: req?.start_time?.slice(0,5)||"20:00", end_time: req?.end_time?.slice(0,5)||"24:00" }] }));
  };
  const removeCastFromDraft = (date: string, castId: number) => {
    setDraft(prev => { const n={...prev}; n[date]=(n[date]||[]).filter(e=>e.cast_id!==castId); if(!n[date].length) delete n[date]; return n; });
  };
  const updateDraftTime = (date: string, castId: number, field: "start_time"|"end_time", val: string) => {
    setDraft(prev => ({ ...prev, [date]: (prev[date]||[]).map(e=>e.cast_id===castId?{...e,[field]:val}:e) }));
  };
  const hasDraft = (date: string, castId: number) => (draft[date]||[]).some(e=>e.cast_id===castId);
  const totalDraftShifts = Object.values(draft).flat().length;

  const handleConfirm = async () => {
    const shifts = Object.entries(draft).flatMap(([date, entries]) => entries.map(e=>({cast_id:e.cast_id,date,start_time:e.start_time,end_time:e.end_time})));
    if (!shifts.length) { setShiftMsg("確定するシフトがありません"); return; }
    setShiftLoading(true); setShiftMsg("");
    const res = await fetch("/api/confirm-shift", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({shop_id:shopId,shifts}) });
    if (res.ok) { setShiftMsg(`${shifts.length}件の確定シフトを保存しました。キャストにメール通知しました。`); setDraft({}); await loadAll(); }
    else setShiftMsg("保存に失敗しました。");
    setShiftLoading(false);
  };

  const handleDeleteConfirmed = async (castId: number, date: string) => {
    await fetch("/api/confirm-shift", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({cast_id:castId,date}) });
    await loadAll();
  };

  const handleIssueAccount = async (cast: Cast) => {
    const email = castAccountEmail[cast.id];
    if (!email) { setShiftMsg("メールアドレスを入力してください"); return; }
    setIssuingAccount(cast.id);
    const res = await fetch("/api/issue-cast-account", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({cast_id:cast.id,email,shop_name:shopName}) });
    if (res.ok) { setShiftMsg(`${cast.name}にアカウントを発行しました。`); setCastAccountEmail({...castAccountEmail,[cast.id]:""}); }
    else setShiftMsg("アカウント発行に失敗しました。");
    setIssuingAccount(null);
  };

  const smInput: React.CSSProperties = { ...inputStyle as any, padding:"4px 8px", fontSize:12, width:"auto" };

  // ===== 給与計算 =====
  const monthDates = (() => {
    const [y,m] = payrollMonth.split("-").map(Number);
    const dates: string[] = [];
    const d = new Date(y,m-1,1);
    while (d.getMonth()===m-1) { dates.push(getDateStr(d)); d.setDate(d.getDate()+1); }
    return dates;
  })();

  const calcCastPayroll = (cast: Cast) => {
    const myShifts = confirmedShifts.filter(s => s.cast_id === cast.id && s.date.startsWith(payrollMonth));
    const totalMin = myShifts.reduce((sum,s) => sum + calcMinutes(s.start_time, s.end_time), 0);
    const baseWage = cast.hourly_wage ? Math.round(cast.hourly_wage * totalMin / 60) : 0;
    const myAllowances = allowances.filter(a => a.cast_id === cast.id);
    const allowanceTotal = myAllowances.reduce((sum,a) => sum + a.amount, 0);
    return { myShifts, totalMin, baseWage, allowanceTotal, total: baseWage + allowanceTotal, myAllowances };
  };

  // CSV出力
  const downloadCSV = () => {
    const rows: string[][] = [["キャスト名","時給","出勤日数","総勤務時間","基本給","手当/控除合計","合計給与","詳細（手当/控除）"]];
    for (const cast of casts) {
      const p = calcCastPayroll(cast);
      const detail = p.myAllowances.map(a=>`${a.date} ${a.label} ${a.amount>=0?"+":""}${a.amount}円`).join(" | ");
      rows.push([
        cast.name,
        cast.hourly_wage ? `¥${cast.hourly_wage}/h` : "未設定",
        String(p.myShifts.length),
        fmtH(p.totalMin),
        String(p.baseWage),
        String(p.allowanceTotal),
        String(p.total),
        detail,
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `給与明細_${shopName}_${payrollMonth}.csv`; a.click();
  };

  // PDF出力（印刷ダイアログ）
  const downloadPDF = () => {
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>給与明細 ${shopName} ${payrollMonth}</title>
<style>
  body { font-family: 'Hiragino Sans', sans-serif; padding: 24px; color: #111; font-size: 13px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1a0828; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  .cast-name { font-weight: 700; font-size: 14px; }
  .total { font-weight: 700; color: #7c3aed; font-size: 15px; }
  .allowance { font-size: 11px; color: #555; line-height: 1.8; }
  .positive { color: #059669; } .negative { color: #dc2626; }
  .summary { background: #f8f0ff; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
  @media print { body { padding: 8px; } }
</style></head><body>
<h1>給与明細</h1>
<div class="sub">${shopName} &nbsp; 対象月: ${payrollMonth}</div>
<table>
<thead><tr>
  <th>キャスト</th><th>出勤日数</th><th>勤務時間</th><th>基本給</th><th>手当・控除</th><th>合計</th>
</tr></thead><tbody>
${casts.map(cast => {
  const p = calcCastPayroll(cast);
  const allowanceDetail = p.myAllowances.map(a =>
    `<div class="${a.amount>=0?"positive":"negative"}">${a.date} ${a.label}：${a.amount>=0?"+":""}${a.amount.toLocaleString()}円</div>`
  ).join("");
  return `<tr>
    <td><div class="cast-name">${cast.name}</div>${cast.hourly_wage?`<div style="font-size:11px;color:#888">¥${cast.hourly_wage.toLocaleString()}/h</div>`:"未設定"}</td>
    <td>${p.myShifts.length}日</td>
    <td>${fmtH(p.totalMin)}</td>
    <td>${p.baseWage.toLocaleString()}円</td>
    <td class="allowance">${allowanceDetail || "—"}<div style="margin-top:4px;font-weight:600;">${p.allowanceTotal!==0?(p.allowanceTotal>=0?"+":"")+p.allowanceTotal.toLocaleString()+"円":""}</div></td>
    <td class="total">${p.total.toLocaleString()}円</td>
  </tr>`;
}).join("")}
</tbody></table>
<div class="summary">
  <strong>合計人件費：¥${casts.reduce((sum,c)=>sum+calcCastPayroll(c).total,0).toLocaleString()}</strong>
</div>
<div style="margin-top:32px;font-size:10px;color:#bbb;">釧路ナイトビジョン 給与管理システム / 出力: ${new Date().toLocaleDateString("ja-JP")}</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div>
      {/* サブナビ */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        {[
          { key:"calendar", label:"📅 出勤表（シフトカレンダー）" },
          { key:"payroll",  label:"💰 給与管理" },
          { key:"accounts", label:"🔑 アカウント管理" },
        ].map(v => (
          <button key={v.key} onClick={()=>setView(v.key as any)} style={{
            padding:"8px 14px", borderRadius:10, cursor:"pointer",
            fontFamily:"var(--font)", fontSize:13, fontWeight:view===v.key?700:500,
            background:view===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
            border:`1px solid ${view===v.key?"transparent":"var(--border)"}`,
            color:view===v.key?"#fff":"var(--text-secondary)",
          }}>{v.label}</button>
        ))}
        <button onClick={loadAll} style={{ marginLeft:"auto", padding:"8px 14px", borderRadius:10, background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--text-muted)", fontSize:12, cursor:"pointer" }}>🔄 更新</button>
      </div>

      {shiftMsg && (
        <div style={{ background:shiftMsg.includes("失敗")?"#ff444418":"var(--online-bg)", border:`1px solid ${shiftMsg.includes("失敗")?"#ff444444":"var(--online-border)"}`, borderRadius:10, padding:"10px 16px", color:shiftMsg.includes("失敗")?"#ff4444":"var(--online)", fontSize:13, marginBottom:16 }}>{shiftMsg}</div>
      )}
      {shiftLoading && <div style={{ textAlign:"center", color:"var(--text-muted)", padding:20 }}>読み込み中...</div>}

      {/* ===== 出勤表（シフトカレンダー） ===== */}
      {view === "calendar" && !shiftLoading && (
        <div>
          <p style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:16, lineHeight:1.7 }}>
            日付をタップして出勤キャストと時間を設定し「保存」してください。<br/>
            <span style={{ opacity:0.7, fontSize:12 }}>📩 = 希望あり　🚫 = 定休日・店休日</span>
          </p>

          {totalDraftShifts > 0 && (
            <button onClick={handleConfirm} disabled={shiftLoading} style={{ ...btnPrimary as any, marginBottom:16, position:"sticky", top:8, zIndex:10, boxShadow:"0 4px 20px var(--accent)44" }}>
              💾 {totalDraftShifts}件の確定シフトを保存してメール通知
            </button>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {dates.map(date => {
              const closed = isClosed(date);
              const closedByException = isClosedDate(date);
              const closedDateReason = closedDates.find(c=>c.date===date)?.reason;
              const confirmed = confirmedOnDate(date);
              const pending = requestsOnDate(date);
              const isSelected = selectedDate === date;
              const draftEntries = draft[date] || [];
              const isToday = date === getDateStr(new Date());
              return (
                <div key={date} style={{ borderBottom:"1px solid var(--border)" }}>
                  <div onClick={()=>!closed&&setSelectedDate(isSelected?null:date)} style={{
                    display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
                    padding:"11px 16px", cursor:closed?"default":"pointer",
                    background:closed?"#ff444408":isSelected?"var(--accent)10":isToday?"var(--accent)06":"transparent",
                  }}>
                    <div style={{ minWidth:96, fontWeight:isToday?900:600, fontSize:14, flexShrink:0,
                      color:closed?"#ff6666":isToday?"var(--accent)":"var(--text-primary)" }}>
                      {fmtFull(date)}
                      {isToday&&<span style={{ fontSize:9, marginLeft:6, color:"var(--accent)", background:"var(--accent)22", padding:"1px 5px", borderRadius:4 }}>今日</span>}
                    </div>
                    {closed&&<span style={{ fontSize:11, background:"#ff444420", color:"#ff6666", border:"1px solid #ff444444", padding:"2px 8px", borderRadius:8, flexShrink:0 }}>
                      {closedByException?`🚫 店休日${closedDateReason?`（${closedDateReason}）`:""}` :"🚫 定休日"}</span>}
                    {!closed&&pending.length>0&&<span style={{ fontSize:11, background:"var(--accent)22", color:"var(--accent)", border:"1px solid var(--accent)55", padding:"2px 8px", borderRadius:8, flexShrink:0 }}>📩 希望{pending.length}件</span>}
                    {!closed&&confirmed.length>0&&(
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap", flex:1 }}>
                        {confirmed.map(s=><span key={s.id} style={{ fontSize:11, padding:"2px 8px", borderRadius:8, fontWeight:600, background:getColor(s.cast_id)+"22", color:getColor(s.cast_id), border:`1px solid ${getColor(s.cast_id)}55` }}>{s.casts?.name} {s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>)}
                      </div>
                    )}
                    {!closed&&draftEntries.length>0&&(
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {draftEntries.map(e=>{const c=casts.find(c=>c.id===e.cast_id); return <span key={e.cast_id} style={{ fontSize:11, padding:"2px 8px", borderRadius:8, fontWeight:600, background:getColor(e.cast_id)+"33", color:getColor(e.cast_id), border:`2px dashed ${getColor(e.cast_id)}` }}>{c?.name} {e.start_time}〜{e.end_time}</span>;})}
                      </div>
                    )}
                    {!closed&&<span style={{ marginLeft:"auto", fontSize:12, color:"var(--text-muted)", flexShrink:0 }}>{isSelected?"▲":"▼"}</span>}
                    {closed&&closedByException&&<button onClick={e=>{e.stopPropagation();fetch("/api/confirm-shift",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"closed_date",shop_id:shopId,date})}).then(loadAll);}} style={{ marginLeft:"auto", background:"none", border:"1px solid #ff444444", borderRadius:8, color:"#ff4444", padding:"2px 10px", fontSize:11, cursor:"pointer" }}>解除</button>}
                  </div>

                  {isSelected && !closed && (
                    <div style={{ padding:"14px 16px 18px", background:"var(--bg-card)", borderTop:"1px solid var(--border)" }}>
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:700, marginBottom:8 }}>出勤キャストを選択</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {casts.map(cast=>{
                            const selected=hasDraft(date,cast.id);
                            const hasReq=shiftRequests.some(r=>r.cast_id===cast.id&&r.date===date);
                            const color=getColor(cast.id);
                            return <button key={cast.id} onClick={()=>selected?removeCastFromDraft(date,cast.id):addCastToDraft(date,cast.id)} style={{ padding:"7px 16px", borderRadius:20, cursor:"pointer", fontFamily:"var(--font)", fontSize:13, fontWeight:selected?700:500, background:selected?`${color}22`:"var(--bg-input)", border:`1.5px solid ${selected?color:hasReq?color+"88":"var(--border)"}`, color:selected?color:hasReq?color:"var(--text-secondary)" }}>{cast.name}{hasReq&&!selected?" 📩":""}</button>;
                          })}
                        </div>
                      </div>
                      {draftEntries.map(entry=>{
                        const cast=casts.find(c=>c.id===entry.cast_id);
                        const color=getColor(entry.cast_id);
                        const req=shiftRequests.find(r=>r.cast_id===entry.cast_id&&r.date===date);
                        return (
                          <div key={entry.cast_id} style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:8, padding:"10px 12px", borderRadius:10, background:`${color}11`, border:`1px solid ${color}44` }}>
                            <span style={{ color, fontWeight:700, fontSize:13, minWidth:56 }}>{cast?.name}</span>
                            {req&&<div style={{ fontSize:11, color:"var(--accent)", display:"flex", flexDirection:"column", gap:1 }}><span>希望: {req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</span>{req.note&&<span style={{ color:"var(--text-muted)" }}>📝 {req.note}</span>}</div>}
                            <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                              <select value={entry.start_time.split(":")[0]} onChange={e=>updateDraftTime(date,entry.cast_id,"start_time",`${e.target.value}:${entry.start_time.split(":")[1]}`)} style={smInput}>{HOURS.map(h=><option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}</select>
                              <select value={entry.start_time.split(":")[1]} onChange={e=>updateDraftTime(date,entry.cast_id,"start_time",`${entry.start_time.split(":")[0]}:${e.target.value}`)} style={smInput}>{MINUTES.map(m=><option key={m} value={m}>{m}分</option>)}</select>
                              <span style={{ color:"var(--text-muted)" }}>〜</span>
                              <select value={entry.end_time.split(":")[0]} onChange={e=>updateDraftTime(date,entry.cast_id,"end_time",`${e.target.value}:${entry.end_time.split(":")[1]}`)} style={smInput}>{HOURS.map(h=><option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}</select>
                              <select value={entry.end_time.split(":")[1]} onChange={e=>updateDraftTime(date,entry.cast_id,"end_time",`${entry.end_time.split(":")[0]}:${e.target.value}`)} style={smInput}>{MINUTES.map(m=><option key={m} value={m}>{m}分</option>)}</select>
                            </div>
                          </div>
                        );
                      })}
                      {confirmed.length>0&&<div style={{ marginTop:10 }}>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:700, marginBottom:6 }}>📌 確定済み</div>
                        {confirmed.map(s=><div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:13, color:getColor(s.cast_id), fontWeight:600 }}>{s.casts?.name}</span>
                          <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>
                          <button onClick={()=>handleDeleteConfirmed(s.cast_id,date)} style={{ background:"#ff444418", border:"1px solid #ff444444", color:"#ff4444", padding:"2px 8px", borderRadius:6, fontSize:11, cursor:"pointer" }}>削除</button>
                        </div>)}
                      </div>}
                      <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)" }}>
                        <button onClick={()=>fetch("/api/confirm-shift",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_id:shopId,date})}).then(loadAll)} style={{ padding:"7px 16px", borderRadius:8, background:"#ff444420", border:"1px solid #ff444444", color:"#ff4444", fontSize:12, cursor:"pointer", fontFamily:"var(--font)", fontWeight:700 }}>🚫 この日を店休日に設定</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalDraftShifts>0&&<button onClick={handleConfirm} disabled={shiftLoading} style={{ ...btnPrimary as any, marginTop:20 }}>💾 {totalDraftShifts}件の確定シフトを保存してメール通知</button>}
        </div>
      )}

      {/* ===== 給与管理 ===== */}
      {view === "payroll" && (
        <div>
          {/* 月切り替え */}
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:20 }}>
            <button onClick={()=>{const d=new Date(payrollMonth+"-01");d.setMonth(d.getMonth()-1);setPayrollMonth(d.toISOString().slice(0,7));}} style={{ padding:"6px 14px", borderRadius:8, background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--text-secondary)", cursor:"pointer" }}>← 前月</button>
            <span style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)" }}>{payrollMonth.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(payrollMonth+"-01");d.setMonth(d.getMonth()+1);setPayrollMonth(d.toISOString().slice(0,7));}} style={{ padding:"6px 14px", borderRadius:8, background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--text-secondary)", cursor:"pointer" }}>次月 →</button>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <button onClick={downloadCSV} style={{ padding:"7px 14px", borderRadius:8, background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--text-secondary)", fontSize:12, cursor:"pointer" }}>📄 CSV</button>
              <button onClick={downloadPDF} style={{ padding:"7px 14px", borderRadius:8, background:"var(--accent)22", border:"1px solid var(--accent)55", color:"var(--accent)", fontSize:12, cursor:"pointer", fontWeight:700 }}>🖨️ PDF印刷</button>
            </div>
          </div>

          {/* 手当・控除追加フォーム */}
          <div style={{ ...sectionStyle, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", marginBottom:12 }}>＋ 手当・控除を追加</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>キャスト</div>
                <select value={newAllowance.cast_id} onChange={e=>setNewAllowance(p=>({...p,cast_id:e.target.value}))} style={{ ...smInput, minWidth:90 }}>
                  <option value="">選択</option>
                  {casts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>日付</div>
                <input type="date" value={newAllowance.date} onChange={e=>setNewAllowance(p=>({...p,date:e.target.value}))} style={smInput} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>件名</div>
                <input type="text" value={newAllowance.label} onChange={e=>setNewAllowance(p=>({...p,label:e.target.value}))} placeholder="同伴・ドリンクバック等" style={{ ...smInput, minWidth:130 }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>金額（マイナス可）</div>
                <input type="number" value={newAllowance.amount} onChange={e=>setNewAllowance(p=>({...p,amount:e.target.value}))} placeholder="例：-1500" style={{ ...smInput, minWidth:100 }} />
              </div>
              <button onClick={addAllowance} disabled={!newAllowance.cast_id||!newAllowance.date||!newAllowance.label||!newAllowance.amount} style={{ padding:"7px 16px", borderRadius:8, background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:(!newAllowance.cast_id||!newAllowance.date||!newAllowance.label||!newAllowance.amount)?0.4:1 }}>追加</button>
            </div>
          </div>

          {/* キャストごと給与明細 */}
          {allowanceLoading ? <div style={{ textAlign:"center", color:"var(--text-muted)", padding:20 }}>読み込み中...</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {casts.map(cast => {
                const p = calcCastPayroll(cast);
                const color = getColor(cast.id);
                const isExpanded = expandedCast === cast.id;
                return (
                  <div key={cast.id} style={{ ...sectionStyle, marginBottom:0 }}>
                    {/* ヘッダー行 */}
                    <div onClick={()=>setExpandedCast(isExpanded?null:cast.id)} style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:700, color, fontSize:15 }}>{cast.name}</span>
                        {cast.hourly_wage&&<span style={{ color:"var(--text-muted)", fontSize:11, marginLeft:8 }}>¥{cast.hourly_wage.toLocaleString()}/h</span>}
                        <div style={{ fontSize:12, color:"var(--text-secondary)", marginTop:4 }}>
                          {p.myShifts.length}日出勤　{fmtH(p.totalMin)}
                          {cast.hourly_wage&&` 　基本給 ¥${p.baseWage.toLocaleString()}`}
                          {p.allowanceTotal!==0&&<span style={{ color:p.allowanceTotal>0?"var(--online)":"#ff4444", marginLeft:8 }}>{p.allowanceTotal>0?"+":""}¥{p.allowanceTotal.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:900, color, fontSize:18 }}>¥{p.total.toLocaleString()}</div>
                        <div style={{ fontSize:11, color:"var(--text-muted)" }}>{isExpanded?"▲":"▼"} 詳細</div>
                      </div>
                    </div>

                    {/* 詳細展開 */}
                    {isExpanded && (
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--border)" }}>
                        {/* シフト詳細 */}
                        {p.myShifts.length > 0 && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:6 }}>勤務日</div>
                            {p.myShifts.map(s=>{
                              const min=calcMinutes(s.start_time,s.end_time);
                              const pay=cast.hourly_wage?Math.round(cast.hourly_wage*min/60):null;
                              return <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid var(--border)", fontSize:12 }}>
                                <span style={{ color:"var(--text-secondary)" }}>{fmtShort(s.date)}</span>
                                <span style={{ color:"var(--text-primary)" }}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}（{fmtH(min)}）</span>
                                {pay&&<span style={{ color }}>¥{pay.toLocaleString()}</span>}
                              </div>;
                            })}
                          </div>
                        )}
                        {/* 手当・控除 */}
                        {p.myAllowances.length > 0 && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:6 }}>手当・控除</div>
                            {p.myAllowances.map(a=>(
                              <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid var(--border)", fontSize:12 }}>
                                <div>
                                  <span style={{ color:"var(--text-muted)", marginRight:8 }}>{fmtShort(a.date)}</span>
                                  <span style={{ color:"var(--text-secondary)" }}>{a.label}</span>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontWeight:700, color:a.amount>=0?"var(--online)":"#ff4444" }}>{a.amount>=0?"+":""}¥{a.amount.toLocaleString()}</span>
                                  <button onClick={()=>deleteAllowance(a.id)} style={{ background:"#ff444418", border:"1px solid #ff444444", color:"#ff4444", padding:"2px 8px", borderRadius:6, fontSize:10, cursor:"pointer" }}>削除</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* 合計 */}
                        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, fontWeight:700 }}>
                          <span style={{ color:"var(--text-muted)" }}>合計支給額</span>
                          <span style={{ color, fontSize:16 }}>¥{p.total.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 月合計 */}
          <div style={{ ...sectionStyle, marginTop:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, color:"var(--text-muted)", fontSize:14 }}>{payrollMonth.replace("-","年")}月 合計人件費</span>
            <span style={{ fontWeight:900, color:"var(--accent)", fontSize:22 }}>
              ¥{casts.reduce((sum,c)=>sum+calcCastPayroll(c).total,0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ===== アカウント管理 ===== */}
      {view === "accounts" && (
        <div style={sectionStyle}>
          <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:16, lineHeight:1.7 }}>
            キャストのポータルアカウントを管理します。メールアドレスを入力して「発行」するとログイン情報がメール送信されます。<br/>
            既存アカウントのメールアドレスを変更することもできます。
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {casts.map(cast => (
              <div key={cast.id} style={{ padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontWeight:700, color:getColor(cast.id), fontSize:14, marginBottom:10 }}>{cast.name}</div>
                {/* 新規発行 */}
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                  <input type="email" value={castAccountEmail[cast.id]||""} onChange={e=>setCastAccountEmail({...castAccountEmail,[cast.id]:e.target.value})}
                    placeholder="新規発行：メールアドレスを入力"
                    style={{ ...inputStyle as any, flex:1, minWidth:180, fontSize:13 }} />
                  <button onClick={()=>handleIssueAccount(cast)} disabled={issuingAccount===cast.id||!castAccountEmail[cast.id]} style={{ padding:"8px 16px", borderRadius:10, cursor:"pointer", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", color:"#fff", fontSize:13, fontWeight:700, fontFamily:"var(--font)", opacity:issuingAccount===cast.id||!castAccountEmail[cast.id]?0.5:1 }}>
                    {issuingAccount===cast.id?"発行中...":"発行"}
                  </button>
                </div>
                {/* メール変更 */}
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <input type="email" id={`edit-email-${cast.id}`} placeholder="既存アカウントのメールアドレスを変更"
                    style={{ ...inputStyle as any, flex:1, minWidth:180, fontSize:13 }} />
                  <button onClick={async()=>{
                    const input=document.getElementById(`edit-email-${cast.id}`) as HTMLInputElement;
                    const email=input?.value?.trim(); if(!email) return;
                    const res=await fetch("/api/cast-account-update",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({cast_id:cast.id,shop_id:shopId,new_email:email})});
                    if(res.ok){setShiftMsg(`${cast.name}のメールアドレスを変更しました`);input.value="";}
                    else setShiftMsg("変更に失敗しました");
                  }} style={{ padding:"8px 14px", borderRadius:10, cursor:"pointer", background:"var(--bg-card)", border:"1px solid var(--border)", color:"var(--text-secondary)", fontSize:13, fontFamily:"var(--font)" }}>メール変更</button>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:"var(--text-hint)", marginTop:16, lineHeight:1.8 }}>
            ポータルURL: <a href="https://www.night-vision.jp/cast-login" style={{ color:"var(--accent)" }}>https://www.night-vision.jp/cast-login</a>
          </p>
        </div>
      )}
    </div>
  );
}
