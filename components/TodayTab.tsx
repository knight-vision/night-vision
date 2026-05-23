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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const todaySales = (dailySales?.cash_sales || 0) + (dailySales?.card_sales || 0);
  const todayCost = dailySales?.cost || 0;

  // キャスト給与計算
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
  const onTodayCasts = casts.filter(c => c.on_today === true);

  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日(${["日","月","火","水","木","金","土"][now.getDay()]})`;

  if (loading) return <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>読み込み中...</div>;

  return (
    <div>
      {/* 日時ヘッダー */}
      <div style={{ textAlign: "center", marginBottom: 20, padding: "16px 0" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{dateStr}</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "var(--text-primary)", letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>{timeStr}</div>
      </div>

      {/* 売上サマリー */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ ...sectionStyle, marginBottom: 0, textAlign: "center" as const }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>本日売上</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent)" }}>
            {todaySales > 0 ? `¥${todaySales.toLocaleString()}` : "—"}
          </div>
          {dailySales && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {dailySales.cash_sales > 0 && `現金 ¥${dailySales.cash_sales.toLocaleString()} `}
              {dailySales.card_sales > 0 && `カード ¥${dailySales.card_sales.toLocaleString()}`}
            </div>
          )}
        </div>
        <div style={{ ...sectionStyle, marginBottom: 0, textAlign: "center" as const }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>純利益</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: todayProfit > 0 ? "var(--online)" : todaySales > 0 ? "#ff4444" : "var(--text-muted)" }}>
            {todaySales > 0 ? `¥${todayProfit.toLocaleString()}` : "—"}
          </div>
          {todaySales > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              人件費 ¥{todayPayroll.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* 伝票入力へのクイックアクセス */}
      <button
        onClick={() => setTab("sales")}
        style={{ ...btnPrimary as React.CSSProperties, marginBottom: 16, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        📋 伝票を入力する
      </button>

      {/* 本日の出勤キャスト */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>本日の出勤キャスト</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            確定シフト {todayShiftCasts.length}名 / 出勤中 {onTodayCasts.length}名
          </div>
        </div>

        {todayShiftCasts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0", fontSize: 13 }}>
            本日の確定シフトがありません
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setTab("shift")} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "1px solid var(--accent)44", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
                出勤管理へ →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayShiftCasts.map(cast => {
              const pay = calcCastPay(cast);
              const myCastSales = castSales.filter(s => s.cast_id === cast.id);
              const isOnToday = cast.on_today === true;
              return (
                <div key={cast.id} style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: isOnToday ? "var(--online-bg)" : "var(--bg-input)",
                  border: `1px solid ${isOnToday ? "var(--online-border)" : "var(--border)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{cast.name}</span>
                      {isOnToday && <span style={{ fontSize: 10, color: "var(--online)", background: "var(--online-bg)", border: "1px solid var(--online-border)", borderRadius: 6, padding: "1px 6px" }}>出勤中</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>
                      ¥{pay.total.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                    {pay.shift && <span>{fmtTime(pay.shift.start_time)}〜{fmtTime(pay.shift.end_time)}</span>}
                    {pay.base > 0 && <span>基本給 ¥{pay.base.toLocaleString()}</span>}
                    {myCastSales.filter(s => s.sales_type !== "bottle").map(s => {
                      const labels: Record<string, string> = { honshimei:"⭐本指名", baai:"🎯場内", douhan:"🚗同伴" };
                      return <span key={s.cast_id + s.sales_type} style={{ color: "var(--accent)" }}>{labels[s.sales_type] || s.sales_type} ¥{s.amount.toLocaleString()}</span>;
                    })}
                    {pay.bottle > 0 && <span style={{ color: "#a855f7" }}>🍾¥{pay.bottle.toLocaleString()}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 今日のキャスト売上 */}
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
          { label: "📅 出勤管理", tab: "shift" },
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
