"use client";
import { useState, useEffect } from "react";

type Props = { castAccountId: string; castId: string; castName: string };

export default function CastLinePanel({ castAccountId, castId, castName }: Props) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("line_success") === "1") setMsg("✅ LINE通知の連携が完了しました！");
    if (params.get("line_error") === "1") setMsg("❌ 連携に失敗しました。もう一度お試しください。");
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/cast-line?cast_account_id=${castAccountId}`);
    if (res.ok) {
      const d = await res.json();
      setConnected(d.connected);
    }
    setLoading(false);
  };

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
    if (!clientId) { alert("LINE連携の設定が完了していません。"); return; }
    const redirectUri = encodeURIComponent("https://www.night-vision.jp/api/cast-line/callback");
    const state = castAccountId;
    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile&bot_prompt=normal`;
    window.location.href = url;
  };

  const disconnect = async () => {
    if (!confirm("LINE通知の連携を解除しますか？")) return;
    await fetch("/api/cast-line", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_account_id: castAccountId }),
    });
    setConnected(false);
    setMsg("LINE連携を解除しました");
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 20 }}>読み込み中...</div>;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#06c755", marginBottom: 8 }}>💬 LINE通知連携</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.8 }}>
        LINEと連携すると以下の通知がLINEに届きます：<br/>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          ✦ 確定シフトのお知らせ<br/>
          ✦ 写真審査結果
        </span>
      </p>

      {connected ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#06c75518", border: "1px solid #06c75544", borderRadius: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "#06c755", fontSize: 14 }}>LINE通知が有効です</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>シフト確定などの通知がLINEに届きます</div>
            </div>
          </div>
          <button onClick={disconnect} style={{ padding: "8px 16px", borderRadius: 10, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 13, cursor: "pointer" }}>
            連携を解除する
          </button>
        </div>
      ) : (
        <div>
          <button onClick={handleConnect} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px 24px", borderRadius: 14, background: "#06c755", color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer" }}>
            <svg width="24" height="24" viewBox="0 0 44 44" fill="currentColor">
              <path d="M22 4C12.06 4 4 11.16 4 19.9c0 7.16 5.18 13.2 12.6 15.3l-1.6 5.8 6.7-3.7c.74.1 1.5.16 2.3.16 9.94 0 18-7.16 18-15.56S31.94 4 22 4z"/>
            </svg>
            LINEで連携する
          </button>
          <p style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 8, textAlign: "center" }}>
            LINEのログイン画面に移動します
          </p>
        </div>
      )}

      {msg && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: msg.includes("❌") || msg.includes("解除") ? "#ff444418" : "#06c75518",
          border: `1px solid ${msg.includes("❌") || msg.includes("解除") ? "#ff444444" : "#06c75544"}`,
          color: msg.includes("❌") || msg.includes("解除") ? "#ff4444" : "#06c755",
        }}>{msg}</div>
      )}
    </div>
  );
}
