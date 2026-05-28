"use client";
import { useState, useEffect, useCallback } from "react";
import type { Cast } from "@/lib/shops";

type CastSale = { id: string; cast_id: number; date: string; sales_type: string; amount: number; count: number; memo: string };
type WageOverride = { id: string; cast_id: number; date: string; hourly_wage: number; memo: string };
type Shift = { cast_id: number; date: string; start_time: string; end_time: string };

const SALES_LABELS: Record<string, { label: string; icon: string; countLabel: string }> = {
  free:      { label: "フリー",    icon: "🆓", countLabel: "本" },
  honshimei: { label: "本指名",   icon: "⭐", countLabel: "本" },
  baai:      { label: "場内指名", icon: "🎯", countLabel: "本" },
  douhan:    { label: "同伴",     icon: "🚗", countLabel: "本" },
  after:     { label: "アフター", icon: "🌙", countLabel: "本" },
  trip:      { label: "出張",     icon: "✈️", countLabel: "本" },
  drink:     { label: "ドリンク", icon: "🥂", countLabel: "杯" },
  shot:      { label: "ショット", icon: "🥃", countLabel: "杯" },
  bottle:    { label: "ボトルバック", icon: "🍾", countLabel: "本" },
};

function calcMinutes(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
}

function getWeekDates(base: string) {
  const d = new Date(base + "T00:00:00");
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon); x.setDate(mon.getDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

type Props = {
  shopId: string;
  casts: Cast[];
  sectionStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  btnPrimary: React.CSSProperties;
};

export default function CastPerformanceTab({ shopId, casts, sectionStyle, inputStyle, labelStyle, btnPrimary }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [sales, setSales] = useState<CastSale[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [wageOverrides, setWageOverrides] = useState<WageOverride[]>([]);
  const [loading, setLoading] = useState(false);

  // 時給上書き入力
  const [wageEditCastId, setWageEditCastId] = useState("");
  const [wageEditDate, setWageEditDate] = useState(today);
  const [wageEditAmount, setWageEditAmount] = useState("");
  const [wageEditMemo, setWageEditMemo] = useState("");

  // 手動売上入力
  const [manualCastId, setManualCastId] = useState("");
  const [manualDate, setManualDate] = useState(today);
  const [manualType, setManualType] = useState("honshimei");
  const [manualCount, setManualCount] = useState("1");
  const [manualAmount, setManualAmount] = useState("");

  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const m = period === "monthly" ? selectedMonth : selectedDate.slice(0, 7);
    const [y, mo] = m.split("-").map(Number);
    const [s, sh, wo] = await Promise.all([
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${m}`).then(r => r.json()),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${mo}`).then(r => r.json()),
      fetch(`/api/cast-wage-overrides?shop_id=${shopId}&month=${m}`).then(r => r.json()),
    ]);
    setSales(Array.isArray(s) ? s : []);
    setShifts(sh?.confirmed || []);
    setWageOverrides(Array.isArray(wo) ? wo : []);
    setLoading(false);
  }, [shopId, period, selectedDate, selectedMonth]);

  useEffect(() => { load(); }, [load]);

  const targetDates: string[] = (() => {
    if (period === "daily") return [selectedDate];
    if (period === "weekly") return getWeekDates(selectedDate);
    const [y, m] = selectedMonth.split("-").map(Number);
    const days: string[] = [];
    const d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) { days.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    return days;
  })();

  const getCastStats = (cast: Cast) => {
    const castSales = sales.filter(s => s.cast_id === cast.id && targetDates.includes(s.date));
    const castShifts = shifts.filter(s => s.cast_id === cast.id && targetDates.includes(s.date));
    const mins = castShifts.reduce((a, s) => a + calcMinutes(s.start_time, s.end_time), 0);
    const stats: Record<string, { count: number; amount: number }> = {};
    for (const key of Object.keys(SALES_LABELS)) {
      const items = castSales.filter(s => s.sales_type === key);
      stats[key] = { count: items.reduce((a, s) => a + (s.count || 1), 0), amount: items.reduce((a, s) => a + s.amount, 0) };
    }
    return { mins, days: castShifts.length, stats };
  };

  const addWageOverride = async () => {
    if (!wageEditCastId || !wageEditDate || !wageEditAmount) return;
    await fetch("/api/cast-wage-overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId, cast_id: Number(wageEditCastId), date: wageEditDate, hourly_wage: Number(wageEditAmount), memo: wageEditMemo }) });
    setWageEditAmount(""); setWageEditMemo("");
    setMsg("✅ 時給を設定しました"); setTimeout(() => setMsg(""), 2500);
    load();
  };

  const addManualSale = async () => {
    if (!manualCastId || !manualDate || !manualAmount) return;
    await fetch("/api/cast-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId, cast_id: Number(manualCastId), date: manualDate, sales_type: manualType, amount: Number(manualAmount), count: Number(manualCount) || 1, memo: "手動入力" }) });
    setManualAmount(""); setManualCount("1");
    setMsg("✅ 売上を追加しました"); setTimeout(() => setMsg(""), 2500);
    load();
  };

  const sec = sectionStyle;

  return (
    <div>
      {msg && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "var(--online-bg)", border: "1px solid var(--online-border)", color: "var(--online)" }}>{msg}</div>}

      {/* 期間ナビ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["daily", "weekly", "monthly"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", background: period === p ? "var(--accent)" : "var(--bg-input)", color: period === p ? "#fff" : "var(--text-secondary)", border: `1px solid ${period === p ? "transparent" : "var(--border)"}` }}>
              {p === "daily" ? "日次" : p === "weekly" ? "週次" : "月次"}
            </button>
          ))}
        </div>
        {period === "monthly"
          ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => { const d = new Date(selectedMonth + "-01"); d.setMonth(d.getMonth() - 1); setSelectedMonth(d.toISOString().slice(0, 7)); }} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>←</button>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{selectedMonth.replace("-", "年")}月</span>
              <button onClick={() => { const d = new Date(selectedMonth + "-01"); d.setMonth(d.getMonth() + 1); setSelectedMonth(d.toISOString().slice(0, 7)); }} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>→</button>
            </div>
          : <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
        }
      </div>

      {/* パフォーマンス一覧 */}
      {loading ? <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>読み込み中...</div> : (
        <div style={{ ...sec, marginBottom: 16, overflowX: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>キャスト別実績</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600 }}>キャスト</th>
                <th style={{ textAlign: "center", padding: "6px 4px", color: "var(--text-muted)", fontWeight: 600 }}>出勤日</th>
                <th style={{ textAlign: "center", padding: "6px 4px", color: "var(--text-muted)", fontWeight: 600 }}>時間</th>
                {Object.entries(SALES_LABELS).map(([k, v]) => (
                  <th key={k} style={{ textAlign: "center", padding: "6px 4px", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{v.icon}{v.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {casts.map(cast => {
                const { mins, days, stats } = getCastStats(cast);
                return (
                  <tr key={cast.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px", color: "var(--text-primary)", fontWeight: 600 }}>{cast.name}</td>
                    <td style={{ textAlign: "center", padding: "8px 4px", color: "var(--text-secondary)" }}>{days}日</td>
                    <td style={{ textAlign: "center", padding: "8px 4px", color: "var(--text-secondary)" }}>{Math.floor(mins / 60)}h{mins % 60 > 0 ? `${mins % 60}m` : ""}</td>
                    {Object.keys(SALES_LABELS).map(k => (
                      <td key={k} style={{ textAlign: "center", padding: "8px 4px" }}>
                        {stats[k].count > 0
                          ? <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{stats[k].count}</span>
                          : <span style={{ color: "var(--text-hint)" }}>-</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 手動売上入力 */}
      <div style={{ ...sec, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>売上を手動で追加</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={labelStyle}>キャスト</label>
            <select value={manualCastId} onChange={e => setManualCastId(e.target.value)} style={inputStyle}>
              <option value="">選択...</option>
              {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>種別</label>
            <select value={manualType} onChange={e => setManualType(e.target.value)} style={inputStyle}>
              {Object.entries(SALES_LABELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>本数/杯数</label>
            <input type="number" value={manualCount} onChange={e => setManualCount(e.target.value)} min={1} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>金額（円）</label>
            <input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>
        <button onClick={addManualSale} disabled={!manualCastId || !manualAmount} style={{ ...btnPrimary, width: "100%", opacity: !manualCastId || !manualAmount ? 0.5 : 1 }}>＋ 売上を追加</button>
      </div>
    </div>
  );
}
