"use client";
import { useState, useEffect } from "react";

type Cast = { id: number; name: string; shop_id: number; on_today: boolean; hourly_wage: number | null };
type ShiftRequest = { id: string; cast_id: number; date: string; start_time: string; end_time: string; note: string; status: string; casts: { id: number; name: string } };
type ConfirmedShift = { id: string; cast_id: number; date: string; start_time: string; end_time: string; casts: { id: number; name: string } };
type ClosedDate = { id: string; date: string; reason: string | null };

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

// 勤務時間を計算（分）
function calcMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return endMin - startMin;
}

const CAST_COLORS = ["#ff6b9d","#00d4ff","#ffd700","#a855f7","#00e5a0","#ff9500","#00c7be","#ff3b30","#34aadc","#4cd964"];
const HOURS = Array.from({length:31},(_,i)=>i); // 0〜30時
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
  const [view, setView] = useState<"calendar" | "table" | "accounts">("calendar");
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [draft, setDraft] = useState<Record<string, DraftEntry[]>>({});
  const [selectedDate, setSelectedDate] = useState<string|null>(null);
  const [loaded, setLoaded] = useState(false);
  // 出勤表の表示期間（週）
  const [tableWeekOffset, setTableWeekOffset] = useState(0);

  const dates = getDates();

  useEffect(() => { if (!loaded) { loadAll(); setLoaded(true); } }, []);

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

  const getColor = (castId: number) => CAST_COLORS[casts.findIndex(c => c.id === castId) % CAST_COLORS.length] || "#aaa";
  const isClosedDate = (date: string) => closedDates.some(c => c.date === date);
  const isClosed = (date: string) => isClosedDate(date) || isWeekClosed(date, shopClosedWeekDays);
  const confirmedOnDate = (date: string) => confirmedShifts.filter(s => s.date === date);
  const requestsOnDate = (date: string) => shiftRequests.filter(s => s.date === date && s.status === "pending");

  const addCastToDraft = (date: string, castId: number) => {
    const req = shiftRequests.find(r => r.cast_id === castId && r.date === date);
    const entry: DraftEntry = {
      cast_id: castId,
      start_time: req?.start_time?.slice(0,5) || "20:00",
      end_time: req?.end_time?.slice(0,5) || "24:00",
    };
    setDraft(prev => ({ ...prev, [date]: [...(prev[date] || []).filter(e => e.cast_id !== castId), entry] }));
  };
  const removeCastFromDraft = (date: string, castId: number) => {
    setDraft(prev => {
      const next = { ...prev };
      next[date] = (next[date] || []).filter(e => e.cast_id !== castId);
      if (next[date].length === 0) delete next[date];
      return next;
    });
  };
  const updateDraftTime = (date: string, castId: number, field: "start_time"|"end_time", val: string) => {
    setDraft(prev => ({ ...prev, [date]: (prev[date] || []).map(e => e.cast_id === castId ? {...e, [field]: val} : e) }));
  };
  const hasDraft = (date: string, castId: number) => (draft[date] || []).some(e => e.cast_id === castId);
  const totalDraftShifts = Object.values(draft).flat().length;

  const handleConfirm = async () => {
    const shifts = Object.entries(draft).flatMap(([date, entries]) =>
      entries.map(e => ({ cast_id: e.cast_id, date, start_time: e.start_time, end_time: e.end_time }))
    );
    if (shifts.length === 0) { setShiftMsg("確定するシフトがありません"); return; }
    setShiftLoading(true); setShiftMsg("");
    const res = await fetch("/api/confirm-shift", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, shifts }),
    });
    if (res.ok) {
      setShiftMsg(`${shifts.length}件の確定シフトを保存しました。キャストにメール通知しました。`);
      setDraft({}); await loadAll();
    } else setShiftMsg("保存に失敗しました。");
    setShiftLoading(false);
  };

  const handleDeleteConfirmed = async (castId: number, date: string) => {
    await fetch("/api/confirm-shift", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cast_id: castId, date }) });
    await loadAll();
  };

  const handleAddClosedDate = async (date: string) => {
    await fetch("/api/confirm-shift", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId, date }) });
    await loadAll();
  };

  const handleDeleteClosedDate = async (date: string) => {
    await fetch("/api/confirm-shift", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "closed_date", shop_id: shopId, date }) });
    await loadAll();
  };

  const handleIssueAccount = async (cast: Cast) => {
    const email = castAccountEmail[cast.id];
    if (!email) { setShiftMsg("メールアドレスを入力してください"); return; }
    setIssuingAccount(cast.id);
    const res = await fetch("/api/issue-cast-account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: cast.id, email, shop_name: shopName }),
    });
    if (res.ok) { setShiftMsg(`${cast.name}にアカウントを発行しました。`); setCastAccountEmail({ ...castAccountEmail, [cast.id]: "" }); }
    else setShiftMsg("アカウント発行に失敗しました。");
    setIssuingAccount(null);
  };

  const smInput: React.CSSProperties = { ...inputStyle as any, padding: "4px 8px", fontSize: 12, width: "auto" };

  // 出勤表：週単位
  const tableStartDate = new Date();
  tableStartDate.setDate(tableStartDate.getDate() + tableWeekOffset * 7);
  const tableDates = Array.from({length:7}, (_,i) => {
    const d = new Date(tableStartDate); d.setDate(tableStartDate.getDate() + i);
    return getDateStr(d);
  });

  // キャスト別集計（月単位）
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthShifts = confirmedShifts.filter(s => s.date.startsWith(thisMonth));

  return (
    <div>
      {/* サブナビ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { key: "calendar", label: "📅 確定シフト入力" },
          { key: "table", label: "📊 出勤表" },
          { key: "accounts", label: "🔑 アカウント管理" },
        ].map(v => (
          <button key={v.key} onClick={() => setView(v.key as any)} style={{
            padding: "8px 16px", borderRadius: 10, cursor: "pointer",
            fontFamily: "var(--font)", fontSize: 13, fontWeight: view === v.key ? 700 : 500,
            background: view === v.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
            border: `1px solid ${view === v.key ? "transparent" : "var(--border)"}`,
            color: view === v.key ? "#fff" : "var(--text-secondary)",
          }}>{v.label}</button>
        ))}
        <button onClick={loadAll} style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>🔄 更新</button>
      </div>

      {shiftMsg && (
        <div style={{
          background: shiftMsg.includes("失敗") ? "#ff444418" : "var(--online-bg)",
          border: `1px solid ${shiftMsg.includes("失敗") ? "#ff444444" : "var(--online-border)"}`,
          borderRadius: 10, padding: "10px 16px",
          color: shiftMsg.includes("失敗") ? "#ff4444" : "var(--online)",
          fontSize: 13, marginBottom: 16,
        }}>{shiftMsg}</div>
      )}
      {shiftLoading && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>読み込み中...</div>}

      {/* ===== 確定シフト入力カレンダー ===== */}
      {view === "calendar" && !shiftLoading && (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.7 }}>
            日付をタップして出勤キャストと時間を設定し、「確定シフトを保存」してください。<br />
            <span style={{ opacity: 0.7, fontSize: 12 }}>📩 = 希望シフトあり　🚫 = 定休日・店休日</span>
          </p>

          {totalDraftShifts > 0 && (
            <button onClick={handleConfirm} disabled={shiftLoading} style={{
              ...btnPrimary as any, marginBottom: 16,
              position: "sticky", top: 8, zIndex: 10,
              boxShadow: "0 4px 20px var(--accent)44",
            }}>
              💾 {totalDraftShifts}件の確定シフトを保存してメール通知
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {dates.map(date => {
              const closed = isClosed(date);
              const closedByException = isClosedDate(date);
              const closedDateReason = closedDates.find(c => c.date === date)?.reason;
              const confirmed = confirmedOnDate(date);
              const pending = requestsOnDate(date);
              const isSelected = selectedDate === date;
              const draftEntries = draft[date] || [];
              const isToday = date === getDateStr(new Date());

              return (
                <div key={date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div
                    onClick={() => !closed && setSelectedDate(isSelected ? null : date)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                      padding: "11px 16px", cursor: closed ? "default" : "pointer",
                      background: closed ? "#ff444408" : isSelected ? "var(--accent)10" : isToday ? "var(--accent)06" : "transparent",
                    }}
                  >
                    <div style={{ minWidth: 96, fontWeight: isToday ? 900 : 600, fontSize: 14,
                      color: closed ? "#ff6666" : isToday ? "var(--accent)" : "var(--text-primary)", flexShrink: 0 }}>
                      {fmtFull(date)}
                      {isToday && <span style={{ fontSize: 9, marginLeft: 6, color: "var(--accent)", background: "var(--accent)22", padding: "1px 5px", borderRadius: 4 }}>今日</span>}
                    </div>

                    {closed && (
                      <span style={{ fontSize: 11, background: "#ff444420", color: "#ff6666", border: "1px solid #ff444444", padding: "2px 8px", borderRadius: 8, flexShrink: 0 }}>
                        {closedByException ? `🚫 店休日${closedDateReason ? `（${closedDateReason}）` : ""}` : "🚫 定休日"}
                      </span>
                    )}
                    {!closed && pending.length > 0 && (
                      <span style={{ fontSize: 11, background: "var(--accent)22", color: "var(--accent)", border: "1px solid var(--accent)55", padding: "2px 8px", borderRadius: 8, flexShrink: 0 }}>
                        📩 希望{pending.length}件
                      </span>
                    )}
                    {!closed && confirmed.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                        {confirmed.map(s => (
                          <span key={s.id} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                            background: getColor(s.cast_id) + "22", color: getColor(s.cast_id),
                            border: `1px solid ${getColor(s.cast_id)}55`,
                          }}>{s.casts?.name} {s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>
                        ))}
                      </div>
                    )}
                    {!closed && draftEntries.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {draftEntries.map(e => {
                          const c = casts.find(c => c.id === e.cast_id);
                          return (
                            <span key={e.cast_id} style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                              background: getColor(e.cast_id) + "33", color: getColor(e.cast_id),
                              border: `2px dashed ${getColor(e.cast_id)}`,
                            }}>{c?.name} {e.start_time}〜{e.end_time}</span>
                          );
                        })}
                      </div>
                    )}
                    {!closed && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{isSelected ? "▲" : "▼"}</span>}
                    {closed && closedByException && (
                      <button onClick={e => { e.stopPropagation(); handleDeleteClosedDate(date); }} style={{ marginLeft: "auto", background: "none", border: "1px solid #ff444444", borderRadius: 8, color: "#ff4444", padding: "2px 10px", fontSize: 11, cursor: "pointer" }}>解除</button>
                    )}
                  </div>

                  {isSelected && !closed && (
                    <div style={{ padding: "14px 16px 18px", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
                      {/* キャスト選択 */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>出勤キャストを選択（タップで追加/解除）</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {casts.map(cast => {
                            const selected = hasDraft(date, cast.id);
                            const hasReq = shiftRequests.some(r => r.cast_id === cast.id && r.date === date);
                            const color = getColor(cast.id);
                            return (
                              <button key={cast.id} onClick={() => selected ? removeCastFromDraft(date, cast.id) : addCastToDraft(date, cast.id)} style={{
                                padding: "7px 16px", borderRadius: 20, cursor: "pointer",
                                fontFamily: "var(--font)", fontSize: 13, fontWeight: selected ? 700 : 500,
                                background: selected ? `${color}22` : "var(--bg-input)",
                                border: `1.5px solid ${selected ? color : hasReq ? color + "88" : "var(--border)"}`,
                                color: selected ? color : hasReq ? color : "var(--text-secondary)",
                              }}>
                                {cast.name}{hasReq && !selected ? " 📩" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 時間設定 */}
                      {draftEntries.map(entry => {
                        const cast = casts.find(c => c.id === entry.cast_id);
                        const color = getColor(entry.cast_id);
                        const req = shiftRequests.find(r => r.cast_id === entry.cast_id && r.date === date);
                        return (
                          <div key={entry.cast_id} style={{
                            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
                            marginBottom: 8, padding: "10px 12px", borderRadius: 10,
                            background: `${color}11`, border: `1px solid ${color}44`,
                          }}>
                            <span style={{ color, fontWeight: 700, fontSize: 13, minWidth: 56 }}>{cast?.name}</span>
                            {req && (
                              <div style={{ fontSize: 11, color: "var(--accent)", display: "flex", flexDirection: "column", gap: 1 }}>
                                <span>希望: {req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</span>
                                {req.note && <span style={{ color: "var(--text-muted)" }}>📝 {req.note}</span>}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                              <select value={entry.start_time.split(":")[0]} onChange={e => updateDraftTime(date, entry.cast_id, "start_time", `${e.target.value}:${entry.start_time.split(":")[1]}`)} style={smInput}>
                                {HOURS.map(h => <option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}
                              </select>
                              <select value={entry.start_time.split(":")[1]} onChange={e => updateDraftTime(date, entry.cast_id, "start_time", `${entry.start_time.split(":")[0]}:${e.target.value}`)} style={smInput}>
                                {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                              </select>
                              <span style={{ color: "var(--text-muted)" }}>〜</span>
                              <select value={entry.end_time.split(":")[0]} onChange={e => updateDraftTime(date, entry.cast_id, "end_time", `${e.target.value}:${entry.end_time.split(":")[1]}`)} style={smInput}>
                                {HOURS.map(h => <option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}
                              </select>
                              <select value={entry.end_time.split(":")[1]} onChange={e => updateDraftTime(date, entry.cast_id, "end_time", `${entry.end_time.split(":")[0]}:${e.target.value}`)} style={smInput}>
                                {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      {/* 確定済み */}
                      {confirmed.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 6 }}>📌 確定済み</div>
                          {confirmed.map(s => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, color: getColor(s.cast_id), fontWeight: 600 }}>{s.casts?.name}</span>
                              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>
                              <button onClick={() => handleDeleteConfirmed(s.cast_id, date)} style={{ background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", padding: "2px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>削除</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 店休日設定 */}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                        <button onClick={() => handleAddClosedDate(date)} style={{
                          padding: "7px 16px", borderRadius: 8, background: "#ff444420",
                          border: "1px solid #ff444444", color: "#ff4444",
                          fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700,
                        }}>🚫 この日を店休日に設定</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalDraftShifts > 0 && (
            <button onClick={handleConfirm} disabled={shiftLoading} style={{ ...btnPrimary as any, marginTop: 20 }}>
              💾 {totalDraftShifts}件の確定シフトを保存してメール通知
            </button>
          )}
        </div>
      )}

      {/* ===== 出勤表 ===== */}
      {view === "table" && !shiftLoading && (
        <div>
          {/* 週ナビゲーション */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={() => setTableWeekOffset(w => w - 1)} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>← 前週</button>
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>
              {fmtShort(tableDates[0])} 〜 {fmtShort(tableDates[6])}
            </span>
            <button onClick={() => setTableWeekOffset(w => w + 1)} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>次週 →</button>
            <button onClick={() => setTableWeekOffset(0)} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>今週</button>
          </div>

          {/* 週間出勤表 */}
          <div style={{ ...sectionStyle, overflowX: "auto", padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", minWidth: 70, fontWeight: 700, background: "var(--bg-input)" }}>キャスト</th>
                  {tableDates.map(d => {
                    const closed = isClosed(d);
                    const isToday = d === getDateStr(new Date());
                    const dow = new Date(d + "T00:00:00").getDay();
                    return (
                      <th key={d} style={{
                        padding: "8px 6px", textAlign: "center", minWidth: 70,
                        background: isToday ? "var(--accent)15" : closed ? "#ff444410" : "var(--bg-input)",
                        color: closed ? "#ff6666" : isToday ? "var(--accent)" : dow === 0 ? "#ff8888" : dow === 6 ? "#88aaff" : "var(--text-muted)",
                        borderLeft: "1px solid var(--border)", fontWeight: isToday ? 900 : 600,
                      }}>
                        {fmtShort(d)}
                        {closed && <div style={{ fontSize: 9, opacity: 0.8 }}>休</div>}
                      </th>
                    );
                  })}
                  <th style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted)", borderLeft: "1px solid var(--border)", background: "var(--bg-input)", minWidth: 80 }}>週計</th>
                </tr>
              </thead>
              <tbody>
                {casts.map((cast, ci) => {
                  const color = getColor(cast.id);
                  const weekShifts = tableDates.map(d => confirmedShifts.find(s => s.cast_id === cast.id && s.date === d));
                  const weekMin = weekShifts.reduce((sum, s) => sum + (s ? calcMinutes(s.start_time, s.end_time) : 0), 0);
                  const weekHours = Math.floor(weekMin / 60);
                  const weekMins = weekMin % 60;
                  const weekPay = cast.hourly_wage ? Math.round(cast.hourly_wage * weekMin / 60) : null;
                  return (
                    <tr key={cast.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color, whiteSpace: "nowrap" }}>
                        {cast.name}
                        {cast.hourly_wage && <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>¥{cast.hourly_wage.toLocaleString()}/h</div>}
                      </td>
                      {tableDates.map(date => {
                        const s = confirmedShifts.find(s => s.cast_id === cast.id && s.date === date);
                        const closed = isClosed(date);
                        return (
                          <td key={date} style={{ padding: "6px 4px", textAlign: "center", borderLeft: "1px solid var(--border)", background: closed ? "#ff444406" : "transparent" }}>
                            {s ? (
                              <div style={{ background: `${color}20`, border: `1px solid ${color}55`, borderRadius: 6, padding: "3px 4px", display: "inline-block", minWidth: 56 }}>
                                <div style={{ color, fontSize: 11, fontWeight: 600 }}>{s.start_time?.slice(0,5)}</div>
                                <div style={{ color: "var(--text-muted)", fontSize: 10 }}>〜{s.end_time?.slice(0,5)}</div>
                                <div style={{ color, fontSize: 10, opacity: 0.8 }}>
                                  {Math.floor(calcMinutes(s.start_time, s.end_time)/60)}h{calcMinutes(s.start_time, s.end_time)%60 > 0 ? `${calcMinutes(s.start_time, s.end_time)%60}m` : ""}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "var(--border)" }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: "8px 10px", textAlign: "center", borderLeft: "1px solid var(--border)", background: "var(--bg-input)" }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>{weekHours}h{weekMins > 0 ? `${weekMins}m` : ""}</div>
                        {weekPay !== null && weekMin > 0 && (
                          <div style={{ color, fontSize: 11, fontWeight: 600 }}>¥{weekPay.toLocaleString()}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 月次集計 */}
          <div style={{ ...sectionStyle, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
              📊 {new Date().getMonth()+1}月の集計
            </div>
            {casts.map(cast => {
              const color = getColor(cast.id);
              const myShifts = monthShifts.filter(s => s.cast_id === cast.id);
              const totalMin = myShifts.reduce((sum, s) => sum + calcMinutes(s.start_time, s.end_time), 0);
              const totalHours = Math.floor(totalMin / 60);
              const totalMins = totalMin % 60;
              const totalPay = cast.hourly_wage ? Math.round(cast.hourly_wage * totalMin / 60) : null;
              if (myShifts.length === 0) return null;
              return (
                <div key={cast.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ fontWeight: 700, color, fontSize: 14 }}>{cast.name}</span>
                    {cast.hourly_wage && <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 8 }}>¥{cast.hourly_wage.toLocaleString()}/h</span>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>{myShifts.length}日出勤　{totalHours}h{totalMins > 0 ? `${totalMins}m` : ""}</div>
                    {totalPay !== null && <div style={{ color, fontWeight: 800, fontSize: 15 }}>¥{totalPay.toLocaleString()}</div>}
                  </div>
                </div>
              );
            })}
            {/* 合計 */}
            {casts.some(c => c.hourly_wage) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0", marginTop: 4 }}>
                <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>合計人件費</span>
                <span style={{ fontWeight: 900, color: "var(--accent)", fontSize: 18 }}>
                  ¥{casts.reduce((sum, cast) => {
                    const myMin = monthShifts.filter(s => s.cast_id === cast.id).reduce((s, sh) => s + calcMinutes(sh.start_time, sh.end_time), 0);
                    return sum + (cast.hourly_wage ? Math.round(cast.hourly_wage * myMin / 60) : 0);
                  }, 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== アカウント管理 ===== */}
      {view === "accounts" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.7 }}>
            キャストがシフト希望を提出できるよう、アカウントを発行してください。<br />
            メールアドレスを入力して発行すると、ログイン情報がキャストに送信されます。
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {casts.map(cast => (
              <div key={cast.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, color: getColor(cast.id), fontSize: 14, minWidth: 80 }}>{cast.name}</div>
                <input type="email" value={castAccountEmail[cast.id] || ""} onChange={e => setCastAccountEmail({ ...castAccountEmail, [cast.id]: e.target.value })}
                  placeholder="キャストのメールアドレス"
                  style={{ ...inputStyle as any, flex: 1, minWidth: 180, fontSize: 13 }} />
                <button onClick={() => handleIssueAccount(cast)} disabled={issuingAccount === cast.id || !castAccountEmail[cast.id]} style={{
                  padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)",
                  opacity: issuingAccount === cast.id || !castAccountEmail[cast.id] ? 0.5 : 1,
                }}>{issuingAccount === cast.id ? "発行中..." : "発行"}</button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 16, lineHeight: 1.8 }}>
            ポータルURL: <a href="https://www.night-vision.jp/cast-login" style={{ color: "var(--accent)" }}>https://www.night-vision.jp/cast-login</a>
          </p>
        </div>
      )}
    </div>
  );
}
