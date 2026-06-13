"use client";
import { useState, useEffect } from "react";

type Tweet = { id: string; message: string; created_at: string; expires_at: string };
const MAX_CHARS = 15;

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60;
  if (diff < 1) return "たった今";
  if (diff < 60) return `${Math.floor(diff)}分前`;
  return `${Math.floor(diff / 60)}時間前`;
}
function timeLeft(expiresAt: string): string {
  const diff = (new Date(expiresAt).getTime() - Date.now()) / 1000 / 60;
  if (diff <= 0) return "期限切れ";
  if (diff < 60) return `あと${Math.floor(diff)}分`;
  return `あと${Math.floor(diff / 60)}時間${Math.floor(diff % 60)}分`;
}

type Props = {
  shopId: string;
  ownerId: string | null;
  sectionStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  btnPrimary: React.CSSProperties;
};

export default function TweetTab({ shopId, ownerId, sectionStyle, inputStyle, labelStyle, btnPrimary }: Props) {
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await fetch(`/api/tweet?shop_id=${shopId}`);
    if (res.ok) setTweet(await res.json());
  };

  const post = async () => {
    if (!message.trim()) return;
    setLoading(true); setMsg("");
    const res = await fetch("/api/tweet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, owner_id: ownerId, message: message.trim() }),
    });
    if (res.ok) { setMsg("投稿しました！店舗一覧のアイコンに3時間表示されます。"); setMessage(""); await load(); }
    else { const d = await res.json(); setMsg(d.error || "投稿に失敗しました"); }
    setLoading(false);
  };

  const deleteTweet = async () => {
    await fetch("/api/tweet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId, owner_id: ownerId }) });
    setTweet(null); setMsg("削除しました");
  };

  return (
    <div>
      {/* 説明 */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💬 つぶやき機能</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.8 }}>
          店舗一覧のアイコンに吹き出しで3時間表示されます。<br/>
          「今空いてます」「今夜限定イベント！」などリアルタイムな情報を投稿できます。
        </p>
      </div>

      {/* 現在のつぶやき */}
      {tweet && (
        <div style={{ ...sectionStyle, marginBottom: 16, borderColor: "var(--accent)44" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>📢 現在のつぶやき</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>「{tweet.message}」</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {timeAgo(tweet.created_at)} 投稿 · <span style={{ color: "var(--accent)" }}>{timeLeft(tweet.expires_at)}</span>
            </div>
            <button onClick={deleteTweet} style={{ padding: "4px 12px", borderRadius: 8, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 12, cursor: "pointer" }}>削除</button>
          </div>
        </div>
      )}

      {/* 投稿フォーム */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>つぶやき内容 <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11 }}>（{MAX_CHARS}文字以内）</span></label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={message}
              maxLength={MAX_CHARS}
              onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={e => e.key === "Enter" && post()}
              placeholder="例：今空いてます！　例：本日イベント開催中🎉"
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const, paddingRight: 50 }}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: message.length === MAX_CHARS ? "#ff4444" : "var(--text-muted)" }}>
              {message.length}/{MAX_CHARS}
            </span>
          </div>
        </div>
        <button onClick={post} disabled={loading || !message.trim()} style={{ ...btnPrimary as any, opacity: !message.trim() ? 0.5 : 1 }}>
          {loading ? "投稿中..." : tweet ? "🔄 上書き投稿（3時間）" : "💬 投稿する（3時間）"}
        </button>
        {msg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13,
            background: msg.includes("失敗") ? "#ff444418" : "var(--online-bg)",
            border: `1px solid ${msg.includes("失敗") ? "#ff444444" : "var(--online-border)"}`,
            color: msg.includes("失敗") ? "#ff4444" : "var(--online)",
          }}>{msg}</div>
        )}
      </div>
    </div>
  );
}
