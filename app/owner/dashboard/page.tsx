"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/shops";
import Header from "@/components/Header";
import ShiftManagementTab from "@/components/ShiftManagementTab";
import CastPhotoManager from "@/components/CastPhotoManager";
import PrintPayslipButton from "@/components/PrintPayslipButton";
import TweetTab from "@/components/TweetTab";
import JobsTab from "@/components/JobsTab";
import FeedbackTab from "@/components/FeedbackTab";
import LineTab from "@/components/LineTab";
import SalesTab from "@/components/SalesTab";
import TodayTab from "@/components/TodayTab";
import CastPerformanceTab from "@/components/CastPerformanceTab";
import CastRecordTab from "@/components/CastRecordTab";

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
  weekly_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  plan: string;
};

type Cast = {
  id: number;
  shop_id: number;
  name: string;
  age: number;
  comment: string;
  on_today: boolean;
  today_start: string | null;
  today_end: string | null;
  instagram: string | null;
  x_account: string | null;
  tiktok_account: string | null;
  birthplace: string | null;
  hourly_wage: number | null;
  icon_photo?: string | null;
  page_views?: number;
};

type PhotoRequest = {
  id: number;
  type: string;
  url: string;
  status: string;
  sort_order: number;
  created_at: string;
};

type Tab = "today" | "shop_info" | "cast" | "shift" | "sales" | "jobs" | "tweet" | "feedback" | "line" | "plan" | "password";

type ShiftRequest = {
  id: string;
  cast_id: number;
  date: string;
  start_time: string;
  end_time: string;
  note: string;
  status: string;
  casts: { id: number; name: string };
};

type ConfirmedShift = {
  id: string;
  cast_id: number;
  date: string;
  start_time: string;
  end_time: string;
  casts: { id: number; name: string };
};

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
  const [tab, setTab] = useState<Tab>("today");
  const [castSubTab, setCastSubTab] = useState<"list" | "cast_sales" | "performance" | "record" | "payroll">("list");
  const [allowanceJumpCastId, setAllowanceJumpCastId] = useState<string>("");

  const handleSetTab = (t: Tab) => {
    if (t !== "cast") { setAllowanceJumpCastId(""); }
    if (t !== "cast") setCastSubTab("list");
    setTab(t);
  };
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editCast, setEditCast] = useState<Partial<Cast> | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerEmail2, setNewOwnerEmail2] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [confirmedShifts, setConfirmedShifts] = useState<ConfirmedShift[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftMsg, setShiftMsg] = useState("");
  const [castAccountEmail, setCastAccountEmail] = useState<Record<number, string>>({});
  const [issuingAccount, setIssuingAccount] = useState<number | null>(null);
  const [castAccounts, setCastAccounts] = useState<Record<number, string>>({}); // cast_id -> email
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

    // 日付が変わっていたらon_todayをリセット
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("owner_last_date");
    if (lastDate && lastDate !== today) {
      // 日付が変わった → on_today をリセット
      supabase.from("casts").update({ on_today: null, today_start: null, today_end: null }).eq("shop_id", parseInt(sid)).then(() => {
        fetchCasts(parseInt(sid));
      });
    }
    localStorage.setItem("owner_last_date", today);

    // URLパラメータでタブを自動選択
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam) setTab(tabParam as any);
  }, []);

  useEffect(() => {
    fetchTagSuggestions();
  }, []);

  async function deletePhoto(id: number) {
    if (!confirm("この画像を削除しますか？")) return;
    const target = photoRequests.find((p) => p.id === id);
    await supabase.from("photo_requests").delete().eq("id", id);

    // shopsテーブルも更新
    if (target && target.status === "approved" && shopId) {
      const remaining = photoRequests
        .filter((p) => p.id !== id && p.status === "approved")
        .map((p) => p.url);
      const newImage = remaining.length > 0 ? remaining[0] : null;
      await supabase.from("shops").update({
        image: newImage,
        photos: remaining,
      }).eq("id", parseInt(shopId));
    }

    await fetchPhotoRequests(parseInt(shopId!));
    showMsg("削除しました");
  }

  async function fetchShop(sid: number) {
    const { data } = await supabase.from("shops").select("*").eq("id", sid).single();
    if (data) setShop(data);
  }

  async function fetchCasts(sid: number) {
    const { data } = await supabase.from("casts").select("*").eq("shop_id", sid).order("id");
    if (data) {
      setCasts(data);
      // キャストアカウントのメールアドレスを取得
      const castIds = data.map((c: Cast) => c.id);
      if (castIds.length > 0) {
        const { data: accounts } = await supabase
          .from("cast_accounts")
          .select("cast_id, email")
          .in("cast_id", castIds);
        if (accounts) {
          const map: Record<number, string> = {};
          accounts.forEach((a: any) => { map[a.cast_id] = a.email; });
          setCastAccounts(map);
        }
      }
    }
  }

  async function fetchPhotoRequests(sid: number) {
    const { data } = await supabase
      .from("photo_requests")
      .select("*")
      .eq("shop_id", sid)
      .neq("type", "cast_photo")
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
        x_account: editCast.x_account || null,
        tiktok_account: editCast.tiktok_account || null,
        birthplace: editCast.birthplace,
        hourly_wage: editCast.hourly_wage ?? null,
      }).eq("id", editCast.id);
    } else {
      await supabase.from("casts").insert({
        shop_id: parseInt(shopId),
        name: editCast.name,
        age: editCast.age,
        comment: editCast.comment,
        instagram: editCast.instagram,
        x_account: editCast.x_account || null,
        tiktok_account: editCast.tiktok_account || null,
        birthplace: editCast.birthplace,
        hourly_wage: editCast.hourly_wage ?? null,
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
    { key: "today", label: "🏠 ホーム" },
    { key: "shop_info", label: "店舗管理" },
    { key: "cast", label: "キャスト管理" },
    { key: "shift", label: "シフト管理" },
    { key: "sales", label: "📊 売上管理" },
    { key: "jobs", label: "求人" },
    { key: "tweet", label: "つぶやき" },
    { key: "feedback", label: "ご意見" },
    { key: "line", label: "LINE通知" },
    { key: "plan", label: "プラン" },
    { key: "password", label: "アカウント管理" },
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
            <button key={t.key} onClick={() => handleSetTab(t.key)} style={{
              flex: 1, minWidth: 80, padding: "8px 6px", borderRadius: 10,
              fontWeight: tab === t.key ? 700 : 500, fontSize: 12,
              fontFamily: "var(--font)", cursor: "pointer",
              background: tab === t.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
              border: "1px solid " + (tab === t.key ? "transparent" : "var(--border)"),
              color: tab === t.key ? "#fff" : "var(--text-secondary)",
            }}>
              {t.label}
              {t.key === "shop_info" && pendingPhotos.length > 0 && (
                <span style={{ marginLeft: 4, background: "#ffd700", color: "#000", borderRadius: "50%", fontSize: 10, padding: "1px 5px" }}>
                  {pendingPhotos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 今日 */}
        {tab === "today" && shopId && (
          <TodayTab shopId={shopId} casts={casts} sectionStyle={sectionStyle} btnPrimary={btnPrimary} setTab={(t: any) => setTab(t)} showMsg={showMsg}
            onAllowanceClick={(castId) => { setAllowanceJumpCastId(castId); setCastSubTab("payroll"); setTab("cast"); }} />
        )}

        {/* 基本情報 */}
        {tab === "shop_info" && (<>
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
              <label style={labelStyle}>タグ <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>（最大10個・1タグ10文字まで）</span></label>
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
                      const val = (e.target as HTMLInputElement).value.trim().slice(0, 10);
                      if (val && !(shop.tags ?? []).includes(val) && (shop.tags ?? []).length < 10) {
                        setShop({ ...shop, tags: [...(shop.tags ?? []), val] });
                      }
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById("tag-input") as HTMLInputElement;
                    const val = input?.value.trim().slice(0, 10);
                    if (val && !(shop.tags ?? []).includes(val) && (shop.tags ?? []).length < 10) {
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
              {/* タグ候補 */}
              {tagSuggestions.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>よく使われるタグ</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(showAllTags ? tagSuggestions : tagSuggestions.slice(0, 10))
                      .filter((tag) => !(shop.tags ?? []).includes(tag))
                      .map((tag) => (
                        <button key={tag} onClick={() => { if ((shop.tags ?? []).length < 10) setShop({ ...shop, tags: [...(shop.tags ?? []), tag] }); }}
                          style={{
                            fontSize: 11, padding: "3px 10px", borderRadius: 16, cursor: "pointer",
                            background: "var(--bg-input)", border: "1px solid var(--border)",
                            color: "var(--text-muted)", fontFamily: "var(--font)",
                          }}>+ {tag}</button>
                      ))}
                    {tagSuggestions.filter((tag) => !(shop.tags ?? []).includes(tag)).length > 10 && (
                      <button onClick={() => setShowAllTags(!showAllTags)} style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 16, cursor: "pointer",
                        background: "var(--accent)22", border: "1px solid var(--accent)44",
                        color: "var(--accent)", fontFamily: "var(--font)",
                      }}>{showAllTags ? "折りたたむ" : "もっと見る"}</button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={saveBasic} disabled={saving} style={btnPrimary as React.CSSProperties}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>


        {/* 営業時間 */}
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
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      value={shop.open_time ? shop.open_time.slice(0, 2) : ""}
                      onChange={(e) => {
                        const h = e.target.value;
                        const m = shop.open_time ? shop.open_time.slice(3, 5) : "00";
                        setShop({ ...shop, open_time: h ? `${h}:${m}:00` : null });
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      <option value="">時</option>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, "0")}>{i}時</option>)}
                    </select>
                    <select
                      value={shop.open_time ? shop.open_time.slice(3, 5) : ""}
                      onChange={(e) => {
                        const h = shop.open_time ? shop.open_time.slice(0, 2) : "20";
                        setShop({ ...shop, open_time: e.target.value !== "" ? `${h}:${e.target.value}:00` : null });
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      <option value="">分</option>
                      {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}分</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>閉店時刻</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      value={shop.close_time ? shop.close_time.slice(0, 2) : ""}
                      onChange={(e) => {
                        const h = e.target.value;
                        const m = shop.close_time ? shop.close_time.slice(3, 5) : "00";
                        setShop({ ...shop, close_time: h ? `${h}:${m}:00` : null });
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      <option value="">時</option>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, "0")}>{i}時</option>)}
                    </select>
                    <select
                      value={shop.close_time ? shop.close_time.slice(3, 5) : ""}
                      onChange={(e) => {
                        const h = shop.close_time ? shop.close_time.slice(0, 2) : "02";
                        setShop({ ...shop, close_time: e.target.value !== "" ? `${h}:${e.target.value}:00` : null });
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      <option value="">分</option>
                      {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}分</option>)}
                    </select>
                  </div>
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
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1 }}>
                            <select
                              value={hours?.open ? hours.open.slice(0, 2) : ""}
                              onChange={(e) => {
                                const wh = { ...(shop.weekly_hours ?? {}) };
                                const m = hours?.open ? hours.open.slice(3, 5) : "00";
                                wh[day] = { ...wh[day], open: e.target.value ? `${e.target.value}:${m}` : "", closed: false };
                                setShop({ ...shop, weekly_hours: wh });
                              }}
                              style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 60 }}
                            >
                              <option value="">時</option>
                              {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, "0")}>{i}</option>)}
                            </select>
                            <select
                              value={hours?.open ? hours.open.slice(3, 5) : ""}
                              onChange={(e) => {
                                const wh = { ...(shop.weekly_hours ?? {}) };
                                const h = hours?.open ? hours.open.slice(0, 2) : "20";
                                wh[day] = { ...wh[day], open: `${h}:${e.target.value}`, closed: false };
                                setShop({ ...shop, weekly_hours: wh });
                              }}
                              style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 55 }}
                            >
                              {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>〜</span>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1 }}>
                            <select
                              value={hours?.close ? hours.close.slice(0, 2) : ""}
                              onChange={(e) => {
                                const wh = { ...(shop.weekly_hours ?? {}) };
                                const m = hours?.close ? hours.close.slice(3, 5) : "00";
                                wh[day] = { ...wh[day], close: e.target.value ? `${e.target.value}:${m}` : "", closed: false };
                                setShop({ ...shop, weekly_hours: wh });
                              }}
                              style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 60 }}
                            >
                              <option value="">時</option>
                              {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, "0")}>{i}</option>)}
                            </select>
                            <select
                              value={hours?.close ? hours.close.slice(3, 5) : ""}
                              onChange={(e) => {
                                const wh = { ...(shop.weekly_hours ?? {}) };
                                const h = hours?.close ? hours.close.slice(0, 2) : "02";
                                wh[day] = { ...wh[day], close: `${h}:${e.target.value}`, closed: false };
                                setShop({ ...shop, weekly_hours: wh });
                              }}
                              style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 55 }}
                            >
                              {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
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

        {/* SNS */}
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

        {/* 店舗画像 */}
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
        </>
        )}

        {/* キャスト */}
        {tab === "cast" && (
          <div>
            {/* サブタブ */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { key: "list", label: "👥 キャスト一覧" },
                { key: "cast_sales", label: "⭐ キャスト売上" },
                { key: "performance", label: "📈 パフォーマンス" },
                { key: "record", label: "📅 実績" },
                { key: "payroll", label: "💴 給与管理" },
              ].map(st => (
                <button key={st.key} onClick={() => setCastSubTab(st.key as any)} style={{
                  padding: "8px 18px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontFamily: "var(--font)", fontSize: 13, fontWeight: castSubTab === st.key ? 700 : 500,
                  background: castSubTab === st.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
                  color: castSubTab === st.key ? "#fff" : "var(--text-secondary)",
                }}>{st.label}</button>
              ))}
            </div>

            {/* パフォーマンスサブタブ */}
            {castSubTab === "performance" && shopId && (
              <CastPerformanceTab
                shopId={shopId}
                casts={casts as any}
                sectionStyle={sectionStyle}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                btnPrimary={btnPrimary}
              />
            )}

            {/* 実績サブタブ */}
            {castSubTab === "record" && shopId && (
              <CastRecordTab
                shopId={shopId}
                casts={casts}
                sectionStyle={sectionStyle}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
              />
            )}

            {/* キャスト売上サブタブ */}
            {castSubTab === "cast_sales" && shopId && (
              <SalesTab shopId={shopId} shopPlan={shop.plan || "free"} casts={casts} sectionStyle={sectionStyle} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} initialView="cast_sales" />
            )}

            {/* キャスト一覧サブタブ */}
            {castSubTab === "list" && (<div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                onClick={() => setEditCast({ shop_id: parseInt(shopId!), name: "", age: 20, comment: "", on_today: false, instagram: "", x_account: "", tiktok_account: "", birthplace: "" })}
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
                {/* 基本情報 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>名前 *</label>
                    <input value={editCast.name ?? ""} onChange={(e) => setEditCast({ ...editCast, name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>年齢</label>
                    <input type="number" value={editCast.age ?? ""} onChange={(e) => setEditCast({ ...editCast, age: parseInt(e.target.value) })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Instagram</label>
                    <input value={editCast.instagram ?? ""} onChange={(e) => setEditCast({ ...editCast, instagram: e.target.value })} style={inputStyle} placeholder="@なしで入力" />
                  </div>
                  <div>
                    <label style={labelStyle}>X（Twitter）</label>
                    <input value={editCast.x_account ?? ""} onChange={(e) => setEditCast({ ...editCast, x_account: e.target.value })} style={inputStyle} placeholder="@なしで入力" />
                  </div>
                  <div>
                    <label style={labelStyle}>TikTok</label>
                    <input value={editCast.tiktok_account ?? ""} onChange={(e) => setEditCast({ ...editCast, tiktok_account: e.target.value })} style={inputStyle} placeholder="@なしで入力" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>一言コメント</label>
                    <input value={editCast.comment ?? ""} onChange={(e) => setEditCast({ ...editCast, comment: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                {/* 時給（非公開） */}
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 8, letterSpacing: "0.1em" }}>💰 給与設定（非公開）</div>
                  <div>
                    <label style={labelStyle}>時給（円）</label>
                    <input type="number" value={editCast.hourly_wage ?? ""} onChange={(e) => setEditCast({ ...editCast, hourly_wage: e.target.value ? parseInt(e.target.value) : null })} placeholder="例：1200" style={{ ...inputStyle, maxWidth: 160 }} />
                  </div>
                </div>

                {/* キャストアカウント管理 */}
                {editCast.id && (
                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 10, letterSpacing: "0.1em" }}>🔑 ポータルアカウント</div>

                    {/* 発行済みの場合 */}
                    {castAccounts[editCast.id] ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", background: "var(--online-bg)", border: "1px solid var(--online-border)", borderRadius: 8 }}>
                          <span style={{ fontSize: 13, color: "var(--online)" }}>✅ 発行済み</span>
                          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{castAccounts[editCast.id]}</span>
                        </div>
                        <label style={{ ...labelStyle, fontSize: 11 }}>メールアドレスを変更</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="email" placeholder="新しいメールアドレス"
                            value={castAccountEmail[editCast.id!] || ""}
                            onChange={e => setCastAccountEmail({ ...castAccountEmail, [editCast.id!]: e.target.value })}
                            style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                          <button onClick={async () => {
                            const newEmail = castAccountEmail[editCast.id!]?.trim();
                            if (!newEmail) return;
                            const res = await fetch("/api/cast-account-update", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cast_id: editCast.id, shop_id: shopId, new_email: newEmail }) });
                            if (res.ok) { showMsg("メールアドレスを変更しました"); setCastAccounts({ ...castAccounts, [editCast.id!]: newEmail }); setCastAccountEmail({ ...castAccountEmail, [editCast.id!]: "" }); }
                            else showMsg("変更に失敗しました");
                          }} style={{ padding: "8px 14px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>変更</button>
                        </div>
                      </div>
                    ) : (
                      /* 未発行の場合 */
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>アカウントがまだ発行されていません。メールアドレスを入力してアカウントを発行してください。</div>
                        <label style={{ ...labelStyle, fontSize: 11 }}>メールアドレス</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="email" value={castAccountEmail[editCast.id!] || ""} onChange={e => setCastAccountEmail({ ...castAccountEmail, [editCast.id!]: e.target.value })} placeholder="例: cast@example.com" style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                          <button
                            onClick={async () => {
                              const email = castAccountEmail[editCast.id!];
                              if (!email) return;
                              setIssuingAccount(editCast.id!);
                              const cast = casts.find(c => c.id === editCast.id);
                              const res = await fetch("/api/issue-cast-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cast_id: editCast.id, email, shop_name: shop?.name || "" }) });
                              if (res.ok) {
                                showMsg(`${cast?.name}にアカウントを発行しました`);
                                setCastAccounts({ ...castAccounts, [editCast.id!]: email });
                                setCastAccountEmail({ ...castAccountEmail, [editCast.id!]: "" });
                              } else showMsg("発行に失敗しました");
                              setIssuingAccount(null);
                            }}
                            disabled={issuingAccount === editCast.id || !castAccountEmail[editCast.id!]}
                            style={{ padding: "8px 14px", borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent2))", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: !castAccountEmail[editCast.id!] ? 0.5 : 1 }}
                          >{issuingAccount === editCast.id ? "発行中..." : "発行"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* キャスト写真管理 */}
                {editCast.id && <CastPhotoManager castId={editCast.id} />}

                {/* 給与明細出力 */}
                {editCast.id && (
                  <div style={{ marginTop: 12 }}>
                    <PrintPayslipButton castId={editCast.id} castName={editCast.name || ""} shopId={shopId!} />
                  </div>
                )}

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
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{cast.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{cast.age}歳</span>
                    <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2 }}>{cast.comment}</div>
                    {cast.hourly_wage && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>時給 ¥{cast.hourly_wage.toLocaleString()}</div>}
                    {castAccounts[cast.id]
                      ? <div style={{ fontSize: 11, color: "var(--online)", marginTop: 2 }}>🔑 {castAccounts[cast.id]}</div>
                      : <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2 }}>🔑 アカウント未発行</div>
                    }
                    {/* 出勤時間（シフト管理で設定） */}
                    {cast.on_today === true && (
                      <div style={{ fontSize: 11, color: "var(--online)", marginTop: 4 }}>
                        ● 本日出勤{cast.today_start ? ` ${cast.today_start}〜${cast.today_end || "?"}` : ""}
                      </div>
                    )}
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
            </div>)}

            {/* 給与管理サブタブ */}
            {castSubTab === "payroll" && shopId && (
              <ShiftManagementTab
                shopId={shopId!}
                casts={casts}
                shiftRequests={shiftRequests}
                setShiftRequests={setShiftRequests}
                confirmedShifts={confirmedShifts}
                setConfirmedShifts={setConfirmedShifts}
                shiftLoading={shiftLoading}
                setShiftLoading={setShiftLoading}
                shiftMsg={shiftMsg}
                setShiftMsg={setShiftMsg}
                castAccountEmail={castAccountEmail}
                setCastAccountEmail={setCastAccountEmail}
                issuingAccount={issuingAccount}
                setIssuingAccount={setIssuingAccount}
                shopName={shop.name}
                shopClosedWeekDays={shop.closed_week_days ?? []}
                sectionStyle={sectionStyle}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                btnPrimary={btnPrimary}
                initialAllowanceCastId={allowanceJumpCastId}
                initialView="payroll"
                payrollOnly={true}
              />
            )}
          </div>
        )}


        {/* シフト管理 */}
        {tab === "shift" && (
          <ShiftManagementTab
            shopId={shopId!}
            casts={casts}
            shiftRequests={shiftRequests}
            setShiftRequests={setShiftRequests}
            confirmedShifts={confirmedShifts}
            setConfirmedShifts={setConfirmedShifts}
            shiftLoading={shiftLoading}
            setShiftLoading={setShiftLoading}
            shiftMsg={shiftMsg}
            setShiftMsg={setShiftMsg}
            castAccountEmail={castAccountEmail}
            setCastAccountEmail={setCastAccountEmail}
            issuingAccount={issuingAccount}
            setIssuingAccount={setIssuingAccount}
            shopName={shop.name}
            shopClosedWeekDays={shop.closed_week_days ?? []}
            sectionStyle={sectionStyle}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            btnPrimary={btnPrimary}
          />
        )}


        {/* つぶやき */}
        {tab === "tweet" && (
          <TweetTab shopId={shopId!} sectionStyle={sectionStyle} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} />
        )}

        {/* 求人 */}
        {tab === "jobs" && (
          <JobsTab shopId={shopId!} shopPlan={shop.plan} shopSlug={shop.slug} sectionStyle={sectionStyle} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} />
        )}

        {/* LINE通知 */}
        {tab === "line" && (
          <LineTab shopId={shopId!} sectionStyle={sectionStyle} btnPrimary={btnPrimary} />
        )}

        {/* 売上管理 */}
        {tab === "sales" && shopId && (
          <SalesTab shopId={shopId} shopPlan={shop.plan || "free"} casts={casts} sectionStyle={sectionStyle} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} />
        )}

        {/* ご意見・ご要望 */}
        {tab === "feedback" && (
          <FeedbackTab shopId={shopId!} sectionStyle={sectionStyle} inputStyle={inputStyle} btnPrimary={btnPrimary} />
        )}

        {/* プラン */}
        {tab === "plan" && (
          <div style={sectionStyle}>
            {/* 成功メッセージ */}
            {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("success") && (
              <div style={{ background: "var(--online-bg)", border: "1px solid var(--online-border)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, color: "var(--online)", fontWeight: 700 }}>
                ✅ プランへのアップグレードが完了しました！1ヶ月間は無料でご利用いただけます。
              </div>
            )}
            {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("canceled") === "1" && (
              <div style={{ background: "#ff444418", border: "1px solid #ff444444", borderRadius: 12, padding: "14px 16px", marginBottom: 20, color: "#ff4444" }}>
                決済がキャンセルされました。
              </div>
            )}

            {/* 現在のプラン */}
            {(()=>{
              const planInfo: Record<string, { label: string; icon: string; price: string; color: string }> = {
                free:     { label: "フリープラン", icon: "⭐", price: "¥0/月", color: "#10b981" },
                light:    { label: "フリープラン", icon: "⭐", price: "¥0/月", color: "#10b981" },
                standard: { label: "スタンダードプラン", icon: "🌙", price: "¥3,000/月", color: "#a78bfa" },
                premium:  { label: "プレミアムプラン", icon: "💡", price: "¥5,000/月", color: "#f472b6" },
                pro:      { label: "プロプラン", icon: "🌃", price: "¥8,000/月", color: "#fbbf24" },
              };
              const rawPlan = shop.plan || "free";
              const currentPlan = rawPlan === "gold" ? "standard" : rawPlan; // gold→standard正規化
              const current = planInfo[currentPlan] || planInfo.free;
              const isPaid = ["standard","premium","pro"].includes(currentPlan);

              return (
                <>
                  {/* 現在のプラン表示 */}
                  <div style={{ background: `${current.color}15`, border: `1px solid ${current.color}44`, borderRadius: 16, padding: "18px 20px", marginBottom: 24 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>現在のプラン</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{current.icon}</span>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)" }}>{current.label}</div>
                        <div style={{ fontSize: 13, color: current.color, fontWeight: 700 }}>{current.price}（税込）</div>
                      </div>
                    </div>
                    {isPaid && (
                      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                        🎁 初月無料トライアル中 · 翌月以降に請求が発生します
                      </div>
                    )}
                  </div>

                  {/* プラン一覧 */}
                  {(()=>{
                    const plans = [
                      {
                        key: "standard", name: "スタンダード", icon: "🌙", price: "¥3,000", color: "#a78bfa",
                        desc: "売上・給与をまるごと管理",
                        features: ["ライトの全機能", "伝票・日次売上管理", "月次売上グラフ・分析", "キャスト別売上・成績", "給与計算・明細PDF出力", "CSVエクスポート"],
                      },
                      {
                        key: "premium", name: "プレミアム", icon: "💡", price: "¥5,000", color: "#f472b6",
                        desc: "検索上位・目立つ掲載で集客強化",
                        features: ["ライトの全機能", "バナー写真・キャスト写真掲載", "おすすめ優先表示", "求人情報の掲載", "LINE通知"],
                      },
                      {
                        key: "pro", name: "プロ", icon: "🌃", price: "¥8,000", color: "#fbbf24",
                        desc: "全機能無制限。これ一つで完結",
                        features: ["全プランの機能をすべて含む", "バナー・優先表示・求人", "売上・給与・成績管理", "LINE通知", "優先サポート"],
                        badge: "おすすめ",
                      },
                    ];

                    const trialUsed = (shop as any).trial_used === true;
                    return plans.map(plan => {
                      const isCurrent = plan.key === currentPlan;
                      return (
                        <div key={plan.key} style={{
                          background: plan.badge ? `${plan.color}12` : "var(--bg-input)",
                          border: `1px solid ${isCurrent ? plan.color : plan.badge ? plan.color+"44" : "var(--border)"}`,
                          borderRadius: 16, padding: "18px 20px", marginBottom: 12, position: "relative",
                        }}>
                          {plan.badge && !isCurrent && (
                            <div style={{ position: "absolute", top: -10, right: 16, background: `linear-gradient(135deg,${plan.color},#db2777)`, fontSize: 10, color: "#fff", fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>
                              ⭐ {plan.badge}
                            </div>
                          )}
                          {isCurrent && (
                            <div style={{ position: "absolute", top: -10, right: 16, background: plan.color, fontSize: 10, color: "#fff", fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>
                              ✓ 現在のプラン
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, color: plan.color, letterSpacing: 2, marginBottom: 3 }}>{plan.icon} {plan.name.toUpperCase()}</div>
                              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>/月（税込）</span></div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{plan.desc}</div>
                            </div>
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            {plan.features.map(f => (
                              <div key={f} style={{ fontSize: 12, color: "rgba(200,190,220,0.8)", display: "flex", gap: 6, marginBottom: 4 }}>
                                <span style={{ color: plan.color }}>✓</span>{f}
                              </div>
                            ))}
                          </div>
                          {!isCurrent && (
                            <button
                              onClick={async () => {
                                const btn = document.getElementById(`upgrade-btn-${plan.key}`) as HTMLButtonElement;
                                if (btn) { btn.disabled = true; btn.textContent = "処理中..."; }
                                try {
                                  const res = await fetch("/api/stripe/checkout", {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ shop_id: shopId, owner_id: ownerId, plan: plan.key }),
                                  });
                                  const data = await res.json();
                                  if (data.url && data.url.startsWith("https://checkout.stripe.com")) {
                                    window.location.href = data.url;
                                  } else {
                                    showMsg("エラー: " + (data.error || "決済画面の起動に失敗しました"));
                                    if (btn) { btn.disabled = false; btn.textContent = trialUsed ? "プロプランに申し込む" : "1ヶ月無料で試す（初回のみ）"; }
                                  }
                                } catch(e: any) {
                                  showMsg("通信エラー: " + e.message);
                                  if (btn) { btn.disabled = false; btn.textContent = trialUsed ? "プロプランに申し込む" : "1ヶ月無料で試す（初回のみ）"; }
                                }
                              }}
                              id={`upgrade-btn-${plan.key}`}
                              style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg,${plan.color}44,${plan.color}22)`, border: `1px solid ${plan.color}55`, borderRadius: 12, color: plan.color, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)" }}
                            >
                              {plan.key === "pro"
                                ? (trialUsed ? "🚀 プロプランに申し込む" : "🚀 1ヶ月無料で試す（初回のみ）")
                                : `🚀 ${plan.name}プランに申し込む`}
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}

                  {/* 有料プランの管理 */}
                  {isPaid && (
                    <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20, marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>プランの管理</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <button
                          onClick={async () => {
                            const res = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId }) });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                            else showMsg(data.error || "管理ポータルの起動に失敗しました");
                          }}
                          style={{ padding: "10px 20px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font)", textAlign: "left" as const }}
                        >
                          🔧 お支払い情報・カードの変更
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("ライトプラン（無料）に変更しますか？\n有料機能が利用できなくなります。")) return;
                            const res = await fetch("/api/stripe/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId }) });
                            const data = await res.json();
                            if (data.success) { showMsg("ライトプランに変更しました"); setTimeout(() => window.location.reload(), 1500); }
                            else showMsg(data.error || "変更に失敗しました");
                          }}
                          style={{ padding: "10px 20px", borderRadius: 10, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 13, cursor: "pointer", fontFamily: "var(--font)", textAlign: "left" as const }}
                        >
                          ⬇️ ライトプランに変更（解約）
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 10 }}>解約すると当月末まで現在のプランが継続します。</p>
                    </div>
                  )}
                </>
              );
            })()}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <button onClick={requestClose} style={{ width: "100%", padding: "12px", background: "#ff444420", border: "1px solid #ff444444", borderRadius: 12, color: "#ff4444", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                掲載終了を申請する
              </button>
              <p style={{ color: "var(--text-hint)", fontSize: 11, textAlign: "center", marginTop: 8 }}>申請後、担当者からご連絡します。</p>
            </div>
          </div>
        )}

        {/* アカウント管理 */}
        {tab === "password" && (
          <div>
            {/* ログイン情報 */}
            <div style={{ ...sectionStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.1em" }}>🔑 ログイン情報</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                現在のメールアドレス：<span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{typeof window !== "undefined" ? localStorage.getItem("owner_email") || "—" : "—"}</span>
              </div>
            </div>

            {/* メールアドレス変更 */}
            <div style={{ ...sectionStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.1em" }}>📧 メールアドレス変更</div>
              <div style={fieldStyle}>
                <label style={labelStyle}>新しいメールアドレス</label>
                <input type="email" value={newOwnerEmail} onChange={e => setNewOwnerEmail(e.target.value)} placeholder="new@example.com" style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>新しいメールアドレス（確認）</label>
                <input type="email" value={newOwnerEmail2} onChange={e => setNewOwnerEmail2(e.target.value)} placeholder="new@example.com" style={inputStyle} />
              </div>
              <button
                onClick={async () => {
                  if (!newOwnerEmail || newOwnerEmail !== newOwnerEmail2) { setPwMsg("メールアドレスが一致しません"); return; }
                  const res = await fetch("/api/owner-account-update", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ owner_id: ownerId, new_email: newOwnerEmail }),
                  });
                  if (res.ok) {
                    setPwMsg("メールアドレスを変更しました");
                    localStorage.setItem("owner_email", newOwnerEmail);
                    setNewOwnerEmail(""); setNewOwnerEmail2("");
                  } else {
                    const d = await res.json();
                    setPwMsg(d.error || "変更に失敗しました");
                  }
                }}
                disabled={saving}
                style={btnPrimary as React.CSSProperties}
              >メールアドレスを変更する</button>
            </div>

            {/* パスワード変更 */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.1em" }}>🔒 パスワード変更</div>
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
          </div>
        )}
      </main>
    </div>
  );
}