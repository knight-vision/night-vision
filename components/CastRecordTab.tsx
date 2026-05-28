"use client";
import { useState, useEffect, useCallback } from "react";

type SlipItem = { name: string; qty: number; price: number };
type SlipCast = { cast_id: string; type: string };
type Slip = { id: string; date: string; payment: string; subtotal: number; tax: number; total: number; items: SlipItem[]; cast_entries: SlipCast[]; memo: string | null };
type Customer = { id: string; slip_id: string | null; visit_date: string; name: string; memo: string; visit_count: number; created_at: string };
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // メモ入力
  const [noteSlipId, setNoteSlipId] = useState<string | null>(null);
  const [noteName, setNoteName] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteVisit, setNoteVisit] = useState("1");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editName, setEditName] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!selectedCastId) return;
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      fetch(`/api/slips?shop_id=${shopId}&month=${month}&cast_id=${selectedCastId}`),
      fetch(`/api/customers?shop_id=${shopId}&cast_id=${selectedCastId}&month=${month}`),
    ]);
    const sData = sRes.ok ? await sRes.json() : [];
    const cData = cRes.ok ? await cRes.json() : [];
    // cast_idなし（フリー）でも同じshopの全伝票から手動でフィルタ
    if (Array.isArray(sData) && sData.length === 0) {
      // cast_idフィルタで引っかからない場合、全伝票から再検索
      const allRes = await fetch(`/api/slips?shop_id=${shopId}&month=${month}`);
      const allData = allRes.ok ? await allRes.json() : [];
      const filtered = allData.filter((s: any) =>
        Array.isArray(s.cast_entries) && s.cast_entries.some((e: any) =>
          String(e.cast_id) === String(selectedCastId)
        )
      );
      setSlips(filtered);
    } else {
      setSlips(Array.isArray(sData) ? sData : []);
    }
    setCustomers(Array.isArray(cData) ? cData : []);
    setLoading(false);
  }, [shopId, selectedCastId, month]);

  useEffect(() => { load(); }, [load]);

  // カレンダー生成
  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const calDays: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (calDays.length % 7 !== 0) calDays.push(null);

  // 日付ごとの集計
  const slipsByDate: Record<string, Slip[]> = {};
  const customersByDate: Record<string, Customer[]> = {};
  for (const s of slips) {
    if (!slipsByDate[s.date]) slipsByDate[s.date] = [];
    slipsByDate[s.date].push(s);
  }
  for (const c of customers) {
    const k = c.visit_date || "";
    if (!k) continue;
    if (!customersByDate[k]) customersByDate[k] = [];
    customersByDate[k].push(c);
  }

  const daySlips = selectedDate ? (slipsByDate[selectedDate] || []) : [];
  const dayCustomers = selectedDate ? (customersByDate[selectedDate] || []) : [];

  const addNote = async () => {
    if (!selectedCastId || !selectedDate || !noteText.trim()) return;
    await fetch("/api/customers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, cast_id: Number(selectedCastId), slip_id: noteSlipId, visit_date: selectedDate, name: noteName.trim() || "名前なし", memo: noteText.trim(), visit_count: Number(noteVisit) || 1 }),
    });
    setNoteText(""); setNoteName(""); setNoteSlipId(null);
    setMsg("✅ 保存しました"); setTimeout(() => setMsg(""), 2000);
    load();
  };

  const saveEdit = async () => {
    if (!editId) return;
    await fetch("/api/customers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, name: editName, memo: editText }) });
    setEditId(null);
    load();
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/customers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const sec: React.CSSProperties = { ...(sectionStyle as object), marginBottom: 12 } as React.CSSProperties;

  return (
    <div>
      {/* キャスト・月選択 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const, alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>キャスト</label>
          <select value={selectedCastId} onChange={e => { setSelectedCastId(e.target.value); setSelectedDate(null); }} style={inputStyle}>
            {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0, 7)); setSelectedDate(null); }}
            style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>←</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", minWidth: 80, textAlign: "center" as const }}>{month.replace("-", "年")}月</span>
          <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0, 7)); setSelectedDate(null); }}
            style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>→</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "var(--online-bg)", border: "1px solid var(--online-border)", color: "var(--online)" }}>{msg}</div>}

      {loading ? <div style={{ textAlign: "center" as const, color: "var(--text-muted)", padding: 24 }}>読み込み中...</div> : (<>

        {/* カレンダー */}
        <div style={sec}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ textAlign: "center" as const, fontSize: 11, color: i === 0 ? "#ff4444" : i === 6 ? "var(--accent)" : "var(--text-muted)", fontWeight: 700, padding: "4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {calDays.map((date, idx) => {
              if (!date) return <div key={idx} />;
              const dayNum = Number(date.slice(-2));
              const dow = idx % 7;
              const hasSlip = !!slipsByDate[date]?.length;
              const hasNote = !!customersByDate[date]?.length;
              const isSelected = date === selectedDate;
              const isToday = date === today;
              return (
                <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)} style={{
                  padding: "7px 2px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: isSelected ? "linear-gradient(135deg, var(--accent), var(--accent2))" : isToday ? "var(--accent)18" : "var(--bg-input)",
                  color: isSelected ? "#fff" : dow === 0 ? "#ff4444" : dow === 6 ? "var(--accent)" : "var(--text-primary)",
                  fontWeight: isToday ? 900 : 500, fontSize: 13,
                  outline: isToday && !isSelected ? "2px solid var(--accent)66" : "none",
                }}>
                  {dayNum}
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, minHeight: 6 }}>
                    {hasSlip && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "var(--online)", display: "inline-block" }} />}
                    {hasNote && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "#f59e0b", display: "inline-block" }} />}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--online)", marginRight: 4, verticalAlign: "middle" }} />伝票あり</span>
            <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginRight: 4, verticalAlign: "middle" }} />顧客メモあり</span>
          </div>
        </div>

        {/* 日付未選択 */}
        {!selectedDate && (
          <div style={{ textAlign: "center" as const, color: "var(--text-muted)", padding: "20px 0", fontSize: 13 }}>
            日付をタップすると伝票・顧客メモを確認できます
          </div>
        )}

        {/* 選択日の詳細 */}
        {selectedDate && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              {fmtDate(selectedDate)}
            </div>

            {/* 伝票一覧 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.08em" }}>
              伝票 {daySlips.length > 0 ? `(${daySlips.length}件)` : ""}
            </div>
            {daySlips.length === 0
              ? <div style={{ ...sec, color: "var(--text-hint)", fontSize: 13, textAlign: "center" as const }}>この日の伝票はありません</div>
              : daySlips.map(slip => {
                const myEntry = slip.cast_entries?.find(e => String(e.cast_id) === selectedCastId);
                return (
                  <div key={slip.id} style={sec}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {myEntry && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--accent)22", color: "var(--accent)", fontWeight: 700 }}>{myEntry.type}</span>}
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{slip.payment}</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>¥{(slip.total || 0).toLocaleString()}</span>
                    </div>
                    {/* 品目 */}
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                      {(slip.items || []).map((i, idx) => (
                        <span key={idx}>{i.name}×{i.qty}{idx < slip.items.length - 1 ? " · " : ""}</span>
                      ))}
                    </div>
                    {/* 担当キャスト */}
                    {(slip.cast_entries || []).filter(e => e.cast_id).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 8 }}>
                        {slip.cast_entries.filter(e => e.cast_id).map((e, i) => {
                          const c = casts.find(cc => String(cc.id) === String(e.cast_id));
                          const isMe = String(e.cast_id) === selectedCastId;
                          return (
                            <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: isMe ? "var(--accent)18" : "var(--bg-input)", border: `1px solid ${isMe ? "var(--accent)44" : "var(--border)"}`, color: isMe ? "var(--accent)" : "var(--text-muted)", fontWeight: isMe ? 700 : 400 }}>
                              {c?.name || "?"} ({e.type})
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* この伝票にメモを紐づける */}
                    <button onClick={() => setNoteSlipId(noteSlipId === slip.id ? null : slip.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: noteSlipId === slip.id ? "var(--accent)22" : "var(--bg-input)", border: `1px solid ${noteSlipId === slip.id ? "var(--accent)44" : "var(--border)"}`, color: noteSlipId === slip.id ? "var(--accent)" : "var(--text-muted)", cursor: "pointer" }}>
                      📝 {noteSlipId === slip.id ? "紐づけ中" : "顧客メモを紐づける"}
                    </button>
                  </div>
                );
              })
            }

            {/* 顧客メモ一覧 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.08em", marginTop: 16 }}>
              顧客メモ {dayCustomers.length > 0 ? `(${dayCustomers.length}件)` : ""}
            </div>
            {dayCustomers.length === 0
              ? <div style={{ ...sec, color: "var(--text-hint)", fontSize: 13, textAlign: "center" as const }}>この日の顧客メモはありません</div>
              : dayCustomers.map(c => (
                <div key={c.id} style={sec}>
                  {editId === c.id ? (
                    <div>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="お客様名" style={{ ...inputStyle, width: "100%", marginBottom: 6, boxSizing: "border-box" as const }} />
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" as const, width: "100%", marginBottom: 8, boxSizing: "border-box" as const }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveEdit} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer" }}>保存</button>
                        <button onClick={() => setEditId(null)} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{c.name && c.name !== "名前なし" ? c.name : "名前なし"}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>来店{c.visit_count}回目</span>
                          {c.slip_id && <span style={{ fontSize: 11, color: "var(--accent)", marginLeft: 6 }}>📋 伝票紐付き</span>}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEditId(c.id); setEditText(c.memo); setEditName(c.name); }} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>編集</button>
                          <button onClick={() => deleteCustomer(c.id)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", cursor: "pointer" }}>削除</button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>{c.memo}</div>
                    </div>
                  )}
                </div>
              ))
            }

            {/* 顧客メモ追加フォーム */}
            <div style={{ ...sec, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
                + 顧客メモを追加 {noteSlipId && <span style={{ color: "var(--accent)" }}>（伝票紐付き）</span>}
              </div>
              {noteSlipId && (
                <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8, padding: "4px 10px", background: "var(--accent)11", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>上の伝票に紐づけてメモを保存します</span>
                  <button onClick={() => setNoteSlipId(null)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>× 解除</button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>お客様名（任意）</label>
                  <input type="text" value={noteName} onChange={e => setNoteName(e.target.value)} placeholder="例：田中様" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>来店回数</label>
                  <input type="number" value={noteVisit} onChange={e => setNoteVisit(e.target.value)} min={1} style={inputStyle} />
                </div>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder={"メモ（好きなお酒・誕生日・話した内容など）"}
                rows={3} style={{ ...inputStyle, resize: "vertical" as const, width: "100%", boxSizing: "border-box" as const, marginBottom: 8 }} />
              <button onClick={addNote} disabled={!noteText.trim()} style={{
                width: "100%", padding: "10px", borderRadius: 10,
                background: noteText.trim() ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
                border: "none", color: noteText.trim() ? "#fff" : "var(--text-muted)",
                fontSize: 13, fontWeight: 700, cursor: noteText.trim() ? "pointer" : "not-allowed", fontFamily: "var(--font)",
              }}>保存</button>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
