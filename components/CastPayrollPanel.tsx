"use client";
import { useState, useEffect } from "react";

type Shift = { id: string; date: string; start_time: string; end_time: string };
type Allowance = { id: string; cast_id: number; date: string; label: string; amount: number };

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function calcMinutes(start: string, end: string) {
  const [sh,sm] = start.split(":").map(Number);
  const [eh,em] = end.split(":").map(Number);
  let s = sh*60+sm, e = eh*60+em;
  if (e <= s) e += 24*60;
  return e - s;
}
function fmtH(min: number) {
  const h = Math.floor(min/60), m = min%60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
function fmtDate(ds: string) {
  const d = new Date(ds+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
}
function getWeekLabel(ds: string) {
  const d = new Date(ds+"T00:00:00");
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return `${mon.getMonth()+1}/${mon.getDate()}〜${sun.getMonth()+1}/${sun.getDate()}`;
}
function getWeekKey(ds: string) {
  const d = new Date(ds+"T00:00:00");
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return getDateStr(mon);
}

type ViewMode = "day" | "week" | "month";

export default function CastPayrollPanel({
  castId, castName, shopId,
}: { castId: string; castName: string; shopId?: string }) {
  const [mode, setMode] = useState<ViewMode>("month");
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // 日表示用
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [hourlyWage, setHourlyWage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, [month, castId, shopId]);

  const load = async () => {
    setLoading(true);
    // confirmed_shifts から月分を取得
    const shiftsRes = await fetch(`/api/cast-confirmed-shifts?cast_id=${castId}`);
    if (shiftsRes.ok) {
      const data = await shiftsRes.json();
      setShifts(data.filter((s: Shift) => s.date.startsWith(month)));
    }
    // 手当は shop_id が必要
    if (shopId) {
      const allowRes = await fetch(`/api/cast-allowances?shop_id=${shopId}&month=${month}`);
      if (allowRes.ok) {
        const all: Allowance[] = await allowRes.json();
        // このキャストの分だけ絞る
        setAllowances(all.filter(a => String(a.cast_id) === String(castId)));
      }
    } else {
      setAllowances([]);
    }
    // 時給取得
    try {
      const wageRes = await fetch(`/api/cast-wage?cast_id=${castId}`);
      if (wageRes.ok) {
        const w = await wageRes.json();
        setHourlyWage(w.hourly_wage || null);
      }
    } catch {}
    setLoading(false);
  };

  const today = getDateStr(new Date());

  // 月の全日付
  const [y, m] = month.split("-").map(Number);
  const monthDates: string[] = [];
  { const d = new Date(y, m-1, 1); while (d.getMonth() === m-1) { monthDates.push(getDateStr(d)); d.setDate(d.getDate()+1); } }

  const calcDay = (date: string) => {
    const shift = shifts.find(s => s.date === date);
    const mins = shift ? calcMinutes(shift.start_time, shift.end_time) : 0;
    const baseWage = (hourlyWage && mins) ? Math.round(hourlyWage * mins / 60) : 0;
    const dayAllowances = allowances.filter(a => a.date === date);
    const allowanceTotal = dayAllowances.reduce((s, a) => s + a.amount, 0);
    return { shift, mins, baseWage, allowanceTotal, total: baseWage + allowanceTotal, dayAllowances };
  };

  const workedDates = monthDates.filter(d => { const r = calcDay(d); return r.shift || r.dayAllowances.length > 0; });

  const monthTotal = workedDates.reduce((acc, date) => {
    const d = calcDay(date);
    return { days: acc.days + (d.shift ? 1 : 0), mins: acc.mins + d.mins, base: acc.base + d.baseWage, allowance: acc.allowance + d.allowanceTotal, total: acc.total + d.total };
  }, { days: 0, mins: 0, base: 0, allowance: 0, total: 0 });

  // 週ごとにグループ化
  const weekGroups: Record<string, string[]> = {};
  for (const date of workedDates) {
    const wk = getWeekKey(date);
    if (!weekGroups[wk]) weekGroups[wk] = [];
    weekGroups[wk].push(date);
  }

  const toggleExpand = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  // 1日の明細行（タップ展開）
  const DayRow = ({ date }: { date: string }) => {
    const row = calcDay(date);
    const isToday = date === today;
    const expanded = expandedDates.has(date);
    const hasDetail = row.dayAllowances.length > 0;
    return (
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => hasDetail && toggleExpand(date)}
          style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: isToday ? "var(--accent)06" : "transparent", border: "none", cursor: hasDetail ? "pointer" : "default", textAlign: "left" as const }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              {fmtDate(date)}
              {isToday && <span style={{ fontSize: 9, background: "var(--accent)22", color: "var(--accent)", padding: "1px 5px", borderRadius: 4 }}>今日</span>}
              {hasDetail && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{expanded ? "▲" : "▼"}</span>}
            </div>
            {row.shift && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {row.shift.start_time.slice(0,5)} 〜 {row.shift.end_time.slice(0,5)}（{fmtH(row.mins)}）
                {row.baseWage > 0 && <span style={{ marginLeft: 6 }}>基本 ¥{row.baseWage.toLocaleString()}</span>}
              </div>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", flexShrink: 0 }}>
            ¥{row.total.toLocaleString()}
          </div>
        </button>
        {/* 展開：手当・控除明細 */}
        {expanded && hasDetail && (
          <div style={{ padding: "0 16px 12px", background: "var(--bg-input)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>手当・控除内訳</div>
            {row.dayAllowances.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)" }}>{a.label}</span>
                <span style={{ color: a.amount >= 0 ? "var(--online)" : "#ff4444", fontWeight: 700 }}>
                  {a.amount >= 0 ? "+" : ""}¥{a.amount.toLocaleString()}
                </span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: "var(--text-muted)" }}>日計</span>
              <span style={{ color: "var(--accent)" }}>¥{row.total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const btnStyle = (active: boolean) => ({
    flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer" as const,
    fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "var(--font)",
    background: active ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
    color: active ? "#fff" : "var(--text-secondary)",
  });

  return (
    <div>
      {/* 表示モード切替 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {([ ["day","日"], ["week","週"], ["month","月"] ] as [ViewMode,string][]).map(([v, label]) => (
          <button key={v} style={btnStyle(mode===v)} onClick={() => setMode(v)}>
            {label}払い
          </button>
        ))}
      </div>

      {/* 月ナビ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button onClick={() => { const d = new Date(month+"-01"); d.setMonth(d.getMonth()-1); setMonth(d.toISOString().slice(0,7)); }} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>← 前月</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1, textAlign: "center" as const }}>{month.replace("-","年")}月</span>
        <button onClick={() => { const d = new Date(month+"-01"); d.setMonth(d.getMonth()+1); setMonth(d.toISOString().slice(0,7)); }} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>次月 →</button>
        <button onClick={() => setMonth(new Date().toISOString().slice(0,7))} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>今月</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>読み込み中...</div>
      ) : (<>

        {/* 月合計サマリー */}
        <div style={{ background: "linear-gradient(135deg, var(--accent)22, var(--accent2)11)", border: "1px solid var(--accent)44", borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            {month.replace("-","年")}月 {mode === "day" ? "日払い" : mode === "week" ? "週払い" : "月払い"}合計
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "var(--accent)", marginBottom: 6 }}>
            ¥{monthTotal.total.toLocaleString()}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" as const }}>
            <span>📅 {monthTotal.days}日出勤</span>
            <span>⏱ {fmtH(monthTotal.mins)}</span>
            {monthTotal.base > 0 && <span>基本給 ¥{monthTotal.base.toLocaleString()}</span>}
            {monthTotal.allowance !== 0 && <span>手当 {monthTotal.allowance >= 0 ? "+" : ""}¥{monthTotal.allowance.toLocaleString()}</span>}
          </div>
        </div>

        {workedDates.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 16px", fontSize: 13 }}>
            この月の出勤記録がありません
          </div>
        ) : (<>

          {/* 日払い表示 */}
          {mode === "day" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>日別明細</div>
              {workedDates.map(date => <DayRow key={date} date={date} />)}
            </div>
          )}

          {/* 週払い表示 */}
          {mode === "week" && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
              {Object.entries(weekGroups).sort().map(([wk, dates]) => {
                const wTotal = dates.reduce((acc, d) => {
                  const r = calcDay(d);
                  return { days: acc.days + (r.shift ? 1 : 0), mins: acc.mins + r.mins, total: acc.total + r.total };
                }, { days: 0, mins: 0, total: 0 });
                return (
                  <div key={wk} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{getWeekLabel(wk)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{wTotal.days}日出勤 / {fmtH(wTotal.mins)}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "var(--accent)" }}>¥{wTotal.total.toLocaleString()}</div>
                    </div>
                    {dates.map(date => <DayRow key={date} date={date} />)}
                  </div>
                );
              })}
            </div>
          )}

          {/* 月払い表示 */}
          {mode === "month" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>日別明細</div>
              {workedDates.map(date => <DayRow key={date} date={date} />)}
            </div>
          )}

        </>)}
      </>)}
    </div>
  );
}
