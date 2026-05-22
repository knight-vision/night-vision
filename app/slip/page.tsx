"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MENU_PRESETS = [
  { name: "セット料金", price: 3000 },
  { name: "ビール", price: 800 },
  { name: "ハイボール", price: 800 },
  { name: "ソフトドリンク", price: 600 },
  { name: "シャンパン（モエ）", price: 35000 },
  { name: "ドンペリ(白)", price: 80000 },
  { name: "ドンペリ(黒)", price: 120000 },
  { name: "場内指名料", price: 1000 },
  { name: "同伴料", price: 2000 },
  { name: "延長料", price: 3000 },
];

const SHIMEI_TYPES = ["フリー", "場内指名", "本指名"] as const;
const PAYMENT_TYPES = ["現金", "カード", "請求書"] as const;
const TAX_RATE = 0.1;

type Cast = { id: number; name: string };
type Item = { name: string; qty: number; price: number };
type CastEntry = { cast_id: string; cast_name: string; type: string; timeFrom: string; timeTo: string };

function fmtYen(n: number) { return "¥" + Number(n).toLocaleString(); }

export default function SlipPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tableNo, setTableNo] = useState("");
  const [payment, setPayment] = useState<typeof PAYMENT_TYPES[number]>("現金");
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0 }]);
  const [castEntries, setCastEntries] = useState<CastEntry[]>([{ cast_id: "", cast_name: "", type: "フリー", timeFrom: "", timeTo: "" }]);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sid = localStorage.getItem("owner_shop_id");
    if (!sid) { window.location.href = "/owner/login"; return; }
    setShopId(sid);
    supabase.from("casts").select("id, name").eq("shop_id", Number(sid)).order("id").then(({ data }) => {
      if (data) setCasts(data);
    });
  }, []);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const addItem = () => setItems([...items, { name: "", qty: 1, price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof Item, val: any) => setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const applyPreset = (i: number, preset: typeof MENU_PRESETS[number]) => setItems(items.map((item, idx) => idx === i ? { ...item, name: preset.name, price: preset.price } : item));

  const addCast = () => setCastEntries([...castEntries, { cast_id: "", cast_name: "", type: "フリー", timeFrom: "", timeTo: "" }]);
  const removeCast = (i: number) => setCastEntries(castEntries.filter((_, idx) => idx !== i));
  const updateCast = (i: number, field: keyof CastEntry, val: string) => setCastEntries(castEntries.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true); setError("");
    try {
      // 1. 日次売上に反映
      const salesData = {
        shop_id: Number(shopId), date,
        cash_sales: payment === "現金" ? total : 0,
        card_sales: payment === "カード" ? total : 0,
        invoice_sales: payment === "請求書" ? total : 0,
      };
      // upsertで既存の日付があれば加算
      const { data: existing } = await supabase.from("daily_sales").select("*").eq("shop_id", Number(shopId)).eq("date", date).single();
      if (existing) {
        await supabase.from("daily_sales").update({
          cash_sales: (existing.cash_sales || 0) + salesData.cash_sales,
          card_sales: (existing.card_sales || 0) + salesData.card_sales,
          invoice_sales: (existing.invoice_sales || 0) + salesData.invoice_sales,
        }).eq("id", existing.id);
      } else {
        await supabase.from("daily_sales").insert({ ...salesData, opening_cash: 0, cost: 0 });
      }

      // 2. キャスト売上に反映（場内指名・本指名）
      for (const entry of castEntries) {
        if (!entry.cast_id) continue;
        const salesType = entry.type === "本指名" ? "honshimei" : entry.type === "場内指名" ? "baai" : null;
        if (salesType) {
          const typeItem = items.find(i => i.name.includes("指名"));
          const amount = typeItem ? typeItem.qty * typeItem.price : (salesType === "honshimei" ? 16000 : 1000);
          await supabase.from("cast_sales").insert({
            shop_id: Number(shopId), cast_id: Number(entry.cast_id),
            date, sales_type: salesType, amount, count: 1,
            memo: `テーブル${tableNo} ${memo}`.trim(),
          });
        }
        // 同伴
        if (items.some(i => i.name.includes("同伴"))) {
          await supabase.from("cast_sales").insert({
            shop_id: Number(shopId), cast_id: Number(entry.cast_id),
            date, sales_type: "douhan", amount: items.find(i=>i.name.includes("同伴"))?.price||2000, count: 1, memo: `テーブル${tableNo}`,
          });
        }
        // ボトルバック（シャンパン系）
        const bottleItem = items.find(i => i.name.includes("モエ") || i.name.includes("ドンペリ") || i.name.includes("シャンパン"));
        if (bottleItem) {
          const back = Math.floor(bottleItem.qty * bottleItem.price * 0.1); // 10%バック
          await supabase.from("cast_sales").insert({
            shop_id: Number(shopId), cast_id: Number(entry.cast_id),
            date, sales_type: "bottle", amount: back, count: 1,
            memo: `${bottleItem.name} (10%バック)`,
          });
        }
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setItems([{ name: "", qty: 1, price: 0 }]);
        setCastEntries([{ cast_id: "", cast_name: "", type: "フリー", timeFrom: "", timeTo: "" }]);
        setTableNo(""); setMemo(""); setPayment("現金");
      }, 2000);
    } catch (e: any) {
      setError(e.message || "保存に失敗しました");
    }
    setSaving(false);
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "#0d0817", border: "1px solid #3d2a60",
    borderRadius: 7, color: "#e8e0f0", padding: "9px 12px", fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #12101a 50%, #0d0b14 100%)",
      fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
      color: "#e8e0f0", paddingBottom: 60,
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(90deg, #1a0a2e 0%, #2d1054 50%, #1a0a2e 100%)",
        borderBottom: "1px solid #7c3aed44",
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 4px 32px #7c3aed22",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 20, letterSpacing: 3, fontWeight: 700, color: "#c4b5fd" }}>🦉 NIGHT VISION</span>
          <span style={{ background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 6, padding: "3px 12px", fontSize: 11, color: "#a78bfa", letterSpacing: 2 }}>
            伝票入力
          </span>
        </div>
        <a href="/owner/dashboard" style={{ color: "#7c3aed", fontSize: 13, textDecoration: "none" }}>← 管理画面</a>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 0" }}>

        {/* 基本情報 */}
        <SectionTitle>基本情報</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <FieldLabel>日付</FieldLabel>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
          <div>
            <FieldLabel>テーブル No.</FieldLabel>
            <input value={tableNo} onChange={e => setTableNo(e.target.value)} placeholder="例: A-3" style={inp} />
          </div>
        </div>
        <div>
          <FieldLabel>支払方法</FieldLabel>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {PAYMENT_TYPES.map(p => (
              <button key={p} onClick={() => setPayment(p)} style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
                background: payment === p ? "#7c3aed" : "#1e1530",
                color: payment === p ? "#fff" : "#8b7aa8",
                border: payment === p ? "1px solid #7c3aed" : "1px solid #2d2050",
                boxShadow: payment === p ? "0 0 14px #7c3aed66" : "none",
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* キャスト */}
        <SectionTitle mt={28}>キャスト</SectionTitle>
        {castEntries.map((c, i) => (
          <div key={i} style={{ background: "#160e28", border: "1px solid #2d1f4a", borderRadius: 12, padding: "14px 16px", marginBottom: 10, position: "relative" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>キャスト名</FieldLabel>
                <select value={c.cast_id} onChange={e => {
                  const cast = casts.find(c => String(c.id) === e.target.value);
                  updateCast(i, "cast_id", e.target.value);
                  if (cast) updateCast(i, "cast_name", cast.name);
                }} style={inp}>
                  <option value="">選択...</option>
                  {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>指名種別</FieldLabel>
                <select value={c.type} onChange={e => updateCast(i, "type", e.target.value)} style={inp}>
                  {SHIMEI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>入店時刻</FieldLabel>
                <input type="time" value={c.timeFrom} onChange={e => updateCast(i, "timeFrom", e.target.value)} style={inp} />
              </div>
              <div>
                <FieldLabel>退店時刻</FieldLabel>
                <input type="time" value={c.timeTo} onChange={e => updateCast(i, "timeTo", e.target.value)} style={inp} />
              </div>
            </div>
            {castEntries.length > 1 && (
              <button onClick={() => removeCast(i)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#7c3aed55", cursor: "pointer", fontSize: 20 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addCast} style={{ width: "100%", padding: 11, background: "transparent", border: "1px dashed #3d2a60", borderRadius: 10, color: "#7c3aed", fontSize: 14, cursor: "pointer", letterSpacing: 2, fontFamily: "inherit", marginTop: 4 }}>
          ＋ キャストを追加
        </button>

        {/* 注文品目 */}
        <SectionTitle mt={28}>注文品目</SectionTitle>
        {items.map((item, i) => (
          <div key={i} style={{ background: "#160e28", border: "1px solid #2d1f4a", borderRadius: 12, padding: "14px 16px", marginBottom: 10, position: "relative" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {MENU_PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(i, p)} style={{
                  background: "#1e1530", border: "1px solid #3d2a60", borderRadius: 5,
                  color: "#b39ddb", fontSize: 11, padding: "3px 9px", cursor: "pointer", whiteSpace: "nowrap",
                }}>{p.name}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px", gap: 10 }}>
              <div>
                <FieldLabel>品目名</FieldLabel>
                <input value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="品目を入力" style={inp} />
              </div>
              <div>
                <FieldLabel>数量</FieldLabel>
                <input type="number" min={1} value={item.qty} onChange={e => updateItem(i, "qty", Number(e.target.value))} style={{ ...inp, textAlign: "center" }} />
              </div>
              <div>
                <FieldLabel>単価（¥）</FieldLabel>
                <input type="number" min={0} value={item.price || ""} onChange={e => updateItem(i, "price", Number(e.target.value))} style={{ ...inp, textAlign: "right" }} />
              </div>
            </div>
            <div style={{ textAlign: "right", marginTop: 8, color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>
              小計: {fmtYen(item.qty * item.price)}
            </div>
            {items.length > 1 && (
              <button onClick={() => removeItem(i)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#7c3aed55", cursor: "pointer", fontSize: 20 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addItem} style={{ width: "100%", padding: 11, background: "transparent", border: "1px dashed #3d2a60", borderRadius: 10, color: "#7c3aed", fontSize: 14, cursor: "pointer", letterSpacing: 2, fontFamily: "inherit", marginTop: 4 }}>
          ＋ 品目を追加
        </button>

        {/* 合計 */}
        <SectionTitle mt={28}>合計</SectionTitle>
        <div style={{ background: "#160e28", border: "1px solid #7c3aed44", borderRadius: 12, padding: "20px 24px" }}>
          <AmountRow label="小計" value={fmtYen(subtotal)} />
          <AmountRow label={`消費税 (${TAX_RATE * 100}%)`} value={fmtYen(tax)} />
          <div style={{ borderTop: "1px solid #7c3aed33", margin: "14px 0" }} />
          <AmountRow label="合計" value={fmtYen(total)} large accent />
        </div>

        {/* メモ */}
        <SectionTitle mt={28}>メモ</SectionTitle>
        <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="特記事項など..." rows={2} style={{ width: "100%", background: "#0d0817", border: "1px solid #3d2a60", borderRadius: 7, color: "#e8e0f0", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />

        {error && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 13 }}>{error}</div>}

        {/* 保存ボタン */}
        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", marginTop: 24, padding: 16,
          background: saved ? "linear-gradient(90deg, #059669, #10b981)" : "linear-gradient(90deg, #7c3aed, #a855f7)",
          border: "none", borderRadius: 12, color: "#fff", fontSize: 17, fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer", letterSpacing: 2, fontFamily: "inherit",
          boxShadow: saved ? "0 0 24px #059669aa" : "0 0 24px #7c3aedaa",
          transition: "all 0.3s", opacity: saving ? 0.7 : 1,
        }}>
          {saved ? "✓ 保存しました" : saving ? "保存中..." : "伝票を保存する"}
        </button>

      </div>
    </div>
  );
}

function SectionTitle({ children, mt = 0 }: { children: React.ReactNode; mt?: number }) {
  return (
    <div style={{ marginTop: mt, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1, height: 1, background: "#7c3aed33" }} />
      <span style={{ fontSize: 11, letterSpacing: 3, color: "#7c3aed", textTransform: "uppercase" as const }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "#7c3aed33" }} />
    </div>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#8b7aa8", marginBottom: 5, letterSpacing: 1 }}>{children}</div>;
}
function AmountRow({ label, value, large, accent }: { label: string; value: string; large?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ color: "#8b7aa8", fontSize: large ? 15 : 13 }}>{label}</span>
      <span style={{ color: accent ? "#c4b5fd" : "#e8e0f0", fontSize: large ? 22 : 15, fontWeight: large ? 700 : 400, letterSpacing: 1 }}>{value}</span>
    </div>
  );
}
