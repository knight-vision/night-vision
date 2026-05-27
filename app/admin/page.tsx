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
  const [tab, setTab] = useState<"shops" | "casts" | "analytics" | "applications">("applications");
  const [shopSearch, setShopSearch] = useState("");
  const [analytics, setAnalytics] = useState<{ today: number; week: number; month: number; daily: { date: string; count: number }[] } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [editShop, setEditShop] = useState<Partial<Shop> | null>(null);
  const [editCast, setEditCast] = useState<Partial<Cast> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  useEffect(() => {
    if (authed) {
      fetchShops();
      fetchCasts();
      loadApplications();
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

  async function loadApplications() {
    setAppsLoading(true);
    const res = await fetch("/api/admin/applications");
    if (res.ok) setApplications(await res.json());
    setAppsLoading(false);
  }

  async function approveApplication(id: string) {
    if (!confirm("この申請を承認してアカウントを作成しますか？")) return;
    const res = await fetch("/api/admin/applications/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) { setMsg("承認しました！アカウントが作成されました。"); await loadApplications(); }
    else setMsg("エラー: " + (data.error || "失敗しました"));
    setTimeout(() => setMsg(""), 3000);
  }

  async function rejectApplication(id: string) {
    if (!confirm("この申請を却下しますか？")) return;
    const res = await fetch("/api/admin/applications/reject", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) { setMsg("却下しました"); await loadApplications(); }
    setTimeout(() => setMsg(""), 2000);
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

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    // JST (UTC+9) で今日の日付を計算
    const jstOffset = 9 * 60 * 60 * 1000;
    const nowJST = new Date(Date.now() + jstOffset);
    const toJSTDateStr = (d: Date) => d.toISOString().slice(0, 10);

    const todayJST = toJSTDateStr(nowJST);
    const todayUTC = new Date(todayJST + "T00:00:00+09:00").toISOString(); // JSTの0時をUTCに変換

    const weekAgoJST = new Date(nowJST); weekAgoJST.setDate(nowJST.getDate() - 7);
    const weekUTC = new Date(toJSTDateStr(weekAgoJST) + "T00:00:00+09:00").toISOString();

    const monthAgoJST = new Date(nowJST); monthAgoJST.setDate(nowJST.getDate() - 30);
    const monthUTC = new Date(toJSTDateStr(monthAgoJST) + "T00:00:00+09:00").toISOString();

    const [todayRes, weekRes, monthRes, dailyRes] = await Promise.all([
      supabase.from("view_events").select("id", { count: "exact" }).gte("created_at", todayUTC),
      supabase.from("view_events").select("id", { count: "exact" }).gte("created_at", weekUTC),
      supabase.from("view_events").select("id", { count: "exact" }).gte("created_at", monthUTC),
      supabase.from("view_events").select("created_at").gte("created_at", weekUTC).order("created_at"),
    ]);

    // 日別集計（JST基準）
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowJST); d.setDate(nowJST.getDate() - i);
      dailyMap[toJSTDateStr(d)] = 0;
    }
    (dailyRes.data || []).forEach((e: any) => {
      // UTC→JSTに変換してから日付を取得
      const jstDate = new Date(new Date(e.created_at).getTime() + jstOffset);
      const day = toJSTDateStr(jstDate);
      if (dailyMap[day] !== undefined) dailyMap[day]++;
    });

    setAnalytics({
      today: todayRes.count || 0,
      week: weekRes.count || 0,
      month: monthRes.count || 0,
      daily: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
    });
    setAnalyticsLoading(false);
  };

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
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "applications", label: "🔔 登録申請" },
            { key: "shops", label: "店舗管理" },
            { key: "casts", label: "キャスト管理" },
            { key: "analytics", label: "📊 アクセス解析" },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key as any); if (t.key==="applications") loadApplications(); }} style={{
              padding: "8px 20px", borderRadius: 20, border: "none", cursor: "pointer",
              fontWeight: tab === t.key ? 700 : 500, fontSize: 13, fontFamily: "var(--font)",
              background: tab === t.key ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--bg-input)",
              color: tab === t.key ? "#fff" : "var(--text-muted)",
              position: "relative" as const,
            }}>
              {t.label}
              {t.key === "applications" && applications.filter(a=>a.status==="pending").length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "#f472b6", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {applications.filter(a=>a.status==="pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 登録申請タブ */}
        {tab === "applications" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800 }}>店舗会員登録 申請一覧</h2>
              <button onClick={loadApplications} style={{ ...btnStyle, fontSize: 12, padding: "8px 14px" }}>🔄 更新</button>
            </div>
            {appsLoading ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>読み込み中...</div>
            ) : applications.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>申請はありません</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {applications.map(app => (
                  <div key={app.id} style={{
                    background: "var(--bg-card)", border: `1px solid ${app.status==="pending"?"#f472b644":"var(--border)"}`,
                    borderRadius: 14, padding: 18,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
                          {app.shops?.name || `Shop ID: ${app.shop_id}`}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{app.email}</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: app.status==="pending"?"#f472b422":app.status==="approved"?"#10b98122":"#ff444422",
                        color: app.status==="pending"?"#f472b6":app.status==="approved"?"#10b981":"#ff4444",
                        border: `1px solid ${app.status==="pending"?"#f472b444":app.status==="approved"?"#10b98144":"#ff444444"}`,
                      }}>
                        {app.status==="pending"?"承認待ち":app.status==="approved"?"承認済み":"却下"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, background: "var(--bg-input)", borderRadius: 10, padding: "10px 14px" }}>
                      <span style={{ fontSize: 18 }}>📞</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: "#f472b6", letterSpacing: 1 }}>{app.tel}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-hint)", marginBottom: 12 }}>
                      申請日時: {new Date(app.created_at).toLocaleString("ja-JP")}
                    </div>
                    {app.status === "pending" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => approveApplication(app.id)} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          ✅ 承認してアカウント作成
                        </button>
                        <button onClick={() => rejectApplication(app.id)} style={{ padding: "10px 16px", background: "#ff444418", border: "1px solid #ff444444", borderRadius: 10, color: "#ff4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          却下
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 店舗管理 */}
        {/* アナリティクスタブ */}
        {tab === "analytics" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800 }}>アクセス解析</h2>
              <button onClick={fetchAnalytics} style={{ ...btnStyle, fontSize: 12, padding: "8px 14px" }}>🔄 更新</button>
            </div>
            {analyticsLoading ? <p style={{ color: "var(--text-muted)" }}>読み込み中...</p> : analytics ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "今日", value: analytics.today, color: "var(--accent)" },
                    { label: "過去7日", value: analytics.week, color: "#00d4ff" },
                    { label: "過去30日", value: analytics.month, color: "#00e5a0" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>PV</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>過去7日間の日別PV</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {analytics.daily.map(d => {
                      const max = Math.max(...analytics.daily.map(x => x.count), 1);
                      const h = Math.round((d.count / max) * 72);
                      const isToday = d.date === new Date().toISOString().slice(0,10);
                      return (
                        <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.count}</div>
                          <div style={{ width: "100%", height: h || 2, background: isToday ? "var(--accent)" : "var(--accent)44", borderRadius: 4 }} />
                          <div style={{ fontSize: 9, color: isToday ? "var(--accent)" : "var(--text-hint)", fontWeight: isToday ? 700 : 400 }}>
                            {d.date.slice(5).replace("-","/")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={fetchAnalytics} style={btnStyle}>データを取得</button>
            )}
          </div>
        )}

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
                    { key: "open_hour", label: "営業時間テキスト" },
                    { key: "tel", label: "電話番号" },
                    { key: "instagram", label: "Instagram" },
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

                  {/* 定休日（選択式） */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>定休日</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["日", "月", "火", "水", "木", "金", "土"].map(day => {
                        const days: string[] = (editShop as any).closed_week_days ?? [];
                        const active = days.includes(day);
                        return (
                          <button key={day} type="button" onClick={() => {
                            const next = active ? days.filter((d: string) => d !== day) : [...days, day];
                            setEditShop({ ...editShop, closed_week_days: next, closed_days: next.join("・") } as any);
                          }} style={{
                            padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                            fontFamily: "var(--font)", fontSize: 13, fontWeight: active ? 700 : 500,
                            background: active ? "var(--accent)22" : "var(--bg-input)",
                            border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                            color: active ? "var(--accent)" : "var(--text-secondary)",
                          }}>{day}曜日</button>
                        );
                      })}
                    </div>
                    {((editShop as any).closed_week_days ?? []).length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                        定休日: {((editShop as any).closed_week_days ?? []).map((d: string) => d + "曜日").join("・")}
                      </div>
                    )}
                  </div>

                  {/* 開店・閉店時刻 */}
                  <div>
                    <label style={labelStyle}>開店時刻</label>
                    <select value={(editShop as any).open_time ?? ""} onChange={e => setEditShop({ ...editShop, open_time: e.target.value } as any)} style={inputStyle}>
                      <option value="">未設定</option>
                      {Array.from({length: 24}, (_, i) => i).map(h => (
                        ["00","30"].map(m => <option key={`${h}:${m}`} value={`${String(h).padStart(2,"0")}:${m}`}>{h >= 24 ? `翌${h-24}` : h}時{m !== "00" ? m + "分" : ""}</option>)
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>閉店時刻</label>
                    <select value={(editShop as any).close_time ?? ""} onChange={e => setEditShop({ ...editShop, close_time: e.target.value } as any)} style={inputStyle}>
                      <option value="">未設定</option>
                      {Array.from({length: 31}, (_, i) => i).map(h => (
                        ["00","30"].map(m => <option key={`${h}:${m}`} value={`${String(h%24).padStart(2,"0")}:${m}`}>{h >= 24 ? `翌${h-24}` : h}時{m !== "00" ? m + "分" : ""}</option>)
                      ))}
                    </select>
                  </div>

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

            {/* 店舗名検索 */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={shopSearch}
                onChange={e => setShopSearch(e.target.value)}
                placeholder="🔍 店舗名で検索..."
                style={{ ...inputStyle, maxWidth: 320 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shops.filter(s => !shopSearch || s.name.toLowerCase().includes(shopSearch.toLowerCase())).map((shop) => (
                <div key={shop.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{shop.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                      {shop.type} · {shop.area_category} · {shop.plan}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setEditShop(shop)} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "var(--bg-input)", color: "var(--text-secondary)" }}>編集</button>
                    <button onClick={() => deleteShop(shop.id)} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "#ff444420", color: "#ff4444" }}>削除</button>
                    <button onClick={() => issueOwnerAccount(shop)} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "#00994d20", color: "#00994d" }}>アカウント発行</button>
                    <button onClick={async () => {
                      const res = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shop.id }) });
                      const data = await res.json();
                      if (data.url) {
                        await navigator.clipboard.writeText(data.url);
                        alert(`招待URLをコピーしました！\n\n${data.url}\n\nInstagram DMに貼り付けてください。`);
                      } else alert("エラー: " + data.error);
                    }} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, background: "#7c3aed20", color: "#a78bfa" }}>🔗 招待URL</button>
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