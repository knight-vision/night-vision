"use client";
import { useState, useEffect, useCallback } from "react";

type SlipItem = { name: string; qty: number; price: number };
type SlipCast = { cast_id: string; type: string };
type Slip = { id: string; date: string; payment: string; subtotal: number; tax: number; total: number; items: SlipItem[]; cast_entries: SlipCast[]; memo: string | null };
type Note = { id: string; slip_id: string | null; date: string; note: string; visit_count: number; created_at: string };
type Cast = { id: number; name: string };

type Props = {
  shopId: string;
  casts: Cast[];
  sectionStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
};

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function fmtDate(d: string) {
  const x = new Date(d + "T00:00:00");
  return `${x.getMonth() + 1}/${x.getDate()}(${DAY_NAMES[x.getDay()]})`;
}

export default function CastRecordTab({ shopId, casts, sectionStyle, inputStyle, labelStyle }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedCastId, setSelectedCastId] = useState(casts[0] ? String(casts[0].id) : "");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // メモ入力
  const [noteSlipId, setNoteSlipId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteVisit, setNoteVisit] = useState("1");
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!selectedCastId) return;
    setLoading(true);
    const [s, n] = await Promise.all([
      fetch(`/api/slips?shop_id=${shopId}&month=${month}&cast_id=${selectedCastId}`).then(r => r.json()),
      fetch(`/api/customer-notes?shop_id=${shopId}&cast_id=${selectedCastId}&month=${month}`).then(r => r.json()),
    ]);
    setSlips(Array.isArray(s) ? s : []);
    setNotes(Array.isArray(n) ? n : []);
    setLoading(false);
  }, [shopId, selectedCastId, month]);

  useEffect(() => { load(); }, [load]);

  // カレンダー生成
  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const calendarDays: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  // 日付ごとの伝票・メモ数
  const slipsByDate: Record<string, Slip[]> = {};
  const notesByDate: Record<string, Note[]> = {};
  for (const s of slips) { if (!slipsByDate[s.date]) slipsByDate[s.date] = []; slipsByDate[s.date].push(s); }
  for (const n of notes) { if (!notesByDate[n.date]) notesByDate[n.date] = []; notesByDate[n.date].push(n); }

  const daySlips = selectedDate ? (slipsByDate[selectedDate] || []) : [];
  const dayNotes = selectedDate ? (notesByDate[selectedDate] || []) : [];

  const addNote = async () => {
    if (!selectedCastId || !selectedDate || !noteText.trim()) return;
    await fetch("/api/customer-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId, cast_id: Number(selectedCastId), slip_id: noteSlipId, date: selectedDate, note: noteText.trim(), visit_count: Number(noteVisit) || 1 }) });
    setNoteText(""); setNoteSlipId(null);
    setMsg("✅ メモを保存しました"); setTimeout(() => setMsg(""), 2000);
    load();
  };

  const saveEdit = async () => {
    if (!editNoteId || !editText.trim()) return;
    await fetch("/api/customer-notes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editNoteId, note: editText.trim() }) });
    setEditNoteId(null); setEditText("");
    load();
  };

  const deleteNote = async (id: string) => {
    await fetch("/api/customer-notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const cast = casts.find(c => String(c.id) === selectedCastId);

  return (
    <div>
      {/* キャスト・月選択 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>キャスト</label>
          <select value={selectedCastId} onChange={e => { setSelectedCastId(e.target.value); setSelectedDate(null); }} style={inputStyle}>
            {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0, 7)); setSelectedDate(null); }} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>←</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", minWidth: 80, textAlign: "center" }}>{month.replace("-", "年")}月</span>
          <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0, 7)); setSelectedDate(null); }} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>→</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "var(--online-bg)", border: "1px solid var(--online-border)", color: "var(--online)" }}>{msg}</div>}

      {loading ? <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>読み込み中...</div> : (<>

      {/* カレンダー */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {DAY_NAMES.map((d, i) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, color: i === 0 ? "#ff4444" : i === 6 ? "var(--accent)" : "var(--text-muted)", fontWeight: 700, padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={idx} />;
            const dayNum = Number(date.slice(-2));
            const dow = idx % 7;
            const hasSlip = !!slipsByDate[date];
            const hasNote = !!notesByDate[date];
            const isSelected = date === selectedDate;
            const isToday = date === today;
            return (
              <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)} style={{
                padding: "6px 2px", borderRadius: 8, border: "none", cursor: "pointer",
                background: isSelected ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
                color: isSelected ? "#fff" : dow === 0 ? "#ff4444" : dow === 6 ? "var(--accent)" : "var(--text-primary)",
                fontWeight: isToday ? 900 : 500, fontSize: 13,
                outline: isToday && !isSelected ? "2px solid var(--accent)66" : "none",
                position: "relative" as const,
              }}>
                {dayNum}
                {(hasSlip || hasNote) && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                    {hasSlip && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "var(--online)", display: "inline-block" }} />}
                    {hasNote && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "#f59e0b", display: "inline-block" }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
          <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--online)", marginRight: 4 }} />伝票あり</span>
          <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginRight: 4 }} />メモあり</span>
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selectedDate && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            {fmtDate(selectedDate)} の記録
          </div>

          {/* 伝票 */}
          {daySlips.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>伝票</div>
              {daySlips.map(slip => {
                const myEntry = slip.cast_entries?.find(e => String(e.cast_id) === selectedCastId);
                return (
                  <div key={slip.id} style={{ ...sectionStyle, marginBottom: 8, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {myEntry && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--accent)22", color: "var(--accent)", fontWeight: 700 }}>{myEntry.type}</span>}
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{slip.payment}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)" }}>¥{(slip.total || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                      {slip.items?.map(i => `${i.name}×${i.qty}`).join(" · ")}
                    </div>
                    {/* この伝票へのメモ追加ボタン */}
                    <button onClick={() => setNoteSlipId(noteSlipId === slip.id ? null : slip.id)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: noteSlipId === slip.id ? "var(--accent)22" : "var(--bg-input)", border: `1px solid ${noteSlipId === slip.id ? "var(--accent)44" : "var(--border)"}`, color: noteSlipId === slip.id ? "var(--accent)" : "var(--text-muted)", cursor: "pointer" }}>
                      📝 この伝票にメモを紐づける
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 顧客メモ一覧 */}
          {dayNotes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>顧客メモ</div>
              {dayNotes.map(note => (
                <div key={note.id} style={{ ...sectionStyle, marginBottom: 8 }}>
                  {editNoteId === note.id ? (
                    <div>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                        style={{ ...inputStyle, resize: "vertical" as const, width: "100%", boxSizing: "border-box" as const, marginBottom: 8 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveEdit} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer" }}>保存</button>
                        <button onClick={() => setEditNoteId(null)} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7, marginBottom: 6, whiteSpace: "pre-wrap" as const }}>{note.note}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          来店{note.visit_count}回目
                          {note.slip_id && <span style={{ marginLeft: 6, color: "var(--accent)" }}>📋 伝票紐付き</span>}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEditNoteId(note.id); setEditText(note.note); }} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>編集</button>
                          <button onClick={() => deleteNote(note.id)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", cursor: "pointer" }}>削除</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* メモ追加フォーム */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
              {noteSlipId ? "📋 伝票に紐づけてメモを追加" : "メモを追加"}
            </div>
            {noteSlipId && (
              <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8, padding: "4px 10px", background: "var(--accent)11", borderRadius: 6 }}>
                選択中の伝票に紐づけます
                <button onClick={() => setNoteSlipId(null)} style={{ marginLeft: 8, fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>× 解除</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>来店回数</label>
                <input type="number" value={noteVisit} onChange={e => setNoteVisit(e.target.value)} min={1} style={{ ...inputStyle, maxWidth: 80 }} />
              </div>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={`${fmtDate(selectedDate)}の顧客メモを入力...\n例：好きなお酒：ウイスキー水割り\n誕生日：3月15日\n来店のきっかけ：友人紹介`}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" as const, width: "100%", boxSizing: "border-box" as const, marginBottom: 8 }}
            />
            <button onClick={addNote} disabled={!noteText.trim()} style={{
              width: "100%", padding: "10px", borderRadius: 10,
              background: noteText.trim() ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
              border: "none", color: noteText.trim() ? "#fff" : "var(--text-muted)",
              fontSize: 13, fontWeight: 700, cursor: noteText.trim() ? "pointer" : "not-allowed",
              fontFamily: "var(--font)",
            }}>メモを保存</button>
          </div>
        </div>
      )}

      {!selectedDate && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 13 }}>
          カレンダーの日付をタップすると伝票とメモを確認・追加できます
        </div>
      )}
      </>)}
    </div>
  );
}
