"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

type ShiftRequest = {
  date: string;
  start_time: string;
  end_time: string;
  note: string;
};

type ExistingRequest = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  note: string;
  status: string;
};

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  // 今日から14日分
  for (let i = 0; i < 31; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateJP(d: Date): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 18); // 18〜30時（翌6時）
const MINUTES = ["00", "10", "20", "30", "40", "50"];

function timeToLabel(h: number): string {
  if (h >= 24) return `翌${h - 24}時`;
  return `${h}時`;
}

export default function CastPortalPage() {
  const router = useRouter();
  const [castId, setCastId] = useState<string | null>(null);
  const [castName, setCastName] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<ExistingRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, ShiftRequest>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const weekDates = getWeekDates(today);

  useEffect(() => {
    const id = localStorage.getItem("cast_id");
    const name = localStorage.getItem("cast_name");
    const sid = localStorage.getItem("cast_shop_id");
    if (!id) { router.push("/cast-login"); return; }
    setCastId(id);
    setCastName(name || "");
    setShopId(sid);
    fetchExisting(id);
  }, []);

  const fetchExisting = async (id: string) => {
    const res = await fetch(`/api/cast-shift-request?cast_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setExistingRequests(data);
    }
    setLoading(false);
  };

  const getExisting = (date: string) =>
    existingRequests.find((r) => r.date === date);

  const getDraft = (date: string): ShiftRequest =>
    draft[date] || { date, start_time: "20:00", end_time: "24:00", note: "" };

  const updateDraft = (date: string, field: keyof ShiftRequest, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [date]: { ...getDraft(date), [field]: value },
    }));
  };

  const isSelected = (date: string) => !!draft[date] || !!getExisting(date);

  const toggleDate = (date: string) => {
    if (draft[date]) {
      const next = { ...draft };
      delete next[date];
      setDraft(next);
    } else {
      const ex = getExisting(date);
      setDraft((prev) => ({
        ...prev,
        [date]: {
          date,
          start_time: ex?.start_time?.slice(0, 5) || "20:00",
          end_time: ex?.end_time?.slice(0, 5) || "24:00",
          note: ex?.note || "",
        },
      }));
    }
    setSelectedDate(date);
  };

  const handleSubmit = async () => {
    if (!castId || !shopId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const requests = Object.values(draft);
      const res = await fetch("/api/cast-shift-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cast_id: castId, shop_id: shopId, requests }),
      });
      if (res.ok) {
        setSaveMsg("シフト希望を送信しました！お店に通知されます。");
        setDraft({});
        fetchExisting(castId);
      } else {
        setSaveMsg("送信に失敗しました。もう一度お試しください。");
      }
    } catch {
      setSaveMsg("送信に失敗しました。");
    }
    setSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("cast_id");
    localStorage.removeItem("cast_account_id");
    localStorage.removeItem("cast_name");
    localStorage.removeItem("cast_shop_id");
    router.push("/cast-login");
  };

  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
    borderRadius: 8, color: "var(--text-primary)", fontSize: 13,
    outline: "none", fontFamily: "var(--font)", padding: "6px 10px",
  };

  if (loading) {
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
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 80px" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 4 }}>CAST PORTAL</div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)" }}>
              シフト希望提出
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{castName}</p>
          </div>
          <button onClick={handleLogout} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 10,
            color: "var(--text-muted)", fontSize: 12, padding: "6px 14px", cursor: "pointer",
          }}>ログアウト</button>
        </div>

        {/* 既存の希望シフト確認 */}
        {existingRequests.length > 0 && Object.keys(draft).length === 0 && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
              📋 提出済みのシフト希望
            </div>
            {existingRequests.map((r) => {
              const d = new Date(r.date + "T00:00:00");
              return (
                <div key={r.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}>
                  <span style={{ color: "var(--text-secondary)" }}>{formatDateJP(d)}</span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {r.start_time?.slice(0, 5)} 〜 {r.end_time?.slice(0, 5)}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: r.status === "approved" ? "var(--online-bg)" : r.status === "rejected" ? "#ff444418" : "var(--bg-input)",
                    color: r.status === "approved" ? "var(--online)" : r.status === "rejected" ? "#ff4444" : "var(--text-muted)",
                    border: `1px solid ${r.status === "approved" ? "var(--online-border)" : r.status === "rejected" ? "#ff444444" : "var(--border)"}`,
                  }}>
                    {r.status === "approved" ? "確定" : r.status === "rejected" ? "非採用" : "審査中"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 説明 */}
        <div style={{
          background: "var(--accent)11", border: "1px solid var(--accent)33",
          borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13,
          color: "var(--text-secondary)", lineHeight: 1.7,
        }}>
          出勤したい日付をタップして時間を設定し、「送信」してください。<br />
          お店に通知が届きます。
        </div>

        {/* 日付カレンダー */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 10 }}>
            DATE · 日付を選択（タップで追加/解除）
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {weekDates.map((d) => {
              const dateStr = formatDate(d);
              const selected = !!draft[dateStr];
              const existing = !!getExisting(dateStr);
              const isToday = dateStr === formatDate(today);
              const isSun = d.getDay() === 0;
              const isSat = d.getDay() === 6;
              return (
                <button
                  key={dateStr}
                  onClick={() => toggleDate(dateStr)}
                  style={{
                    padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${selected ? "var(--accent)" : existing ? "var(--online-border)" : "var(--border)"}`,
                    background: selected ? "var(--accent)22" : existing ? "var(--online-bg)" : "var(--bg-input)",
                    color: selected ? "var(--accent)" : existing ? "var(--online)" : isSun ? "#ff6b6b" : isSat ? "#6bb5ff" : "var(--text-secondary)",
                    fontWeight: selected || isToday ? 800 : 500,
                    fontSize: 11, textAlign: "center", fontFamily: "var(--font)",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2 }}>
                    {["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{d.getDate()}</div>
                  {isToday && (
                    <div style={{ fontSize: 8, marginTop: 2, color: "var(--accent)" }}>今日</div>
                  )}
                  {existing && !selected && (
                    <div style={{ fontSize: 8, marginTop: 2 }}>提出済</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 選択した日の時間設定 */}
        {Object.keys(draft).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 10 }}>
              TIME · 時間を設定
            </div>
            {Object.keys(draft).sort().map((dateStr) => {
              const d = new Date(dateStr + "T00:00:00");
              const req = getDraft(dateStr);
              return (
                <div key={dateStr} style={{
                  background: "var(--bg-card)", border: "1px solid var(--accent)44",
                  borderRadius: 14, padding: 16, marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>
                      {formatDateJP(d)}
                    </span>
                    <button onClick={() => toggleDate(dateStr)} style={{
                      background: "none", border: "1px solid var(--border)", borderRadius: 8,
                      color: "var(--text-muted)", fontSize: 11, padding: "3px 10px", cursor: "pointer",
                    }}>✕ 削除</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>出勤時刻</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={req.start_time.split(":")[0]}
                          onChange={(e) => updateDraft(dateStr, "start_time", `${e.target.value}:${req.start_time.split(":")[1]}`)}
                          style={inputStyle}
                        >
                          {HOURS.map((h) => (
                            <option key={h} value={String(h % 24).padStart(2, "0")}>
                              {timeToLabel(h)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={req.start_time.split(":")[1]}
                          onChange={(e) => updateDraft(dateStr, "start_time", `${req.start_time.split(":")[0]}:${e.target.value}`)}
                          style={inputStyle}
                        >
                          {MINUTES.map((m) => <option key={m} value={m}>{m}分</option>)}
                        </select>
                      </div>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 16 }}>〜</span>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>退勤時刻</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={req.end_time.split(":")[0]}
                          onChange={(e) => updateDraft(dateStr, "end_time", `${e.target.value}:${req.end_time.split(":")[1]}`)}
                          style={inputStyle}
                        >
                          {HOURS.map((h) => (
                            <option key={h} value={String(h % 24).padStart(2, "0")}>
                              {timeToLabel(h)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={req.end_time.split(":")[1]}
                          onChange={(e) => updateDraft(dateStr, "end_time", `${req.end_time.split(":")[0]}:${e.target.value}`)}
                          style={inputStyle}
                        >
                          {MINUTES.map((m) => <option key={m} value={m}>{m}分</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>メモ（任意）</div>
                    <input
                      type="text"
                      value={req.note}
                      onChange={(e) => updateDraft(dateStr, "note", e.target.value)}
                      placeholder="例：遅れる可能性あり"
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 送信ボタン */}
        {Object.keys(draft).length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%", padding: "14px",
              background: saving ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font)", marginBottom: 12,
            }}
          >
            {saving ? "送信中..." : `${Object.keys(draft).length}日分のシフト希望を送信`}
          </button>
        )}

        {saveMsg && (
          <div style={{
            background: saveMsg.includes("送信しました") ? "var(--online-bg)" : "#ff444418",
            border: `1px solid ${saveMsg.includes("送信しました") ? "var(--online-border)" : "#ff444444"}`,
            borderRadius: 10, padding: "12px 16px",
            color: saveMsg.includes("送信しました") ? "var(--online)" : "#ff4444",
            fontSize: 13, textAlign: "center",
          }}>{saveMsg}</div>
        )}
      </main>
    </>
  );
}
