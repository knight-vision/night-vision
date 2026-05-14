"use client";
import { useState, useEffect, useRef } from "react";
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
  open_time: string | null;
  close_time: string | null;
  closed_week_days: string[] | null;
  is_closed: boolean;
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
  plan: string;
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

type PhotoRequest = {
  id: number;
  type: string;
  url: string;
  status: string;
  sort_order: number;
  created_at: string;
};

type Tab = "basic" | "hours" | "sns" | "images" | "cast" | "plan" | "password";

const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日", "祝"];

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
const btnPrimary = {
  width: "100%", padding: "12px",
  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
  border: "none", borderRadius: 12, color: "#fff",
  fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font)",
};

export default function OwnerDashboard() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [photoRequests, setPhotoRequests] = useState<PhotoRequest[]>([]);
  const [tab, setTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editCast, setEditCast] = useState<Partial<Cast> | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("owner_id");
    const sid = localStorage.getItem("owner_shop_id");
    if (!id || !sid) { router.push("/owner/login"); return; }
    setOwnerId(id);
    setShopId(sid);
    fetchShop(parseInt(sid));
    fetchCasts(parseInt(sid));
    fetchPhotoRequests(parseInt(sid));
  }, []);

  useEffect(() => {
    fetchTagSuggestions();
  }, []);

  async function deletePhoto(id: number) {
    if (!confirm("この画像を削除しますか？")) return;
    await supabase.from("photo_requests").delete().eq("id", id);
    await fetchPhotoRequests(parseInt(shopId!));
    showMsg("削除しました");
  }

  async function fetchShop(sid: number) {
    const { data } = await supabase.from("shops").select("*").eq("id", sid).single();
    if (data) setShop(data);
  }

  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    fetchTagSuggestions();
  }, []);

  async function fetchTagSuggestions() {
    const { data } = await supabase.from("shops").select("tags");
    if (!data) return;
    const tagCount: Record<string, number> = {};
    data.forEach((s) => {
      (s.tags ?? []).forEach((t: string) => {
        tagCount[t] = (tagCount[t] ?? 0) + 1;
      });
    });
    const sorted = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    setTagSuggestions(sorted);
  }

  async function fetchCasts(sid: number) {
    const { data } = await supabase.from("casts").select("*").eq("shop_id", sid).order("id");
    if (data) setCasts(data);
  }

  async function fetchPhotoRequests(sid: number) {
    const { data } = await supabase
      .from("photo_requests")
      .select("*")
      .eq("shop_id", sid)
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (data) setPhotoRequests(data);
  }

  async function fetchTagSuggestions() {
    const { data } = await supabase.from("shops").select("tags");
    if (!data) return;
    const tagCount: Record<string, number> = {};
    data.forEach((s) => {
      (s.tags ?? []).forEach((t: string) => {
        tagCount[t] = (tagCount[t] ?? 0) + 1;
      });
    });
    const sorted = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    setTagSuggestions(sorted);
  }

  async function fetchAddressSuggestions(query: string) {
    if (!query || query.length < 2) { setAddressSuggestions([]); return; }
    const { data } = await supabase
      .from("shops")
      .select("area")
      .ilike("area", `%${query}%`)
      .neq("id", shop?.id ?? 0)
      .limit(5);
    const areas = [...new Set((data ?? []).map((s) => s.area).filter(Boolean))];
    setAddressSuggestions(areas);
    setShowAddressSuggestions(areas.length > 0);
  }

  async function saveBasic() {
    if (!shop) return;
    setSaving(true);
    await supabase.from("shops").update({
      name: shop.name,
      area: shop.area,
      area_category: shop.area_category,
      budget: shop.budget,
      tel: shop.tel,
      description: shop.description,
      tags: shop.tags,
      system: shop.system,
      seats: shop.seats,
    }).eq("id", shop.id);
    showMsg("保存しました");
    setSaving(false);
  }

  async function saveHours() {
    if (!shop) return;
    setSaving(true);

    // 通常営業時間のopen_hour文字列を生成
    const openHour = shop.open_time && shop.close_time
      ? `${shop.open_time.slice(0, 5)}〜${shop.close_time.slice(0, 5)}`
      : shop.open_hour;

    await supabase.from("shops").update({
      open_time: shop.open_time,
      close_time: shop.close_time,
      closed_week_days: shop.closed_week_days ?? [],
      is_closed: shop.is_closed,
      weekly_hours: shop.weekly_hours ?? {},
      open_hour: openHour,
      closed_days: (shop.closed_week_days ?? []).join("・"),
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

  async function uploadImage(file: File, fileType: string) {
    if (!shopId || !ownerId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shopId", shopId);
    formData.append("fileType", fileType);

    const res = await fetch("/api/upload-image", { method: "POST", body: formData });
    const { url, error } = await res.json();

    if (error || !url) {
      showMsg("アップロードに失敗しました");
      setUploading(false);
      return;
    }

    // photo_requestsに追加（審査待ち）
    await supabase.from("photo_requests").insert({
      shop_id: parseInt(shopId),
      owner_id: parseInt(ownerId),
      type: fileType,
      url,
      status: "pending",
      sort_order: photoRequests.length,
    });

    // 管理者に通知
    await fetch("/api/photo-request-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName: shop?.name, photoType: fileType, url }),
    });

    await fetchPhotoRequests(parseInt(shopId));
    showMsg("アップロードしました。審査後に反映されます。");
    setUploading(false);
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
    // キャスト年齢から年齢層を自動更新
    await updateAgeGroups(parseInt(shopId));
    setEditCast(null);
    showMsg("保存しました");
    setSaving(false);
  }

  async function updateAgeGroups(sid: number) {
    const { data } = await supabase.from("casts").select("age").eq("shop_id", sid);
    if (!data) return;
    const decades = [...new Set(data.map((c) => Math.floor(c.age / 10) * 10 + "代"))];
    await supabase.from("shops").update({ age_groups: decades }).eq("id", sid);
  }

  async function handleCastAttendance(cast: Cast, action: "on" | "off") {
    let newVal: boolean | null;
    if (action === "on") {
      newVal = cast.on_today === true ? null : true;
    } else {
      newVal = cast.on_today === false ? null : false;
    }
    await supabase.from("casts").update({ on_today: newVal }).eq("id", cast.id);
    await fetchCasts(parseInt(shopId!));
  }

  async function deleteCast(id: number) {
    if (!confirm("削除しますか？")) return;
    await supabase.from("casts").delete().eq("id", id);
    await fetchCasts(parseInt(shopId!));
    await updateAgeGroups(parseInt(shopId!));
  }

  async function movePhoto(id: number, dir: "up" | "down") {
    const idx = photoRequests.findIndex((p) => p.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === photoRequests.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const newList = [...photoRequests];
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    setPhotoRequests(newList);
    await Promise.all(newList.map((p, i) =>
      supabase.from("photo_requests").update({ sort_order: i }).eq("id", p.id)
    ));
  }

  async function changePassword() {
    if (!newPassword || newPassword !== newPassword2) { setPwMsg("パスワードが一致しません"); return; }
    if (newPassword.length < 8) { setPwMsg("8文字以上で入力してください"); return; }
    setSaving(true);
    await supabase.from("shop_owners").update({ password_hash: newPassword }).eq("id", parseInt(ownerId!));
    setNewPassword(""); setNewPassword2("");
    setPwMsg("パスワードを変更しました");
    setSaving(false);
  }

  async function requestPlanChange(newPlan: string) {
    await fetch("/api/plan-change-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName: shop?.name, currentPlan: shop?.plan, newPlan }),
    });
    showMsg("プラン変更申請を送信しました。担当者からご連絡します。");
  }

  async function requestClose() {
    if (!confirm("掲載終了を申請しますか？")) return;
    await fetch("/api/plan-change-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName: shop?.name, currentPlan: shop?.plan, newPlan: "close" }),
    });
    showMsg("掲載終了申請を送信しました。");
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
    <div><Header />
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>読み込み中...</div>
    </div>
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "basic", label: "基本情報" },
    { key: "hours", label: "営業時間" },
    { key: "sns", label: "SNS" },
    { key: "images", label: "店舗画像" },
    { key: "cast", label: "キャスト" },
    { key: "plan", label: "プラン" },
    { key: "password", label: "パスワード" },
  ];

  const pendingPhotos = photoRequests.filter((p) => p.status === "pending");
  const approvedPhotos = photoRequests.filter((p) => p.status === "approved");
  const rejectedPhotos = photoRequests.filter((p) => p.status === "rejected");
  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
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
            }}>
              {t.label}
              {t.key === "images" && pendingPhotos.length > 0 && (
                <span style={{ marginLeft: 4, background: "#ffd700", color: "#000", borderRadius: "50%", fontSize: 10, padding: "1px 5px" }}>
                  {pendingPhotos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 基本情報 */}
        {tab === "basic" && (
          <div style={sectionStyle}>
            {[
            { label: "店舗名", key: "name", placeholder: "" },
            { label: "予算目安", key: "budget", placeholder: "例：3,000〜5,000円" },
            { label: "電話番号", key: "tel", placeholder: "例：0154-XX-XXXX" },
          ].map((f) => (
            <div key={f.key} style={fieldStyle}>
              <label style={labelStyle}>{f.label}</label>
              <input
                value={(shop as any)[f.key] ?? ""}
                onChange={(e) => setShop({ ...shop, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                style={inputStyle}
              />
            </div>
          ))}

          {/* 所在地（住所補完付き） */}
          <div style={{ ...fieldStyle, position: "relative" }}>
            <label style={labelStyle}>所在地</label>
            <input
              value={shop.area ?? ""}
              onChange={(e) => {
                setShop({ ...shop, area: e.target.value });
                fetchAddressSuggestions(e.target.value);
              }}
              onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
              onFocus={() => shop.area && fetchAddressSuggestions(shop.area)}
              placeholder="例：北海道釧路市末広町4丁目9 フジビル2F"
              style={inputStyle}
            />
            {showAddressSuggestions && addressSuggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, zIndex: 10, overflow: "hidden",
              }}>
                {addressSuggestions.map((addr) => (
                  <div
                    key={addr}
                    onClick={() => { setShop({ ...shop, area: addr }); setShowAddressSuggestions(false); }}
                    style={{
                      padding: "10px 14px", cursor: "pointer",
                      fontSize: 13, color: "var(--text-secondary)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >{addr}</div>
                ))}
              </div>
            )}
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
              <label style={labelStyle}>席数</label>
              <input type="number" value={shop.seats ?? ""} onChange={(e) => setShop({ ...shop, seats: parseInt(e.target.value) || null })} style={inputStyle} />
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
              <label style={labelStyle}>タグ</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {(shop.tags ?? []).map((tag) => (
                  <span key={tag} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "var(--accent)22", border: "1px solid var(--accent)44",
                    color: "var(--accent)", padding: "4px 10px", borderRadius: 20, fontSize: 12,
                  }}>
                    {tag}
                    <button
                      onClick={() => setShop({ ...shop, tags: (shop.tags ?? []).filter((t) => t !== tag) })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, padding: 0, lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="tag-input"
                  placeholder="タグを入力してEnter"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !(shop.tags ?? []).includes(val)) {
                        setShop({ ...shop, tags: [...(shop.tags ?? []), val] });
                      }
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById("tag-input") as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val && !(shop.tags ?? []).includes(val)) {
                      setShop({ ...shop, tags: [...(shop.tags ?? []), val] });
                      input.value = "";
                    }
                  }}
                  style={{
                    padding: "10px 16px", borderRadius: 10, border: "none",
                    background: "var(--accent)", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >追加</button>
              </div>
            </div>
            <button onClick={saveBasic} disabled={saving} style={btnPrimary as React.CSSProperties}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        )}

        {/* 営業時間 */}
        {tab === "hours" && (
          <div>
            {/* 本日休業 */}
            <div style={{ ...sectionStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>本日休業</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>緊急時や臨時休業に使用</div>
              </div>
              <button
                onClick={() => setShop({ ...shop, is_closed: !shop.is_closed })}
                style={{
                  width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                  background: shop.is_closed ? "var(--accent)" : "var(--border-hover)",
                  position: "relative", transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3,
                  left: shop.is_closed ? 26 : 3,
                  width: 22, height: 22, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            {/* 通常営業時間 */}
            <div style={sectionStyle}>
              <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>通常営業時間</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>開店時刻</label>
                  <select
                    value={shop.open_time?.slice(0, 5) ?? ""}
                    onChange={(e) => setShop({ ...shop, open_time: e.target.value ? e.target.value + ":00" : null })}
                    style={inputStyle}
                  >
                    <option value="">選択</option>
                    {Array.from({ length: 24 * 6 }, (_, i) => {
                      const h = Math.floor(i / 6);
                      const m = (i % 6) * 10;
                      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>閉店時刻</label>
                  <select
                    value={shop.close_time?.slice(0, 5) ?? ""}
                    onChange={(e) => setShop({ ...shop, close_time: e.target.value ? e.target.value + ":00" : null })}
                    style={inputStyle}
                  >
                    <option value="">選択</option>
                    {Array.from({ length: 24 * 6 }, (_, i) => {
                      const h = Math.floor(i / 6);
                      const m = (i % 6) * 10;
                      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>定休日</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {WEEK_DAYS.map((day) => {
                    const active = (shop.closed_week_days ?? []).includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const current = shop.closed_week_days ?? [];
                          const next = active ? current.filter((d) => d !== day) : [...current, day];
                          setShop({ ...shop, closed_week_days: next });
                        }}
                        style={{
                          width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                          background: active ? "var(--accent)22" : "var(--bg-input)",
                          border: "1.5px solid " + (active ? "var(--accent)" : "var(--border)"),
                          color: active ? "var(--accent)" : "var(--text-secondary)",
                          fontSize: 13, fontWeight: active ? 700 : 500,
                          fontFamily: "var(--font)",
                        }}
                      >{day}</button>
                    );
                  })}
                </div>
              </div>

              {shop.open_time && shop.close_time && (
                <div style={{
                  background: "var(--bg-input)", borderRadius: 10, padding: "10px 14px",
                  fontSize: 13, color: "var(--text-secondary)",
                }}>
                  表示：{shop.open_time.slice(0, 5)}〜{shop.close_time.slice(0, 5)}
                  {(shop.closed_week_days ?? []).length > 0 && `　定休日：${shop.closed_week_days!.join("・")}`}
                </div>
              )}
            </div>

            {/* 曜日別営業時間 */}
            <div style={sectionStyle}>
              <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>曜日別営業時間（任意）</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                曜日によって営業時間が異なる場合に設定してください。設定した曜日は通常営業時間より優先されます。
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["月", "火", "水", "木", "金", "土", "日", "祝"].map((day) => {
                  const hours = (shop.weekly_hours ?? {})[day];
                  const isClosed = hours?.closed ?? false;
                  const isSet = !!hours;
                  return (
                    <div key={day} style={{
                      background: "var(--bg-input)", borderRadius: 10, padding: "10px 14px",
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isSet ? "var(--accent)22" : "var(--bg-card)",
                        border: "1px solid " + (isSet ? "var(--accent)" : "var(--border)"),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: isSet ? "var(--accent)" : "var(--text-muted)",
                        fontSize: 13, fontWeight: 700,
                      }}>{day}</div>

                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>
                        <input
                          type="checkbox"
                          checked={isClosed}
                          onChange={(e) => {
                            const wh = { ...(shop.weekly_hours ?? {}) };
                            if (e.target.checked) {
                              wh[day] = { open: "", close: "", closed: true };
                            } else {
                              wh[day] = { open: wh[day]?.open ?? "", close: wh[day]?.close ?? "", closed: false };
                            }
                            setShop({ ...shop, weekly_hours: wh });
                          }}
                        />
                        定休日
                      </label>

                      {!isClosed && (
                        <>
                          <select
                            value={hours?.open ?? ""}
                            onChange={(e) => {
                              const wh = { ...(shop.weekly_hours ?? {}) };
                              wh[day] = { ...wh[day], open: e.target.value, closed: false };
                              setShop({ ...shop, weekly_hours: wh });
                            }}
                            style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 80 }}
                          >
                            <option value="">開店</option>
                            {Array.from({ length: 24 * 6 }, (_, i) => {
                              const h = Math.floor(i / 6);
                              const m = (i % 6) * 10;
                              const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                              return <option key={val} value={val}>{val}</option>;
                            })}
                          </select>
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>〜</span>
                          <select
                            value={hours?.close ?? ""}
                            onChange={(e) => {
                              const wh = { ...(shop.weekly_hours ?? {}) };
                              wh[day] = { ...wh[day], close: e.target.value, closed: false };
                              setShop({ ...shop, weekly_hours: wh });
                            }}
                            style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 80 }}
                          >
                            <option value="">閉店</option>
                            {Array.from({ length: 24 * 6 }, (_, i) => {
                              const h = Math.floor(i / 6);
                              const m = (i % 6) * 10;
                              const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                              return <option key={val} value={val}>{val}</option>;
                            })}
                          </select>
                          {isSet && !isClosed && (
                            <button
                              onClick={() => {
                                const wh = { ...(shop.weekly_hours ?? {}) };
                                delete wh[day];
                                setShop({ ...shop, weekly_hours: wh });
                              }}
                              style={{ background: "none", border: "none", color: "var(--text-hint)", cursor: "pointer", fontSize: 16 }}
                            >×</button>
                          )}
                        </>
                      )}

                      {!isSet && !isClosed && (
                        <button
                          onClick={() => {
                            const wh = { ...(shop.weekly_hours ?? {}) };
                            wh[day] = { open: "", close: "", closed: false };
                            setShop({ ...shop, weekly_hours: wh });
                          }}
                          style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "3px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}
                        >設定</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={saveHours} disabled={saving} style={btnPrimary as React.CSSProperties}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        )}

        {/* SNS */}
        {tab === "sns" && (
          <div style={sectionStyle}>
            {[
              { label: "Instagram", key: "instagram" },
              { label: "X（Twitter）", key: "x_account" },
              { label: "TikTok", key: "tiktok_account" },
            ].map((f) => (
              <div key={f.key} style={fieldStyle}>
                <label style={labelStyle}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)" }}>@</span>
                  <input
                    value={(shop as any)[f.key] ?? ""}
                    onChange={(e) => setShop({ ...shop, [f.key]: e.target.value })}
                    placeholder="アカウント名"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
            ))}
            <button onClick={saveSns} disabled={saving} style={btnPrimary as React.CSSProperties}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        )}

        {/* 店舗画像 */}
        {tab === "images" && (
          <div>
            <div style={sectionStyle}>
              <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>画像をアップロード</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                アップロードした画像は審査後に公開されます。JPG・PNG・GIF対応。最大10MB。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await uploadImage(file, "photos");
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: "100%", padding: "14px",
                  background: uploading ? "var(--border-hover)" : "var(--bg-input)",
                  border: "2px dashed var(--border-hover)",
                  borderRadius: 12, color: "var(--text-secondary)",
                  fontSize: 14, cursor: uploading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font)",
                }}
              >
                {uploading ? "アップロード中..." : "📷 画像を選択してアップロード"}
              </button>
            </div>

            {/* 審査待ち */}
            {pendingPhotos.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ color: "#ffd700", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  審査待ち ({pendingPhotos.length}件)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingPhotos.map((p) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "var(--bg-input)", borderRadius: 10, padding: 10,
                    }}>
                      <img src={p.url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#ffd700", fontWeight: 700 }}>審査待ち</div>
                        <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2 }}>
                          {new Date(p.created_at).toLocaleString("ja-JP")}
                        </div>
                      </div>
                      <button onClick={() => deletePhoto(p.id)} style={{
                        background: "#ff444420", border: "1px solid #ff444444",
                        borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                        color: "#ff4444", fontSize: 11, flexShrink: 0,
                      }}>取消</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 承認済み */}
            {approvedPhotos.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ color: "var(--online)", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  公開中 ({approvedPhotos.length}件)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {approvedPhotos.map((p, idx) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "var(--bg-input)", borderRadius: 10, padding: 10,
                    }}>
                      <img src={p.url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--online)", fontWeight: 700 }}>公開中</div>
                        <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2 }}>
                          順番: {idx + 1}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button onClick={() => movePhoto(p.id, "up")} disabled={idx === 0} style={{
                          background: "var(--bg-card)", border: "1px solid var(--border)",
                          borderRadius: 6, padding: "3px 8px", cursor: "pointer",
                          color: "var(--text-muted)", fontSize: 12,
                        }}>↑</button>
                        <button onClick={() => movePhoto(p.id, "down")} disabled={idx === approvedPhotos.length - 1} style={{
                          background: "var(--bg-card)", border: "1px solid var(--border)",
                          borderRadius: 6, padding: "3px 8px", cursor: "pointer",
                          color: "var(--text-muted)", fontSize: 12,
                        }}>↓</button>
                        <button onClick={() => deletePhoto(p.id)} style={{
                          background: "#ff444420", border: "1px solid #ff444444",
                          borderRadius: 6, padding: "3px 8px", cursor: "pointer",
                          color: "#ff4444", fontSize: 12,
                        }}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 却下済み */}
            {rejectedPhotos.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ color: "#ff4444", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  却下済み ({rejectedPhotos.length}件)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rejectedPhotos.map((p) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "var(--bg-input)", borderRadius: 10, padding: 10,
                    }}>
                      <img src={p.url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0, opacity: 0.5 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#ff4444", fontWeight: 700 }}>却下</div>
                      </div>
                      <button onClick={() => deletePhoto(p.id)} style={{
                        background: "#ff444420", border: "1px solid #ff444444",
                        borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                        color: "#ff4444", fontSize: 11, flexShrink: 0,
                      }}>削除</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <button onClick={saveCast} disabled={saving} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setEditCast(null)} style={{ padding: "10px 20px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {casts.map((cast) => (
                <div key={cast.id} style={{ ...sectionStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                  <button
                      onClick={() => handleCastAttendance(cast, "on")}
                      style={{
                        padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: cast.on_today === true ? "var(--online)" : "var(--bg-input)",
                        color: cast.on_today === true ? "#fff" : "var(--text-muted)",
                        fontSize: 11, fontWeight: 700, fontFamily: "var(--font)",
                      }}
                    >{cast.on_today === true ? "✓ 出勤" : "出勤"}</button>
                    <button
                      onClick={() => handleCastAttendance(cast, "off")}
                      style={{
                        padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: cast.on_today === false ? "#ff444420" : "var(--bg-input)",
                        color: cast.on_today === false ? "#ff4444" : "var(--text-muted)",
                        fontSize: 11, fontWeight: 700, fontFamily: "var(--font)",
                      }}
                    >{cast.on_today === false ? "✓ 休み" : "休み"}</button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{cast.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{cast.age}歳</span>
                    <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2 }}>{cast.comment}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditCast(cast)} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "4px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>編集</button>
                    <button onClick={() => deleteCast(cast.id)} style={{ background: "#ff444420", border: "1px solid #ff444444", color: "#ff4444", padding: "4px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>削除</button>
                  </div>
                </div>
              ))}
              {casts.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>キャストが登録されていません</div>
              )}
            </div>
          </div>
        )}

        {/* プラン */}
        {tab === "plan" && (
          <div style={sectionStyle}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>現在のプラン</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
                {{ free: "フリープラン", standard: "ゴールドプラン", premium: "プレミアムプラン" }[shop.plan] ?? shop.plan}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {[
                { key: "free", label: "フリープラン", price: "無料", desc: "店舗名・業種・エリア・営業時間" },
                { key: "standard", label: "ゴールドプラン", price: "月額3,000円", desc: "バナー写真・キャスト3名・Instagram連携" },
                { key: "premium", label: "プレミアムプラン", price: "月額7,000円", desc: "上位表示・キャスト無制限・複数写真" },
              ].filter((p) => p.key !== shop.plan).map((p) => (
                <div key={p.key} style={{
                  background: "var(--bg-input)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{p.label}</span>
                    <span style={{ color: "var(--accent)", fontSize: 13 }}>{p.price}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 10 }}>{p.desc}</div>
                  <button onClick={() => requestPlanChange(p.key)} style={{
                    width: "100%", padding: "8px",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    border: "none", borderRadius: 8, color: "#fff",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>このプランに変更申請</button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <button onClick={requestClose} style={{
                width: "100%", padding: "12px",
                background: "#ff444420", border: "1px solid #ff444444",
                borderRadius: 12, color: "#ff4444",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>掲載終了を申請する</button>
              <p style={{ color: "var(--text-hint)", fontSize: 11, textAlign: "center", marginTop: 8 }}>
                申請後、担当者からご連絡します。
              </p>
            </div>
          </div>
        )}

        {/* パスワード */}
        {tab === "password" && (
          <div style={sectionStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>新しいパスワード（8文字以上）</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>新しいパスワード（確認）</label>
              <input type="password" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} style={inputStyle} />
            </div>
            {pwMsg && (
              <div style={{
                background: pwMsg.includes("変更") ? "var(--online-bg)" : "#ff444418",
                border: "1px solid " + (pwMsg.includes("変更") ? "var(--online-border)" : "#ff444444"),
                borderRadius: 10, padding: "10px 14px", color: pwMsg.includes("変更") ? "var(--online)" : "#ff4444",
                fontSize: 13, marginBottom: 16,
              }}>{pwMsg}</div>
            )}
            <button onClick={changePassword} disabled={saving} style={btnPrimary as React.CSSProperties}>
              {saving ? "変更中..." : "パスワードを変更する"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}