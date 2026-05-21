"use client";
import { useState } from "react";

export default function CastFeedbackPanel({ castId, shopId, castName }: { castId: string; shopId: string; castName: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const send = async () => {
    if (!message.trim()) return;
    setLoading(true); setMsg("");
    const res = await fetch("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_type: "cast", sender_id: castId, shop_id: shopId, message, sender_name: castName }),
    });
    if (res.ok) { setMsg("送信しました。ありがとうございます！"); setMessage(""); }
    else setMsg("送信に失敗しました");
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💬 ご意見・ご要望</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.8 }}>
        使いにくい点・機能追加のご希望など、なんでもお気軽にお送りください。
      </p>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="ご意見・ご要望をご自由にお書きください..."
        style={{ width: "100%", padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font)", resize: "vertical", minHeight: 120, boxSizing: "border-box" as const, marginBottom: 12 }} />
      <button onClick={send} disabled={loading || !message.trim()} style={{ width: "100%", padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)", opacity: !message.trim() ? 0.5 : 1 }}>
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
