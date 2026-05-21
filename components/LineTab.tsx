"use client";
import { useState, useEffect } from "react";

type Props = { shopId: string; sectionStyle: React.CSSProperties; btnPrimary: React.CSSProperties };

const BOT_BASIC_ID = "@734yebrt";

export default function LineTab({ shopId, sectionStyle, btnPrimary }: Props) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/line/connect?shop_id=${shopId}`);
    if (res.ok) { const d = await res.json(); setConnected(d.connected); }
    setLoading(false);
  };

  const issueToken = async () => {
    setTokenLoading(true);
    const res = await fetch("/api/line/connect", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId }),
    });
    if (res.ok) { const d = await res.json(); setToken(d.token); }
    setTokenLoading(false);
  };

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const disconnect = async () => {
    if (!confirm("LINE通知の連携を解除しますか？")) return;
    await fetch("/api/line/connect", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId }),
    });
    setConnected(false); setToken(null);
    setMsg("LINE連携を解除しました");
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 20 }}>読み込み中...</div>;

  return (
    <div>
      <div style={sectionStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#06c755", marginBottom: 8 }}>💬 LINE通知連携</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.8 }}>
          連携するとシフト申請・写真申請・求人応募などの通知がLINEに届きます。
        </p>

        {connected ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#06c75518", border: "1px solid #06c75544", borderRadius: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: "#06c755", fontSize: 14 }}>LINE通知が有効です</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>各種通知がLINEに届きます</div>
              </div>
            </div>
            <button onClick={disconnect} style={{ padding: "8px 16px", borderRadius: 10, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 13, cursor: "pointer" }}>
              連携を解除する
            </button>
          </div>
        ) : (
          <div>
            {/* ステップ1: 友達追加 */}
            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ background: "#06c755", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>公式アカウントを友だち追加</div>
                  <a href={`https://line.me/R/ti/p/${BOT_BASIC_ID}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#06c755", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                    <svg width="18" height="18" viewBox="0 0 44 44" fill="currentColor"><path d="M22 4C12.06 4 4 11.16 4 19.9c0 7.16 5.18 13.2 12.6 15.3l-1.6 5.8 6.7-3.7c.74.1 1.5.16 2.3.16 9.94 0 18-7.16 18-15.56S31.94 4 22 4z"/></svg>
                    友だち追加する
                  </a>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>すでに追加済みの場合はスキップ</div>
                </div>
              </div>

              {/* ステップ2: トークン発行 */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ background: token ? "#06c755" : "var(--accent)", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>連携コードを取得してLINEに送信</div>
                  {!token ? (
                    <button onClick={issueToken} disabled={tokenLoading} style={{ ...btnPrimary as any, padding: "8px 16px", fontSize: 13 }}>
                      {tokenLoading ? "生成中..." : "🔑 連携コードを発行する"}
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                        ⏰ このコードは10分間有効です
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 16px", background: "var(--bg-card)", border: "2px solid var(--accent)", borderRadius: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.2em", fontFamily: "monospace", flex: 1 }}>{token}</span>
                        <button onClick={copyToken} style={{ padding: "6px 14px", borderRadius: 8, background: copied ? "#06c75522" : "var(--accent)22", border: `1px solid ${copied ? "#06c75544" : "var(--accent)44"}`, color: copied ? "#06c755" : "var(--accent)", fontSize: 12, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" as const }}>
                          {copied ? "✅ コピー済み" : "コピー"}
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        上のコード（<strong style={{ color: "var(--accent)" }}>{token}</strong>）を<br/>
                        釧路ナイトビジョンのLINEトークルームに送信してください
                      </div>
                      <button onClick={issueToken} style={{ marginTop: 8, padding: "4px 12px", borderRadius: 6, background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        コードを再発行する
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
