"use client";
import { useState } from "react";

type Props = { jobId: string; jobTitle: string; shopName: string; shopSlug: string };

export default function JobApplyForm({ jobId, jobTitle, shopName, shopSlug }: Props) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", boxSizing: "border-box",
    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
    borderRadius: 10, color: "var(--text-primary)", fontSize: 14,
    outline: "none", fontFamily: "var(--font)",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 700,
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { setError("氏名とメールアドレスは必須です"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/job-apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, name, birthday, email, phone }),
    });
    if (res.ok) { setDone(true); }
    else { const d = await res.json(); setError(d.error || "送信に失敗しました"); }
    setLoading(false);
  };

  if (done) {
    return (
      <div style={{
        background: "var(--online-bg)", border: "1px solid var(--online-border)",
        borderRadius: 20, padding: "32px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: "var(--online)", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>応募が完了しました</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          {shopName}から折り返しご連絡いたします。<br/>
          確認メールを送信しましたのでご確認ください。
        </p>
        <a href={`/shop/${shopSlug}`} style={{
          display: "inline-block", padding: "10px 24px", borderRadius: 20,
          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
          color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none",
        }}>{shopName}のページへ戻る</a>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 20, padding: 24,
    }}>
      <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
        📨 この求人に応募する
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
        「{jobTitle}」への応募フォームです。<br/>
        入力後、お店のオーナーにメールで通知されます。
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>氏名 <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="山田 花子" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>生年月日</label>
          <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>メールアドレス <span style={{ color: "var(--accent)" }}>*</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>電話番号</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="090-0000-0000" style={inputStyle} />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444" }}>
          {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !name || !email} style={{
        width: "100%", marginTop: 20, padding: "14px",
        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
        border: "none", borderRadius: 12, color: "#fff",
        fontSize: 15, fontWeight: 800, cursor: loading || !name || !email ? "not-allowed" : "pointer",
        fontFamily: "var(--font)", opacity: !name || !email ? 0.6 : 1,
      }}>
        {loading ? "送信中..." : "応募する"}
      </button>
      <p style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 10, textAlign: "center" }}>
        応募内容はお店のオーナーに直接メールで通知されます
      </p>
    </div>
  );
}
