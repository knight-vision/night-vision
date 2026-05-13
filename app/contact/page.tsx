"use client";
import { useState } from "react";
import Header from "@/components/Header";

export default function ContactPage() {
  const [form, setForm] = useState({
    type: "",
    shopName: "",
    contactName: "",
    contactEmail: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.type || !form.shopName || !form.contactName || !form.contactEmail || !form.message) {
      alert("必須項目を入力してください");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    background: "var(--bg-input)", border: "1px solid var(--border-hover)",
    borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none",
  };
  const labelStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" };
  const fieldStyle = { marginBottom: 16 };

  if (status === "success") {
    return (
      <>
        <Header />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
            お問い合わせを受け付けました
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
            内容確認後、3営業日以内にご連絡いたします。
          </p>
          <a href="/" style={{
            display: "inline-block", marginTop: 32, padding: "10px 24px", borderRadius: 20,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700,
          }}>トップに戻る</a>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 6 }}>CONTACT</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>お問い合わせ</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.8 }}>
            掲載情報の修正・削除のご依頼、その他お問い合わせはこちらから。<br />
            3営業日以内にご返信いたします。
          </p>
        </div>

        <div style={{
          background: "var(--bg-input)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 16, marginBottom: 28,
          fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8,
        }}>
          当サイトの掲載情報は公開情報をもとに作成しています。情報の修正・削除をご希望の店舗様はお気軽にご連絡ください。迅速に対応いたします。
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>お問い合わせ種別 <span style={{ color: "var(--accent)" }}>*</span></label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} style={inputStyle}>
            <option value="">選択してください</option>
            <option value="修正依頼">掲載情報の修正依頼</option>
            <option value="削除依頼">掲載情報の削除依頼</option>
            <option value="掲載申し込み">掲載・アップグレードの相談</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>店舗名 <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.shopName} onChange={(e) => set("shopName", e.target.value)} placeholder="例：スナック 花火" style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>お名前 <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="例：山田 太郎" style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>メールアドレス <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="例：example@email.com" style={inputStyle} type="email" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>お問い合わせ内容 <span style={{ color: "var(--accent)" }}>*</span></label>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="修正・削除希望の内容、その他ご要望をご記入ください"
            rows={5}
            style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={status === "loading"}
          style={{
            width: "100%", padding: "14px",
            background: status === "loading" ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
            border: "none", borderRadius: 12, color: "#fff",
            fontSize: 16, fontWeight: 800, cursor: status === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {status === "loading" ? "送信中..." : "送信する"}
        </button>

        {status === "error" && (
          <p style={{ color: "#ff4444", fontSize: 13, textAlign: "center", marginTop: 12 }}>
            送信に失敗しました。時間をおいて再度お試しください。
          </p>
        )}
      </main>
    </>
  );
}