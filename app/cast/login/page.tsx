"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function CastLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("メールアドレスとパスワードを入力してください"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cast-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "ログインに失敗しました"); setLoading(false); return; }

      localStorage.setItem("cast_account_id", data.castAccountId);
      localStorage.setItem("cast_id", String(data.castId));
      localStorage.setItem("cast_name", data.castName);
      localStorage.setItem("cast_shop_id", String(data.shopId));
      localStorage.setItem("cast_shop_name", data.shopName);
      router.push("/cast/dashboard");
    } catch {
      setError("ログインに失敗しました");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
    borderRadius: 12, color: "var(--text-primary)", fontSize: 15,
    outline: "none", fontFamily: "var(--font)",
  };

  return (
    <>
      <Header />
      <main style={{ maxWidth: 420, margin: "60px auto", padding: "0 16px" }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 32,
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💃</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 900 }}>
              キャスト専用ページ
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
              釧路ナイトビジョン キャスト用
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>メールアドレス</label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="example@email.com" style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>パスワード</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="お店から発行されたパスワード" style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: "#ff444418", border: "1px solid #ff444444",
              borderRadius: 10, padding: "10px 14px", color: "#ff4444",
              fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin} disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font)",
            }}
          >{loading ? "ログイン中..." : "ログイン"}</button>

          <p style={{ color: "var(--text-hint)", fontSize: 11, textAlign: "center", marginTop: 20, lineHeight: 1.8 }}>
            ログイン情報はお店のオーナーから発行されます。<br />
            不明な場合はお店にご確認ください。
          </p>
        </div>
      </main>
    </>
  );
}
