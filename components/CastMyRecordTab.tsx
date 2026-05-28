"use client";
import { useState, useEffect, useCallback } from "react";

type SlipItem = { name: string; qty: number; price: number };
type SlipCast = { cast_id: string; type: string };
type Slip = { id: string; date: string; payment: string; subtotal: number; tax: number; total: number; items: SlipItem[]; cast_entries: SlipCast[]; memo: string | null };
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string };

type Props = { shopId: number; castId: number; castName: string };

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function fmtDateLong(d: string) {
  const x = new Date(d + "T00:00:00");
  return `${x.getMonth() + 1}月${x.getDate()}日(${DAY_NAMES[x.getDay()]})`;
}

export default function CastMyRecordTab({ shopId, castId, castName }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmedShifts, setConfirmedShifts] = useState<ConfirmedShift[]>([]);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    // 確定シフトと伝票を並行取得
    const [shiftRes, slipRes] = await Promise.all([
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`),
      fetch(`/api/slips?shop_id=${shopId}&month=${month}`),
    ]);
    const shiftData = shiftRes.ok ? await shiftRes.json() : {};
    const slipData = slipRes.ok ? await slipRes.json() : [];

    // 自分のシフトだけ
    const myShifts: ConfirmedShift[] = (shiftData.confirmed || []).filter(
      (s: ConfirmedShift) => Number(s.cast_id) === castId
    );
    setConfirmedShifts(myShifts);

    // 自分が担当した伝票だけ
    const mySlips = (Array.isArray(slipData) ? slipData : []).filter((s: any) =>
      Array.isArray(s.cast_entries) && s.cast_entries.some(
        (e: any) => e.cast_id !== "" && e.cast_id !== null && String(e.cast_id) === String(castId)
      )
    );
    setSlips(mySlips);
    setLoading(false);
  }, [shopId, castId, month]);

  useEffect(() => { load(); }, [load]);

  // カレンダー
  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const calDays: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (calDays.length % 7 !== 0) calDays.push(null);

  const shiftDates = new Set(confirmedShifts.map(s => s.date));
  const slipsByDate: Record<string, Slip[]> = {};
  for (const s of slips) {
    if (!slipsByDate[s.date]) slipsByDate[s.date] = [];
    slipsByDate[s.date].push(s);
  }

  const dayShift = selectedDate ? confirmedShifts.find(s => s.date === selectedDate) : null;
  const daySlips = selectedDate ? (slipsByDate[selectedDate] || []) : [];

  // 月次サマリー
  const totalSlips = slips.length;
  const totalDays = confirmedShifts.length;

  const sec: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 14, padding: 14, marginBottom: 10,
  };

  return (
    <div>
      {/* 月ナビ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0, 7)); setSelectedDate(null); }}
          style={{ padding: "7px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{month.replace("-", "年")}月</span>
        <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0, 7)); setSelectedDate(null); }}
          style={{ padding: "7px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>→</button>
      </div>

      {/* サマリー */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { label: "出勤日数", value: totalDays, unit: "日" },
          { label: "担当伝票", value: totalSlips, unit: "枚" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, ...sec, marginBottom: 0, textAlign: "center" as const }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)" }}>{s.value}<span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2 }}>{s.unit}</span></div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center" as const, color: "var(--text-muted)", padding: 24 }}>読み込み中...</div> : (<>

        {/* カレンダー */}
        <div style={{ ...sec, marginBottom: 16 }}>
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
              const isShift = shiftDates.has(date);
              const hasSlip = !!slipsByDate[date]?.length;
              const isSelected = date === selectedDate;
              const isToday = date === today;
              return (
                <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)} style={{
                  padding: "7px 2px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: isSelected
                    ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                    : isShift ? "var(--online)22" : "var(--bg-input)",
                  color: isSelected ? "#fff" : dow === 0 ? "#ff4444" : dow === 6 ? "var(--accent)" : isShift ? "var(--online)" : "var(--text-muted)",
                  fontWeight: isShift ? 700 : 400, fontSize: 13,
                  outline: isToday && !isSelected ? "2px solid var(--accent)55" : "none",
                }}>
                  {dayNum}
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, minHeight: 6 }}>
                    {isShift && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "var(--online)", display: "inline-block" }} />}
                    {hasSlip && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "var(--accent)", display: "inline-block" }} />}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--online)", marginRight: 4, verticalAlign: "middle" }} />出勤日</span>
            <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginRight: 4, verticalAlign: "middle" }} />伝票あり</span>
          </div>
        </div>

        {/* 選択日の詳細 */}
        {!selectedDate && (
          <div style={{ textAlign: "center" as const, color: "var(--text-muted)", padding: "16px 0", fontSize: 13 }}>
            日付をタップすると出勤・伝票の詳細を確認できます
          </div>
        )}

        {selectedDate && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              {fmtDateLong(selectedDate)}
            </div>

            {/* シフト情報 */}
            {dayShift ? (
              <div style={{ ...sec, background: "var(--online)15", borderColor: "var(--online)44", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--online)", fontWeight: 700, marginBottom: 4 }}>✅ 出勤確定</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 700 }}>
                  {dayShift.start_time} 〜 {dayShift.end_time}
                </div>
              </div>
            ) : (
              <div style={{ ...sec, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" as const }}>この日の出勤記録はありません</div>
              </div>
            )}

            {/* 担当伝票 */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.08em" }}>
              担当伝票 {daySlips.length > 0 ? `(${daySlips.length}件)` : ""}
            </div>
            {daySlips.length === 0 ? (
              <div style={{ ...sec, color: "var(--text-hint)", fontSize: 13, textAlign: "center" as const }}>
                この日の担当伝票はありません
              </div>
            ) : (
              daySlips.map(slip => {
                const myEntry = slip.cast_entries?.find(e => String(e.cast_id) === String(castId));
                return (
                  <div key={slip.id} style={sec}>
                    {/* ヘッダー */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {myEntry && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: "var(--accent)22", color: "var(--accent)", fontWeight: 700 }}>{myEntry.type}</span>}
                        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{slip.payment}</span>
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 900, color: "var(--text-primary)" }}>¥{(slip.total || 0).toLocaleString()}</span>
                    </div>
                    {/* 品目 */}
                    <div style={{ marginBottom: 8 }}>
                      {(slip.items || []).map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 3 }}>
                          <span>{item.name} × {item.qty}</span>
                          <span>¥{(item.qty * item.price).toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", paddingTop: 6, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                        <span>小計 / 税込合計</span>
                        <span>¥{(slip.subtotal||0).toLocaleString()} / ¥{(slip.total||0).toLocaleString()}</span>
                      </div>
                    </div>
                    {slip.memo && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📝 {slip.memo}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </>)}
    </div>
  );
}
