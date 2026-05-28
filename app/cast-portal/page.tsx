"use client";
import { useState, useEffect, useRef } from "react";
import CastPhotosPanel from "@/components/CastPhotosPanel";
import CastChangeRequestPanel from "@/components/CastChangeRequestPanel";
import CastFeedbackPanel from "@/components/CastFeedbackPanel";
import CastPayrollPanel from "@/components/CastPayrollPanel";
import CastSlipHistoryPanel from "@/components/CastSlipHistoryPanel";
import CastLinePanel from "@/components/CastLinePanel";
import CastPerformancePanel from "@/components/CastPerformancePanel";
import CastHomePanel from "@/components/CastHomePanel";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

type ShiftRequest = { date: string; start_time: string; end_time: string; note: string };
type ExistingRequest = { id: string; date: string; start_time: string; end_time: string; note: string; status: string };
type ShopInfo = { open_time: string | null; close_time: string | null; open_hour: string | null; closed_week_days: string[] | null; name: string | null };

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) { dates.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return dates;
}
function fmtDate(d: Date) {
  const days = ["日","月","火","水","木","金","土"];
  return `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`;
}
function isWeekClosed(d: Date, closedDays: string[]): boolean {
  return closedDays.includes(["日","月","火","水","木","金","土"][d.getDay()]);
}

// 営業時間から開始・終了時刻を抽出
function parseShopHours(shop: ShopInfo | null): { start: string; end: string } {
  const def = { start: "20:00", end: "01:00" };
  if (!shop) return def;
  if (shop.open_time) {
    const s = shop.open_time.slice(0, 5);
    const e = shop.close_time?.slice(0, 5) || def.end;
    return { start: s, end: e };
  }
  if (shop.open_hour) {
    const m = shop.open_hour.match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
    if (m) return { start: `${m[1].padStart(2,"0")}:${m[2]}`, end: `${m[3].padStart(2,"0")}:${m[4]}` };
  }
  return def;
}

// 0〜30時（翌6時まで）を30分刻みで生成
const ALL_HOURS = Array.from({length:31}, (_,i) => i);
const MINUTES = ["00","10","20","30","40","50"];
function tLabel(h: number) { return h >= 24 ? `翌${h-24}時` : `${h}時`; }

export default function CastPortalPage() {
  const router = useRouter();
  const [castId, setCastId] = useState<string|null>(null);
  const [castName, setCastName] = useState("");
  const [shopId, setShopId] = useState<string|null>(null);
  const [shopInfo, setShopInfo] = useState<ShopInfo|null>(null);
  const [existing, setExisting] = useState<ExistingRequest[]>([]);
  const [draft, setDraft] = useState<Record<string, ShiftRequest>>({});
  const [selectedDate, setSelectedDate] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const defaultHours = parseShopHours(shopInfo);

  useEffect(() => {
    const id = localStorage.getItem("cast_id");
    const name = localStorage.getItem("cast_name");
    const sid = localStorage.getItem("cast_shop_id");
    const aid = localStorage.getItem("cast_account_id");
    if (!id) { router.push("/cast-login"); return; }
    setCastId(id); setCastName(name || ""); setShopId(sid); setCastAccountId(aid);
    fetchData(id, sid);
  }, []);

  const fetchData = async (id: string, sid: string | null) => {
    // 確定シフト取得
    const csRes = await fetch(`/api/cast-confirmed-shifts?cast_id=${id}`);
    if (csRes.ok) setConfirmedShifts(await csRes.json());
    const params = new URLSearchParams({ cast_id: id });
    if (sid) params.set("shop_id", sid);
    const res = await fetch(`/api/cast-shift-request?${params}`);
    if (res.ok) {
      const data = await res.json();
      setExisting(data.requests || []);
      setShopInfo(data.shop || null);
    }
    setLoading(false);
  };

  const getEx = (date: string) => existing.find(r => r.date === date);
  const getDraft = (date: string): ShiftRequest =>
    draft[date] || { date, start_time: defaultHours.start, end_time: defaultHours.end, note: "" };

  const updateDraft = (date: string, field: keyof ShiftRequest, value: string) => {
    setDraft(prev => ({ ...prev, [date]: { ...getDraft(date), [field]: value } }));
  };

  const toggleDate = (date: string) => {
    if (draft[date]) {
      const next = { ...draft }; delete next[date]; setDraft(next);
    } else {
      const ex = getEx(date);
      setDraft(prev => ({
        ...prev,
        [date]: { date, start_time: ex?.start_time?.slice(0,5) || defaultHours.start, end_time: ex?.end_time?.slice(0,5) || defaultHours.end, note: ex?.note || "" },
      }));
    }
    setSelectedDate(date);
  };

  const handleSubmit = async () => {
    if (!castId || !shopId) return;
    setSaving(true); setSaveMsg("");
    const res = await fetch("/api/cast-shift-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: castId, shop_id: shopId, requests: Object.values(draft) }),
    });
    if (res.ok) {
      setSaveMsg("シフト希望を送信しました！お店に通知されます。");
      setDraft({}); fetchData(castId, shopId);
    } else { setSaveMsg("送信に失敗しました。もう一度お試しください。"); }
    setSaving(false);
  };

  const [portalView, setPortalView] = useState<"home"|"shift"|"payroll"|"photos"|"settings">("home");
  const [shiftSubView, setShiftSubView] = useState<"request"|"change">("request");
  const [payrollSubView, setPayrollSubView] = useState<"payroll"|"slips">("payroll");
  const [confirmedShifts, setConfirmedShifts] = useState<{id:string;date:string;start_time:string;end_time:string}[]>([]);
  const [castAccountId, setCastAccountId] = useState<string|null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const dates = getMonthDates(calYear, calMonth);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [accountMsg, setAccountMsg] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  const handleChangeEmail = async () => {
    if (!castId || !newEmail) return;
    setAccountLoading(true); setAccountMsg("");
    const res = await fetch("/api/cast-account-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: castId, email: newEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setAccountMsg("メールアドレスを変更しました。次回から新しいアドレスでログインしてください。");
      setNewEmail("");
    } else setAccountMsg(data.error || "変更に失敗しました");
    setAccountLoading(false);
  };

  const handleChangePassword = async () => {
    if (!castId || !currentPw || !newPw) return;
    if (newPw.length < 6) { setAccountMsg("新しいパスワードは6文字以上にしてください"); return; }
    setAccountLoading(true); setAccountMsg("");
    const res = await fetch("/api/cast-account-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: castId, current_password: currentPw, new_password: newPw }),
    });
    const data = await res.json();
    if (res.ok) { setAccountMsg("パスワードを変更しました。"); setCurrentPw(""); setNewPw(""); }
    else setAccountMsg(data.error || "変更に失敗しました");
    setAccountLoading(false);
  };

  const handleLogout = () => {
    ["cast_id","cast_account_id","cast_name","cast_shop_id"].forEach(k => localStorage.removeItem(k));
    router.push("/cast-login");
  };

  const sel: React.CSSProperties = {
    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
    borderRadius: 8, color: "var(--text-primary)", fontSize: 13,
    outline: "none", fontFamily: "var(--font)", padding: "6px 10px",
  };

  if (loading) return (
    <><Header />
    <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px", textAlign: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>読み込み中...</p>
    </main></>
  );

  return (
    <><Header />
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 4 }}>CAST PORTAL</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)" }}>キャストポータル</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{castName}{shopInfo?.name ? ` ／ ${shopInfo.name}` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowAccountSettings(!showAccountSettings)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>⚙️</button>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 12, padding: "6px 14px", cursor: "pointer" }}>ログアウト</button>
        </div>
      </div>

      {/* ナビゲーション */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "home", label: "🏠 ホーム" },
          { key: "shift", label: "📅 シフト" },
          { key: "payroll", label: "💰 給与・実績" },
          { key: "photos", label: "📷 写真" },
          { key: "settings", label: "⚙️ 設定" },
        ].map(v => (
          <button key={v.key} onClick={() => setPortalView(v.key as any)} style={{
            padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13,
            fontFamily: "var(--font)", fontWeight: portalView === v.key ? 700 : 500,
            background: portalView === v.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
            border: `1px solid ${portalView === v.key ? "transparent" : "var(--border)"}`,
            color: portalView === v.key ? "#fff" : "var(--text-secondary)",
          }}>{v.label}</button>
        ))}
      </div>

      {/* シフト希望 */}
      {portalView === "shift" && <>

      {/* 確定シフト */}
      {confirmedShifts.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--online-border)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--online)", marginBottom: 10 }}>✅ 確定シフト</div>
          {confirmedShifts.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(r => {
            const d = new Date(r.date + "T00:00:00");
            const isToday = r.date === new Date().toISOString().slice(0,10);
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: isToday ? "var(--accent)" : "var(--text-secondary)", fontWeight: isToday ? 700 : 400 }}>
                  {fmtDate(d)}{isToday && <span style={{ fontSize: 10, marginLeft: 5, color: "var(--accent)" }}>今日</span>}
                </span>
                <span style={{ color: "var(--text-primary)" }}>{r.start_time?.slice(0,5)} 〜 {r.end_time?.slice(0,5)}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--online-bg)", color: "var(--online)", border: "1px solid var(--online-border)" }}>確定</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 提出済みシフト希望 */}
      {existing.length > 0 && Object.keys(draft).length === 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📋 提出済みのシフト希望</div>
          {existing.map(r => {
            const d = new Date(r.date + "T00:00:00");
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>{fmtDate(d)}</span>
                <span style={{ color: "var(--text-primary)" }}>{r.start_time?.slice(0,5)} 〜 {r.end_time?.slice(0,5)}</span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: r.status === "approved" ? "var(--online-bg)" : "var(--bg-input)",
                  color: r.status === "approved" ? "var(--online)" : "var(--text-muted)",
                  border: `1px solid ${r.status === "approved" ? "var(--online-border)" : "var(--border)"}`,
                }}>{r.status === "approved" ? "確定" : "確認中"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 月ナビ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => { if(calMonth===1){setCalYear(y=>y-1);setCalMonth(12);}else setCalMonth(m=>m-1); }} style={{ padding: "5px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>← 前月</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{calYear}年{calMonth}月</span>
        <button onClick={() => { if(calMonth===12){setCalYear(y=>y+1);setCalMonth(1);}else setCalMonth(m=>m+1); }} style={{ padding: "5px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>次月 →</button>
        <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()+1); }} style={{ padding: "5px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>今月</button>
      </div>

      {/* 説明 */}
      <div style={{ background: "var(--accent)11", border: "1px solid var(--accent)33", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
        出勤したい日をタップして時間を設定し、「送信」してください。
        {shopInfo?.open_hour && <span style={{ color: "var(--text-muted)", display: "block", fontSize: 12, marginTop: 4 }}>営業時間: {shopInfo.open_hour}</span>}
      </div>

      {/* カレンダー（7列グリッド） */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>DATE · 日付を選択</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {dates.map(d => {
            const dateStr = getDateStr(d);
            const selected = !!draft[dateStr];
            const ex = !!getEx(dateStr);
            const closed = shopInfo?.closed_week_days ? isWeekClosed(d, shopInfo.closed_week_days) : false;
            const isToday = dateStr === getDateStr(new Date());
            const isSun = d.getDay() === 0, isSat = d.getDay() === 6;
            return (
              <button key={dateStr} onClick={() => !closed && toggleDate(dateStr)} disabled={closed} style={{
                padding: "8px 4px", borderRadius: 10, cursor: closed ? "not-allowed" : "pointer",
                border: `1.5px solid ${selected ? "var(--accent)" : ex ? "var(--online-border)" : "var(--border)"}`,
                background: closed ? "var(--border)22" : selected ? "var(--accent)22" : ex ? "var(--online-bg)" : "var(--bg-input)",
                color: closed ? "var(--text-hint)" : selected ? "var(--accent)" : ex ? "var(--online)" : isSun ? "#ff6b6b" : isSat ? "#6bb5ff" : "var(--text-secondary)",
                fontWeight: selected || isToday ? 800 : 500, fontSize: 10, textAlign: "center",
                fontFamily: "var(--font)", opacity: closed ? 0.4 : 1,
              }}>
                <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 1 }}>{["日","月","火","水","木","金","土"][d.getDay()]}</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{d.getDate()}</div>
                {isToday && <div style={{ fontSize: 8, color: "var(--accent)", marginTop: 1 }}>今日</div>}
                {ex && !selected && <div style={{ fontSize: 8, marginTop: 1 }}>提出済</div>}
                {closed && <div style={{ fontSize: 8, marginTop: 1 }}>定休</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 時間設定 */}
      {Object.keys(draft).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 10, fontWeight: 700 }}>TIME · 時間を設定</div>
          {Object.keys(draft).sort().map(dateStr => {
            const d = new Date(dateStr + "T00:00:00");
            const req = getDraft(dateStr);
            return (
              <div key={dateStr} style={{ background: "var(--bg-card)", border: "1px solid var(--accent)44", borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>{fmtDate(d)}</span>
                  <button onClick={() => toggleDate(dateStr)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 11, padding: "3px 10px", cursor: "pointer" }}>✕ 削除</button>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>出勤時刻</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <select value={req.start_time.split(":")[0]} onChange={e => updateDraft(dateStr, "start_time", `${e.target.value}:${req.start_time.split(":")[1]}`)} style={sel}>
                        {ALL_HOURS.map(h => <option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}
                      </select>
                      <select value={req.start_time.split(":")[1]} onChange={e => updateDraft(dateStr, "start_time", `${req.start_time.split(":")[0]}:${e.target.value}`)} style={sel}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                    </div>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 16 }}>〜</span>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>退勤時刻</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <select value={req.end_time.split(":")[0]} onChange={e => updateDraft(dateStr, "end_time", `${e.target.value}:${req.end_time.split(":")[1]}`)} style={sel}>
                        {ALL_HOURS.map(h => <option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}
                      </select>
                      <select value={req.end_time.split(":")[1]} onChange={e => updateDraft(dateStr, "end_time", `${req.end_time.split(":")[0]}:${e.target.value}`)} style={sel}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>メモ（任意）</div>
                  <input type="text" value={req.note} onChange={e => updateDraft(dateStr, "note", e.target.value)} placeholder="例：遅れる可能性あり" style={{ ...sel, width: "100%", boxSizing: "border-box" as const }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(draft).length > 0 && (
        <button onClick={handleSubmit} disabled={saving} style={{
          width: "100%", padding: "14px",
          background: saving ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
          border: "none", borderRadius: 12, color: "#fff",
          fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
          fontFamily: "var(--font)", marginBottom: 12,
        }}>{saving ? "送信中..." : `${Object.keys(draft).length}日分のシフト希望を送信`}</button>
      )}

      {saveMsg && (
        <div style={{
          background: saveMsg.includes("送信しました") ? "var(--online-bg)" : "#ff444418",
          border: `1px solid ${saveMsg.includes("送信しました") ? "var(--online-border)" : "#ff444444"}`,
          borderRadius: 10, padding: "12px 16px",
          color: saveMsg.includes("送信しました") ? "var(--online)" : "#ff4444",
          fontSize: 13, textAlign: "center",
        }}>{saveMsg}</div>
      )}
      {/* シフト内サブナビ（変更希望） */}
      {portalView === "shift" && castId && (
        <>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            {[{key:"request",label:"希望を出す"},{key:"change",label:"🔄 変更・休み希望"}].map(v=>(
              <button key={v.key} onClick={()=>setShiftSubView(v.key as any)} style={{
                flex:1, padding:"10px", borderRadius:10, cursor:"pointer", fontFamily:"var(--font)", fontSize:13,
                fontWeight:shiftSubView===v.key?700:500,
                background:shiftSubView===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
                border:`1px solid ${shiftSubView===v.key?"transparent":"var(--border)"}`,
                color:shiftSubView===v.key?"#fff":"var(--text-secondary)",
              }}>{v.label}</button>
            ))}
          </div>
          {shiftSubView==="change" && (
            <div style={{marginTop:16}}>
              <CastChangeRequestPanel castId={castId} shopId={shopId||""} />
            </div>
          )}
        </>
      )}
      </>}

      {/* 写真管理 */}
      {portalView === "photos" && castId && shopId && <CastPhotosPanel castId={castId} shopId={shopId} />}

      {/* 給与・実績 */}
      {portalView === "payroll" && castId && (
        <div>
          {/* サブタブ */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {([
              { key: "payroll", label: "💴 給与" },
              { key: "slips",   label: "📋 実績" },
            ] as const).map(v => (
              <button key={v.key} onClick={() => setPayrollSubView(v.key)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13,
                  fontFamily: "var(--font)", fontWeight: payrollSubView === v.key ? 700 : 500,
                  background: payrollSubView === v.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
                  color: payrollSubView === v.key ? "#fff" : "var(--text-secondary)",
                }}>
                {v.label}
              </button>
            ))}
          </div>
          {payrollSubView === "payroll" && (
            <CastPayrollPanel castId={castId} castName={castName} shopId={shopId||undefined} />
          )}
          {payrollSubView === "slips" && shopId && (
            <CastSlipHistoryPanel castId={castId} shopId={shopId} />
          )}
          {payrollSubView === "slips" && !shopId && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 32, fontSize: 13 }}>
              店舗情報が取得できませんでした
            </div>
          )}
        </div>
      )}

      {/* 設定（LINE・ご意見・アカウント） */}
      {portalView === "settings" && (
        <div>
          {castAccountId && castId && (
            <div style={{marginBottom:16}}>
              <CastLinePanel castAccountId={castAccountId} castId={castId} castName={castName} />
            </div>
          )}
          {castId && shopId && (
            <div style={{marginBottom:16}}>
              <CastFeedbackPanel castId={castId} shopId={shopId} castName={castName} />
            </div>
          )}
          {/* アカウント設定 */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>⚙️ アカウント設定</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>メールアドレスを変更</div>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="新しいメールアドレス"
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 8 }} />
              <button onClick={handleChangeEmail} disabled={accountLoading || !newEmail} style={{
                padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !newEmail ? 0.5 : 1,
              }}>メールを変更する</button>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>パスワードを変更</div>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="現在のパスワード"
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 8 }} />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="新しいパスワード（6文字以上）"
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 8 }} />
              <button onClick={handleChangePassword} disabled={accountLoading || !currentPw || !newPw} style={{
                padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (!currentPw || !newPw) ? 0.5 : 1,
              }}>パスワードを変更する</button>
            </div>
            {accountMsg && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10,
                background: accountMsg.includes("失敗") || accountMsg.includes("正しくありません") ? "#ff444418" : "var(--online-bg)",
                border: `1px solid ${accountMsg.includes("失敗") || accountMsg.includes("正しくありません") ? "#ff444444" : "var(--online-border)"}`,
                color: accountMsg.includes("失敗") || accountMsg.includes("正しくありません") ? "#ff4444" : "var(--online)",
                fontSize: 13,
              }}>{accountMsg}</div>
            )}
          </div>
        </div>
      )}

      {/* ホームタブ */}
      {portalView === "home" && castId && shopId && (
        <CastHomePanel castId={castId} shopId={shopId} castName={castName} castAccountId={castAccountId||""} setPortalView={(v) => setPortalView(v as any)} />
      )}
    </main></>
  );
}
