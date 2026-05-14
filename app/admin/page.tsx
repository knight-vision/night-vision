"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/shops";

const ADMIN_PASSWORD = "nightvision2025";

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-input)", border: "1px solid var(--border-hover)",
  borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none",
  fontFamily: "var(--font)",
};

const btnStyle = {
  padding: "10px 20px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  fontFamily: "var(--font)",
};

const labelStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "block" };

type Shop = {
  id: number;
  slug: string;
  name: string;
  type: string;
  area: string;
  area_category: string;
  budget: string;
  open_hour: string;
  tel: string;
  description: string;
  instagram: string;
  plan: string;
  referred: boolean;
  closed_days: string;
  seats: number;
};

type Cast = {
  id: number;
  shop_id: number;
  name: string;
  age: number;
  comment: string;
  on_today: boolean;
  instagram: string;
};

const EMPTY_SHOP: Partial<Shop> = {
  slug: "", name: "", type: "スナック", area: "", area_category: "末広",
  budget: "", open_hour: "", tel: "", description: "", instagram: "",
  plan: "free", referred: false, closed_days: "", seats: 0,
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState<"shops" | "casts">("shops");
  const [shops, setShops] = useState<Shop[]>([]);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [editShop, setEditShop] = useState<Partial<Shop> | null>(null);
  const [editCast, setEditCast] = useState<Partial<Cast> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (authed) {
      fetchShops();
      fetchCasts();
    }
  }, [authed]);

  async function fetchShops() {
    const { data } = await supabase.from("shops").select("*").order("id");
    if (data) setShops(data);
  }

  async function fetchAddressSuggestions(query: string) {
    if (!query || query.length < 2) { setAddressSuggestions([]); return; }
    const { data } = await supabase.from("shops").select("area").ilike("area", `%${query}%`).limit(5);
    const areas = [...new Set((data ?? []).map((s) => s.area).filter(Boolean))];
    setAddressSuggestions(areas);
    setShowAddressSuggestions(areas.length > 0);
  }

  async function fetchCasts() {
    const { data } = await supabase.from("casts").select("*").order("shop_id");
    if (data) setCasts(data);
  }

  async function saveShop() {
    if (!editShop) return;
    setSaving(true);
    if (editShop.id) {
      await supabase.from("shops").update(editShop).eq("id", editShop.id);
    } else {
      await supabase.from("shops").insert(editShop);
    }
    await fetchShops();
    setEditShop(null);
    setMsg("保存しました");
    setTimeout(() => setMsg(""), 2000);
    setSaving(false);
  }

  async function issueOwnerAccount(shop: Shop) {
    const email = prompt("担当者のメールアドレスを入力してください：");
    if (!email) return;

    // ランダムパスワード生成
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    const { error } = await supabase.from("shop_owners").upsert({
      shop_id: shop.id,
      email: email.toLowerCase().trim(),
      password_hash: password,
    }, { onConflict: "email" });

    if (error) {
      alert("エラー: " + error.message);
      return;
    }

    // メールで通知
    await fetch("/api/issue-owner-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, shopName: shop.name }),
    });

    alert(`アカウントを発行しました。\nメール: ${email}\nパスワード: ${password}\n\n担当者にメールで送信しました。`);
  }

  async function saveCast() {
    if (!editCast) return;
    setSaving(true);
    if (editCast.id) {
      await supabase.from("casts").update(editCast).eq("id", editCast.id);
    } else {
      await supabase.from("casts").insert(editCast);
    }
    await fetchCasts();
    setEditCast(null);
    setMsg("保存しました");
    setTimeout(() => setMsg(""), 2000);
    setSaving(false);
  }

  async function toggleOnToday(cast: Cast) {
    await supabase.from("casts").update({ on_today: !cast.on_today }).eq("id", cast.id);
    await fetchCasts();
  }

  async function deleteShop(id: number) {
    if (!confirm("削除しますか？")) return;
    await supabase.from("shops").delete().eq("id", id);
    await fetchShops();
  }

  async function deleteCast(id: number) {
    if (!confirm("削除しますか？")) return;
    await supabase.from("casts").delete().eq("id", id);
    await fetchCasts();
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font)" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, width: 300, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🦉</div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 900, marginBottom: 20 }}>管理画面</h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pw === ADMIN_PASSWORD && setAuthed(true)}
            placeholder="パスワード"
            style={{ ...inputStyle, marginBottom: 12, textAlign: "center" }}
          />
          <button
            onClick={() => pw === ADMIN_PASSWORD ? setAuthed(true) : alert("パスワードが違います")}
            style={{ ...btnStyle, width: "100%" }}
          >ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              管理画面
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>KUSHIRO NIGHT VISION</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {msg && <span style={{ fontSize: 12, color: "var(--online)" }}>✓ {msg}</span>}
            <a href="/" style={{ fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "5px 12px", borderRadius: 20 }}>サイトへ</a>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { key: "shops", label: "店舗管理" },
            { key: "casts", label: "キャスト・出勤管理" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              padding: "8px 20px", borderRadius: 20, border: "none", cursor: "pointer",
              fontWeight: tab === t.key ? 700 : 500, fontSize: 13, fontFamily: "var(--font)",
              background: tab === t.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
              color: tab === t.key ? "#fff" : "var(--text-muted)",
            }}>{t.label}</button>
          ))}
        </div>

        {/* 店舗管理 */}
        {tab === "shops" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{shops.length}件</div>
              <button onClick={() => setEditShop({ ...EMPTY_SHOP })} style={btnStyle}>+ 店舗追加</button>
            </div>

            {editShop && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--accent)44", borderRadius: 16, padding: 20, marginBottom: 20 }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                  {editShop.id ? "店舗編集" : "新規店舗追加（お手伝いありがとう！！）"}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                    { key: "name", label: "店舗名 *" },
                    { key: "slug", label: "店舗名のローマ字（小文字）*" },
                    { key: "budget", label: "予算" },
                    { key: "open_hour", label: "営業時間" },
                    { key: "tel", label: "電話番号" },
                    { key: "instagram", label: "Instagram" },
                    { key: "closed_days", label: "定休日" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={labelStyle}>{f.label}</label>
                      <input
                        value={(editShop as any)[f.key] ?? ""}
                        onChange={(e) => setEditShop({ ...editShop, [f.key]: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  ))}

                  {/* 住所（補完付き） */}
                  <div style={{ position: "relative" }}>
                    <label style={labelStyle}>住所</label>
                    <input
                      value={editShop.area ?? ""}
                      onChange={(e) => {
                        setEditShop({ ...editShop, area: e.target.value });
                        fetchAddressSuggestions(e.target.value);
                      }}
                      onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                      style={inputStyle}
                    />
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0,
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 10, zIndex: 10, overflow: "hidden",
                      }}>
                        {addressSuggestions.map((addr) => (
                          <div key={addr}
                            onClick={() => { setEditShop({ ...editShop, area: addr }); setShowAddressSuggestions(false); }}
                            style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
                            {addr}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>業種 *</label>
                    <select value={editShop.type ?? "スナック"} onChange={(e) => setEditShop({ ...editShop, type: e.target.value })} style={inputStyle}>
                      <option>ラウンジ</option>
                      <option>ガールズバー</option>
                      <option>スナック</option>
                      <option>カジュアルバー</option>
                      <option>その他</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>エリア区分 *</label>
                    <select value={editShop.area_category ?? "末広"} onChange={(e) => setEditShop({ ...editShop, area_category: e.target.value })} style={inputStyle}>
                      <option>末広</option>
                      <option>愛国</option>
                      <option>その他</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>プラン *</label>
                    <select value={editShop.plan ?? "free"} onChange={(e) => setEditShop({ ...editShop, plan: e.target.value })} style={inputStyle}>
                      <option value="free">フリー</option>
                      <option value="standard">ゴールド</option>
                      <option value="premium">プレミアム</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>紹介プレミアム</label>
                    <select value={editShop.referred ? "true" : "false"} onChange={(e) => setEditShop({ ...editShop, referred: e.target.value === "true" })} style={inputStyle}>
                      <option value="false">なし</option>
                      <option value="true">あり</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>説明文</label>
                  <textarea
                    value={editShop.description ?? ""}
                    onChange={(e) => setEditShop({ ...editShop, description: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={saveShop} disabled={saving} style={btnStyle}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setEditShop(null)} style={{ ...btnStyle, background: "var(--bg-input)", color: "var(--text-muted)" }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shops.map((shop) => (
                <div key={shop.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{shop.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                      {shop.type} · {shop.area_category} · {shop.plan}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditShop(shop)} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "var(--bg-input)", color: "var(--text-secondary)" }}>編集</button>
                    <button onClick={() => deleteShop(shop.id)} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "#ff444420", color: "#ff4444" }}>削除</button>
                    <button onClick={() => issueOwnerAccount(shop)} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "#00994d20", color: "#00994d" }}>アカウント発行</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* キャスト・出勤管理 */}
        {tab === "casts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{casts.length}名</div>
              <button onClick={() => setEditCast({ shop_id: shops[0]?.id, name: "", age: 20, comment: "", on_today: false, instagram: "" })} style={btnStyle}>
                + キャスト追加
              </button>
            </div>

            {editCast && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--accent)44", borderRadius: 16, padding: 20, marginBottom: 20 }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                  {editCast.id ? "キャスト編集" : "新規キャスト追加"}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>所属店舗 *</label>
                    <select value={editCast.shop_id ?? ""} onChange={(e) => setEditCast({ ...editCast, shop_id: parseInt(e.target.value) })} style={inputStyle}>
                      {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>名前 *</label>
                    <input value={editCast.name ?? ""} onChange={(e) => setEditCast({ ...editCast, name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>年齢</label>
                    <input value={editCast.age ?? ""} onChange={(e) => setEditCast({ ...editCast, age: parseInt(e.target.value) })} style={inputStyle} type="number" />
                  </div>
                  <div>
                    <label style={labelStyle}>Instagram</label>
                    <input value={editCast.instagram ?? ""} onChange={(e) => setEditCast({ ...editCast, instagram: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>一言コメント</label>
                    <input value={editCast.comment ?? ""} onChange={(e) => setEditCast({ ...editCast, comment: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={saveCast} disabled={saving} style={btnStyle}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setEditCast(null)} style={{ ...btnStyle, background: "var(--bg-input)", color: "var(--text-muted)" }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* 店舗ごとにキャストをグループ表示 */}
            {shops.map((shop) => {
              const shopCasts = casts.filter((c) => c.shop_id === shop.id);
              if (shopCasts.length === 0) return null;
              return (
                <div key={shop.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                    {shop.name}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {shopCasts.map((cast) => (
                      <div key={cast.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            onClick={() => toggleOnToday(cast)}
                            style={{
                              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                              background: cast.on_today ? "var(--online)" : "var(--border-hover)",
                              position: "relative", transition: "background 0.2s",
                            }}
                          >
                            <span style={{
                              position: "absolute", top: 3, left: cast.on_today ? 22 : 3,
                              width: 18, height: 18, borderRadius: "50%", background: "#fff",
                              transition: "left 0.2s",
                            }} />
                          </button>
                          <div>
                            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>{cast.name}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 6 }}>{cast.age}歳</span>
                            <span style={{ color: cast.on_today ? "var(--online)" : "var(--text-hint)", fontSize: 11, marginLeft: 8 }}>
                              {cast.on_today ? "本日出勤" : "休み"}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditCast(cast)} style={{ ...btnStyle, padding: "4px 12px", fontSize: 11, background: "var(--bg-input)", color: "var(--text-secondary)" }}>編集</button>
                          <button onClick={() => deleteCast(cast.id)} style={{ ...btnStyle, padding: "4px 12px", fontSize: 11, background: "#ff444420", color: "#ff4444" }}>削除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}