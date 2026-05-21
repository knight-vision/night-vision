"use client";
import { useState } from "react";

type Props = { shopId: string; sectionStyle: React.CSSProperties; inputStyle: React.CSSProperties; btnPrimary: React.CSSProperties };

export default function FeedbackTab({ shopId, sectionStyle, inputStyle, btnPrimary }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const send = async () => {
    if (!message.trim()) return;
    setLoading(true); setMsg("");
    const res = await fetch("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_type: "owner", shop_id: shopId, message }),
    });
    if (res.ok) { setMsg("送信しました。ありがとうございます！"); setMessage(""); }
    else setMsg("送信に失敗しました");
    setLoading(false);
  };

  return (
    <div style={sectionStyle}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💬 ご意見・ご要望</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.8 }}>
        機能追加のご希望・使いにくい点・バグ報告など、なんでもお気軽にお送りください。<br/>
        いただいたご意見はサービス改善に活用させていただきます。
      </p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="ご意見・ご要望をご自由にお書きください..."
        style={{ width: "100%", padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font)", resize: "vertical", minHeight: 120, boxSizing: "border-box" as const, marginBottom: 12 }}
      />
      <button onClick={send} disabled={loading || !message.trim()} style={{ ...btnPrimary as any, opacity: !message.trim() ? 0.5 : 1 }}>
        {loading ? "送信中..." : "送信する"}
      </button>
      {msg && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: msg.includes("失敗") ? "#ff444418" : "var(--online-bg)",
          border: `1px solid ${msg.includes("失敗") ? "#ff444444" : "var(--online-border)"}`,
          color: msg.includes("失敗") ? "#ff4444" : "var(--online)",
        }}>{msg}</div>
      )}
    </div>
  );
}
