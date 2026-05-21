"use client";
import { useState, useEffect } from "react";

type Shift = { id: string; date: string; start_time: string; end_time: string };
type Allowance = { id: string; date: string; label: string; amount: number };

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

export default function CastPayrollPanel({ castId, castName }: { castId: string; castName: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [hourlyWage, setHourlyWage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [month]);

  const load = async () => {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const [shiftsRes, allowancesRes, castRes] = await Promise.all([
      fetch(`/api/cast-confirmed-shifts?cast_id=${castId}`),
      fetch(`/api/cast-allowances?cast_id=${castId}&month=${month}`),
      fetch(`/api/cast-allowances?cast_id=${castId}&get_cast=1`),
    ]);
    if (shiftsRes.ok) {
      const data = await shiftsRes.json();
      // 対象月のみ
      const monthStr = month;
      setShifts(data.filter((s: Shift) => s.date.startsWith(monthStr)));
    }
    if (allowancesRes.ok) setAllowances(await allowancesRes.json());
    setLoading(false);
  };

  // 月のカレンダー日付
  const [y, m] = month.split("-").map(Number);
  const monthDates: string[] = [];
  const d = new Date(y, m-1, 1);
  while (d.getMonth() === m-1) { monthDates.push(getDateStr(d)); d.setDate(d.getDate()+1); }

  const today = getDateStr(new Date());

  // 各日の計算
  const calcDay = (date: string) => {
    const shift = shifts.find(s => s.date === date);
    const mins = shift ? calcMinutes(shift.start_time, shift.end_time) : 0;
    const baseWage = (hourlyWage && mins) ? Math.round(hourlyWage * mins / 60) : 0;
    const dayAllowances = allowances.filter(a => a.date === date);
    const allowanceTotal = dayAllowances.reduce((s, a) => s + a.amount, 0);
    return { shift, mins, baseWage, allowanceTotal, total: baseWage + allowanceTotal, dayAllowances };
  };

  const monthTotal = monthDates.reduce((acc, date) => {
    const d = calcDay(date);
    return { days: acc.days + (d.shift ? 1 : 0), mins: acc.mins + d.mins, base: acc.base + d.baseWage, allowance: acc.allowance + d.allowanceTotal, total: acc.total + d.total };
  }, { days: 0, mins: 0, base: 0, allowance: 0, total: 0 });

  const workedDates = monthDates.filter(date => {
    const d = calcDay(date);
    return d.shift || d.dayAllowances.length > 0;
  });

  return (
    <div>
      {/* 月ナビ */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => { const d = new Date(month+"-01"); d.setMonth(d.getMonth()-1); setMonth(d.toISOString().slice(0,7)); }} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>← 前月</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{month.replace("-","年")}月</span>
        <button onClick={() => { const d = new Date(month+"-01"); d.setMonth(d.getMonth()+1); setMonth(d.toISOString().slice(0,7)); }} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>次月 →</button>
        <button onClick={() => setMonth(new Date().toISOString().slice(0,7))} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>今月</button>
      </div>

      {loading ? <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>読み込み中...</div> : (
        <>
          {/* 月合計カード */}
          <div style={{ background: "linear-gradient(135deg, var(--accent)22, var(--accent2)11)", border: "1px solid var(--accent)44", borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{month.replace("-","年")}月 合計</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", marginBottom: 8 }}>
              ¥{monthTotal.total.toLocaleString()}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
              <span>📅 {monthTotal.days}日出勤</span>
              <span>⏱ {fmtH(monthTotal.mins)}</span>
              {monthTotal.base > 0 && <span>基本給 ¥{monthTotal.base.toLocaleString()}</span>}
              {monthTotal.allowance !== 0 && <span>手当 {monthTotal.allowance >= 0 ? "+" : ""}¥{monthTotal.allowance.toLocaleString()}</span>}
            </div>
          </div>

          {/* 日別明細 */}
          {workedDates.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 16px", fontSize: 13 }}>
              この月の出勤記録がありません
            </div>
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>日別明細</div>
              {workedDates.map(date => {
                const row = calcDay(date);
                const isToday = date === today;
                return (
                  <div key={date} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: isToday ? "var(--accent)06" : "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "var(--accent)" : "var(--text-primary)" }}>
                          {fmtDate(date)}{isToday && <span style={{ fontSize: 9, marginLeft: 6, background: "var(--accent)22", color: "var(--accent)", padding: "1px 5px", borderRadius: 4 }}>今日</span>}
                        </div>
                        {row.shift && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {row.shift.start_time.slice(0,5)} 〜 {row.shift.end_time.slice(0,5)}（{fmtH(row.mins)}）
                            {row.baseWage > 0 && <span style={{ marginLeft: 8 }}>¥{row.baseWage.toLocaleString()}</span>}
                          </div>
                        )}
                        {row.dayAllowances.map(a => (
                          <div key={a.id} style={{ fontSize: 12, color: a.amount >= 0 ? "var(--online)" : "#ff4444", marginTop: 2 }}>
                            {a.label}：{a.amount >= 0 ? "+" : ""}¥{a.amount.toLocaleString()}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", flexShrink: 0 }}>
                        ¥{row.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
