"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";

function DemoForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  useEffect(() => {
    if (sessionStorage.getItem("demo_authed")) {
      router.replace(redirect);
    }
  }, []);

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true); setError("");
    const res = await fetch("/api/demo-auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await res.json();
    if (d.ok) {
      sessionStorage.setItem("demo_authed", "1");
      sessionStorage.setItem("demo_role", d.role);
      router.replace(redirect);
    } else {
      setError(d.error || "パスワードが違います");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", background: "var(--bg-input)",
    border: "1px solid var(--border-hover)", borderRadius: 12,
    color: "var(--text-primary)", fontSize: 16, outline: "none",
    fontFamily: "var(--font)", boxSizing: "border-box", textAlign: "center",
  };

  return (
    <div style={{ width: "100%", maxWidth: 360, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🦉</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6 }}>プレビュー認証</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          このページはプレビュー限定です。<br />パスワードを入力してください。
        </div>
      </div>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleLogin()}
        placeholder="パスワード"
        style={inputStyle}
      />
      {error && <div style={{ color: "#ff4444", fontSize: 12, textAlign: "center", marginTop: 8 }}>{error}</div>}
      <button
        onClick={handleLogin}
        disabled={loading || !password}
        style={{
          width: "100%", marginTop: 16, padding: "14px",
          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
          border: "none", borderRadius: 12, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          opacity: (!password || loading) ? 0.5 : 1, fontFamily: "var(--font)",
        }}
      >{loading ? "確認中..." : "入る"}</button>
    </div>
  );
}

export default function DemoPage() {
  return (
    <>
      <Header />
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Suspense fallback={<div style={{ color: "var(--text-muted)" }}>読み込み中...</div>}>
          <DemoForm />
        </Suspense>
      </main>
    </>
  );
}
