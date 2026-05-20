"use client";
import { useState, useEffect } from "react";

type Cast = {
  id: number;
  name: string;
  shop_id: number;
  on_today: boolean;
};

type ShiftRequest = {
  id: string;
  cast_id: number;
  date: string;
  start_time: string;
  end_time: string;
  note: string;
  status: string;
  casts: { id: number; name: string };
};

type ConfirmedShift = {
  id: string;
  cast_id: number;
  date: string;
  start_time: string;
  end_time: string;
  casts: { id: number; name: string };
};

function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function getDates(n = 14): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 18);
const MINUTES = ["00", "10", "20", "30", "40", "50"];

function timeToLabel(h: number): string {
  if (h >= 24) return `翌${h - 24}時`;
  return `${h}時`;
}

// パステルカラー（キャストごと）
const CAST_COLORS = [
  "#ff6b9d", "#00d4ff", "#ffd700", "#a855f7", "#00e5a0",
  "#ff9500", "#00c7be", "#ff3b30", "#34aadc", "#4cd964",
];

type Props = {
  shopId: string;
  casts: Cast[];
  shiftRequests: ShiftRequest[];
  setShiftRequests: (v: ShiftRequest[]) => void;
  confirmedShifts: ConfirmedShift[];
  setConfirmedShifts: (v: ConfirmedShift[]) => void;
  shiftLoading: boolean;
  setShiftLoading: (v: boolean) => void;
  shiftMsg: string;
  setShiftMsg: (v: string) => void;
  castAccountEmail: Record<number, string>;
  setCastAccountEmail: (v: Record<number, string>) => void;
  issuingAccount: number | null;
  setIssuingAccount: (v: number | null) => void;
  shopName: string;
  sectionStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  btnPrimary: React.CSSProperties;
};

export default function ShiftManagementTab({
  shopId, casts, shiftRequests, setShiftRequests,
  confirmedShifts, setConfirmedShifts,
  shiftLoading, setShiftLoading, shiftMsg, setShiftMsg,
  castAccountEmail, setCastAccountEmail,
  issuingAccount, setIssuingAccount,
  shopName, sectionStyle, inputStyle, labelStyle, btnPrimary,
}: Props) {
  const [view, setView] = useState<"requests" | "confirm" | "accounts">("requests");
  // 確定シフト編集用ドラフト: { "cast_id:date" -> { start_time, end_time } }
  const [confirmDraft, setConfirmDraft] = useState<Record<string, { cast_id: number; date: string; start_time: string; end_time: string }>>({});
  const [loaded, setLoaded] = useState(false);

  const dates = getDates(14);

  useEffect(() => {
    if (!loaded) {
      loadShifts();
      setLoaded(true);
    }
  }, []);

  const loadShifts = async () => {
    setShiftLoading(true);
    const res = await fetch(`/api/confirm-shift?shop_id=${shopId}`);
    if (res.ok) {
      const data = await res.json();
      setShiftRequests(data.requests || []);
      setConfirmedShifts(data.confirmed || []);
    }
    setShiftLoading(false);
  };

  const getColor = (castId: number) => {
    const idx = casts.findIndex((c) => c.id === castId);
    return CAST_COLORS[idx % CAST_COLORS.length];
  };

  // 確定シフトをカレンダーにセット
  const addToConfirm = (castId: number, date: string, start_time = "20:00", end_time = "24:00") => {
    const key = `${castId}:${date}`;
    setConfirmDraft((prev) => ({
      ...prev,
      [key]: { cast_id: castId, date, start_time, end_time },
    }));
  };

  const removeFromConfirm = (castId: number, date: string) => {
    const key = `${castId}:${date}`;
    setConfirmDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateConfirmTime = (castId: number, date: string, field: "start_time" | "end_time", value: string) => {
    const key = `${castId}:${date}`;
    setConfirmDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleConfirm = async () => {
    const shifts = Object.values(confirmDraft);
    if (shifts.length === 0) { setShiftMsg("確定するシフトがありません"); return; }
    setShiftLoading(true);
    setShiftMsg("");
    const res = await fetch("/api/confirm-shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, shifts }),
    });
    if (res.ok) {
      setShiftMsg(`${shifts.length}件のシフトを確定しました。キャストにメールで通知しました。`);
      setConfirmDraft({});
      await loadShifts();
    } else {
      setShiftMsg("確定に失敗しました。");
    }
    setShiftLoading(false);
  };

  const handleDeleteConfirmed = async (castId: number, date: string) => {
    await fetch("/api/confirm-shift", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: castId, date }),
    });
    await loadShifts();
  };

  const handleIssueAccount = async (cast: Cast) => {
    const email = castAccountEmail[cast.id];
    if (!email) { setShiftMsg("メールアドレスを入力してください"); return; }
    setIssuingAccount(cast.id);
    const res = await fetch("/api/issue-cast-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: cast.id, email, shop_name: shopName }),
    });
    if (res.ok) {
      setShiftMsg(`${cast.name}にアカウントを発行しました。`);
      setCastAccountEmail({ ...castAccountEmail, [cast.id]: "" });
    } else {
      setShiftMsg("アカウント発行に失敗しました。");
    }
    setIssuingAccount(null);
  };

  // 希望シフトを確定ドラフトに取り込む
  const importRequest = (req: ShiftRequest) => {
    addToConfirm(req.cast_id, req.date, req.start_time?.slice(0, 5), req.end_time?.slice(0, 5));
  };

  const pendingRequests = shiftRequests.filter((r) => r.status === "pending");

  return (
    <div>
      {/* サブナビ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "requests", label: `📩 希望シフト${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` },
          { key: "confirm", label: "📅 シフト確定" },
          { key: "accounts", label: "🔑 アカウント管理" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key as any)}
            style={{
              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
              fontFamily: "var(--font)", fontSize: 13, fontWeight: view === v.key ? 700 : 500,
              background: view === v.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
              border: `1px solid ${view === v.key ? "transparent" : "var(--border)"}`,
              color: view === v.key ? "#fff" : "var(--text-secondary)",
            }}
          >{v.label}</button>
        ))}
        <button onClick={loadShifts} style={{
          padding: "8px 14px", borderRadius: 10, background: "var(--bg-input)",
          border: "1px solid var(--border)", color: "var(--text-muted)",
          fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
          marginLeft: "auto",
        }}>🔄 更新</button>
      </div>

      {shiftMsg && (
        <div style={{
          background: shiftMsg.includes("失敗") ? "#ff444418" : "var(--online-bg)",
          border: `1px solid ${shiftMsg.includes("失敗") ? "#ff444444" : "var(--online-border)"}`,
          borderRadius: 10, padding: "10px 16px",
          color: shiftMsg.includes("失敗") ? "#ff4444" : "var(--online)",
          fontSize: 13, marginBottom: 16,
        }}>{shiftMsg}</div>
      )}

      {shiftLoading && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>読み込み中...</div>
      )}

      {/* 希望シフト一覧 */}
      {view === "requests" && !shiftLoading && (
        <div>
          {pendingRequests.length === 0 ? (
            <div style={{ ...sectionStyle, textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
              未確認の希望シフトはありません
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingRequests.map((req) => {
                const color = getColor(req.cast_id);
                return (
                  <div key={req.id} style={{
                    ...sectionStyle, marginBottom: 0,
                    borderLeft: `3px solid ${color}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>
                          {req.casts?.name}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {formatDateJP(req.date)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {req.start_time?.slice(0, 5)} 〜 {req.end_time?.slice(0, 5)}
                        {req.note && <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>※{req.note}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => importRequest(req)}
                      style={{
                        padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                        background: "var(--accent)22", border: "1px solid var(--accent)55",
                        color: "var(--accent)", fontSize: 12, fontWeight: 700,
                        fontFamily: "var(--font)", flexShrink: 0,
                      }}
                    >確定へ追加</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 確定済み希望シフト */}
          {shiftRequests.filter((r) => r.status === "approved").length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 10 }}>確定済み</div>
              {shiftRequests.filter((r) => r.status === "approved").map((req) => {
                const color = getColor(req.cast_id);
                return (
                  <div key={req.id} style={{
                    ...sectionStyle, marginBottom: 8,
                    borderLeft: `3px solid ${color}`, opacity: 0.7,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{req.casts?.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{formatDateJP(req.date)}</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: 12, marginLeft: 8 }}>{req.start_time?.slice(0, 5)}〜{req.end_time?.slice(0, 5)}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--online)", background: "var(--online-bg)", border: "1px solid var(--online-border)", padding: "2px 8px", borderRadius: 10 }}>確定</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* シフト確定カレンダー */}
      {view === "confirm" && !shiftLoading && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.7 }}>
            各キャストの出勤日・時間帯を設定して「シフトを確定する」を押してください。<br />
            確定するとキャストにメールで通知されます。
          </div>

          {/* 確定済みシフトカレンダー */}
          {confirmedShifts.length > 0 && (
            <div style={{ ...sectionStyle, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>📌 確定済みシフト</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", minWidth: 60 }}>キャスト</th>
                      {dates.map((d) => (
                        <th key={d} style={{ padding: "6px 8px", textAlign: "center", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", minWidth: 52, whiteSpace: "nowrap" }}>
                          {formatDateJP(d)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {casts.map((cast) => {
                      const color = getColor(cast.id);
                      return (
                        <tr key={cast.id}>
                          <td style={{ padding: "8px 10px", color, fontWeight: 700, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                            {cast.name}
                          </td>
                          {dates.map((date) => {
                            const cs = confirmedShifts.find((s) => s.cast_id === cast.id && s.date === date);
                            return (
                              <td key={date} style={{ padding: "4px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                                {cs ? (
                                  <div style={{ position: "relative", display: "inline-block" }}>
                                    <div style={{
                                      background: `${color}22`, border: `1px solid ${color}66`,
                                      borderRadius: 6, padding: "2px 4px", fontSize: 10,
                                      color, minWidth: 44, textAlign: "center", lineHeight: 1.4,
                                    }}>
                                      <div>{cs.start_time?.slice(0, 5)}</div>
                                      <div>{cs.end_time?.slice(0, 5)}</div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteConfirmed(cast.id, date)}
                                      title="削除"
                                      style={{
                                        position: "absolute", top: -4, right: -4,
                                        background: "#ff4444", border: "none", borderRadius: "50%",
                                        width: 14, height: 14, color: "#fff", cursor: "pointer",
                                        fontSize: 8, lineHeight: "14px", textAlign: "center",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                      }}
                                    >✕</button>
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--border)" }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 新規確定シフト作成 */}
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
              ✏️ 新しいシフトを作成
            </div>

            {casts.map((cast) => {
              const color = getColor(cast.id);
              return (
                <div key={cast.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color, fontSize: 14, marginBottom: 8 }}>{cast.name}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {dates.map((date) => {
                      const key = `${cast.id}:${date}`;
                      const hasDraft = !!confirmDraft[key];
                      const hasConfirmed = confirmedShifts.some((s) => s.cast_id === cast.id && s.date === date);
                      const req = shiftRequests.find((r) => r.cast_id === cast.id && r.date === date);
                      return (
                        <div key={date} style={{ textAlign: "center" }}>
                          <button
                            onClick={() => hasDraft ? removeFromConfirm(cast.id, date) : addToConfirm(cast.id, date, req?.start_time?.slice(0, 5) || "20:00", req?.end_time?.slice(0, 5) || "24:00")}
                            style={{
                              padding: "6px 4px", borderRadius: 8, cursor: "pointer",
                              border: `1.5px solid ${hasDraft ? color : req ? color + "66" : "var(--border)"}`,
                              background: hasDraft ? `${color}22` : req ? `${color}11` : "var(--bg-input)",
                              color: hasDraft ? color : req ? color : "var(--text-muted)",
                              fontSize: 10, fontFamily: "var(--font)", width: 48,
                              fontWeight: hasDraft ? 700 : 400,
                            }}
                            title={req ? `希望: ${req.start_time?.slice(0, 5)}〜${req.end_time?.slice(0, 5)}` : ""}
                          >
                            {formatDateJP(date)}
                            {req && !hasDraft && <div style={{ fontSize: 8, marginTop: 1, opacity: 0.7 }}>希望</div>}
                            {hasConfirmed && !hasDraft && <div style={{ fontSize: 8, marginTop: 1 }}>確定済</div>}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* 選択した日の時間設定 */}
                  {Object.keys(confirmDraft).filter((k) => k.startsWith(`${cast.id}:`)).map((key) => {
                    const draft = confirmDraft[key];
                    return (
                      <div key={key} style={{
                        marginTop: 8, padding: "10px 12px",
                        background: `${color}11`, borderRadius: 10,
                        border: `1px solid ${color}44`,
                        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                      }}>
                        <span style={{ color, fontSize: 12, fontWeight: 700 }}>{formatDateJP(draft.date)}</span>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <select
                            value={draft.start_time.split(":")[0]}
                            onChange={(e) => updateConfirmTime(cast.id, draft.date, "start_time", `${e.target.value}:${draft.start_time.split(":")[1]}`)}
                            style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 } as React.CSSProperties}
                          >
                            {HOURS.map((h) => <option key={h} value={String(h % 24).padStart(2, "0")}>{timeToLabel(h)}</option>)}
                          </select>
                          <select
                            value={draft.start_time.split(":")[1]}
                            onChange={(e) => updateConfirmTime(cast.id, draft.date, "start_time", `${draft.start_time.split(":")[0]}:${e.target.value}`)}
                            style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 } as React.CSSProperties}
                          >
                            {MINUTES.map((m) => <option key={m} value={m}>{m}分</option>)}
                          </select>
                          <span style={{ color: "var(--text-muted)" }}>〜</span>
                          <select
                            value={draft.end_time.split(":")[0]}
                            onChange={(e) => updateConfirmTime(cast.id, draft.date, "end_time", `${e.target.value}:${draft.end_time.split(":")[1]}`)}
                            style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 } as React.CSSProperties}
                          >
                            {HOURS.map((h) => <option key={h} value={String(h % 24).padStart(2, "0")}>{timeToLabel(h)}</option>)}
                          </select>
                          <select
                            value={draft.end_time.split(":")[1]}
                            onChange={(e) => updateConfirmTime(cast.id, draft.date, "end_time", `${draft.end_time.split(":")[0]}:${e.target.value}`)}
                            style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 } as React.CSSProperties}
                          >
                            {MINUTES.map((m) => <option key={m} value={m}>{m}分</option>)}
                          </select>
                          <button
                            onClick={() => removeFromConfirm(cast.id, draft.date)}
                            style={{ background: "#ff444420", border: "1px solid #ff444444", color: "#ff4444", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}
                          >✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {Object.keys(confirmDraft).length > 0 && (
              <button
                onClick={handleConfirm}
                disabled={shiftLoading}
                style={{ ...btnPrimary, marginTop: 8 } as React.CSSProperties}
              >
                {shiftLoading ? "確定中..." : `${Object.keys(confirmDraft).length}件のシフトを確定してメール通知する`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* アカウント管理 */}
      {view === "accounts" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.7 }}>
            キャストがシフト希望を提出できるよう、アカウントを発行してください。<br />
            メールアドレスを入力して発行すると、ログイン情報がキャストに送信されます。
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {casts.map((cast) => (
              <div key={cast.id} style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "12px 0", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14, minWidth: 80 }}>
                  {cast.name}
                </div>
                <input
                  type="email"
                  value={castAccountEmail[cast.id] || ""}
                  onChange={(e) => setCastAccountEmail({ ...castAccountEmail, [cast.id]: e.target.value })}
                  placeholder="キャストのメールアドレス"
                  style={{ ...inputStyle, flex: 1, minWidth: 200, fontSize: 13 } as React.CSSProperties}
                />
                <button
                  onClick={() => handleIssueAccount(cast)}
                  disabled={issuingAccount === cast.id || !castAccountEmail[cast.id]}
                  style={{
                    padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                    fontFamily: "var(--font)", opacity: issuingAccount === cast.id || !castAccountEmail[cast.id] ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {issuingAccount === cast.id ? "発行中..." : "アカウント発行"}
                </button>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 16, lineHeight: 1.8 }}>
            ポータルURL: <a href="https://www.night-vision.jp/cast-login" style={{ color: "var(--accent)" }}>https://www.night-vision.jp/cast-login</a>
          </p>
        </div>
      )}
    </div>
  );
}
