"use client";
import { useState } from "react";
import Header from "@/components/Header";

const PLAN_INFO = [
  {
    key: "free",
    name: "フリープラン",
    price: "無料",
    color: "#10b981",
    features: [
      "店舗名・業種・エリア掲載",
      "営業時間・所在地表示",
      "キャスト登録・シフト管理",
    ],
  },
  {
    key: "standard",
    name: "スタンダードプラン",
    price: "月額 ¥3,000",
    color: "#a78bfa",
    features: [
      "フリーの全機能",
      "伝票・日次売上管理",
      "キャスト別売上・給与管理",
      "売上グラフ・CSV出力",
    ],
  },
  {
    key: "premium",
    name: "プレミアムプラン",
    price: "月額 ¥5,000",
    color: "#f472b6",
    features: [
      "フリーの全機能",
      "バナー写真・優先表示",
      "求人情報の掲載",
      "LINE通知",
    ],
  },
  {
    key: "pro",
    name: "プロプラン",
    price: "月額 ¥8,000",
    color: "#fbbf24",
    features: [
      "全プランの機能をすべて含む",
      "売上管理＋集客＋求人",
      "優先サポート",
    ],
    recommended: true,
  },
];

export default function ApplyPage() {
  const [form, setForm] = useState({
    shopName: "", address: "", shopTel: "",
    type: "", typeOther: "", area: "", areaOther: "",
    openHour: "", closedDays: "", seats: "",
    instagram: "", xAccount: "", tiktok: "", pr: "",
    contactName: "", contactEmail: "", contactTel: "",
    plan: "", notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.shopName || !form.address || !form.type || !form.area || !form.contactName || !form.contactEmail || !form.contactTel) {
      alert("必須項目を入力してください");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/apply", {
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
  const sectionStyle = { marginBottom: 32 };
  const h2Style = {
    fontSize: 14, fontWeight: 700, color: "var(--text-secondary)",
    letterSpacing: "0.1em", marginBottom: 16,
    paddingBottom: 8, borderBottom: "1px solid var(--border)",
  };

  if (status === "success") {
    return (
      <>
        <head><link rel="canonical" href="https://www.night-vision.jp/apply" /></head>
      <Header />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>申し込みを受け付けました</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
            ご入力いただいたメールアドレスに確認メールをお送りしました。<br />
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
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 6 }}>LISTING APPLICATION</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>掲載お申し込み</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            釧路ナイトビジョンへの掲載をご希望の方はこちらからお申し込みください。<br />
            内容確認後、3営業日以内にご連絡いたします。
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>店舗情報</h2>
          <div style={fieldStyle}>
            <label style={labelStyle}>店舗名 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.shopName} onChange={(e) => set("shopName", e.target.value)} placeholder="例：スナック 花火" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>所在地 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="例：釧路市末広町4-1-1" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>店舗電話番号 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.shopTel} onChange={(e) => set("shopTel", e.target.value)} placeholder="例：0154-XX-XXXX" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>業種 <span style={{ color: "var(--accent)" }}>*</span></label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} style={inputStyle}>
              <option value="">選択してください</option>
              <option value="ラウンジ">ラウンジ</option>
              <option value="ガールズバー">ガールズバー</option>
              <option value="スナック">スナック</option>
              <option value="カジュアルバー">カジュアルバー</option>
              <option value="other">その他</option>
            </select>
            {form.type === "other" && (
              <input value={form.typeOther} onChange={(e) => set("typeOther", e.target.value)} placeholder="業種を入力" style={{ ...inputStyle, marginTop: 8 }} />
            )}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>エリア <span style={{ color: "var(--accent)" }}>*</span></label>
            <select value={form.area} onChange={(e) => set("area", e.target.value)} style={inputStyle}>
              <option value="">選択してください</option>
              <option value="末広">末広エリア</option>
              <option value="愛国">愛国エリア</option>
              <option value="other">その他</option>
            </select>
            {form.area === "other" && (
              <input value={form.areaOther} onChange={(e) => set("areaOther", e.target.value)} placeholder="エリアを入力" style={{ ...inputStyle, marginTop: 8 }} />
            )}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>営業時間</label>
            <input value={form.openHour} onChange={(e) => set("openHour", e.target.value)} placeholder="例：20:00〜翌3:00" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>定休日</label>
            <input value={form.closedDays} onChange={(e) => set("closedDays", e.target.value)} placeholder="例：日曜日、祝日" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>席数</label>
            <input value={form.seats} onChange={(e) => set("seats", e.target.value)} placeholder="例：20" style={inputStyle} type="number" />
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>SNSアカウント（任意）</h2>
          {[
            { label: "Instagram", key: "instagram" },
            { label: "X（Twitter）", key: "xAccount" },
            { label: "TikTok", key: "tiktok" },
          ].map((sns) => (
            <div key={sns.key} style={fieldStyle}>
              <label style={labelStyle}>{sns.label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>@</span>
                <input
                  value={(form as any)[sns.key]}
                  onChange={(e) => set(sns.key, e.target.value)}
                  placeholder="アカウント名"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          ))}
          <div style={fieldStyle}>
            <label style={labelStyle}>一言PR（100文字以内）</label>
            <textarea
              value={form.pr}
              onChange={(e) => set("pr", e.target.value)}
              placeholder="お店の魅力を一言でアピールしてください"
              maxLength={100}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
            />
            <div style={{ fontSize: 11, color: "var(--text-hint)", textAlign: "right", marginTop: 4 }}>{form.pr.length}/100</div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>担当者情報</h2>
          <div style={fieldStyle}>
            <label style={labelStyle}>担当者氏名 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="例：山田 太郎" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>メールアドレス <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="例：example@email.com" style={inputStyle} type="email" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>電話番号 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input value={form.contactTel} onChange={(e) => set("contactTel", e.target.value)} placeholder="例：090-XXXX-XXXX" style={inputStyle} />
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>備考・要望（任意）</h2>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="ご質問・ご要望があればご記入ください"
            rows={4}
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
          {status === "loading" ? "送信中..." : "申し込みを送信する"}
        </button>

        {status === "error" && (
          <p style={{ color: "#ff4444", fontSize: 13, textAlign: "center", marginTop: 12 }}>
            送信に失敗しました。時間をおいて再度お試しください。
          </p>
        )}

        <p style={{ color: "var(--text-hint)", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 1.8 }}>
          送信後、ご入力のメールアドレスに確認メールをお送りします。<br />
          内容確認後、3営業日以内にご連絡いたします。
        </p>
      </main>
    </>
  );
}