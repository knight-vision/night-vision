"use client";
import { useState, useEffect } from "react";

type Cast = { id: number; name: string; shop_id: number; on_today: boolean };
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
function fmtJP(ds: string) {
  const d = new Date(ds + "T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function fmtFull(ds: string) {
  const d = new Date(ds + "T00:00:00");
  return `${d.getMonth()+1}月${d.getDate()}日(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function isWeekClosed(ds: string, closedWeekDays: string[]): boolean {
  const d = new Date(ds + "T00:00:00");
  const name = ["日","月","火","水","木","金","土"][d.getDay()];
  return closedWeekDays.includes(name);
}

const CAST_COLORS = ["#ff6b9d","#00d4ff","#ffd700","#a855f7","#00e5a0","#ff9500","#00c7be","#ff3b30","#34aadc","#4cd964"];
const HOURS = Array.from({length:13},(_,i)=>i+18);
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
  const [view, setView] = useState<"calendar" | "requests" | "accounts">("calendar");
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  // draft: date -> DraftEntry[]
  const [draft, setDraft] = useState<Record<string, DraftEntry[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState("");
  const [loaded, setLoaded] = useState(false);

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
  const isWeekClosedDate = (date: string) => isWeekClosed(date, shopClosedWeekDays);
  const isClosed = (date: string) => isClosedDate(date) || isWeekClosedDate(date);

  const confirmedOnDate = (date: string) => confirmedShifts.filter(s => s.date === date);
  const requestsOnDate = (date: string) => shiftRequests.filter(s => s.date === date && s.status === "pending");

  // ドラフトにキャストを追加
  const addCastToDraft = (date: string, castId: number) => {
    // 希望シフトがあれば時間をプリセット
    const req = shiftRequests.find(r => r.cast_id === castId && r.date === date);
    const entry: DraftEntry = {
      cast_id: castId,
      start_time: req?.start_time?.slice(0,5) || "20:00",
      end_time: req?.end_time?.slice(0,5) || "24:00",
    };
    setDraft(prev => ({
      ...prev,
      [date]: [...(prev[date] || []).filter(e => e.cast_id !== castId), entry],
    }));
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
    setDraft(prev => ({
      ...prev,
      [date]: (prev[date] || []).map(e => e.cast_id === castId ? {...e, [field]: val} : e),
    }));
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, shifts }),
    });
    if (res.ok) {
      setShiftMsg(`${shifts.length}件の確定シフトを保存しました。キャストにメールで通知しました。`);
      setDraft({});
      await loadAll();
    } else {
      setShiftMsg("保存に失敗しました。");
    }
    setShiftLoading(false);
  };

  const handleDeleteConfirmed = async (castId: number, date: string) => {
    await fetch("/api/confirm-shift", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cast_id: castId, date }) });
    await loadAll();
  };

  const handleAddClosedDate = async (date: string) => {
    const res = await fetch("/api/confirm-shift", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, date, reason: closedReason || null }),
    });
    if (res.ok) { setClosedReason(""); await loadAll(); }
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

  const pendingCount = shiftRequests.filter(r => r.status === "pending").length;

  const smInput: React.CSSProperties = { ...inputStyle as any, padding: "4px 8px", fontSize: 12, width: "auto" };

  return (
    <div>
      {/* サブナビ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { key: "calendar", label: "📅 確定シフト" },
          { key: "requests", label: `📩 希望シフト${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
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

      {/* ===== 確定シフトカレンダー ===== */}
      {view === "calendar" && !shiftLoading && (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.7 }}>
            日付を選んでキャストの出勤を設定し、「確定シフトを保存」してください。<br />
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>紫の枠</span>：希望シフトあり　
            <span style={{ color: "#ff4444", fontWeight: 700 }}>赤背景</span>：定休日・店休日
          </p>

          {/* ドラフト保存ボタン（上部固定） */}
          {totalDraftShifts > 0 && (
            <button onClick={handleConfirm} disabled={shiftLoading} style={{
              ...btnPrimary as any,
              marginBottom: 16, position: "sticky", top: 8, zIndex: 10,
              boxShadow: "0 4px 20px var(--accent)44",
            }}>
              💾 {totalDraftShifts}件の確定シフトを保存してメール通知
            </button>
          )}

          {/* 日付リスト */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {dates.map(date => {
              const closed = isClosed(date);
              const closedByException = isClosedDate(date);
              const closedReason = closedDates.find(c => c.date === date)?.reason;
              const confirmed = confirmedOnDate(date);
              const pending = requestsOnDate(date);
              const isSelected = selectedDate === date;
              const draftEntries = draft[date] || [];
              const today = getDateStr(new Date());
              const isToday = date === today;

              return (
                <div key={date} style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* 日付ヘッダー行 */}
                  <div
                    onClick={() => { if (!closed) setSelectedDate(isSelected ? null : date); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 16px", cursor: closed ? "default" : "pointer",
                      background: closed ? "#ff444410" : isSelected ? "var(--accent)10" : isToday ? "var(--accent)08" : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* 日付 */}
                    <div style={{ minWidth: 100, fontWeight: isToday ? 900 : 600, fontSize: 14,
                      color: closed ? "#ff6666" : isToday ? "var(--accent)" : "var(--text-primary)" }}>
                      {fmtFull(date)}
                      {isToday && <span style={{ fontSize: 10, marginLeft: 6, color: "var(--accent)", background: "var(--accent)22", padding: "1px 6px", borderRadius: 6 }}>今日</span>}
                    </div>

                    {/* 定休日・店休日バッジ */}
                    {closed && (
                      <span style={{ fontSize: 11, background: "#ff444420", color: "#ff6666", border: "1px solid #ff444444", padding: "2px 8px", borderRadius: 8, flexShrink: 0 }}>
                        {closedByException ? `🚫 店休日${closedReason ? `（${closedReason}）` : ""}` : "🚫 定休日"}
                      </span>
                    )}

                    {/* 希望シフトバッジ */}
                    {!closed && pending.length > 0 && (
                      <span style={{ fontSize: 11, background: "var(--accent)22", color: "var(--accent)", border: "1px solid var(--accent)55", padding: "2px 8px", borderRadius: 8, flexShrink: 0 }}>
                        📩 希望{pending.length}件
                      </span>
                    )}

                    {/* 確定シフトのキャスト名（コンパクト） */}
                    {!closed && confirmed.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                        {confirmed.map(s => (
                          <span key={s.id} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                            background: getColor(s.cast_id) + "22",
                            color: getColor(s.cast_id),
                            border: `1px solid ${getColor(s.cast_id)}55`,
                          }}>{s.casts?.name} {s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</span>
                        ))}
                      </div>
                    )}

                    {/* ドラフト表示 */}
                    {!closed && draftEntries.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {draftEntries.map(e => {
                          const c = casts.find(c => c.id === e.cast_id);
                          return (
                            <span key={e.cast_id} style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                              background: getColor(e.cast_id) + "33",
                              color: getColor(e.cast_id),
                              border: `2px dashed ${getColor(e.cast_id)}`,
                            }}>{c?.name} {e.start_time}〜{e.end_time}</span>
                          );
                        })}
                      </div>
                    )}

                    {!closed && <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)", flexShrink: 0 }}>{isSelected ? "▲" : "▼"}</span>}
                    {closed && closedByException && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClosedDate(date); }} style={{ marginLeft: "auto", background: "none", border: "1px solid #ff444444", borderRadius: 8, color: "#ff4444", padding: "2px 10px", fontSize: 11, cursor: "pointer" }}>解除</button>
                    )}
                  </div>

                  {/* 展開パネル */}
                  {isSelected && !closed && (
                    <div style={{ padding: "12px 16px 20px", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>

                      {/* キャスト選択 */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>出勤キャストを選択</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {casts.map(cast => {
                            const selected = hasDraft(date, cast.id);
                            const hasReq = shiftRequests.some(r => r.cast_id === cast.id && r.date === date);
                            const color = getColor(cast.id);
                            return (
                              <button key={cast.id} onClick={() => selected ? removeCastFromDraft(date, cast.id) : addCastToDraft(date, cast.id)} style={{
                                padding: "6px 14px", borderRadius: 20, cursor: "pointer",
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

                      {/* 選択キャストの時間設定 */}
                      {draftEntries.map(entry => {
                        const cast = casts.find(c => c.id === entry.cast_id);
                        const color = getColor(entry.cast_id);
                        const req = shiftRequests.find(r => r.cast_id === entry.cast_id && r.date === date);
                        return (
                          <div key={entry.cast_id} style={{
                            display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                            marginBottom: 8, padding: "10px 12px", borderRadius: 10,
                            background: `${color}11`, border: `1px solid ${color}44`,
                          }}>
                            <span style={{ color, fontWeight: 700, fontSize: 13, minWidth: 60 }}>{cast?.name}</span>
                            {req && <span style={{ fontSize: 11, color: "var(--accent)" }}>希望: {req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</span>}
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
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

                      {/* 確定済み表示 */}
                      {confirmed.length > 0 && (
                        <div style={{ marginTop: 12 }}>
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
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 6 }}>🚫 この日を店休日に設定</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            type="text"
                            value={closedReason}
                            onChange={e => setClosedReason(e.target.value)}
                            placeholder="理由（任意）例：貸切・設備工事"
                            style={{ ...inputStyle as any, flex: 1, minWidth: 160, fontSize: 12 }}
                          />
                          <button onClick={() => handleAddClosedDate(date)} style={{
                            padding: "8px 14px", borderRadius: 8, background: "#ff444420",
                            border: "1px solid #ff444444", color: "#ff4444",
                            fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
                          }}>店休日に設定</button>
                        </div>
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

      {/* ===== 希望シフト一覧 ===== */}
      {view === "requests" && !shiftLoading && (
        <div>
          {shiftRequests.filter(r => r.status === "pending").length === 0 ? (
            <div style={{ ...sectionStyle, textAlign: "center", color: "var(--text-muted)", padding: 40 }}>未確認の希望シフトはありません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shiftRequests.filter(r => r.status === "pending").map(req => {
                const color = getColor(req.cast_id);
                return (
                  <div key={req.id} style={{ ...sectionStyle, marginBottom: 0, borderLeft: `3px solid ${color}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{req.casts?.name}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{fmtJP(req.date)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {req.start_time?.slice(0,5)} 〜 {req.end_time?.slice(0,5)}
                        {req.note && <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>※{req.note}</span>}
                      </div>
                    </div>
                    <button onClick={() => { addCastToDraft(req.date, req.cast_id); setView("calendar"); setSelectedDate(req.date); }} style={{
                      padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                      background: "var(--accent)22", border: "1px solid var(--accent)55",
                      color: "var(--accent)", fontSize: 12, fontWeight: 700, fontFamily: "var(--font)",
                    }}>カレンダーへ</button>
                  </div>
                );
              })}
            </div>
          )}
          {shiftRequests.filter(r => r.status === "approved").length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>確定済み</div>
              {shiftRequests.filter(r => r.status === "approved").map(req => (
                <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)", opacity: 0.7 }}>
                  <span style={{ fontWeight: 700, color: getColor(req.cast_id), fontSize: 13 }}>{req.casts?.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{fmtJP(req.date)}</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</span>
                  <span style={{ fontSize: 11, color: "var(--online)", background: "var(--online-bg)", border: "1px solid var(--online-border)", padding: "1px 8px", borderRadius: 8 }}>確定</span>
                </div>
              ))}
            </div>
          )}
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
                <input
                  type="email"
                  value={castAccountEmail[cast.id] || ""}
                  onChange={e => setCastAccountEmail({ ...castAccountEmail, [cast.id]: e.target.value })}
                  placeholder="キャストのメールアドレス"
                  style={{ ...inputStyle as any, flex: 1, minWidth: 180, fontSize: 13 }}
                />
                <button
                  onClick={() => handleIssueAccount(cast)}
                  disabled={issuingAccount === cast.id || !castAccountEmail[cast.id]}
                  style={{
                    padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                    fontFamily: "var(--font)", opacity: issuingAccount === cast.id || !castAccountEmail[cast.id] ? 0.5 : 1,
                  }}
                >{issuingAccount === cast.id ? "発行中..." : "発行"}</button>
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
