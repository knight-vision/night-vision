"use client";
import { useState, useEffect } from "react";

type Cast = { id: number; name: string; hourly_wage: number | null; on_today: boolean | null };
type DailySales = { cash_sales: number; card_sales: number; cost: number };
type CastSale = { cast_id: number; sales_type: string; amount: number };
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string };
type Allowance = { cast_id: number; amount: number };

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function calcMinutes(s: string, e: string) {
  const [sh, sm] = s.split(":").map(Number), [eh, em] = e.split(":").map(Number);
  let a = sh * 60 + sm, b = eh * 60 + em;
  if (b <= a) b += 1440;
  return b - a;
}
function fmtTime(t: string) { return t?.slice(0, 5) || ""; }

type Props = {
  shopId: string;
  casts: Cast[];
  sectionStyle: React.CSSProperties;
  btnPrimary: React.CSSProperties;
  setTab: (tab: string) => void;
  showMsg: (msg: string) => void;
};

export default function TodayTab({ shopId, casts, sectionStyle, btnPrimary, setTab, showMsg }: Props) {
  const today = getToday();
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [castSales, setCastSales] = useState<CastSale[]>([]);
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShift, setEditingShift] = useState<number | null>(null); // cast_id
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const month = today.slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const [dsRes, csRes, shiftRes, allowRes] = await Promise.all([
      fetch(`/api/daily-sales?shop_id=${shopId}&month=${month}`),
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${month}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`),
      fetch(`/api/cast-allowances?shop_id=${shopId}&month=${month}`),
    ]);
    if (dsRes.ok) {
      const all = await dsRes.json();
      setDailySales(all.find((d: any) => d.date === today) || null);
    }
    if (csRes.ok) setCastSales((await csRes.json()).filter((s: CastSale & { date: string }) => s.date === today));
    if (shiftRes.ok) { const d = await shiftRes.json(); setShifts((d.confirmed || []).filter((s: ConfirmedShift) => s.date === today)); }
    if (allowRes.ok) setAllowances((await allowRes.json()).filter((a: Allowance & { date: string }) => a.date === today));
    setLoading(false);
  };

  const saveShiftEdit = async (castId: number) => {
    const res = await fetch("/api/confirm-shift/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, cast_id: castId, date: today, start_time: editStart, end_time: editEnd }),
    });
    if (res.ok) {
      setShifts(prev => prev.map(s => s.cast_id === castId ? { ...s, start_time: editStart, end_time: editEnd } : s));
      setEditingShift(null);
      showMsg("シフトを更新しました");
      load();
    }
  };

  const todaySales = (dailySales?.cash_sales || 0) + (dailySales?.card_sales || 0);
  const todayCost = dailySales?.cost || 0;

  const calcCastPay = (cast: Cast) => {
    const shift = shifts.find(s => s.cast_id === cast.id);
    if (!shift) return { shift: null, base: 0, allow: 0, bottle: 0, total: 0, mins: 0 };
    const mins = calcMinutes(shift.start_time, shift.end_time);
    const base = cast.hourly_wage ? Math.round(cast.hourly_wage * mins / 60) : 0;
    const allow = allowances.filter(a => a.cast_id === cast.id).reduce((s, a) => s + a.amount, 0);
    const bottle = castSales.filter(c => c.cast_id === cast.id && c.sales_type === "bottle").reduce((s, c) => s + c.amount, 0);
    return { shift, base, allow, bottle, total: base + allow + bottle, mins };
  };

  const todayPayroll = casts.reduce((s, c) => s + calcCastPay(c).total, 0);
  const todayProfit = todaySales - todayCost - todayPayroll;
  const todayShiftCasts = casts.filter(c => shifts.some(s => s.cast_id === c.id));

  const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>読み込み中...</div>;

  return (
    <div>
      {/* サマリー */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "本日売上", value: todaySales ? `¥${todaySales.toLocaleString()}` : "—" },
          { label: "純利益", value: todaySales ? `¥${todayProfit.toLocaleString()}` : "—" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px", textAlign: "center" as const }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.value === "—" ? "var(--border)" : "var(--accent)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 伝票入力 */}
      <button onClick={() => setTab("sales")} style={{ ...btnPrimary, width: "100%", marginBottom: 16, padding: "14px", fontSize: 15 }}>
        🧾 伝票を入力する
      </button>

      {/* 本日の出勤キャスト */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>本日の出勤キャスト</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>確定シフト {todayShiftCasts.length}名</div>
        </div>

        {todayShiftCasts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0", fontSize: 13 }}>
            本日の確定シフトがありません
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setTab("shift")} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "1px solid var(--accent)44", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
                シフト管理へ →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayShiftCasts.map(cast => {
              const pay = calcCastPay(cast);
              const myCastSales = castSales.filter(s => s.cast_id === cast.id);
              const isEditing = editingShift === cast.id;
              return (
                <div key={cast.id} style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{cast.name}</span>
                    <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>¥{pay.total.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                    {pay.shift && <span>{fmtTime(pay.shift.start_time)}〜{fmtTime(pay.shift.end_time)}</span>}
                    {pay.base > 0 && <span>基本給 ¥{pay.base.toLocaleString()}</span>}
                    {myCastSales.filter(s => s.sales_type !== "bottle").map(s => {
                      const labels: Record<string, string> = { honshimei:"⭐本指名", baai:"🎯場内", douhan:"🚗同伴" };
                      return <span key={s.cast_id + s.sales_type} style={{ color: "var(--accent)" }}>{labels[s.sales_type] || s.sales_type} ¥{s.amount.toLocaleString()}</span>;
                    })}
                    {pay.bottle > 0 && <span style={{ color: "#a855f7" }}>🍾¥{pay.bottle.toLocaleString()}</span>}
                    <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                      <button
                        onClick={() => setTab("shift")}
                        style={{ fontSize: 10, color: "#10b981", background: "#10b98118", border: "1px solid #10b98144", borderRadius: 6, padding: "1px 8px", cursor: "pointer" }}
                      >＋ 手当・控除</button>
                      <button
                        onClick={() => { setEditingShift(cast.id); setEditStart(pay.shift?.start_time?.slice(0,5) || ""); setEditEnd(pay.shift?.end_time?.slice(0,5) || ""); }}
                        style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "1px 8px", cursor: "pointer" }}
                      >✏️ シフト変更</button>
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={editStart.slice(0,2)} onChange={e => setEditStart(`${e.target.value}:${editStart.slice(3,5)||"00"}`)}
                        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", padding: "6px 8px", fontSize: 13, fontFamily: "var(--font)" }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}時</option>)}
                      </select>
                      <select value={editStart.slice(3,5)||"00"} onChange={e => setEditStart(`${editStart.slice(0,2)||"20"}:${e.target.value}`)}
                        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", padding: "6px 8px", fontSize: 13, fontFamily: "var(--font)" }}>
                        {MINS.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>〜</span>
                      <select value={editEnd.slice(0,2)} onChange={e => setEditEnd(`${e.target.value}:${editEnd.slice(3,5)||"00"}`)}
                        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", padding: "6px 8px", fontSize: 13, fontFamily: "var(--font)" }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}時</option>)}
                      </select>
                      <select value={editEnd.slice(3,5)||"00"} onChange={e => setEditEnd(`${editEnd.slice(0,2)||"02"}:${e.target.value}`)}
                        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", padding: "6px 8px", fontSize: 13, fontFamily: "var(--font)" }}>
                        {MINS.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                      <button onClick={() => saveShiftEdit(cast.id)} style={{ fontSize: 12, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>保存</button>
                      <button onClick={() => setEditingShift(null)} style={{ fontSize: 12, background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>キャンセル</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* キャスト売上 */}
      {castSales.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>本日のキャスト売上</div>
          {castSales.map(s => {
            const cast = casts.find(c => c.id === s.cast_id);
            const labels: Record<string, string> = { honshimei:"⭐本指名", baai:"🎯場内指名", douhan:"🚗同伴", bottle:"🍾ボトルバック", other:"📝その他" };
            return (
              <div key={s.cast_id + s.sales_type + s.amount} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{cast?.name}</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--text-muted)" }}>{labels[s.sales_type] || s.sales_type}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>¥{s.amount.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* クイックリンク */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        {[
          { label: "⭐ キャスト売上", tab: "sales" },
          { label: "📅 シフト管理", tab: "shift" },
          { label: "👥 キャスト", tab: "cast" },
          { label: "📊 月次集計", tab: "sales" },
        ].map(item => (
          <button key={item.label} onClick={() => setTab(item.tab)} style={{
            padding: "12px", borderRadius: 12, background: "var(--bg-card)",
            border: "1px solid var(--border)", color: "var(--text-secondary)",
            fontSize: 13, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600,
          }}>{item.label}</button>
        ))}
      </div>
    </div>
  );
}
