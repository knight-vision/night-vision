"use client";
import { useState, useEffect } from "react";

type Props = {
  shopId: string;
  sectionStyle: React.CSSProperties;
  btnPrimary: React.CSSProperties;
};

export default function LineTab({ shopId, sectionStyle, btnPrimary }: Props) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // LINE Bot のID（@から始まるID）
  const BOT_BASIC_ID = process.env.NEXT_PUBLIC_LINE_BOT_BASIC_ID || "@734yebrt";

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/line/connect?shop_id=${shopId}`);
    if (res.ok) {
      const d = await res.json();
      setConnected(d.connected);
    }
    setLoading(false);
  };

  const disconnect = async () => {
    if (!confirm("LINE通知の連携を解除しますか？")) return;
    await fetch("/api/line/connect", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId }),
    });
    setConnected(false);
    setMsg("LINE連携を解除しました");
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 20 }}>読み込み中...</div>;

  return (
    <div>
      <div style={sectionStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#06c755", marginBottom: 8 }}>
          💬 LINE通知連携
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.8 }}>
          LINE公式アカウントを友だち追加すると、以下の通知がLINEに届きます：<br/>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            ✦ キャストのシフト希望申請<br/>
            ✦ シフト変更・休み希望<br/>
            ✦ 写真申請（審査依頼）<br/>
            ✦ 求人への応募
          </span>
        </p>

        {connected ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#06c75518", border: "1px solid #06c75544", borderRadius: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: "#06c755", fontSize: 14 }}>LINE通知が有効です</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>シフト申請・写真申請などの通知がLINEに届きます</div>
              </div>
            </div>
            <button onClick={disconnect} style={{ padding: "8px 16px", borderRadius: 10, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 13, cursor: "pointer" }}>
              連携を解除する
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>連携手順</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ background: "#06c755", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>LINEで友だち追加</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>下のボタンから「釧路ナイトビジョン」を友だち追加してください</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ background: "#06c755", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>連携コードをトークに送信</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>友だち追加後、以下のコードをトークルームに送信してください</div>
                    <div style={{ marginTop: 8, padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.05em", fontFamily: "monospace" }}>
                        connect:{shopId}
                      </span>
                      <button onClick={() => {
                        navigator.clipboard.writeText(`connect:${shopId}`);
                        setMsg("コピーしました！");
                        setTimeout(() => setMsg(""), 2000);
                      }} style={{ padding: "4px 10px", borderRadius: 6, background: "var(--accent)22", border: "1px solid var(--accent)44", color: "var(--accent)", fontSize: 11, cursor: "pointer" }}>
                        コピー
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <a
              href={`https://line.me/R/ti/p/${BOT_BASIC_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 24px", borderRadius: 14, background: "#06c755", color: "#fff", fontWeight: 800, fontSize: 15, textDecoration: "none", marginBottom: 12 }}
            >
              <svg width="22" height="22" viewBox="0 0 44 44" fill="currentColor">
                <path d="M22 4C12.06 4 4 11.16 4 19.9c0 7.16 5.18 13.2 12.6 15.3l-1.6 5.8 6.7-3.7c.74.1 1.5.16 2.3.16 9.94 0 18-7.16 18-15.56S31.94 4 22 4z"/>
              </svg>
              友だち追加する
            </a>

            <button onClick={load} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
              🔄 連携状態を確認する
            </button>
          </div>
        )}

        {msg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13,
            background: msg.includes("解除") ? "#ff444418" : "var(--online-bg)",
            border: `1px solid ${msg.includes("解除") ? "#ff444444" : "var(--online-border)"}`,
            color: msg.includes("解除") ? "#ff4444" : "var(--online)",
          }}>{msg}</div>
        )}
      </div>
    </div>
  );
}
