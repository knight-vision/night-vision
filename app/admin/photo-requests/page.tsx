"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/shops";
import Header from "@/components/Header";

type PhotoRequest = {
  id: number;
  shop_id: number;
  type: string;
  url: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
  shops: { name: string; slug: string } | null;
  shop_owners: { email: string } | null;
  casts: { name: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  banner: "バナー画像",
  icon: "アイコン画像",
  photos: "店内写真",
  cast_photo: "キャスト写真",
};

export default function PhotoRequestsPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (authed) fetchRequests();
  }, [authed]);

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from("photo_requests")
      .select("*, shops(name, slug), shop_owners(email), casts(name)")
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }

  async function handleAction(requestId: number, action: "approve" | "reject") {
    if (action === "reject" && !rejectReason[requestId]) {
      alert("却下理由を入力してください");
      return;
    }
    setProcessing(requestId);
    await fetch("/api/photo-request-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        action,
        rejectReason: rejectReason[requestId] ?? "",
      }),
    });
    await fetchRequests();
    setMsg(action === "approve" ? "承認しました" : "却下しました");
    setTimeout(() => setMsg(""), 3000);
    setProcessing(null);
  }

  const inputStyle = {
    width: "100%", padding: "8px 12px",
    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
    borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none",
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, width: 300, textAlign: "center" }}>
          <h1 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 900, marginBottom: 20 }}>管理者認証</h1>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pw === "nightvision2025" && setAuthed(true)}
            placeholder="パスワード" style={{ ...inputStyle, marginBottom: 12, textAlign: "center" }} />
          <button onClick={() => pw === "nightvision2025" ? setAuthed(true) : alert("違います")}
            style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            ログイン
          </button>
        </div>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const done = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 900 }}>写真申請管理</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {msg && <span style={{ fontSize: 12, color: "var(--online)" }}>✓ {msg}</span>}
            <a href="/admin" style={{ fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "5px 12px", borderRadius: 20 }}>← 管理画面</a>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>読み込み中...</div>
        ) : (
          <>
            {/* 審査待ち */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ color: "var(--accent)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                審査待ち ({pending.length}件)
              </h2>
              {pending.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20, textAlign: "center" }}>審査待ちの申請はありません</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {pending.map((req) => (
                    <div key={req.id} style={{
                      background: "var(--bg-card)", border: "1px solid var(--accent)33",
                      borderRadius: 14, padding: 20,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>{req.shops?.name || req.casts?.name || "不明"}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                            {TYPE_LABELS[req.type] || req.type}
                            {req.casts?.name && ` · キャスト: ${req.casts.name}`}
                            {req.shop_owners?.email && ` · ${req.shop_owners.email}`}
                          </div>
                          <div style={{ color: "var(--text-hint)", fontSize: 11, marginTop: 2 }}>
                            {new Date(req.created_at).toLocaleString("ja-JP")}
                          </div>
                        </div>
                        <span style={{
                          background: "#ffd70022", border: "1px solid #ffd70044",
                          color: "#ffd700", fontSize: 11, padding: "2px 10px", borderRadius: 10, height: "fit-content",
                        }}>審査待ち</span>
                      </div>

                      {/* 画像プレビュー */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>申請URL</div>
                        <a href={req.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "var(--accent2)", wordBreak: "break-all" }}>
                          {req.url}
                        </a>
                        {req.url.match(/\.(jpg|jpeg|png|gif|webp)/i) && (
                          <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", maxHeight: 200 }}>
                            <img src={req.url} alt="申請画像" style={{ width: "100%", objectFit: "cover", maxHeight: 200 }} />
                          </div>
                        )}
                      </div>

                      {/* 却下理由入力 */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>却下する場合は理由を入力</div>
                        <input
                          value={rejectReason[req.id] ?? ""}
                          onChange={(e) => setRejectReason({ ...rejectReason, [req.id]: e.target.value })}
                          placeholder="例：画像が不鮮明です。別の画像で再申請してください。"
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleAction(req.id, "approve")}
                          disabled={processing === req.id}
                          style={{
                            flex: 1, padding: "10px",
                            background: "linear-gradient(135deg, #00994d, #00cc66)",
                            border: "none", borderRadius: 10, color: "#fff",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                          }}
                        >✓ 承認する</button>
                        <button
                          onClick={() => handleAction(req.id, "reject")}
                          disabled={processing === req.id}
                          style={{
                            flex: 1, padding: "10px",
                            background: "#ff444420", border: "1px solid #ff444444",
                            borderRadius: 10, color: "#ff4444",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                          }}
                        >✕ 却下する</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 処理済み */}
            {done.length > 0 && (
              <div>
                <h2 style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  処理済み ({done.length}件)
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {done.map((req) => (
                    <div key={req.id} style={{
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: 12, padding: "12px 16px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{req.shops?.name || req.casts?.name || "不明"}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{TYPE_LABELS[req.type]}</div>
                        {req.reject_reason && (
                          <div style={{ color: "var(--text-hint)", fontSize: 11, marginTop: 2 }}>理由: {req.reject_reason}</div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, padding: "2px 10px", borderRadius: 10,
                        background: req.status === "approved" ? "var(--online-bg)" : "#ff444418",
                        border: "1px solid " + (req.status === "approved" ? "var(--online-border)" : "#ff444444"),
                        color: req.status === "approved" ? "var(--online)" : "#ff4444",
                      }}>
                        {req.status === "approved" ? "承認済み" : "却下済み"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}