"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Shop = { id: number; name: string; type: string; area: string; slug: string };

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const tokenRaw = params?.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : (tokenRaw as string | undefined);

  const [step, setStep] = useState<"loading"|"confirm"|"search"|"register"|"done">(token ? "loading" : "search");
  const [shop, setShop] = useState<Shop | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Shop[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [tel, setTel] = useState("");
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
    setSearching(true);
    setSearched(false);
    setError("");
    try {
      const res = await fetch(`/api/shop-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) && data.error) setError("検索エラー: " + data.error);
    } catch(e: any) {
      setError("通信エラー: " + e.message);
      setSearchResults([]);
    }
    setSearching(false);
    setSearched(true);
  };

  // 申請送信（即時登録ではなく管理者へ通知）
  const apply = async () => {
    if (!shop) return;
    if (!email || !password || !tel) { setError("すべての項目を入力してください"); return; }
    if (password !== password2) { setError("パスワードが一致しません"); return; }
    if (password.length < 6) { setError("パスワードは6文字以上で入力してください"); return; }
    if (!/^[\d\-\+\(\)\s]+$/.test(tel)) { setError("電話番号の形式が正しくありません"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/invite/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token || null, shop_id: shop.id, email, password, tel }),
    });
    const data = await res.json();
    if (data.success) {
      setStep("done");
    } else {
      setError(data.error || "申請に失敗しました");
    }
    setLoading(false);
  };

  const styles = {
    wrap: { minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #12101a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" } as React.CSSProperties,
    card: { width: "100%", maxWidth: 420, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 24px" } as React.CSSProperties,
    logo: { textAlign: "center" as const, marginBottom: 28 },
    title: { fontSize: 22, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, textAlign: "center" as const },
    sub: { fontSize: 13, color: "var(--text-muted)", textAlign: "center" as const, marginBottom: 24, lineHeight: 1.7 },
    label: { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" },
    input: { width: "100%", padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 12 },
    btn: { width: "100%", padding: "13px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    shopCard: { padding: "12px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", marginBottom: 8 } as React.CSSProperties,
    error: { background: "#ff444418", border: "1px solid #ff444444", borderRadius: 10, padding: "10px 14px", color: "#ff4444", fontSize: 13, marginBottom: 16 },
  };

  const RegisterForm = ({ title }: { title: string }) => (
    <>
      <div style={styles.title}>{title}</div>
      {shop && (
        <div style={{ background: "var(--accent)15", border: "1px solid var(--accent)44", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 2 }}>登録するお店</div>
          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{shop.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{shop.type} · {shop.area}</div>
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}
      <label style={styles.label}>メールアドレス <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={styles.input} />
      <label style={styles.label}>ご担当者様電話番号 <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="tel" value={tel} onChange={e => setTel(e.target.value)} placeholder="090-0000-0000" style={styles.input} />
      <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "rgba(251,191,36,0.9)", lineHeight: 1.6 }}>
        📞 本人確認のため、担当者より電話にてご連絡します。確認完了後にアカウントが有効化されます。
      </div>
      <label style={styles.label}>パスワード（6文字以上） <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={styles.input} />
      <label style={styles.label}>パスワード（確認） <span style={{ color: "#f472b6" }}>*</span></label>
      <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" style={{ ...styles.input, marginBottom: 20 }} />
      <button onClick={apply} disabled={loading} style={styles.btn}>
        {loading ? "申請中..." : "登録を申請する"}
      </button>
    </>
  );

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 13, color: "var(--accent)", letterSpacing: 3, fontWeight: 700 }}>🦉 NIGHT VISION</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>釧路ナイトビジョン</div>
          </Link>
        </div>

        {step === "loading" && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>読み込み中...</div>
        )}

        {step === "confirm" && shop && (
          <>
            <div style={styles.title}>お店の情報を確認</div>
            <div style={styles.sub}>以下のお店の管理アカウントを申請します</div>
            <div style={{ background: "var(--accent)15", border: "1px solid var(--accent)44", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text-primary)", marginBottom: 4 }}>{shop.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{shop.type} · {shop.area}</div>
            </div>
            <RegisterForm title="登録情報を入力" />
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => setStep("search")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                お店が違う場合はこちら
              </button>
            </div>
          </>
        )}

        {step === "search" && (
          <>
            <div style={styles.title}>店舗会員登録</div>
            <div style={styles.sub}>お店の名前を入力して検索してください</div>
            {error && <div style={styles.error}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchShops()}
                placeholder="例：ラウンジ光、Bar Moon..."
                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              />
              <button onClick={searchShops} disabled={searching} style={{ ...styles.btn, width: "auto", padding: "0 16px", fontSize: 13 }}>
                {searching ? "..." : "検索"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>お店を選択してください</div>
                {searchResults.map(s => (
                  <div key={s.id} style={styles.shopCard} onClick={() => { setShop(s); setStep("register"); }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.type} · {s.area}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 検索後は常に新規掲載ボタンを表示 */}
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
            <RegisterForm title="店舗会員登録" />
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={() => { setStep("search"); setShop(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>← お店を選び直す</button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
            <div style={styles.title}>申請を受け付けました</div>
            <div style={styles.sub}>
              担当者より <strong style={{ color: "var(--text-primary)" }}>{tel}</strong> へ<br />
              確認のお電話をいたします。<br />
              確認完了後にアカウントが有効化されます。
            </div>
            <Link href="/" style={{ display: "block", padding: "12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none" }}>
              トップページへ戻る
            </Link>
          </div>
        )}
      </div>    </div>
  );
}
