"use client";
import { useState } from "react";
import Header from "@/components/Header";

type ReportType = "new_shop" | "closed_shop";

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType>("new_shop");
  const [shopName, setShopName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!shopName) { alert("店舗名を入力してください"); return; }
    setStatus("loading");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, shopName, instagram, note }),
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
    borderRadius: 10, color: "var(--text-primary)", fontSize: 14,
    outline: "none", fontFamily: "var(--font)",
  };

  if (status === "success") {
    return (
      <>
        <head><link rel="canonical" href="https://www.night-vision.jp/report" /></head>
      <Header />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
            ご報告ありがとうございます
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
            内容を確認して対応いたします。
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
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 6 }}>REPORT</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            店舗情報の報告
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            未掲載店舗の情報提供や、閉店済み店舗の報告をお待ちしています。
          </p>
        </div>

        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 24,
        }}>
          {/* 報告種別 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, display: "block" }}>報告の種類</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { key: "new_shop", label: "🆕 未掲載店舗の情報提供" },
                { key: "closed_shop", label: "🚫 閉店済み店舗の報告" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setReportType(t.key as ReportType)}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer",
                    fontWeight: reportType === t.key ? 700 : 500, fontSize: 12,
                    fontFamily: "var(--font)", transition: "all 0.15s",
                    background: reportType === t.key ? "var(--accent)22" : "var(--bg-input)",
                    border: "1.5px solid " + (reportType === t.key ? "var(--accent)" : "var(--border)"),
                    color: reportType === t.key ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              店舗名 *
            </label>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="例：スナック 花火" style={inputStyle} />
          </div>

          {reportType === "new_shop" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
                Instagram ID（任意）
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>@</span>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="アカウント名" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              備考（任意）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={reportType === "new_shop" ? "場所・業種など分かる情報があれば" : "閉店時期など分かる情報があれば"}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
            />
          </div>

          {status === "error" && (
            <p style={{ color: "#ff4444", fontSize: 13, marginBottom: 12 }}>
              送信に失敗しました。時間をおいて再度お試しください。
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            style={{
              width: "100%", padding: "14px",
              background: status === "loading" ? "var(--border-hover)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 16, fontWeight: 800, cursor: status === "loading" ? "not-allowed" : "pointer",
              fontFamily: "var(--font)",
            }}
          >{status === "loading" ? "送信中..." : "報告する"}</button>
        </div>
      </main>
    </>
  );
}