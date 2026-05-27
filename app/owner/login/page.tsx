"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/shops";
import Header from "@/components/Header";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("メールアドレスとパスワードを入力してください"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/owner-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "メールアドレスまたはパスワードが違います");
        setLoading(false);
        return;
      }
      localStorage.setItem("owner_id", String(data.owner_id));
      localStorage.setItem("owner_shop_id", String(data.shop_id));
      localStorage.setItem("owner_email", data.email);
      localStorage.setItem("owner_shop_name", data.shop_name || "");
      router.push("/owner/dashboard");
    } catch {
      setError("ログインに失敗しました");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!resetEmail) { setResetMsg("メールアドレスを入力してください"); return; }
    setResetLoading(true);
    setResetMsg("");
    try {
      const { data } = await supabase
        .from("shop_owners")
        .select("id, shops(name)")
        .eq("email", resetEmail.toLowerCase().trim())
        .single();

      if (!data) {
        setResetMsg("このメールアドレスは登録されていません");
        setResetLoading(false);
        return;
      }

      // 新しいパスワードを生成
      const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

      await supabase.from("shop_owners").update({ password_hash: newPassword }).eq("id", data.id);

      // メールで送信
      await fetch("/api/reset-owner-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, password: newPassword, shopName: (data.shops as any)?.name }),
      });

      setResetMsg("新しいパスワードをメールで送信しました。");
    } catch {
      setResetMsg("エラーが発生しました。時間をおいて再度お試しください。");
    }
    setResetLoading(false);
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>🦉</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 900 }}>
              {mode === "login" ? "店舗管理画面" : "パスワード再発行"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
              釧路ナイトビジョン 掲載店舗専用
            </p>
          </div>

          {mode === "login" ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="example@email.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>パスワード</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="パスワードを入力" style={inputStyle} />
              </div>
              {error && (
                <div style={{
                  background: "#ff444418", border: "1px solid #ff444444",
                  borderRadius: 10, padding: "10px 14px", color: "#ff4444",
                  fontSize: 13, marginBottom: 16,
                }}>{error}</div>
              )}
              <button onClick={handleLogin} disabled={loading} style={{
                width: "100%", padding: "14px",
                background: loading ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", borderRadius: 12, color: "#fff",
                fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font)", marginBottom: 16,
              }}>{loading ? "ログイン中..." : "ログイン"}</button>
              <button
                onClick={() => setMode("reset")}
                style={{ width: "100%", background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
              >パスワードを忘れた方はこちら</button>
            </>
          ) : (
            <>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                登録済みのメールアドレスを入力してください。新しいパスワードをメールで送信します。
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>メールアドレス</label>
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  placeholder="example@email.com" style={inputStyle} />
              </div>
              {resetMsg && (
                <div style={{
                  background: resetMsg.includes("送信") ? "var(--online-bg)" : "#ff444418",
                  border: "1px solid " + (resetMsg.includes("送信") ? "var(--online-border)" : "#ff444444"),
                  borderRadius: 10, padding: "10px 14px",
                  color: resetMsg.includes("送信") ? "var(--online)" : "#ff4444",
                  fontSize: 13, marginBottom: 16,
                }}>{resetMsg}</div>
              )}
              <button onClick={handleReset} disabled={resetLoading} style={{
                width: "100%", padding: "14px",
                background: resetLoading ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", borderRadius: 12, color: "#fff",
                fontSize: 15, fontWeight: 800, cursor: resetLoading ? "not-allowed" : "pointer",
                fontFamily: "var(--font)", marginBottom: 16,
              }}>{resetLoading ? "送信中..." : "パスワードを再発行する"}</button>
              <button
                onClick={() => { setMode("login"); setResetMsg(""); }}
                style={{ width: "100%", background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
              >ログインに戻る</button>
            </>
          )}

          <p style={{ color: "var(--text-hint)", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 1.8 }}>
            ご不明な点はお問い合わせください。
          </p>
        </div>
      </main>
    </>
  );
}