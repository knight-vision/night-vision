"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

function PwaBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone;
    setIsIOS(ios);
    const dismissed = localStorage.getItem("pwa_banner_dismissed_cast");
    if (ios && !isStandalone && !dismissed) setShow(true);
  }, []);
  if (!isIOS || (window as any).navigator.standalone) return null;
  if (!show) return (
    <div style={{ padding: "6px 16px", display: "flex", justifyContent: "flex-end" }}>
      <button onClick={() => setShow(true)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
        📲 ホーム画面に追加
      </button>
    </div>
  );
  return (
    <div style={{ background: "#db277715", borderBottom: "1px solid #db277733", padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 24 }}>📲</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>ホーム画面に追加する方法</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            1. 画面下の <strong>□↑ 共有ボタン</strong> をタップ<br />
            2. <strong>「ホーム画面に追加」</strong> をタップ<br />
            3. 右上の「追加」をタップ
          </div>
        </div>
        <button onClick={() => { localStorage.setItem("pwa_banner_dismissed_cast", "1"); setShow(false); }}
          style={{ fontSize: 20, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}

type ShiftEntry = {
  date: string;
  start_time: string;
  end_time: string;
  note: string;
};

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

// 今日から14日分の日付を生成
function getDates(from: Date, days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const dow = DAY_LABELS[d.getDay()];
  return { label: `${mm}/${dd}（${dow}）`, isWeekend: d.getDay() === 0 || d.getDay() === 6 };
}

export default function CastDashboard() {
  const router = useRouter();
  const [castId, setCastId] = useState<number | null>(null);
  const [castName, setCastName] = useState("");
  const [shopId, setShopId] = useState<number | null>(null);
  const [shopName, setShopName] = useState("");

  const today = new Date();
  const dates = getDates(today, 14);

  const [shifts, setShifts] = useState<Record<string, ShiftEntry>>({});
  const [savedShifts, setSavedShifts] = useState<Record<string, ShiftEntry>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [submitMsg, setSubmitMsg] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("cast_id");
    const name = localStorage.getItem("cast_name");
    const sid = localStorage.getItem("cast_shop_id");
    const sname = localStorage.getItem("cast_shop_name");
    if (!id) { router.push("/cast/login"); return; }
    setCastId(Number(id));
    setCastName(name ?? "");
    setShopId(Number(sid));
    setShopName(sname ?? "");

    // 既存の希望シフトを取得
    const from = dates[0];
    const to = dates[dates.length - 1];
    fetch(`/api/shift-request?cast_id=${id}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, ShiftEntry> = {};
        data.forEach((s) => {
          map[s.date] = {
            date: s.date,
            start_time: s.start_time.slice(0, 5),
            end_time: s.end_time.slice(0, 5),
            note: s.note ?? "",
          };
        });
        setShifts(map);
        setSavedShifts(map);
      })
      .finally(() => setFetchLoading(false));
  }, []);

  const toggleDate = (date: string) => {
    setShifts((prev) => {
      const next = { ...prev };
      if (next[date]) {
        delete next[date];
      } else {
        next[date] = { date, start_time: "20:00", end_time: "02:00", note: "" };
      }
      return next;
    });
  };

  const updateShift = (date: string, key: keyof ShiftEntry, value: string) => {
    setShifts((prev) => ({
      ...prev,
      [date]: { ...prev[date], [key]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!castId || !shopId) return;
    setLoading(true);
    setSubmitMsg("");
    try {
      const payload = Object.values(shifts);
      const res = await fetch("/api/shift-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ castId, shopId, shifts: payload }),
      });
      if (res.ok) {
        setSavedShifts({ ...shifts });
        setSubmitMsg("✅ 希望シフトを送信しました！お店に通知されました。");
      } else {
        setSubmitMsg("❌ 送信に失敗しました。時間をおいて再度お試しください。");
      }
    } catch {
      setSubmitMsg("❌ 送信に失敗しました。");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("cast_account_id");
    localStorage.removeItem("cast_id");
    localStorage.removeItem("cast_name");
    localStorage.removeItem("cast_shop_id");
    localStorage.removeItem("cast_shop_name");
    router.push("/cast/login");
  };

  const selectedCount = Object.keys(shifts).length;

  const sectionStyle = {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 16, padding: 16, marginBottom: 12,
  };

  if (fetchLoading) {
    return (
      <>
        <Header />
        <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>読み込み中...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <PwaBanner />
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 4 }}>CAST PORTAL</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>
            シフト希望提出
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              💃 {castName}｜{shopName}
            </p>
            <button onClick={handleLogout} style={{
              background: "none", border: "1px solid var(--border)", color: "var(--text-hint)",
              padding: "4px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              fontFamily: "var(--font)",
            }}>ログアウト</button>
          </div>
        </div>

        {/* 説明 */}
        <div style={{ ...sectionStyle, background: "var(--accent)12", borderColor: "var(--accent)33" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            出勤したい日をタップして選択し、時間を設定してください。<br />
            最後に「希望シフトを送信」ボタンを押すとお店に通知されます。
          </p>
        </div>

        {/* カレンダー */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>
            日付を選択（今日から2週間）
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {dates.map((date) => {
              const { label, isWeekend } = formatDate(date);
              const selected = !!shifts[date];
              const isToday = date === today.toISOString().slice(0, 10);
              return (
                <button
                  key={date}
                  onClick={() => toggleDate(date)}
                  style={{
                    padding: "8px 2px", borderRadius: 10, cursor: "pointer",
                    border: "1.5px solid " + (selected ? "var(--accent)" : isToday ? "var(--accent)55" : "var(--border)"),
                    background: selected ? "var(--accent)" : isToday ? "var(--accent)12" : "var(--bg-input)",
                    color: selected ? "#fff" : isWeekend ? (selected ? "#fff" : "#ff6b9d") : "var(--text-secondary)",
                    fontSize: 11, fontWeight: selected ? 700 : 400,
                    fontFamily: "var(--font)", lineHeight: 1.3, textAlign: "center",
                  }}
                >
                  {label.split("（")[0]}<br />
                  <span style={{ fontSize: 10 }}>（{label.split("（")[1]}）</span>
                  {selected && <div style={{ fontSize: 10, marginTop: 2 }}>✓</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 時間設定 */}
        {Object.keys(shifts).sort().map((date) => {
          const shift = shifts[date];
          const { label } = formatDate(date);
          return (
            <div key={date} style={{ ...sectionStyle, borderColor: "var(--accent)44" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{label}</div>
                <button
                  onClick={() => toggleDate(date)}
                  style={{
                    background: "#ff444422", border: "1px solid #ff444444", color: "#ff4444",
                    padding: "3px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                    fontFamily: "var(--font)",
                  }}
                >削除</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>出勤時間</label>
                  <select
                    value={shift.start_time}
                    onChange={(e) => updateShift(date, "start_time", e.target.value)}
                    style={{
                      width: "100%", padding: "8px 10px",
                      background: "var(--bg-input)", border: "1px solid var(--border-hover)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14,
                      fontFamily: "var(--font)", outline: "none",
                    }}
                  >
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>退勤時間</label>
                  <select
                    value={shift.end_time}
                    onChange={(e) => updateShift(date, "end_time", e.target.value)}
                    style={{
                      width: "100%", padding: "8px 10px",
                      background: "var(--bg-input)", border: "1px solid var(--border-hover)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14,
                      fontFamily: "var(--font)", outline: "none",
                    }}
                  >
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>メモ（任意）</label>
                <input
                  type="text"
                  value={shift.note}
                  onChange={(e) => updateShift(date, "note", e.target.value)}
                  placeholder="例：遅れるかも、早退あり"
                  style={{
                    width: "100%", padding: "8px 10px",
                    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
                    borderRadius: 8, color: "var(--text-primary)", fontSize: 13,
                    fontFamily: "var(--font)", outline: "none", boxSizing: "border-box" as const,
                  }}
                />
              </div>
            </div>
          );
        })}

        {selectedCount === 0 && (
          <div style={{
            textAlign: "center", padding: "32px 0",
            color: "var(--text-muted)", fontSize: 14,
          }}>
            上のカレンダーから出勤希望日を選んでください
          </div>
        )}

        {/* 送信ボタン */}
        {selectedCount > 0 && (
          <div style={{ position: "sticky", bottom: 16 }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", padding: "16px",
                background: loading ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font)", boxShadow: "0 4px 20px var(--accent)44",
              }}
            >
              {loading ? "送信中..." : `希望シフトを送信（${selectedCount}日分）`}
            </button>
          </div>
        )}

        {submitMsg && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 12,
            background: submitMsg.startsWith("✅") ? "var(--online-bg)" : "#ff444418",
            border: "1px solid " + (submitMsg.startsWith("✅") ? "var(--online-border)" : "#ff444444"),
            color: submitMsg.startsWith("✅") ? "var(--online)" : "#ff4444",
            fontSize: 14, textAlign: "center",
          }}>
            {submitMsg}
          </div>
        )}
      </main>
    </>
  );
}
