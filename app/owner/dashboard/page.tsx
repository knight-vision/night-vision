"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/shops";
import Header from "@/components/Header";

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
  tags: string[];
  instagram: string | null;
  x_account: string | null;
  tiktok_account: string | null;
  image: string | null;
  icon: string | null;
  system: string | null;
  closed_days: string | null;
  seats: number | null;
};

type Cast = {
  id: number;
  shop_id: number;
  name: string;
  age: number;
  comment: string;
  on_today: boolean;
  instagram: string | null;
  birthplace: string | null;
};

type Tab = "basic" | "sns" | "photo" | "cast" | "password";

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-input)", border: "1px solid var(--border-hover)",
  borderRadius: 10, color: "var(--text-primary)", fontSize: 14,
  outline: "none", fontFamily: "var(--font)",
};

const labelStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block" };
const fieldStyle = { marginBottom: 16 };
const sectionStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 16, padding: 20, marginBottom: 16,
};

export default function OwnerDashboard() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [tab, setTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editCast, setEditCast] = useState<Partial<Cast> | null>(null);

  // 写真申請
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoType, setPhotoType] = useState<"banner" | "icon" | "photos">("banner");
  const [photoMsg, setPhotoMsg] = useState("");

  // パスワード変更
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("owner_id");
    const sid = localStorage.getItem("owner_shop_id");
    if (!id || !sid) { router.push("/owner/login"); return; }
    setOwnerId(id);
    setShopId(sid);
    fetchShop(parseInt(sid));
    fetchCasts(parseInt(sid));
  }, []);

  async function fetchShop(sid: number) {
    const { data } = await supabase.from("shops").select("*").eq("id", sid).single();
    if (data) setShop(data);
  }

  async function fetchCasts(sid: number) {
    const { data } = await supabase.from("casts").select("*").eq("shop_id", sid).order("id");
    if (data) setCasts(data);
  }

  async function saveBasic() {
    if (!shop) return;
    setSaving(true);
    await supabase.from("shops").update({
      name: shop.name,
      area: shop.area,
      area_category: shop.area_category,
      budget: shop.budget,
      open_hour: shop.open_hour,
      tel: shop.tel,
      description: shop.description,
      tags: shop.tags,
      system: shop.system,
      closed_days: shop.closed_days,
      seats: shop.seats,
    }).eq("id", shop.id);
    showMsg("保存しました");
    setSaving(false);
  }

  async function saveSns() {
    if (!shop) return;
    setSaving(true);
    await supabase.from("shops").update({
      instagram: shop.instagram,
      x_account: shop.x_account,
      tiktok_account: shop.tiktok_account,
    }).eq("id", shop.id);
    showMsg("保存しました");
    setSaving(false);
  }

  async function submitPhotoRequest() {
    if (!photoUrl || !shopId || !ownerId) { setPhotoMsg("URLを入力してください"); return; }
    setSaving(true);
    await supabase.from("photo_requests").insert({
      shop_id: parseInt(shopId),
      owner_id: parseInt(ownerId),
      type: photoType,
      url: photoUrl,
      status: "pending",
    });
    // 管理者にメール通知
    await fetch("/api/photo-request-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName: shop?.name, photoType, url: photoUrl }),
    });
    setPhotoUrl("");
    setPhotoMsg("申請しました。審査後にメールでご連絡します。");
    setSaving(false);
  }

  async function saveCast() {
    if (!editCast || !shopId) return;
    setSaving(true);
    if (editCast.id) {
      await supabase.from("casts").update({
        name: editCast.name,
        age: editCast.age,
        comment: editCast.comment,
        instagram: editCast.instagram,
        birthplace: editCast.birthplace,
      }).eq("id", editCast.id);
    } else {
      await supabase.from("casts").insert({
        shop_id: parseInt(shopId),
        name: editCast.name,
        age: editCast.age,
        comment: editCast.comment,
        instagram: editCast.instagram,
        birthplace: editCast.birthplace,
        on_today: false,
      });
    }
    await fetchCasts(parseInt(shopId));
    setEditCast(null);
    showMsg("保存しました");
    setSaving(false);
  }

  async function toggleOnToday(cast: Cast) {
    await supabase.from("casts").update({ on_today: !cast.on_today }).eq("id", cast.id);
    await fetchCasts(parseInt(shopId!));
  }

  async function deleteCast(id: number) {
    if (!confirm("削除しますか？")) return;
    await supabase.from("casts").delete().eq("id", id);
    await fetchCasts(parseInt(shopId!));
  }

  async function changePassword() {
    if (!newPassword || newPassword !== newPassword2) { setPwMsg("パスワードが一致しません"); return; }
    if (newPassword.length < 8) { setPwMsg("8文字以上で入力してください"); return; }
    setSaving(true);
    await supabase.from("shop_owners").update({ password_hash: newPassword }).eq("id", parseInt(ownerId!));
    setNewPassword("");
    setNewPassword2("");
    setPwMsg("パスワードを変更しました");
    setSaving(false);
  }

  function showMsg(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  }

  const handleLogout = () => {
    localStorage.removeItem("owner_id");
    localStorage.removeItem("owner_shop_id");
    localStorage.removeItem("owner_email");
    router.push("/owner/login");
  };

  if (!shop) return (
    <div>
      <Header />
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>読み込み中...</div>
    </div>
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "basic", label: "基本情報" },
    { key: "sns", label: "SNS" },
    { key: "photo", label: "写真申請" },
    { key: "cast", label: "キャスト" },
    { key: "password", label: "パスワード" },
  ];

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 4 }}>OWNER DASHBOARD</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 900 }}>{shop.name}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {msg && <span style={{ fontSize: 12, color: "var(--online)" }}>✓ {msg}</span>}
            <button onClick={handleLogout} style={{
              background: "var(--bg-input)", border: "1px solid var(--border)",
              color: "var(--text-muted)", padding: "6px 14px", borderRadius: 20,
              fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
            }}>ログアウト</button>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, minWidth: 80, padding: "8px 6px", borderRadius: 10,
              fontWeight: tab === t.key ? 700 : 500, fontSize: 12,
              fontFamily: "var(--font)", cursor: "pointer",
              background: tab === t.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
              border: "1px solid " + (tab === t.key ? "transparent" : "var(--border)"),
              color: tab === t.key ? "#fff" : "var(--text-secondary)",
            }}>{t.label}</button>
          ))}
        </div>

        {/* 基本情報 */}
        {tab === "basic" && (
          <div style={sectionStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>店舗名</label>
              <input value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>所在地</label>
              <input value={shop.area ?? ""} onChange={(e) => setShop({ ...shop, area: e.target.value })} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>エリア区分</label>
              <select value={shop.area_category ?? "末広"} onChange={(e) => setShop({ ...shop, area_category: e.target.value })} style={inputStyle}>
                <option value="末広">末広</option>
                <option value="愛国">愛国</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>営業時間</label>
              <input value={shop.open_hour ?? ""} onChange={(e) => setShop({ ...shop, open_hour: e.target.value })} placeholder="例：20:00〜翌3:00" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>定休日</label>
              <input value={shop.closed_days ?? ""} onChange={(e) => setShop({ ...shop, closed_days: e.target.value })} placeholder="例：日曜日" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>予算目安</label>
              <input value={shop.budget ?? ""} onChange={(e) => setShop({ ...shop, budget: e.target.value })} placeholder="例：3,000〜5,000円" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>席数</label>
              <input type="number" value={shop.seats ?? ""} onChange={(e) => setShop({ ...shop, seats: parseInt(e.target.value) || null })} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>電話番号</label>
              <input value={shop.tel ?? ""} onChange={(e) => setShop({ ...shop, tel: e.target.value })} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>店舗説明文</label>
              <textarea value={shop.description ?? ""} onChange={(e) => setShop({ ...shop, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>システム・料金説明</label>
              <textarea value={shop.system ?? ""} onChange={(e) => setShop({ ...shop, system: e.target.value })} rows={4} placeholder="入店料、ドリンク料金、指名料など" style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>タグ（カンマ区切り）</label>
              <input
                value={(shop.tags ?? []).join(", ")}
                onChange={(e) => setShop({ ...shop, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="例：カラオケあり, 初見歓迎, 駐車場あり"
                style={inputStyle}
              />
            </div>
            <button onClick={saveBasic} disabled={saving} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)",
            }}>{saving ? "保存中..." : "保存する"}</button>
          </div>
        )}

        {/* SNS */}
        {tab === "sns" && (
          <div style={sectionStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Instagram</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>@</span>
                <input value={shop.instagram ?? ""} onChange={(e) => setShop({ ...shop, instagram: e.target.value })} placeholder="アカウント名" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>X（Twitter）</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>@</span>
                <input value={shop.x_account ?? ""} onChange={(e) => setShop({ ...shop, x_account: e.target.value })} placeholder="アカウント名" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>TikTok</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>@</span>
                <input value={shop.tiktok_account ?? ""} onChange={(e) => setShop({ ...shop, tiktok_account: e.target.value })} placeholder="アカウント名" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <button onClick={saveSns} disabled={saving} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)",
            }}>{saving ? "保存中..." : "保存する"}</button>
          </div>
        )}

        {/* 写真申請 */}
        {tab === "photo" && (
          <div style={sectionStyle}>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
              写真の追加・変更は審査が必要です。画像URLを入力して申請してください。審査後にメールでご連絡します。
            </p>
            <div style={fieldStyle}>
              <label style={labelStyle}>写真の種類</label>
              <select value={photoType} onChange={(e) => setPhotoType(e.target.value as any)} style={inputStyle}>
                <option value="banner">バナー画像（メイン写真）</option>
                <option value="icon">アイコン画像</option>
                <option value="photos">店内写真</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>画像URL</label>
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.7 }}>
                InstagramやGoogleドライブなどの公開URLを入力してください。
              </div>
            </div>
            {photoMsg && (
              <div style={{
                background: photoMsg.includes("申請") ? "var(--online-bg)" : "#ff444418",
                border: "1px solid " + (photoMsg.includes("申請") ? "var(--online-border)" : "#ff444444"),
                borderRadius: 10, padding: "10px 14px",
                color: photoMsg.includes("申請") ? "var(--online)" : "#ff4444",
                fontSize: 13, marginBottom: 16,
              }}>{photoMsg}</div>
            )}
            <button onClick={submitPhotoRequest} disabled={saving} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)",
            }}>{saving ? "申請中..." : "申請する"}</button>
          </div>
        )}

        {/* キャスト */}
        {tab === "cast" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                onClick={() => setEditCast({ shop_id: parseInt(shopId!), name: "", age: 20, comment: "", on_today: false, instagram: "", birthplace: "" })}
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  border: "none", borderRadius: 10, color: "#fff",
                  padding: "8px 18px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "var(--font)",
                }}
              >+ キャスト追加</button>
            </div>

            {editCast && (
              <div style={{ ...sectionStyle, border: "1px solid var(--accent)44" }}>
                <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                  {editCast.id ? "キャスト編集" : "新規キャスト追加"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>名前 *</label>
                    <input value={editCast.name ?? ""} onChange={(e) => setEditCast({ ...editCast, name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>年齢</label>
                    <input type="number" value={editCast.age ?? ""} onChange={(e) => setEditCast({ ...editCast, age: parseInt(e.target.value) })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>出身地</label>
                    <input value={editCast.birthplace ?? ""} onChange={(e) => setEditCast({ ...editCast, birthplace: e.target.value })} style={inputStyle} />
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
                  <button onClick={saveCast} disabled={saving} style={{
                    flex: 1, padding: "10px",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    border: "none", borderRadius: 10, color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)",
                  }}>{saving ? "保存中..." : "保存"}</button>
                  <button onClick={() => setEditCast(null)} style={{
                    padding: "10px 20px",
                    background: "var(--bg-input)", border: "1px solid var(--border)",
                    borderRadius: 10, color: "var(--text-muted)",
                    fontSize: 13, cursor: "pointer", fontFamily: "var(--font)",
                  }}>キャンセル</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {casts.map((cast) => (
                <div key={cast.id} style={{
                  ...sectionStyle, marginBottom: 0,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <button
                    onClick={() => toggleOnToday(cast)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                      background: cast.on_today ? "var(--online)" : "var(--border-hover)",
                      position: "relative", transition: "background 0.2s", flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3,
                      left: cast.on_today ? 22 : 3,
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s",
                    }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{cast.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{cast.age}歳</span>
                    <span style={{ color: cast.on_today ? "var(--online)" : "var(--text-hint)", fontSize: 11, marginLeft: 8 }}>
                      {cast.on_today ? "本日出勤" : "休み"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditCast(cast)} style={{
                      background: "var(--bg-input)", border: "1px solid var(--border)",
                      color: "var(--text-secondary)", padding: "4px 12px",
                      borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
                    }}>編集</button>
                    <button onClick={() => deleteCast(cast.id)} style={{
                      background: "#ff444420", border: "1px solid #ff444444",
                      color: "#ff4444", padding: "4px 12px",
                      borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
                    }}>削除</button>
                  </div>
                </div>
              ))}
              {casts.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>
                  キャストが登録されていません
                </div>
              )}
            </div>
          </div>
        )}

        {/* パスワード変更 */}
        {tab === "password" && (
          <div style={sectionStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>新しいパスワード（8文字以上）</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>新しいパスワード（確認）</label>
              <input
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                style={inputStyle}
              />
            </div>
            {pwMsg && (
              <div style={{
                background: pwMsg.includes("変更") ? "var(--online-bg)" : "#ff444418",
                border: "1px solid " + (pwMsg.includes("変更") ? "var(--online-border)" : "#ff444444"),
                borderRadius: 10, padding: "10px 14px",
                color: pwMsg.includes("変更") ? "var(--online)" : "#ff4444",
                fontSize: 13, marginBottom: 16,
              }}>{pwMsg}</div>
            )}
            <button onClick={changePassword} disabled={saving} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)",
            }}>{saving ? "変更中..." : "パスワードを変更する"}</button>
          </div>
        )}
      </main>
    </div>
  );
}