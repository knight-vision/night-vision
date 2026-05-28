"use client";
import { useState, useEffect, memo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PREFECTURES, REGION_ORDER, getPrefecturesByRegion } from "@/lib/japan";
import { CITIES } from "@/lib/cities";

type Shop = { id: number; name: string; type: string; area: string; slug: string };

// コンポーネントを外に定義することでキーボードが閉じる問題を防ぐ
const RegisterForm = memo(function RegisterForm({
  shop, email, setEmail, tel, setTel, password, setPassword, password2, setPassword2,
  loading, error, onSubmit, onBack,
}: {
  shop: Shop; email: string; setEmail: (v:string)=>void;
  tel: string; setTel: (v:string)=>void;
  password: string; setPassword: (v:string)=>void;
  password2: string; setPassword2: (v:string)=>void;
  loading: boolean; error: string;
  onSubmit: ()=>void; onBack?: ()=>void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    background: "var(--bg-input)", border: "1px solid var(--border)",
    borderRadius: 10, color: "var(--text-primary)", fontSize: 16,
    outline: "none", boxSizing: "border-box", marginBottom: 12,
    fontFamily: "var(--font)",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" };

  return (
    <div>
      <div style={{ background: "var(--accent)15", border: "1px solid var(--accent)44", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 2 }}>登録するお店</div>
        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{shop.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{shop.type} · {shop.area}</div>
      </div>
      {error && (
        <div style={{ background: "#ff444418", border: "1px solid #ff444444", borderRadius: 10, padding: "10px 14px", color: "#ff4444", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <label style={labelStyle}>メールアドレス <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com" style={inputStyle} autoComplete="email" />
      <label style={labelStyle}>ご担当者様電話番号 <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="tel" value={tel} onChange={e => setTel(e.target.value)}
        placeholder="090-0000-0000" style={inputStyle} autoComplete="tel" />
      <label style={labelStyle}>パスワード（6文字以上） <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="••••••••" style={inputStyle} autoComplete="new-password" />
      <label style={labelStyle}>パスワード（確認） <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
        placeholder="••••••••" style={{ ...inputStyle, marginBottom: 20 }} autoComplete="new-password" />
      <button onClick={onSubmit} disabled={loading} style={{
        width: "100%", padding: "13px",
        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
        border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
        fontFamily: "var(--font)",
      }}>
        {loading ? "申請中..." : "登録を申請する"}
      </button>
      {onBack && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
            ← お店を選び直す
          </button>
        </div>
      )}
    </div>
  );
});

export default function JoinPage() {
  const params = useParams();
  const tokenRaw = params?.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : (tokenRaw as string | undefined);

  const [step, setStep] = useState<"loading"|"area"|"confirm"|"search"|"register"|"done">(token ? "loading" : "area");
  const [selectedPref, setSelectedPref] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [shop, setShop] = useState<Shop | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Shop[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.shop) { setShop(data.shop); setStep("confirm"); }
        else { setError(data.error || "無効なURLです"); setStep("search"); }
      });
  }, [token]);

  const searchShops = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearched(false); setError("");
    try {
      const res = await fetch(`/api/shop-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch(e: any) { setError("通信エラー: " + e.message); setSearchResults([]); }
    setSearching(false); setSearched(true);
  };

  const apply = async () => {
    if (!shop) return;
    if (!email || !password || !tel) { setError("すべての項目を入力してください"); return; }
    if (password !== password2) { setError("パスワードが一致しません"); return; }
    if (password.length < 6) { setError("パスワードは6文字以上で入力してください"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/invite/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token || null, shop_id: shop.id, email, password, tel }),
    });
    const data = await res.json();
    if (data.success) setStep("done");
    else setError(data.error || "申請に失敗しました");
    setLoading(false);
  };

  const cardStyle: React.CSSProperties = {
    width: "100%", maxWidth: 420,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 20, padding: "32px 24px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #12101a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={cardStyle}>
        {/* ロゴ */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 13, color: "var(--accent)", letterSpacing: 3, fontWeight: 700 }}>🦉 NIGHT VISION</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>NIGHT VISION</div>
          </Link>
        </div>

        {step === "loading" && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>読み込み中...</div>}

        {step === "confirm" && shop && (
          <>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, textAlign: "center" }}>お店の情報を確認</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 20, lineHeight: 1.7 }}>以下のお店の管理アカウントを申請します</div>
            <RegisterForm shop={shop} email={email} setEmail={setEmail} tel={tel} setTel={setTel}
              password={password} setPassword={setPassword} password2={password2} setPassword2={setPassword2}
              loading={loading} error={error} onSubmit={apply}
              onBack={() => setStep("search")} />
          </>
        )}

        {step === "area" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, textAlign: "center" }}>店舗会員登録</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 20 }}>まず店舗のエリアを選択してください</div>

            {/* 都道府県選択 */}
            <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>都道府県</label>
            <select
              value={selectedPref}
              onChange={e => { setSelectedPref(e.target.value); setSelectedCity(""); }}
              style={{ width: "100%", padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 16, outline: "none", marginBottom: 12, fontFamily: "var(--font)" }}
            >
              <option value="">選択してください</option>
              {REGION_ORDER.map(region => {
                const prefs = getPrefecturesByRegion()[region];
                if (!prefs) return null;
                return (
                  <optgroup key={region} label={region}>
                    {prefs.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </optgroup>
                );
              })}
            </select>

            {/* 市区町村選択（都道府県選択後） */}
            {selectedPref && (
              <>
                <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>市区町村・エリア</label>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 16, outline: "none", marginBottom: 16, fontFamily: "var(--font)" }}
                >
                  <option value="">選択してください</option>
                  {(PREFECTURES.find(p => p.key === selectedPref)?.cities || []).map(c => (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  ))}
                </select>
              </>
            )}

            <button
              onClick={() => setStep("search")}
              disabled={!selectedPref || !selectedCity}
              style={{
                width: "100%", padding: "14px", background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: !selectedPref || !selectedCity ? "not-allowed" : "pointer",
                opacity: !selectedPref || !selectedCity ? 0.5 : 1, fontFamily: "var(--font)",
              }}
            >次へ →</button>
          </>
        )}

        {step === "search" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, textAlign: "center" }}>店舗会員登録</div>
            {selectedPref && selectedCity && (() => {
              const pref = PREFECTURES.find(p => p.key === selectedPref);
              const city = pref?.cities.find(c => c.key === selectedCity);
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--accent)15", border: "1px solid var(--accent)33", borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--accent)" }}>📍 {pref?.name} › {city?.name}</span>
                  <button onClick={() => setStep("area")} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>変更</button>
                </div>
              );
            })()}
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 20 }}>お店の名前を入力して検索してください</div>
            {error && <div style={{ background: "#ff444418", border: "1px solid #ff444444", borderRadius: 10, padding: "10px 14px", color: "#ff4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchShops()}
                placeholder="例：ラウンジ光、スナック月..." style={{
                  flex: 1, padding: "12px 14px", background: "var(--bg-input)",
                  border: "1px solid var(--border)", borderRadius: 10,
                  color: "var(--text-primary)", fontSize: 16, outline: "none",
                }} />
              <button onClick={searchShops} disabled={searching} style={{
                padding: "0 16px", background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "var(--font)",
              }}>{searching ? "..." : "検索"}</button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>お店を選択してください</div>
                {searchResults.map(s => (
                  <div key={s.id} onClick={() => { setShop(s); setStep("register"); }}
                    style={{ padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.type} · {s.area}</div>
                  </div>
                ))}
              </div>
            )}
            {searched && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  {searchResults.length === 0 ? `「${searchQuery}」に一致するお店が見つかりませんでした` : "お店が一覧にない場合"}
                </div>
                <Link href="/apply" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", border: "1px solid var(--accent)44", padding: "8px 20px", borderRadius: 20, display: "inline-block" }}>
                  📝 新規掲載を申し込む →
                </Link>
              </div>
            )}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>すでにアカウントをお持ちの方</div>
              <Link href="/owner/login" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>ログインはこちら →</Link>
            </div>
          </>
        )}

        {step === "register" && shop && (
          <>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", marginBottom: 20, textAlign: "center" }}>店舗会員登録</div>
            <RegisterForm shop={shop} email={email} setEmail={setEmail} tel={tel} setTel={setTel}
              password={password} setPassword={setPassword} password2={password2} setPassword2={setPassword2}
              loading={loading} error={error} onSubmit={apply}
              onBack={() => { setStep("search"); setShop(null); }} />
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", marginBottom: 12 }}>申請を受け付けました</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.9, marginBottom: 24 }}>
              登録申請を受け付けました。<br />
              確認が完了次第、アカウントが有効化されます。
            </div>
            <Link href="/" style={{ display: "block", padding: "12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none" }}>
              トップページへ戻る
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
