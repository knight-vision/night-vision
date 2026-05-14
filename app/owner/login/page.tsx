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

  const handleLogin = async () => {
    if (!email || !password) { setError("メールアドレスとパスワードを入力してください"); return; }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("shop_owners")
        .select("*, shops(*)")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error || !data) { setError("メールアドレスまたはパスワードが違います"); setLoading(false); return; }

      // 簡易パスワード検証（平文比較）
      if (data.password_hash !== password) {
        setError("メールアドレスまたはパスワードが違います");
        setLoading(false);
        return;
      }

      // セッション保存
      localStorage.setItem("owner_id", String(data.id));
      localStorage.setItem("owner_shop_id", String(data.shop_id));
      localStorage.setItem("owner_email", data.email);
      router.push("/owner/dashboard");
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>🦉</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 900 }}>店舗管理画面</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
              釧路ナイトビジョン 掲載店舗専用
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="example@email.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="発行されたパスワードを入力"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: "#ff444418", border: "1px solid #ff444444",
              borderRadius: 10, padding: "10px 14px",
              color: "#ff4444", fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font)",
            }}
          >{loading ? "ログイン中..." : "ログイン"}</button>

          <p style={{ color: "var(--text-hint)", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 1.8 }}>
            ログイン情報はナイトビジョンから発行されます。<br />
            不明な場合はお問い合わせください。
          </p>
        </div>
      </main>
    </>
  );
}