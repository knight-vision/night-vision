"use client";
import { useState, useEffect } from "react";

type ChangeRequest = { id: string; date: string; type: string; requested_start_time: string | null; requested_end_time: string | null; note: string | null; status: string };
type ConfirmedShift = { id: string; date: string; start_time: string; end_time: string };

const HOURS = Array.from({length:31},(_,i)=>i);
const MINUTES = ["00","10","20","30","40","50"];
const tLabel = (h: number) => h>=24?`翌${h-24}時`:`${h}時`;
function fmtDate(ds: string) {
  const d = new Date(ds+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}

export default function CastChangeRequestPanel({ castId, shopId }: { castId: string; shopId: string }) {
  const [confirmedShifts, setConfirmedShifts] = useState<ConfirmedShift[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [type, setType] = useState<"time_change"|"day_off">("day_off");
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("24:00");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const sel: React.CSSProperties = { background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "var(--font)", padding: "6px 10px" };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const today = new Date().toISOString().slice(0,10);
    const now = new Date();
    const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 今月・来月の両方から確定シフトを取得
    const [res1, res2, rRes] = await Promise.all([
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${now.getFullYear()}&month=${now.getMonth()+1}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${nextM.getFullYear()}&month=${nextM.getMonth()+1}`),
      fetch(`/api/shift-change-request?cast_id=${castId}`),
    ]);

    let allConfirmed: any[] = [];
    if (res1.ok) { const d = await res1.json(); allConfirmed = [...allConfirmed, ...(d.confirmed || [])]; }
    if (res2.ok) { const d = await res2.json(); allConfirmed = [...allConfirmed, ...(d.confirmed || [])]; }

    const mine = allConfirmed
      .filter((s: any) => String(s.cast_id) === String(castId) && s.date >= today)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    setConfirmedShifts(mine);

    if (rRes.ok) setRequests(await rRes.json());
  };

  const selectedShift = confirmedShifts.find(s => s.id === selectedShiftId);

  const submit = async () => {
    if (!selectedShift) { setMsg("シフトを選択してください"); return; }
    setLoading(true); setMsg("");
    const res = await fetch("/api/shift-change-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cast_id: castId, shop_id: shopId,
        date: selectedShift.date, type,
        requested_start_time: type === "time_change" ? startTime : null,
        requested_end_time: type === "time_change" ? endTime : null,
        note: note || null,
      }),
    });
    if (res.ok) {
      setMsg("変更希望を送信しました。お店に通知されます。");
      setNote(""); setSelectedShiftId(""); await loadAll();
    } else setMsg("送信に失敗しました");
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>🔄 シフト変更・休み希望</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.8 }}>
          確定されているシフトの変更や休み希望をお店に伝えることができます。
        </p>

        {confirmedShifts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 13 }}>
            変更できる確定シフトがありません
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* シフト選択 */}
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700 }}>変更したいシフトを選択</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {confirmedShifts.map(shift => (
                  <button key={shift.id} onClick={() => {
                    setSelectedShiftId(shift.id);
                    setStartTime(shift.start_time?.slice(0,5) || "20:00");
                    setEndTime(shift.end_time?.slice(0,5) || "24:00");
                  }} style={{
                    padding: "10px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    background: selectedShiftId === shift.id ? "var(--accent)22" : "var(--bg-input)",
                    border: `1.5px solid ${selectedShiftId === shift.id ? "var(--accent)" : "var(--border)"}`,
                    color: "var(--text-primary)", fontFamily: "var(--font)",
                  }}>
                    <span style={{ fontWeight: 700, color: selectedShiftId === shift.id ? "var(--accent)" : "var(--text-primary)" }}>
                      {fmtDate(shift.date)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 10 }}>
                      {shift.start_time?.slice(0,5)} 〜 {shift.end_time?.slice(0,5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedShift && (
              <>
                {/* 変更種別 */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 700 }}>変更内容</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ key: "day_off", label: "🙏 休み希望" }, { key: "time_change", label: "🕐 時間変更" }].map(t => (
                      <button key={t.key} onClick={() => setType(t.key as any)} style={{
                        padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: "var(--font)",
                        background: type === t.key ? "var(--accent)22" : "var(--bg-input)",
                        border: `1.5px solid ${type === t.key ? "var(--accent)" : "var(--border)"}`,
                        color: type === t.key ? "var(--accent)" : "var(--text-secondary)", fontWeight: type === t.key ? 700 : 500,
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>

                {/* 時間変更の場合 */}
                {type === "time_change" && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 700 }}>
                      希望する時間（現在: {selectedShift.start_time?.slice(0,5)}〜{selectedShift.end_time?.slice(0,5)}）
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={startTime.split(":")[0]} onChange={e => setStartTime(`${e.target.value}:${startTime.split(":")[1]}`)} style={sel}>
                        {HOURS.map(h => <option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}
                      </select>
                      <select value={startTime.split(":")[1]} onChange={e => setStartTime(`${startTime.split(":")[0]}:${e.target.value}`)} style={sel}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                      <span style={{ color: "var(--text-muted)" }}>〜</span>
                      <select value={endTime.split(":")[0]} onChange={e => setEndTime(`${e.target.value}:${endTime.split(":")[1]}`)} style={sel}>
                        {HOURS.map(h => <option key={h} value={String(h%24).padStart(2,"0")}>{tLabel(h)}</option>)}
                      </select>
                      <select value={endTime.split(":")[1]} onChange={e => setEndTime(`${endTime.split(":")[0]}:${e.target.value}`)} style={sel}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* メモ */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>メモ（任意）</div>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="理由や詳細があれば..." style={{ ...sel, width: "100%", boxSizing: "border-box" as const }} />
                </div>

                <button onClick={submit} disabled={loading} style={{ padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)" }}>
                  {loading ? "送信中..." : "変更希望を送信"}
                </button>
              </>
            )}
          </div>
        )}

        {msg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13,
            background: msg.includes("失敗") ? "#ff444418" : "var(--online-bg)",
            border: `1px solid ${msg.includes("失敗") ? "#ff444444" : "var(--online-border)"}`,
            color: msg.includes("失敗") ? "#ff4444" : "var(--online)",
          }}>{msg}</div>
        )}
      </div>

      {/* 提出済み変更希望 */}
      {requests.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📋 提出済みの変更希望</div>
          {requests.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <div>
                <span style={{ color: "var(--text-secondary)", marginRight: 8 }}>{fmtDate(r.date)}</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {r.type === "day_off" ? "休み希望" : `${r.requested_start_time?.slice(0,5)}〜${r.requested_end_time?.slice(0,5)} に変更希望`}
                </span>
                {r.note && <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 8 }}>({r.note})</span>}
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, flexShrink: 0,
                background: r.status === "approved" ? "var(--online-bg)" : r.status === "rejected" ? "#ff444418" : "var(--bg-input)",
                color: r.status === "approved" ? "var(--online)" : r.status === "rejected" ? "#ff4444" : "var(--text-muted)",
                border: `1px solid ${r.status === "approved" ? "var(--online-border)" : r.status === "rejected" ? "#ff444444" : "var(--border)"}`,
              }}>
                {r.status === "approved" ? "承認" : r.status === "rejected" ? "非承認" : "確認中"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
