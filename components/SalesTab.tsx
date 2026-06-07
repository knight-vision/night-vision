"use client";
import { useState, useEffect, useCallback } from "react";
import CastSalesDetail from "@/components/CastSalesDetail";
import Link from "next/link";

function PlanGate({ planName }: { planName: string }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:700, color:"var(--text-primary)", marginBottom:8 }}>
        {planName}プラン以上の機能です
      </div>
      <div style={{ fontSize:14, color:"var(--text-muted)", marginBottom:24, lineHeight:1.8 }}>
        売上管理・給与計算・キャスト成績管理は<br />
        スタンダードプラン（¥3,000/月）から利用できます。
      </div>
      <Link href="/for-owners#plans" style={{
        display:"inline-block", padding:"12px 28px",
        background:"linear-gradient(135deg,#7c3aed,#db2777)",
        color:"#fff", borderRadius:25, fontSize:14, fontWeight:700, textDecoration:"none",
      }}>プランを見る →</Link>
    </div>
  );
}

type Cast = { id: number; name: string; hourly_wage: number | null };
type DailySales = { id?: string; date: string; cash_sales: number; card_sales: number; cost: number; memo: string };
type CastSale = { id?: string; cast_id: number; date: string; sales_type: string; amount: number; count: number; memo: string };
type ConfirmedShift = { cast_id: number; date: string; start_time: string; end_time: string };
type Allowance = { cast_id: number; date: string; amount: number; label: string };
type BackType = "fixed" | "rate" | "none";
type ShopMenu = {
  id: string; name: string; price: number;
  back_type?: BackType;
  back_value?: number; // fixedなら円、rateなら0〜1の率
  is_default?: boolean; // 伝票入力時に最初から表示するか
  nomination_type?: string; // 対応する指名種別（本指名/場内指名/同伴/アフター/出張）。選ぶと伝票に自動追加
};
// 品目の担当キャスト配分（複数キャストで割合配分、合計100%）
type ItemAllocation = { cast_id: string; type: string; pct: number };
type SlipItem = {
  name: string; qty: number; price: number;
  menu_id?: string;          // 品名マスタのID（手入力品目はundefined）
  back_type?: BackType;      // バック方式（品名マスタから自動。手入力はnone）
  back_value?: number;       // fixedなら円、rateなら0〜1
  allocations?: ItemAllocation[]; // この品目を担当するキャストと配分%
};
type SlipCast = { cast_id: string; type: string };

const DEFAULT_PRESETS: ShopMenu[] = [
  { id: "p1", name: "セット料金", price: 3000, back_type: "none", back_value: 0, is_default: true },
  { id: "p2", name: "ビール", price: 800, back_type: "none", back_value: 0 },
  { id: "p3", name: "ハイボール", price: 800, back_type: "rate", back_value: 0.1 },
  { id: "p4", name: "ソフトドリンク", price: 600, back_type: "rate", back_value: 0.1 },
  { id: "p5", name: "シャンパン（モエ）", price: 35000, back_type: "rate", back_value: 0.1 },
  { id: "p6", name: "本指名料", price: 3000, back_type: "fixed", back_value: 1500, nomination_type: "本指名" },
  { id: "p7", name: "場内指名料", price: 1000, back_type: "fixed", back_value: 500, nomination_type: "場内指名" },
  { id: "p8", name: "同伴料", price: 2000, back_type: "fixed", back_value: 1000, nomination_type: "同伴" },
  { id: "p9", name: "延長料", price: 3000, back_type: "none", back_value: 0 },
];
const SHIMEI_TYPES = ["フリー", "場内指名", "本指名", "同伴", "アフター", "出張"];

// 指名種別 → sales_type マッピング
const SHIMEI_TO_SALES_TYPE: Record<string, string> = {
  "フリー":   "free",
  "本指名":   "honshimei",
  "場内指名": "baai",
  "同伴":     "douhan",
  "アフター": "after",
  "出張":     "trip",
};
const PAYMENT_TYPES = ["現金", "カード"];
const TAX_RATE = 0.1;
const SALES_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  honshimei: { label: "本指名", icon: "⭐" },
  baai: { label: "場内指名", icon: "🎯" },
  douhan: { label: "同伴", icon: "🚗" },
  bottle: { label: "ボトルバック", icon: "🍾" },
  other: { label: "その他", icon: "📝" },
};

// 配分を均等割にする（端数は先頭に寄せる）
function evenAllocations(allocs: ItemAllocation[]): ItemAllocation[] {
  const n = allocs.length;
  if (n === 0) return allocs;
  const base = Math.floor(100 / n);
  const result = allocs.map(a => ({ ...a, pct: base }));
  result[0].pct += 100 - base * n;
  return result;
}

// 1人のpctを変えたら残りを比率を保って連動再配分し、常に合計100%にする
function redistributeAllocations(allocs: ItemAllocation[], changedIdx: number, newPct: number): ItemAllocation[] {
  const n = allocs.length;
  if (n === 1) return [{ ...allocs[0], pct: 100 }];
  const v = Math.max(0, Math.min(100, Math.round(newPct)));
  const result = allocs.map((a, i) => ({ ...a, pct: i === changedIdx ? v : a.pct }));
  const others = result.filter((_, i) => i !== changedIdx);
  const remain = 100 - v;
  const othersOld = others.reduce((s, o) => s + o.pct, 0);
  if (othersOld === 0) {
    const base = Math.floor(remain / others.length);
    others.forEach((o, k) => { o.pct = k === others.length - 1 ? remain - base * (others.length - 1) : base; });
  } else {
    let acc = 0;
    others.forEach((o, k) => {
      if (k === others.length - 1) o.pct = remain - acc;
      else { o.pct = Math.round(remain * (o.pct / othersOld)); acc += o.pct; }
    });
  }
  return result;
}

// 品目1つあたりのバック総額（数量込み・サービス料を含まない品目単価ベース）
function itemBackTotal(item: SlipItem): number {
  const gross = item.qty * item.price;
  if (item.back_type === "fixed") return (item.back_value || 0) * item.qty;
  if (item.back_type === "rate") return Math.round(gross * (item.back_value || 0));
  return 0;
}

function getDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtDate(ds: string) { const d = new Date(ds+"T00:00:00"); return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`; }
function fmtDateLong(ds: string) { const d = new Date(ds+"T00:00:00"); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`; }
function addDays(ds: string, n: number) { const d = new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return getDateStr(d); }
function getWeekDates(base: string): string[] {
  const d = new Date(base+"T00:00:00");
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day===0?6:day-1));
  return Array.from({length:7},(_,i)=>{ const x=new Date(mon); x.setDate(mon.getDate()+i); return getDateStr(x); });
}
function calcMinutes(s: string, e: string) { const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number); let a=sh*60+sm,b=eh*60+em; if(b<=a)b+=1440; return b-a; }

import { canUseSales } from "@/lib/plan";

type Props = { shopId: string; shopPlan: string; casts: Cast[]; sectionStyle: React.CSSProperties; inputStyle: React.CSSProperties; labelStyle: React.CSSProperties; btnPrimary: React.CSSProperties; initialView?: "slip" | "sales" | "cast_sales" };

export default function SalesTab({ shopId, shopPlan, casts, sectionStyle, inputStyle, labelStyle, btnPrimary, initialView }: Props) {
  const [view, setView] = useState<"slip"|"sales"|"cast_sales">(initialView || "slip");
  const [salesPeriod, setSalesPeriod] = useState<"daily"|"weekly"|"monthly">("daily");
  const [castSalesPeriod, setCastSalesPeriod] = useState<"daily"|"weekly"|"monthly">("monthly");
  const [selectedCastDetail, setSelectedCastDetail] = useState<number|null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [dailyDate, setDailyDate] = useState(getDateStr(new Date()));
  const [weekBase, setWeekBase] = useState(getDateStr(new Date()));

  // データ
  const [shopMenus, setShopMenus] = useState<ShopMenu[]>([]);
  const [allDailySales, setAllDailySales] = useState<DailySales[]>([]);
  const [editingDailyDate, setEditingDailyDate] = useState<string|null>(null);
  const [editDailyValues, setEditDailyValues] = useState<Record<string,any>>({});
  const [salesSubView, setSalesSubView] = useState<"detail"|"expense">("detail");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0,10));
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenses, setExpenses] = useState<{id:string;date:string;name:string;amount:number}[]>([]);
  const [allCastSales, setAllCastSales] = useState<CastSale[]>([]);
  const [allShifts, setAllShifts] = useState<ConfirmedShift[]>([]);
  const [allAllowances, setAllAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // メニュー管理
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuPrice, setNewMenuPrice] = useState("");

  // 伝票
  const [slipDate, setSlipDate] = useState(getDateStr(new Date()));
  const [payment, setPayment] = useState("現金");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([{ name:"", qty:1, price:0 }]);
  const [slipCasts, setSlipCasts] = useState<SlipCast[]>([{ cast_id:"", type:"フリー" }]);
  const [slipSaving, setSlipSaving] = useState(false);
  const [slipSaved, setSlipSaved] = useState(false);
  const [slipMemo, setSlipMemo] = useState("");
  const [serviceChargeRate, setServiceChargeRate] = useState(0); // サービス料率(%) 0〜100
  const [editingSlipId, setEditingSlipId] = useState<string|null>(null);
  const [todaySlips, setTodaySlips] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  // 品名管理
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editBackType, setEditBackType] = useState<BackType>("none");
  const [editBackValue, setEditBackValue] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editNominationType, setEditNominationType] = useState("");
  const [showMenuManager, setShowMenuManager] = useState(false);

  // 品名マスタの編集を開始
  const startEditMenu = (m: ShopMenu) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditPrice(String(m.price));
    setEditBackType((m.back_type as BackType) || "none");
    setEditIsDefault(!!m.is_default);
    setEditNominationType(m.nomination_type || "");
    // rateは0〜1で保存されているので、編集時は%表示(×100)にする
    setEditBackValue(m.back_type === "rate" ? String(Math.round((m.back_value || 0) * 100)) : String(m.back_value || 0));
  };

  // 品名マスタの編集を保存
  const saveEditMenu = async () => {
    if (!editingId) return;
    // rateなら%(0〜100)を0〜1に戻す。fixedはそのまま円
    const backValueStored = editBackType === "rate" ? (Number(editBackValue) || 0) / 100 : (Number(editBackValue) || 0);
    await fetch("/api/shop-menus", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editName, price: Number(editPrice) || 0, back_type: editBackType, back_value: backValueStored, is_default: editIsDefault, nomination_type: editNominationType || null }),
    });
    setEditingId(null);
    await loadMenus();
  };

  // 伝票入力画面から品名の「毎回表示」をトグル
  const toggleMenuDefault = async (menuId: string, next: boolean) => {
    await fetch("/api/shop-menus", { method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id: menuId, is_default: next }) });
    await loadMenus();
  };

  // 指名種別を変更したとき、対応する品名（本指名料など）を自動で品目に追加する
  const handleNominationChange = (castIdx: number, newType: string) => {
    setSlipCasts(prev => prev.map((x,idx)=>idx===castIdx?{...x,type:newType}:x));
    // newTypeに対応する品名マスタを探す
    const menu = shopMenus.find(m => m.nomination_type === newType);
    if (!menu) return; // 対応品名がなければ何もしない（フリー等）
    setSlipItems(prev => {
      // 既に同じ品名が伝票にあれば二重追加しない
      if (prev.some(it => it.menu_id === menu.id)) return prev;
      const newItem: SlipItem = { name:menu.name, qty:1, price:menu.price, menu_id:menu.id, back_type:menu.back_type||"none", back_value:menu.back_value||0 };
      // 空の品目行（未選択）があればそこに入れる。なければ末尾に追加
      const emptyIdx = prev.findIndex(it => !it.menu_id && !it.name);
      if (emptyIdx >= 0) return prev.map((it,idx)=>idx===emptyIdx?newItem:it);
      return [...prev, newItem];
    });
  };

  const slipSubtotal = slipItems.reduce((s,i)=>s+i.qty*i.price, 0);
  const slipServiceCharge = Math.floor(slipSubtotal * serviceChargeRate / 100); // サービス料（小計×率）
  const slipTaxBase = slipSubtotal + slipServiceCharge; // 税の対象は小計＋サービス料
  const slipTax = Math.floor(slipTaxBase*TAX_RATE);
  const slipTotal = slipTaxBase + slipTax;

  // 全品名はDBから（初回は自動でデフォルト登録される）
  const allPresets = shopMenus;

  const loadMenus = useCallback(async () => {
    const res = await fetch(`/api/shop-menus?shop_id=${shopId}`);
    if (res.ok) {
      const data = await res.json();
      const existingNames = data.map((d: any) => d.name);
      // デフォルト品名でDBにないものを追加
      const missing = DEFAULT_PRESETS.filter(p => !existingNames.includes(p.name));
      if (missing.length > 0) {
        await Promise.all(missing.map((p, i) =>
          fetch("/api/shop-menus", { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ shop_id: shopId, name: p.name, price: p.price, back_type: p.back_type, back_value: p.back_value, is_default: p.is_default, nomination_type: p.nomination_type, sort_order: i }) })
        ));
        const res2 = await fetch(`/api/shop-menus?shop_id=${shopId}`);
        if (res2.ok) setShopMenus(await res2.json());
      } else {
        setShopMenus(data);
      }
    }
  }, [shopId]);

  const loadExpenses = async (m: string) => {
    const res = await fetch(`/api/expenses?shop_id=${shopId}&month=${m}`);
    if (res.ok) setExpenses(await res.json());
  };

  const loadSales = useCallback(async (m: string) => {
    setLoading(true);
    const [y, mo] = m.split("-").map(Number);
    const [dsRes, csRes, shiftRes, allowRes] = await Promise.all([
      fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`),
      fetch(`/api/cast-sales?shop_id=${shopId}&month=${m}`),
      fetch(`/api/confirm-shift?shop_id=${shopId}&year=${y}&month=${mo}`),
      fetch(`/api/cast-allowances?shop_id=${shopId}&month=${m}`),
    ]);
    if (dsRes.ok) setAllDailySales(await dsRes.json());
    if (csRes.ok) setAllCastSales(await csRes.json());
    if (shiftRes.ok) { const d = await shiftRes.json(); setAllShifts(d.confirmed||[]); }
    if (allowRes.ok) setAllAllowances(await allowRes.json());
    setLoading(false);
  }, [shopId]);

  const loadTodaySlips = useCallback(async (date: string) => {
    const res = await fetch(`/api/slips?shop_id=${shopId}&date=${date}`);
    if (res.ok) setTodaySlips(await res.json());
  }, [shopId]);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  // 品名マスタ読み込み後、新規入力で品目が空ならデフォルト品目を反映
  useEffect(() => {
    if (editingSlipId) return; // 編集中は触らない
    const defaults = shopMenus.filter(m => m.is_default);
    if (defaults.length === 0) return;
    // 品目が初期状態（1行・未入力）のときだけ差し替え
    setSlipItems(prev => {
      const isEmpty = prev.length === 1 && !prev[0].name && !prev[0].price;
      if (!isEmpty) return prev;
      return defaults.map(m => ({ name:m.name, qty:1, price:m.price, menu_id:m.id, back_type:m.back_type||"none", back_value:m.back_value||0 }));
    });
  }, [shopMenus, editingSlipId]);
  useEffect(() => { loadTodaySlips(slipDate); }, [slipDate, loadTodaySlips]);
  useEffect(() => {
    if (initialView === "cast_sales") loadSales(month);
  }, [initialView]);
  useEffect(() => { if (view==="sales" || view==="cast_sales") { loadSales(month); loadExpenses(month); } }, [view, month, loadSales]);
  useEffect(() => { if (initialView === "cast_sales") loadSales(month); }, [initialView]);

  // 伝票保存
  const saveSlip = async () => {
    setSlipSaving(true); setMsg("");
    try {
      const m = slipDate.slice(0,7);

      if (editingSlipId) {
        // === 編集モード：既存伝票を更新 ===
        // まず古い伝票の金額をdaily_salesから引く
        const oldSlip = todaySlips.find(s => s.id === editingSlipId);
        if (oldSlip) {
          const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
          const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slipDate) : null;
          if (existing) {
            await fetch("/api/daily-sales", { method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ shop_id:shopId, date:slipDate, opening_cash:0,
                cash_sales: Math.max(0,(existing.cash_sales||0) - (oldSlip.payment==="現金"?oldSlip.total:0) + (payment==="現金"?slipTotal:0)),
                card_sales: Math.max(0,(existing.card_sales||0) - (oldSlip.payment==="カード"?oldSlip.total:0) + (payment==="カード"?slipTotal:0)),
                invoice_sales:0, cost:existing.cost||0, memo:existing.memo||"" }),
            });
          }
        }
        await fetch("/api/slips", { method:"PATCH", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ id:editingSlipId, payment, subtotal:slipSubtotal, tax:slipTax, total:slipTotal, service_charge_rate:serviceChargeRate, service_charge:slipServiceCharge, items:slipItems, cast_entries:slipCasts, memo:slipMemo }),
        });
        setMsg("✅ 伝票を更新しました");
        setEditingSlipId(null);
      } else {
        // === 新規保存 ===
        const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
        const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slipDate) : null;
        await fetch("/api/daily-sales", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ shop_id:shopId, date:slipDate, opening_cash:0,
            cash_sales:(existing?.cash_sales||0)+(payment==="現金"?slipTotal:0),
            card_sales:(existing?.card_sales||0)+(payment==="カード"?slipTotal:0),
            invoice_sales:0, cost:existing?.cost||0, memo:existing?.memo||"" }),
        });
        // slipsテーブルに記録（保存したIDを受け取る）
        const slipRes = await fetch("/api/slips", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ shop_id:shopId, date:slipDate, payment, subtotal:slipSubtotal, tax:slipTax, total:slipTotal, service_charge_rate:serviceChargeRate, service_charge:slipServiceCharge, items:slipItems, cast_entries:slipCasts, memo:slipMemo }),
        });
        const savedSlip = slipRes.ok ? await slipRes.json() : null;
        const newSlipId = savedSlip?.id || savedSlip?.[0]?.id || null;

        // 品目ごとの配分から、キャスト売上と配分明細を生成
        // 上部キャスト欄で有効なキャスト（cast_idあり）
        const validCasts = slipCasts.filter(c => c.cast_id);
        // 各キャストの (sales_type別) 売上・バックを集計
        type Agg = { sales: number; back: number; type: string };
        const castAgg: Record<string, Agg> = {};
        for (const item of slipItems) {
          // この品目の担当配分を決める：
          //  - 品目に個別配分(allocations)があればそれを使う（複数キャスト時）
          //  - なければ上部キャスト欄にフォールバック
          //    * 1人なら その人に100%
          //    * 複数人なら 均等割
          let allocs = (item.allocations || []).filter(a => a.cast_id);
          if (allocs.length === 0 && validCasts.length > 0) {
            const base = Math.floor(100 / validCasts.length);
            allocs = validCasts.map((c, k) => ({
              cast_id: c.cast_id, type: c.type,
              pct: k === validCasts.length - 1 ? 100 - base * (validCasts.length - 1) : base,
            }));
          }
          if (allocs.length === 0) continue;
          const itemSales = item.qty * item.price;
          const itemBack = itemBackTotal(item);
          for (const a of allocs) {
            const ratio = a.pct / 100;
            const allocSales = Math.round(itemSales * ratio);
            const allocBack = Math.round(itemBack * ratio);
            // 指名種別は上部キャスト欄から引く（同じキャストの指名種別）
            const castEntry = slipCasts.find(sc => String(sc.cast_id) === String(a.cast_id));
            const stype = castEntry ? (SHIMEI_TO_SALES_TYPE[castEntry.type] || "free") : "free";
            // slip_allocations に1行ずつ記録（テーブル未作成でも本体は止めない）
            if (newSlipId) {
              try {
                await fetch("/api/slip-allocations", { method:"POST", headers:{"Content-Type":"application/json"},
                  body: JSON.stringify({ shop_id:shopId, slip_id:newSlipId, menu_id:item.menu_id||null, cast_id:Number(a.cast_id), date:slipDate, category:stype, item_name:item.name, share_ratio:ratio, allocated_sales:allocSales, allocated_back:allocBack }) });
              } catch { /* slip_allocations は補助記録なので失敗しても続行 */ }
            }
            // キャスト売上を集計（バックがある品目はバック額、なければ売上額を計上）
            const key = a.cast_id;
            if (!castAgg[key]) castAgg[key] = { sales: 0, back: 0, type: stype };
            castAgg[key].sales += allocSales;
            castAgg[key].back += allocBack;
          }
        }
        // 集計をcast_salesに反映（バック総額をそのキャストの売上成績として計上）
        console.log("[伝票保存] キャスト売上集計:", JSON.stringify(castAgg), "newSlipId:", newSlipId);
        let castSalesErrors = 0;
        for (const [castId, agg] of Object.entries(castAgg)) {
          const amount = agg.back > 0 ? agg.back : agg.sales;
          try {
            const r = await fetch("/api/cast-sales", { method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ shop_id:shopId, cast_id:Number(castId), date:slipDate, sales_type:agg.type, amount, count:1, memo:"" }) });
            if (!r.ok) { castSalesErrors++; console.error("[伝票保存] cast-sales失敗:", r.status, await r.text()); }
          } catch (e) { castSalesErrors++; console.error("[伝票保存] cast-sales例外:", e); }
        }
        if (Object.keys(castAgg).length === 0) setMsg("⚠️ 伝票は保存しましたが、担当キャストが未選択のため売上に反映されていません");
        else if (castSalesErrors > 0) setMsg(`⚠️ 伝票は保存しましたが、キャスト売上の反映に${castSalesErrors}件失敗しました`);
        else setMsg(`✅ 保存しました（¥${slipTotal.toLocaleString()}）`);
      }

      setSlipSaved(true);
      await loadTodaySlips(slipDate);
      await loadSales(month); // キャスト売上タブに即反映
      setTimeout(()=>{ setSlipSaved(false); resetForm(); }, 1200);
    } catch(e:any) { setMsg("保存失敗: "+e.message); }
    setSlipSaving(false);
  };

  // 伝票入力フォームの初期品目（is_defaultの品名を最初から並べる）
  const buildInitialItems = useCallback((): SlipItem[] => {
    const defaults = shopMenus.filter(m => m.is_default);
    if (defaults.length === 0) return [{ name:"", qty:1, price:0 }];
    return defaults.map(m => ({ name:m.name, qty:1, price:m.price, menu_id:m.id, back_type:m.back_type||"none", back_value:m.back_value||0 }));
  }, [shopMenus]);

  const resetForm = () => {
    setSlipItems(buildInitialItems());
    setSlipCasts([{cast_id:"",type:"フリー"}]);
    setPayment("現金"); setSlipMemo(""); setEditingSlipId(null); setServiceChargeRate(0);
  };

  const startEdit = (slip: any) => {
    setSlipItems(slip.items || [{name:"",qty:1,price:0}]);
    setSlipCasts(slip.cast_entries || [{cast_id:"",type:"フリー"}]);
    setPayment(slip.payment || "現金");
    setSlipMemo(slip.memo || "");
    setServiceChargeRate(slip.service_charge_rate || 0);
    setEditingSlipId(slip.id);
    setSlipDate(slip.date);
    window.scrollTo({top:0, behavior:"smooth"});
  };

  const deleteSlip = async (slip: any) => {
    if (!confirm("この伝票を削除しますか？")) return;
    // daily_salesから金額を引く
    const m = slip.date.slice(0,7);
    const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${m}`);
    const existing = dsRes.ok ? (await dsRes.json()).find((d: DailySales)=>d.date===slip.date) : null;
    if (existing) {
      await fetch("/api/daily-sales", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ shop_id:shopId, date:slip.date, opening_cash:0,
          cash_sales: Math.max(0,(existing.cash_sales||0)-(slip.payment==="現金"?slip.total:0)),
          card_sales: Math.max(0,(existing.card_sales||0)-(slip.payment==="カード"?slip.total:0)),
          invoice_sales:0, cost:existing.cost||0, memo:existing.memo||"" }),
      });
    }
    await fetch("/api/slips",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:slip.id})});
    await loadTodaySlips(slip.date);
    setMsg("伝票を削除しました");
  };

  // 月次計算
  const calcCastMonthly = (cast: Cast) => {
    const myShifts = allShifts.filter(s=>s.cast_id===cast.id);
    const mins = myShifts.reduce((s,sh)=>s+calcMinutes(sh.start_time,sh.end_time),0);
    const base = cast.hourly_wage ? Math.round(cast.hourly_wage*mins/60) : 0;
    const allow = allAllowances.filter(a=>a.cast_id===cast.id).reduce((s,a)=>s+a.amount,0);
    const bottle = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
    const honshimei = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="honshimei").reduce((s,c)=>s+c.amount,0);
    const baai = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="baai").reduce((s,c)=>s+c.amount,0);
    const douhan = allCastSales.filter(c=>c.cast_id===cast.id&&c.sales_type==="douhan").reduce((s,c)=>s+c.amount,0);
    const sales = allCastSales.filter(c=>c.cast_id===cast.id).reduce((s,c)=>s+c.amount,0);
    return { days:myShifts.length, mins, base, allow, bottle, honshimei, baai, douhan, totalPay:base+allow+bottle, sales };
  };

  const totalMonthlySales = allDailySales.reduce((s,d)=>s+(d.cash_sales||0)+(d.card_sales||0),0);
  const totalMonthlyPayroll = casts.reduce((s,c)=>s+calcCastMonthly(c).totalPay,0);
  const totalMonthlyCost = allDailySales.reduce((s,d)=>s+(d.cost||0),0);

  const printPayslips = () => {
    const [y, m] = month.split("-").map(Number);
    const monthDatesAll: string[] = [];
    const dd = new Date(y, m-1, 1);
    while(dd.getMonth()===m-1){ monthDatesAll.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }

    const rows = casts.map(cast => {
      const d = calcCastMonthly(cast);
      const myShifts = allShifts.filter(s=>s.cast_id===cast.id);
      const dayRows = monthDatesAll.map(date=>{
        const shift = myShifts.find(s=>s.date===date);
        if (!shift) return null;
        const mins = calcMinutes(shift.start_time, shift.end_time);
        const base = cast.hourly_wage ? Math.round(cast.hourly_wage*mins/60) : 0;
        const allows = allAllowances.filter(a=>a.cast_id===cast.id&&a.date===date);
        const bottles = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="bottle");
        const honshimeis = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="honshimei");
        const baais = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="baai");
        const douhans = allCastSales.filter(s=>s.cast_id===cast.id&&s.date===date&&s.sales_type==="douhan");
        const dayTotal = base + allows.reduce((s:number,a:any)=>s+a.amount,0) + bottles.reduce((s:number,b:any)=>s+b.amount,0);
        return { date, shift, mins, base, allows, bottles, honshimeis, baais, douhans, dayTotal };
      }).filter(Boolean) as any[];
      return { cast, d, dayRows };
    }).filter(r => r.dayRows.length > 0);

    const fmtD = (ds: string) => { const x=new Date(ds+"T00:00:00"); return `${x.getMonth()+1}/${x.getDate()}`; };

    const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>${month}月 給与明細</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif; font-size:11px; color:#000; }
.page { width:100%; padding:16px; page-break-after:always; }
.page:last-child { page-break-after:auto; }
.header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px; border-bottom:2px solid #333; padding-bottom:6px; }
.title { font-size:16px; font-weight:bold; }
.subtitle { font-size:12px; color:#555; }
table { width:100%; border-collapse:collapse; margin-bottom:12px; }
th,td { border:1px solid #bbb; padding:4px 6px; font-size:10px; }
th { background:#f5f5f5; text-align:center; font-weight:bold; }
.num { text-align:right; }
.center { text-align:center; }
.summary { border:2px solid #333; padding:10px 14px; margin-top:8px; }
.srow { display:flex; justify-content:space-between; padding:4px 0; font-size:11px; border-bottom:1px solid #e0e0e0; }
.srow:last-child { border-bottom:none; }
.total { display:flex; justify-content:space-between; padding:8px 0 0; font-weight:bold; font-size:15px; border-top:2px solid #333; margin-top:4px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
${rows.map(({ cast, d, dayRows }) => `
<div class="page">
  <div class="header">
    <div class="title">${cast.name}　給与明細書</div>
    <div class="subtitle">${month.replace("-","年")}月分${cast.hourly_wage ? `　時給 ¥${cast.hourly_wage.toLocaleString()}` : ""}</div>
  </div>
  <table>
    <thead><tr>
      <th>日付</th><th>勤務時間</th><th>基本給</th><th>本指名</th><th>場内</th><th>同伴</th><th>ボトルバック</th><th>手当・控除</th><th>日計</th>
    </tr></thead>
    <tbody>
      ${dayRows.map((row: any) => {
        const honAmt = row.honshimeis.reduce((s:number,x:any)=>s+x.amount,0);
        const baaiAmt = row.baais.reduce((s:number,x:any)=>s+x.amount,0);
        const douAmt = row.douhans.reduce((s:number,x:any)=>s+x.amount,0);
        const bottleAmt = row.bottles.reduce((s:number,x:any)=>s+x.amount,0);
        const allowAmt = row.allows.reduce((s:number,x:any)=>s+x.amount,0);
        return `<tr>
          <td class="center">${fmtD(row.date)}</td>
          <td class="center">${row.shift.start_time.slice(0,5)}〜${row.shift.end_time.slice(0,5)}</td>
          <td class="num">${row.base>0?"¥"+row.base.toLocaleString():""}</td>
          <td class="num">${honAmt>0?"¥"+honAmt.toLocaleString():""}</td>
          <td class="num">${baaiAmt>0?"¥"+baaiAmt.toLocaleString():""}</td>
          <td class="num">${douAmt>0?"¥"+douAmt.toLocaleString():""}</td>
          <td class="num">${bottleAmt>0?"¥"+bottleAmt.toLocaleString():""}</td>
          <td class="num">${allowAmt!==0?(allowAmt>0?"+":"-")+"¥"+Math.abs(allowAmt).toLocaleString():""}</td>
          <td class="num"><strong>¥${row.dayTotal.toLocaleString()}</strong></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="summary">
    ${[
      ["出勤日数", `${d.days}日`],
      ["基本給合計", `¥${d.base.toLocaleString()}`],
      ["ボトルバック", `¥${d.bottle.toLocaleString()}`],
      ["手当・控除", `${d.allow>=0?"+":""}¥${d.allow.toLocaleString()}`],
    ].map(([l,v])=>`<div class="srow"><span>${l}</span><span>${v}</span></div>`).join("")}
    <div class="total"><span>支払合計</span><span>¥${d.totalPay.toLocaleString()}</span></div>
  </div>
</div>`).join("")}
</body></html>`;

    const w = window.open("","_blank","width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(), 800); }
  };

  // 日次データ
  const dailyRecord = allDailySales.find(d=>d.date===dailyDate);
  const dailySalesTotal = (dailyRecord?.cash_sales||0) + (dailyRecord?.card_sales||0);
  const dailyShifts = allShifts.filter(s=>s.date===dailyDate);
  const dailyPayroll = casts.reduce((s,c)=>{
    const sh = dailyShifts.find(x=>x.cast_id===c.id);
    if (!sh) return s;
    const mins = calcMinutes(sh.start_time, sh.end_time);
    const base = c.hourly_wage ? Math.round(c.hourly_wage*mins/60) : 0;
    const allow = allAllowances.filter(a=>a.cast_id===c.id&&a.date===dailyDate).reduce((t,a)=>t+a.amount,0);
    const bottle = allCastSales.filter(cs=>cs.cast_id===c.id&&cs.date===dailyDate&&cs.sales_type==="bottle").reduce((t,cs)=>t+cs.amount,0);
    return s + base + allow + bottle;
  }, 0);

  // 月の日付
  const [y,m2] = month.split("-").map(Number);
  const monthDates: string[] = [];
  const dd = new Date(y,m2-1,1);
  while(dd.getMonth()===m2-1){ monthDates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }
  const activeDates = monthDates.filter(d=>allDailySales.some(s=>s.date===d&&((s.cash_sales||0)+(s.card_sales||0))>0));

  const inp: React.CSSProperties = { ...inputStyle as any, fontSize:13, boxSizing:"border-box" as const, width:"100%" };
  const sec = { ...sectionStyle, marginBottom:12 };

  return (
    <div>
      {/* サブナビ */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[{key:"slip",label:"📋 伝票入力"},{key:"sales",label:"📊 店舗売上"}].map(v=>(
          <button key={v.key} onClick={()=>{ setView(v.key as any); if(v.key==="sales") loadSales(month); }} style={{
            padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,fontWeight:view===v.key?700:500,
            background:view===v.key?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
            border:`1px solid ${view===v.key?"transparent":"var(--border)"}`,
            color:view===v.key?"#fff":"var(--text-secondary)",
          }}>{v.label}</button>
        ))}
      </div>

      {msg&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,fontSize:13,background:msg.includes("失敗")?"#ff444418":"var(--online-bg)",border:`1px solid ${msg.includes("失敗")?"#ff444444":"var(--online-border)"}`,color:msg.includes("失敗")?"#ff4444":"var(--online)"}}>{msg}</div>}

      {/* ===== 伝票入力 ===== */}
      {view==="slip"&&(
        <div>
          {/* 編集モードバナー */}
          {editingSlipId && (
            <div style={{background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>✏️ 伝票を編集中</span>
              <button onClick={resetForm} style={{background:"none",border:"1px solid #f59e0b44",borderRadius:8,color:"#f59e0b",padding:"4px 12px",fontSize:12,cursor:"pointer"}}>キャンセル</button>
            </div>
          )}

          <div style={sec}>
          {/* 日付・支払方法 */}
          <div style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div>
              <label style={labelStyle}>日付</label>
              <input type="date" value={slipDate} onChange={e=>setSlipDate(e.target.value)} style={{...inp,width:"auto"}}/>
            </div>
            <div>
              <label style={labelStyle}>支払方法</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {PAYMENT_TYPES.map(p=>(
                  <button key={p} onClick={()=>setPayment(p)} style={{
                    padding:"9px 18px",borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,whiteSpace:"nowrap",
                    background:payment===p?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
                    color:payment===p?"#fff":"var(--text-secondary)",
                    border:payment===p?"1px solid transparent":"1px solid var(--border)",
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* キャスト */}
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8,letterSpacing:"0.08em"}}>キャスト</div>
          {slipCasts.map((c,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
              <div>
                <label style={labelStyle}>キャスト名</label>
                <select value={c.cast_id} onChange={e=>setSlipCasts(slipCasts.map((x,idx)=>idx===i?{...x,cast_id:e.target.value}:x))} style={inp}>
                  <option value="">選択...</option>
                  {casts.map(cc=><option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>指名種別</label>
                <select value={c.type} onChange={e=>handleNominationChange(i, e.target.value)} style={inp}>
                  {SHIMEI_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {slipCasts.length>1&&<button onClick={()=>setSlipCasts(slipCasts.filter((_,idx)=>idx!==i))} style={{padding:"9px 12px",background:"#ff444418",border:"1px solid #ff444444",borderRadius:10,color:"#ff4444",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
            </div>
          ))}
          <button onClick={()=>setSlipCasts([...slipCasts,{cast_id:"",type:"フリー"}])} style={{width:"100%",padding:"9px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)",marginBottom:14}}>＋ キャストを追加</button>

          {/* 品名マスタ管理（カテゴリ・バック率設定） */}
          <div style={{marginBottom:14}}>
            <button onClick={()=>setShowMenuManager(v=>!v)} style={{width:"100%",padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,color:"var(--text-secondary)",fontSize:12.5,cursor:"pointer",fontFamily:"var(--font)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>⚙️ 品名マスタ設定（カテゴリ・バック率）</span>
              <span style={{color:"var(--text-muted)"}}>{showMenuManager?"閉じる ▲":"開く ▼"}</span>
            </button>
            {showMenuManager && (
              <div style={{border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 10px 10px",padding:"12px",background:"var(--bg-card)"}}>
                <p style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.7,margin:"0 0 10px"}}>
                  各品目にカテゴリとバックを設定すると、伝票入力時に自動でバックが計算されます。指名・同伴は固定額、ボトル・ドリンクは料金に対する％です。
                </p>
                {allPresets.map(m=>(
                  <div key={m.id} style={{borderBottom:"1px solid var(--border)",padding:"8px 0"}}>
                    {editingId===m.id ? (
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <div style={{display:"grid",gridTemplateColumns:"2fr 90px",gap:6}}>
                          <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="品目名" style={inp}/>
                          <input type="number" value={editPrice} onChange={e=>setEditPrice(e.target.value)} placeholder="単価" style={{...inp,textAlign:"right"}}/>
                        </div>
                        <div>
                          <select value={editBackType} onChange={e=>setEditBackType(e.target.value as BackType)} style={inp}>
                            <option value="none">バックなし</option>
                            <option value="fixed">固定額（円）</option>
                            <option value="rate">料金の％</option>
                          </select>
                        </div>
                        {editBackType!=="none" && (
                          <input type="number" value={editBackValue} onChange={e=>setEditBackValue(e.target.value)} placeholder={editBackType==="rate"?"バック率（％）例: 10":"バック額（円）例: 500"} style={inp}/>
                        )}
                        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--text-secondary)",cursor:"pointer",padding:"2px 0"}}>
                          <input type="checkbox" checked={editIsDefault} onChange={e=>setEditIsDefault(e.target.checked)} style={{width:16,height:16,cursor:"pointer"}}/>
                          伝票入力時に最初から表示する（セット料金など）
                        </label>
                        <div>
                          <label style={{...labelStyle,display:"block",marginBottom:2}}>指名種別と連動（選ぶと伝票で自動追加）</label>
                          <select value={editNominationType} onChange={e=>setEditNominationType(e.target.value)} style={inp}>
                            <option value="">連動しない</option>
                            <option value="本指名">本指名 → この品名を自動追加</option>
                            <option value="場内指名">場内指名 → この品名を自動追加</option>
                            <option value="同伴">同伴 → この品名を自動追加</option>
                            <option value="アフター">アフター → この品名を自動追加</option>
                            <option value="出張">出張 → この品名を自動追加</option>
                          </select>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={saveEditMenu} style={{flex:1,padding:"7px",background:"var(--accent)",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>保存</button>
                          <button onClick={()=>setEditingId(null)} style={{flex:1,padding:"7px",background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-muted)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{minWidth:0}}>
                          <span style={{fontSize:13,color:"var(--text-secondary)"}}>{m.name}</span>
                          <span style={{fontSize:11,color:"var(--text-muted)",marginLeft:8}}>
                            {m.back_type==="fixed" && `バック¥${(m.back_value||0).toLocaleString()}`}
                            {m.back_type==="rate" && `バック${Math.round((m.back_value||0)*100)}%`}
                            {(!m.back_type||m.back_type==="none") && "バックなし"}
                            {m.is_default && <span style={{marginLeft:6,color:"var(--accent)"}}>・最初から表示</span>}
                            {m.nomination_type && <span style={{marginLeft:6,color:"var(--accent2,#a855f7)"}}>・{m.nomination_type}と連動</span>}
                          </span>
                        </div>
                        <button onClick={()=>startEditMenu(m)} style={{background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",marginLeft:8}}>編集</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 品目 */}
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8,letterSpacing:"0.08em"}}>注文品目</div>
          {slipItems.map((item,i)=>(
            <div key={i} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 72px 110px",gap:8}}>
                <div>
                  <label style={labelStyle}>品目名</label>
                  <select value={item.menu_id||""} onChange={e=>{
                    const sel = allPresets.find(p=>p.id===e.target.value);
                    if (sel) setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,name:sel.name,price:sel.price,menu_id:sel.id,back_type:sel.back_type||"none",back_value:sel.back_value||0}:x));
                  }} style={inp}>
                    <option value="">品目を選択...</option>
                    {allPresets.map(p=>(
                      <option key={p.id} value={p.id}>{p.name}（¥{p.price.toLocaleString()}）</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>数量</label>
                  <input type="number" min={1} value={item.qty} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,qty:Number(e.target.value)}:x))} style={{...inp,textAlign:"center"}}/>
                </div>
                <div>
                  <label style={labelStyle}>単価（¥）</label>
                  <input type="number" min={0} value={item.price||""} onChange={e=>setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,price:Number(e.target.value)}:x))} style={{...inp,textAlign:"right"}}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                <span style={{color:"var(--accent)",fontSize:12,fontWeight:600}}>小計: ¥{(item.qty*item.price).toLocaleString()}
                  {item.back_type==="fixed" && <span style={{color:"var(--text-muted)",fontWeight:400,marginLeft:8}}>バック¥{((item.back_value||0)*item.qty).toLocaleString()}</span>}
                  {item.back_type==="rate" && <span style={{color:"var(--text-muted)",fontWeight:400,marginLeft:8}}>バック{Math.round((item.back_value||0)*100)}% = ¥{itemBackTotal(item).toLocaleString()}</span>}
                </span>
                {slipItems.length>1&&<button onClick={()=>setSlipItems(slipItems.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:13}}>削除</button>}
              </div>
              {/* 伝票入力画面から「毎回表示」設定（選択済み品目のみ） */}
              {item.menu_id && (() => {
                const menu = allPresets.find(p=>p.id===item.menu_id);
                const isDef = !!menu?.is_default;
                return (
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:isDef?"var(--accent)":"var(--text-muted)",cursor:"pointer",marginTop:4}}>
                    <input type="checkbox" checked={isDef} onChange={e=>toggleMenuDefault(item.menu_id!, e.target.checked)} style={{width:14,height:14,cursor:"pointer"}}/>
                    この品目を伝票入力時に最初から表示する
                  </label>
                );
              })()}

              {/* 担当キャスト配分（上部キャストが2人以上のときだけ品目別に割り当て） */}
              {(() => {
                const validCastCount = slipCasts.filter(c=>c.cast_id).length;
                if (validCastCount <= 1) {
                  // 1人のときは全品目を自動でそのキャストに紐付け（UIは案内のみ）
                  const only = slipCasts.find(c=>c.cast_id);
                  const name = only ? (casts.find(cc=>String(cc.id)===String(only.cast_id))?.name || "") : "";
                  return (
                    <div style={{marginTop:10,paddingTop:10,borderTop:"1px dashed var(--border)",fontSize:11,color:"var(--text-muted)"}}>
                      {name ? `この品目は「${name}」の担当になります` : "上部でキャストを選ぶと、この品目が担当になります"}
                    </div>
                  );
                }
                // 2人以上：品目ごとに担当を割り当て
                return (
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px dashed var(--border)"}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>この品目の担当（複数なら割合で配分）</div>
                  {(item.allocations||[]).map((a,ai)=>{
                  const allocBack = Math.round(itemBackTotal(item)*(a.pct/100));
                  const allocSales = Math.round(item.qty*item.price*(a.pct/100));
                  return (
                    <div key={ai} style={{display:"grid",gridTemplateColumns:"1fr 130px 80px 24px",gap:6,alignItems:"center",marginBottom:6}}>
                      <select value={a.cast_id} onChange={e=>{
                        setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,allocations:(x.allocations||[]).map((y,yi)=>yi===ai?{...y,cast_id:e.target.value}:y)}:x));
                      }} style={{...inp,fontSize:12}}>
                        <option value="">キャスト選択</option>
                        {casts.map(cc=><option key={cc.id} value={cc.id}>{cc.name}</option>)}
                      </select>
                      {(item.allocations||[]).length>1 ? (
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <input type="range" min={0} max={100} value={a.pct} onChange={e=>{
                            setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,allocations:redistributeAllocations(x.allocations||[],ai,Number(e.target.value))}:x));
                          }} style={{flex:1}}/>
                          <span style={{fontSize:11,color:"var(--text-muted)",minWidth:30,textAlign:"right"}}>{a.pct}%</span>
                        </div>
                      ) : <span style={{fontSize:11,color:"var(--text-muted)",textAlign:"right"}}>100%</span>}
                      <span style={{fontSize:11,color:item.back_type&&item.back_type!=="none"?"var(--success,#10b981)":"var(--text-muted)",textAlign:"right"}}>
                        {item.back_type&&item.back_type!=="none"?`¥${allocBack.toLocaleString()}`:`¥${allocSales.toLocaleString()}`}
                      </span>
                      <button onClick={()=>{
                        setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,allocations:evenAllocations((x.allocations||[]).filter((_,yi)=>yi!==ai))}:x));
                      }} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:14,padding:0}} aria-label="削除">✕</button>
                    </div>
                  );
                })}
                  <button onClick={()=>{
                    setSlipItems(slipItems.map((x,idx)=>idx===i?{...x,allocations:evenAllocations([...(x.allocations||[]),{cast_id:"",type:"フリー",pct:0}])}:x));
                  }} style={{background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:12,padding:"2px 0",display:"inline-flex",alignItems:"center",gap:4}}>＋ 担当キャストを追加</button>
                </div>
                );
              })()}
            </div>
          ))}
          <button onClick={()=>setSlipItems([...slipItems,{name:"",qty:1,price:0}])} style={{width:"100%",padding:"9px",background:"transparent",border:"1px dashed var(--border)",borderRadius:10,color:"var(--accent)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)",marginBottom:14}}>＋ 品目を追加</button>

          {/* 合計 */}
          <div style={{background:"var(--bg-input)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
              <span style={{color:"var(--text-muted)"}}>小計</span><span style={{color:"var(--text-secondary)"}}>¥{slipSubtotal.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,marginBottom:4}}>
              <span style={{color:"var(--text-muted)",display:"flex",alignItems:"center",gap:6}}>
                サービス料
                <input type="number" min={0} max={100} value={serviceChargeRate||""} onChange={e=>setServiceChargeRate(Math.max(0,Math.min(100,Number(e.target.value)||0)))} placeholder="0" style={{width:48,padding:"3px 6px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",fontSize:12,textAlign:"right",fontFamily:"var(--font)"}}/>
                <span style={{color:"var(--text-muted)"}}>%</span>
              </span>
              <span style={{color:"var(--text-secondary)"}}>¥{slipServiceCharge.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
              <span style={{color:"var(--text-muted)"}}>消費税（10%）</span><span style={{color:"var(--text-secondary)"}}>¥{slipTax.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid var(--border)"}}>
              <span style={{fontWeight:700,fontSize:15}}>合計</span>
              <span style={{color:"var(--accent)",fontSize:22,fontWeight:900}}>¥{slipTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* メモ */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>メモ（任意）</label>
            <input value={slipMemo} onChange={e=>setSlipMemo(e.target.value)} placeholder="客名・備考など" style={inp}/>
          </div>

          <button onClick={saveSlip} disabled={slipSaving} style={{...btnPrimary as any,background:slipSaved?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,var(--accent),var(--accent2))"}}>
            {slipSaved?"✓ 保存しました":slipSaving?"保存中...":editingSlipId?"✏️ 伝票を更新する":"伝票を保存する"}
          </button>
          </div>{/* sec close */}

          {/* 本日の伝票履歴 */}
          <div style={{marginTop:16}}>
            <button onClick={()=>setShowHistory(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 14px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",fontFamily:"var(--font)"}}>
              <span style={{fontWeight:700,fontSize:13,color:"var(--text-primary)"}}>
                📋 {slipDate === getDateStr(new Date()) ? "本日" : slipDate}の伝票履歴
                {todaySlips.length > 0 && <span style={{marginLeft:8,fontSize:12,color:"var(--accent)"}}>
                  {todaySlips.length}件 ¥{todaySlips.reduce((s:number,sl:any)=>s+sl.total,0).toLocaleString()}
                </span>}
              </span>
              <span style={{color:"var(--text-muted)"}}>{showHistory?"▲":"▼"}</span>
            </button>

            {showHistory && (
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
                {todaySlips.length === 0 ? (
                  <div style={{textAlign:"center",color:"var(--text-muted)",padding:"20px 0",fontSize:13}}>まだ伝票がありません</div>
                ) : todaySlips.map((slip:any, idx:number) => {
                  const castNames = (slip.cast_entries||[]).map((c:any)=>{
                    const cast = casts.find(x=>String(x.id)===String(c.cast_id));
                    return cast ? `${cast.name}(${c.type})` : null;
                  }).filter(Boolean).join("・");
                  const timeStr = new Date(slip.created_at).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
                  return (
                    <div key={slip.id} style={{background:"var(--bg-card)",border:`1px solid ${editingSlipId===slip.id?"var(--accent)":"var(--border)"}`,borderRadius:12,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <span style={{fontSize:12,color:"var(--text-muted)",marginRight:8}}>#{todaySlips.length-idx}</span>
                          <span style={{fontSize:12,color:"var(--text-muted)"}}>{timeStr}</span>
                          <span style={{marginLeft:8,fontSize:12,background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:6,padding:"1px 8px",color:"var(--text-secondary)"}}>{slip.payment}</span>
                        </div>
                        <span style={{fontWeight:900,fontSize:16,color:"var(--accent)"}}>¥{slip.total.toLocaleString()}</span>
                      </div>
                      {castNames && <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:4}}>👤 {castNames}</div>}
                      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:8}}>
                        {(slip.items||[]).map((item:any)=>`${item.name}×${item.qty}`).join("　")}
                      </div>
                      {slip.memo && <div style={{fontSize:11,color:"var(--text-hint)",marginBottom:8}}>📝 {slip.memo}</div>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>startEdit(slip)} style={{flex:1,padding:"6px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-secondary)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>✏️ 修正</button>
                        <button onClick={()=>deleteSlip(slip)} style={{padding:"6px 12px",background:"#ff444418",border:"1px solid #ff444444",borderRadius:8,color:"#ff4444",fontSize:12,cursor:"pointer"}}>削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== キャスト売上 ===== */}
      {view==="cast_sales"&&(
        !canUseSales(shopPlan) ? (
          <PlanGate planName="スタンダード" />
        ) :
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {/* 月ナビ */}
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>→</button>
            {/* 期間切替 */}
            <div style={{marginLeft:"auto",display:"flex",gap:6}}>
              {(["daily","weekly","monthly"] as const).map(p=>(
                <button key={p} onClick={()=>setCastSalesPeriod(p)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"var(--font)",background:castSalesPeriod===p?"var(--accent)":"var(--bg-input)",color:castSalesPeriod===p?"#fff":"var(--text-secondary)",border:`1px solid ${castSalesPeriod===p?"transparent":"var(--border)"}`}}>
                  {p==="daily"?"日次":p==="weekly"?"週次":"月次"}
                </button>
              ))}
            </div>
          </div>

          {/* 週ナビ（週次のみ） */}
          {castSalesPeriod==="weekly"&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <button onClick={()=>setWeekBase(addDays(weekBase,-7))} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前週</button>
              <span style={{flex:1,textAlign:"center",fontWeight:700,color:"var(--text-primary)",fontSize:13}}>
                {(()=>{ const w=getWeekDates(weekBase); return `${fmtDate(w[0])} 〜 ${fmtDate(w[6])}`; })()}
              </span>
              <button onClick={()=>setWeekBase(addDays(weekBase,7))} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>次週 →</button>
            </div>
          )}

          {/* 日次ナビ（日次のみ） */}
          {castSalesPeriod==="daily"&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <button onClick={()=>setDailyDate(addDays(dailyDate,-1))} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前日</button>
              <span style={{flex:1,textAlign:"center",fontWeight:700,color:"var(--text-primary)"}}>{fmtDateLong(dailyDate)}</span>
              <button onClick={()=>setDailyDate(addDays(dailyDate,1))} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>翌日 →</button>
              <button onClick={()=>setDailyDate(getDateStr(new Date()))} style={{padding:"6px 8px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>今日</button>
            </div>
          )}

          {loading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(()=>{
            // 期間でフィルタ
            const weekDates = getWeekDates(weekBase);
            const filteredSales = castSalesPeriod==="daily"
              ? allCastSales.filter(s=>s.date===dailyDate)
              : castSalesPeriod==="weekly"
              ? allCastSales.filter(s=>weekDates.includes(s.date))
              : allCastSales;

            const castsWithData = casts.filter(cast=>filteredSales.some(s=>s.cast_id===cast.id));

            if (castsWithData.length===0) return (
              <div style={{textAlign:"center",color:"var(--text-muted)",padding:"32px 0",fontSize:13}}>この期間のキャスト売上データがありません</div>
            );

            return (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>

                {/* ===== キャスト比較グラフ ===== */}
                {(()=>{
                  const castTotals = casts.map(cast=>({
                    cast,
                    total: filteredSales.filter(s=>s.cast_id===cast.id).reduce((a,b)=>a+b.amount,0),
                    honshimei: filteredSales.filter(s=>s.cast_id===cast.id&&s.sales_type==="honshimei").reduce((a,b)=>a+b.amount,0),
                    baai: filteredSales.filter(s=>s.cast_id===cast.id&&s.sales_type==="baai").reduce((a,b)=>a+b.amount,0),
                    douhan: filteredSales.filter(s=>s.cast_id===cast.id&&s.sales_type==="douhan").reduce((a,b)=>a+b.amount,0),
                    bottle: filteredSales.filter(s=>s.cast_id===cast.id&&s.sales_type==="bottle").reduce((a,b)=>a+b.amount,0),
                  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
                  if (castTotals.length===0) return null;
                  const maxTotal = castTotals[0].total;
                  const CAST_COLORS = ["#ff6b9d","#00d4ff","#ffd700","#a855f7","#00e5a0","#ff9500","#00c7be","#ff3b30"];
                  const getColor = (id: number) => CAST_COLORS[casts.findIndex(c=>c.id===id) % CAST_COLORS.length];
                  return (
                    <div style={{...sectionStyle,marginBottom:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:14}}>📊 キャスト売上比較</div>
                      {castTotals.map((item, rank)=>{
                        const color = getColor(item.cast.id);
                        const pct = item.total / maxTotal * 100;
                        return (
                          <div key={item.cast.id} style={{marginBottom:12}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:13,fontWeight:700,color:"var(--text-muted)",minWidth:20}}>{rank+1}位</span>
                                <span style={{fontWeight:700,color:"var(--text-primary)",fontSize:14}}>{item.cast.name}</span>
                              </div>
                              <span style={{fontWeight:800,color,fontSize:14}}>¥{item.total.toLocaleString()}</span>
                            </div>
                            {/* メインバー */}
                            <div style={{background:"var(--bg-input)",borderRadius:6,height:12,overflow:"hidden",marginBottom:4}}>
                              <div style={{height:"100%",borderRadius:6,background:color,width:`${pct}%`,transition:"width 0.4s"}}/>
                            </div>
                            {/* 内訳バー */}
                            <div style={{display:"flex",gap:3,height:5,borderRadius:3,overflow:"hidden"}}>
                              {[
                                {val:item.honshimei,color:"#f59e0b"},
                                {val:item.baai,color:"#8b5cf6"},
                                {val:item.douhan,color:"#06b6d4"},
                                {val:item.bottle,color:"#10b981"},
                              ].filter(t=>t.val>0).map((t,i)=>(
                                <div key={i} style={{flex:t.val,background:t.color,borderRadius:2}}/>
                              ))}
                            </div>
                            {/* 内訳数字 */}
                            <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap"}}>
                              {[
                                {label:"⭐本指名",val:item.honshimei},
                                {label:"🎯場内",val:item.baai},
                                {label:"🚗同伴",val:item.douhan},
                                {label:"🍾ボトル",val:item.bottle},
                              ].filter(t=>t.val>0).map(t=>(
                                <span key={t.label} style={{fontSize:10,color:"var(--text-muted)"}}>
                                  {t.label} ¥{t.val.toLocaleString()}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {/* 凡例 */}
                      <div style={{display:"flex",gap:12,flexWrap:"wrap",paddingTop:8,borderTop:"1px solid var(--border)",marginTop:4}}>
                        {[{c:"#f59e0b",l:"本指名"},{c:"#8b5cf6",l:"場内"},{c:"#06b6d4",l:"同伴"},{c:"#10b981",l:"ボトル"}].map(t=>(
                          <div key={t.l} style={{display:"flex",alignItems:"center",gap:4}}>
                            <div style={{width:8,height:8,borderRadius:2,background:t.c}}/>
                            <span style={{fontSize:10,color:"var(--text-muted)"}}>{t.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 個別カード */}
                {casts.filter(c=>filteredSales.some(s=>s.cast_id===c.id)).map(cast=>{
                  const mySales = filteredSales.filter(s=>s.cast_id===cast.id);
                  const total = mySales.reduce((s,c)=>s+c.amount,0);
                  const honshimei = mySales.filter(s=>s.sales_type==="honshimei").reduce((s,c)=>s+c.amount,0);
                  const baai = mySales.filter(s=>s.sales_type==="baai").reduce((s,c)=>s+c.amount,0);
                  const douhan = mySales.filter(s=>s.sales_type==="douhan").reduce((s,c)=>s+c.amount,0);
                  const bottle = mySales.filter(s=>s.sales_type==="bottle").reduce((s,c)=>s+c.amount,0);
                  const d = calcCastMonthly(cast);
                  const ratio = castSalesPeriod==="monthly" && d.totalPay>0 ? d.sales/d.totalPay*100 : null;
                  return (
                    <div key={cast.id} style={{...sectionStyle,marginBottom:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <button onClick={()=>setSelectedCastDetail(cast.id)} style={{fontWeight:700,fontSize:15,color:"var(--accent)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font)",padding:0,textDecoration:"underline",textDecorationColor:"var(--accent)44"}}>
                          {cast.name} 📊
                        </button>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {ratio!=null&&<span style={{fontSize:11,padding:"2px 10px",borderRadius:10,fontWeight:700,
                            background:ratio>=100?"var(--online-bg)":ratio>=70?"#f59e0b22":"#ff444418",
                            color:ratio>=100?"var(--online)":ratio>=70?"#f59e0b":"#ff4444",
                            border:`1px solid ${ratio>=100?"var(--online-border)":ratio>=70?"#f59e0b44":"#ff444444"}`}}>
                            売上/給与 {ratio.toFixed(0)}%
                          </span>}
                          <span style={{fontWeight:800,color:"var(--accent)",fontSize:16}}>¥{total.toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:mySales.length>0?10:0}}>
                        {[["本指名",honshimei],["場内",baai],["同伴",douhan],["ボトル",bottle]].map(([l,v])=>(
                          <div key={l as string} style={{background:"var(--bg-input)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{l}</div>
                            <div style={{fontSize:12,fontWeight:700,color:(v as number)>0?"var(--text-primary)":"var(--text-hint)"}}>{(v as number)>0?`¥${(v as number).toLocaleString()}`:"—"}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:12}}>
                        {mySales.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(s=>{
                          const t=SALES_TYPE_LABELS[s.sales_type];
                          return (
                            <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:"1px solid var(--border)",color:"var(--text-muted)"}}>
                              <span>{castSalesPeriod!=="daily"&&`${fmtDate(s.date)} `}{t?.icon} {t?.label}</span>
                              <span style={{color:"var(--accent)",fontWeight:600}}>¥{s.amount.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== 売上表 ===== */}
      {view==="sales"&&(
        !canUseSales(shopPlan) ? (
          <PlanGate planName="スタンダード" />
        ) :
        <div>
          {/* サブナビ */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {(["detail","expense"] as const).map(v=>(
              <button key={v} onClick={()=>setSalesSubView(v)} style={{
                padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"var(--font)",fontSize:13,
                fontWeight:salesSubView===v?700:500,
                background:salesSubView===v?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg-input)",
                border:`1px solid ${salesSubView===v?"transparent":"var(--border)"}`,
                color:salesSubView===v?"#fff":"var(--text-secondary)",
              }}>{v==="detail"?"📊 売上詳細":"💸 経費入力"}</button>
            ))}
          </div>

          {/* 経費入力サブビュー */}
          {salesSubView==="expense"&&(
            <div>
              <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:12}}>経費を追加</div>
                <input type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)}
                  style={{width:"100%",padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-primary)",fontSize:14,fontFamily:"var(--font)",marginBottom:8,boxSizing:"border-box" as const}} />
                <input type="text" value={expenseName} onChange={e=>setExpenseName(e.target.value)}
                  placeholder="項目名（例：ドリンク仕入れ・消耗品）"
                  style={{width:"100%",padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-primary)",fontSize:14,fontFamily:"var(--font)",marginBottom:8,boxSizing:"border-box" as const}} />
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <input type="number" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} placeholder="0"
                    style={{flex:1,padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-primary)",fontSize:14,fontFamily:"var(--font)",minWidth:0}} />
                  <span style={{fontSize:13,color:"var(--text-muted)",flexShrink:0}}>円</span>
                </div>
                <button onClick={async()=>{
                  if(!expenseName||!expenseAmount||!expenseDate) return;
                  const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${month}`);
                  const existing = dsRes.ok ? (await dsRes.json()).find((d:any)=>d.date===expenseDate) : null;
                  await fetch("/api/daily-sales",{method:"POST",headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({shop_id:shopId,date:expenseDate,
                      cash_sales:existing?.cash_sales||0,card_sales:existing?.card_sales||0,
                      cost:(existing?.cost||0)+Number(expenseAmount),
                      memo:existing?.memo||"",opening_cash:0,invoice_sales:0})});
                  await fetch("/api/expenses",{method:"POST",headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({shop_id:shopId,date:expenseDate,name:expenseName,amount:Number(expenseAmount)})});
                  setExpenseName(""); setExpenseAmount("");
                  await loadSales(month); await loadExpenses(month);
                  setMsg("✅ 経費を追加しました");
                }} disabled={!expenseName||!expenseAmount}
                style={{width:"100%",padding:"10px",borderRadius:10,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font)",opacity:!expenseName||!expenseAmount?0.5:1}}>
                  ＋ 経費を追加
                </button>
              </div>
              <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)"}}>今月の経費一覧</div>
                  <div style={{fontSize:12,color:"var(--accent)",fontWeight:700}}>合計 ¥{expenses.reduce((s,e)=>s+e.amount,0).toLocaleString()}</div>
                </div>
                {expenses.length===0
                  ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:"12px 0",fontSize:13}}>経費の記録はありません</div>
                  : expenses.map(e=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                      <div>
                        <div style={{color:"var(--text-primary)",fontWeight:600}}>{e.name}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{e.date}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{color:"#f59e0b",fontWeight:700}}>¥{e.amount.toLocaleString()}</span>
                        <button onClick={async()=>{
                          const dsRes = await fetch(`/api/daily-sales?shop_id=${shopId}&month=${month}`);
                          const ex = dsRes.ok ? (await dsRes.json()).find((d:any)=>d.date===e.date) : null;
                          if(ex) await fetch("/api/daily-sales",{method:"POST",headers:{"Content-Type":"application/json"},
                            body:JSON.stringify({...ex,cost:Math.max(0,(ex.cost||0)-e.amount),shop_id:shopId})});
                          await fetch("/api/expenses",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e.id})});
                          await loadSales(month); await loadExpenses(month);
                          setMsg("削除しました");
                        }} style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:"#ff444418",border:"1px solid #ff444444",color:"#ff4444",cursor:"pointer"}}>削除</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* 売上詳細サブビュー */}
          {salesSubView==="detail"&&(<>
          {/* 月ナビ + 日次/月次切替 + エクスポート */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()-1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{month.replace("-","年")}月</span>
            <button onClick={()=>{const d=new Date(month+"-01");d.setMonth(d.getMonth()+1);setMonth(d.toISOString().slice(0,7));}} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>→</button>
            <div style={{marginLeft:"auto",display:"flex",gap:6}}>
              {(["daily","weekly","monthly"] as const).map(p=>(
                <button key={p} onClick={()=>setSalesPeriod(p)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"var(--font)",background:salesPeriod===p?"var(--accent)":"var(--bg-input)",color:salesPeriod===p?"#fff":"var(--text-secondary)",border:`1px solid ${salesPeriod===p?"transparent":"var(--border)"}`}}>
                  {p==="daily"?"日次":p==="weekly"?"週次":"月次"}
                </button>
              ))}
            </div>
          </div>

          {/* エクスポートボタン */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>{
              // CSV出力
              const [y,m2] = month.split("-").map(Number);
              const dates: string[] = [];
              const dd = new Date(y,m2-1,1);
              while(dd.getMonth()===m2-1){ dates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }
              const rows = [
                ["日付","現金売上","カード売上","売上合計","仕入・経費","キャスト給与","純利益"],
                ...dates.map(date=>{
                  const d = allDailySales.find(s=>s.date===date);
                  const total = (d?.cash_sales||0)+(d?.card_sales||0);
                  const cost = d?.cost||0;
                  const payroll = casts.reduce((s,c)=>{
                    const sh = allShifts.find(x=>x.cast_id===c.id&&x.date===date);
                    if (!sh) return s;
                    const mins = calcMinutes(sh.start_time,sh.end_time);
                    return s + (c.hourly_wage?Math.round(c.hourly_wage*mins/60):0);
                  },0);
                  return [date, d?.cash_sales||0, d?.card_sales||0, total, cost, payroll, total-cost-payroll];
                }),
                [],
                ["合計","","", totalMonthlySales, totalMonthlyCost, totalMonthlyPayroll, totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll],
              ];
              const csv = rows.map(r=>r.join(",")).join("\n");
              const bom = "\uFEFF";
              const blob = new Blob([bom+csv], {type:"text/csv;charset=utf-8"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href=url; a.download=`売上_${month}.csv`; a.click();
              URL.revokeObjectURL(url);
            }} style={{padding:"8px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>
              📄 CSVエクスポート
            </button>
            <button onClick={()=>{
              // PDF出力（印刷）
              const [y,m2] = month.split("-").map(Number);
              const dates: string[] = [];
              const dd = new Date(y,m2-1,1);
              while(dd.getMonth()===m2-1){ dates.push(getDateStr(dd)); dd.setDate(dd.getDate()+1); }
              const activeDays = dates.filter(d=>allDailySales.some(s=>s.date===d&&((s.cash_sales||0)+(s.card_sales||0))>0));
              const fmtD = (ds: string) => { const x=new Date(ds+"T00:00:00"); return `${x.getMonth()+1}/${x.getDate()}(${["日","月","火","水","木","金","土"][x.getDay()]})`; };
              const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${month}月 店舗売上</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif; font-size:11px; padding:20px; }
h1 { font-size:16px; margin-bottom:4px; }
.sub { color:#666; font-size:11px; margin-bottom:16px; }
table { width:100%; border-collapse:collapse; margin-bottom:20px; }
th,td { border:1px solid #ccc; padding:5px 8px; text-align:right; }
th { background:#f5f5f5; text-align:center; font-weight:bold; }
td:first-child { text-align:left; }
.total { font-weight:bold; background:#fffbe6; }
.summary { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
.card { border:1px solid #ddd; border-radius:8px; padding:10px 14px; text-align:center; }
.card-label { font-size:10px; color:#666; margin-bottom:4px; }
.card-value { font-size:18px; font-weight:bold; }
@media print { body { padding:10px; } }
</style></head><body>
<h1>${month.replace("-","年")}月 店舗売上レポート</h1>
<div class="sub">出力日: ${new Date().toLocaleDateString("ja-JP")}</div>
<div class="summary">
  <div class="card"><div class="card-label">月次売上</div><div class="card-value" style="color:#7c3aed">¥${totalMonthlySales.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">人件費</div><div class="card-value" style="color:#f59e0b">¥${totalMonthlyPayroll.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">仕入・経費</div><div class="card-value" style="color:#f59e0b">¥${totalMonthlyCost.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">純利益</div><div class="card-value" style="color:${(totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll)>=0?"#059669":"#dc2626"}">¥${(totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll).toLocaleString()}</div></div>
</div>
<table>
<thead><tr><th>日付</th><th>現金売上</th><th>カード売上</th><th>売上合計</th><th>仕入・経費</th><th>キャスト給与</th><th>純利益</th></tr></thead>
<tbody>
${activeDays.map(date=>{
  const d=allDailySales.find(s=>s.date===date);
  const total=(d?.cash_sales||0)+(d?.card_sales||0);
  const cost=d?.cost||0;
  const payroll=casts.reduce((s,c)=>{
    const sh=allShifts.find(x=>x.cast_id===c.id&&x.date===date);
    if(!sh)return s;
    const mins=calcMinutes(sh.start_time,sh.end_time);
    return s+(c.hourly_wage?Math.round(c.hourly_wage*mins/60):0);
  },0);
  const profit=total-cost-payroll;
  return `<tr>
    <td>${fmtD(date)}</td>
    <td>¥${(d?.cash_sales||0).toLocaleString()}</td>
    <td>¥${(d?.card_sales||0).toLocaleString()}</td>
    <td><strong>¥${total.toLocaleString()}</strong></td>
    <td style="color:#b45309">¥${cost.toLocaleString()}</td>
    <td style="color:#b45309">¥${payroll.toLocaleString()}</td>
    <td style="color:${profit>=0?"#059669":"#dc2626"};font-weight:bold">¥${profit.toLocaleString()}</td>
  </tr>`;
}).join("")}
<tr class="total">
  <td>合計</td>
  <td>¥${allDailySales.reduce((s,d)=>s+(d.cash_sales||0),0).toLocaleString()}</td>
  <td>¥${allDailySales.reduce((s,d)=>s+(d.card_sales||0),0).toLocaleString()}</td>
  <td>¥${totalMonthlySales.toLocaleString()}</td>
  <td>¥${totalMonthlyCost.toLocaleString()}</td>
  <td>¥${totalMonthlyPayroll.toLocaleString()}</td>
  <td style="color:${(totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll)>=0?"#059669":"#dc2626"}">¥${(totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll).toLocaleString()}</td>
</tr>
</tbody>
</table>
</body></html>`;
              const w = window.open("","_blank","width=900,height=700");
              if(w){ w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }
            }} style={{padding:"8px 14px",borderRadius:8,background:"var(--accent)22",border:"1px solid var(--accent)44",color:"var(--accent)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)",fontWeight:700}}>
              🖨️ PDFエクスポート
            </button>
          </div>

          {loading?<div style={{textAlign:"center",color:"var(--text-muted)",padding:20}}>読み込み中...</div>:(
            <>
              {/* 月次サマリー（常に表示） */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
                {[
                  {label:"月次売上",value:totalMonthlySales,color:"var(--accent)"},
                  {label:"純利益",value:totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll,color:(totalMonthlySales-totalMonthlyCost-totalMonthlyPayroll)>=0?"var(--online)":"#ff4444"},
                  {label:"人件費",value:totalMonthlyPayroll,color:"#f59e0b"},
                  {label:"仕入・経費",value:totalMonthlyCost,color:"#f59e0b"},
                ].map(s=>(
                  <div key={s.label} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{s.label}</div>
                    <div style={{fontSize:16,fontWeight:900,color:s.color}}>¥{s.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* 日次表示 */}
              {salesPeriod==="daily"&&(
                <div>
                  {/* 日次ナビ */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <button onClick={()=>setDailyDate(addDays(dailyDate,-1))} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前日</button>
                    <span style={{flex:1,textAlign:"center",fontWeight:700,color:"var(--text-primary)"}}>{fmtDateLong(dailyDate)}</span>
                    <button onClick={()=>setDailyDate(addDays(dailyDate,1))} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>翌日 →</button>
                    <button onClick={()=>setDailyDate(getDateStr(new Date()))} style={{padding:"7px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>今日</button>
                  </div>

                  {/* 日次売上 */}
                  <div style={{...sectionStyle,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>売上詳細</div>
                    {dailyRecord ? (
                      <div style={{fontSize:13}}>
                        {[["現金売上",dailyRecord.cash_sales||0],["カード売上",dailyRecord.card_sales||0],["仕入・経費",-(dailyRecord.cost||0)],["キャスト給与",-dailyPayroll]].map(([l,v])=>(
                          <div key={l as string} style={{display:"flex",justifyContent:"space-between",marginBottom:6,color:(v as number)<0?"#f59e0b":"var(--text-secondary)"}}>
                            <span>{l as string}</span><span style={{fontWeight:600}}>{(v as number)>=0?"":"-"}¥{Math.abs(v as number).toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid var(--border)",fontWeight:700}}>
                          <span>純利益</span>
                          <span style={{color:dailySalesTotal-dailyPayroll-(dailyRecord.cost||0)>=0?"var(--online)":"#ff4444",fontSize:15}}>¥{(dailySalesTotal-(dailyRecord.cost||0)-dailyPayroll).toLocaleString()}</span>
                        </div>
                      </div>
                    ):<div style={{textAlign:"center",color:"var(--text-muted)",padding:"16px 0",fontSize:13}}>この日の記録はありません</div>}
                  </div>

                  {/* 日次キャスト売上表 */}
                  {allCastSales.filter(s=>s.date===dailyDate).length>0&&(
                    <div style={sectionStyle}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>キャスト売上</div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:"var(--bg-input)"}}>
                              {["キャスト","種別","金額","メモ"].map((h,i)=>(
                                <th key={h} style={{padding:"8px",textAlign:i===0?"left":"right",color:"var(--text-muted)",borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allCastSales.filter(s=>s.date===dailyDate).map(s=>{
                              const cast = casts.find(c=>c.id===s.cast_id);
                              const t = SALES_TYPE_LABELS[s.sales_type];
                              return (
                                <tr key={s.id} style={{borderBottom:"1px solid var(--border)"}}>
                                  <td style={{padding:"8px",fontWeight:700,color:"var(--text-primary)"}}>{cast?.name||"—"}</td>
                                  <td style={{padding:"8px",textAlign:"right",color:"var(--text-secondary)"}}>{t?.icon} {t?.label}</td>
                                  <td style={{padding:"8px",textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥{s.amount.toLocaleString()}</td>
                                  <td style={{padding:"8px",textAlign:"right",color:"var(--text-muted)",fontSize:11}}>{s.memo}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 週次表示 */}
              {salesPeriod==="weekly"&&(
                <div>
                  {/* 週ナビ */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <button onClick={()=>setWeekBase(addDays(weekBase,-7))} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>← 前週</button>
                    <span style={{flex:1,textAlign:"center",fontWeight:700,color:"var(--text-primary)",fontSize:13}}>
                      {(()=>{ const w=getWeekDates(weekBase); return `${fmtDate(w[0])} 〜 ${fmtDate(w[6])}`; })()}
                    </span>
                    <button onClick={()=>setWeekBase(addDays(weekBase,7))} style={{padding:"7px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer"}}>次週 →</button>
                    <button onClick={()=>setWeekBase(getDateStr(new Date()))} style={{padding:"7px 10px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border)",color:"var(--text-muted)",cursor:"pointer",fontSize:11}}>今週</button>
                  </div>

                  {/* 週次売上バー */}
                  {(()=>{
                    const weekDates = getWeekDates(weekBase);
                    const weekData = weekDates.map(date=>{
                      const d = allDailySales.find(s=>s.date===date);
                      return { date, total:(d?.cash_sales||0)+(d?.card_sales||0), cash:d?.cash_sales||0, card:d?.card_sales||0 };
                    });
                    const weekTotal = weekData.reduce((s,d)=>s+d.total,0);
                    const maxVal = Math.max(...weekData.map(d=>d.total), 1);
                    const DAY_LABEL = ["月","火","水","木","金","土","日"];
                    return (
                      <div style={{...sectionStyle,marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                          <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)"}}>週次売上</div>
                          <div style={{fontSize:18,fontWeight:900,color:"var(--accent)"}}>¥{weekTotal.toLocaleString()}</div>
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:100,marginBottom:10}}>
                          {weekData.map((d,i)=>{
                            const pct = d.total/maxVal;
                            const isToday = d.date===getDateStr(new Date());
                            return (
                              <div key={d.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                <div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600}}>
                                  {d.total>0?`¥${d.total.toLocaleString()}`:""}
                                </div>
                                <div style={{
                                  width:"100%",borderRadius:"6px 6px 0 0",
                                  height:Math.max(pct*72,d.total>0?4:0),
                                  background:isToday?"var(--accent)":d.total>0?"var(--accent)66":"var(--bg-input)",
                                  transition:"height 0.3s",
                                }}/>
                                <div style={{fontSize:12,fontWeight:isToday?800:500,color:isToday?"var(--accent)":"var(--text-muted)"}}>{DAY_LABEL[i]}</div>
                              </div>
                            );
                          })}
                        </div>
                        {weekData.filter(d=>d.total>0).map(d=>(
                          <div key={d.date} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:"1px solid var(--border)",fontSize:12}}>
                            <span style={{color:"var(--text-primary)",fontWeight:600}}>{fmtDate(d.date)}</span>
                            <div style={{display:"flex",gap:10}}>
                              {d.cash>0&&<span style={{color:"var(--text-muted)"}}>現 ¥{d.cash.toLocaleString()}</span>}
                              {d.card>0&&<span style={{color:"var(--text-muted)"}}>カ ¥{d.card.toLocaleString()}</span>}
                              <span style={{color:"var(--accent)",fontWeight:700}}>¥{d.total.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* 週次キャスト売上 */}
                  {(()=>{
                    const weekDates = getWeekDates(weekBase);
                    const weekCastSales = allCastSales.filter(s=>weekDates.includes(s.date));
                    if (weekCastSales.length===0) return null;
                    return (
                      <div style={sectionStyle}>
                        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>週次キャスト売上</div>
                        {weekCastSales.map(s=>{
                          const cast=casts.find(c=>c.id===s.cast_id);
                          const t=SALES_TYPE_LABELS[s.sales_type];
                          return (
                            <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:12}}>
                              <span style={{color:"var(--text-primary)",fontWeight:600}}>{fmtDate(s.date)} {cast?.name}</span>
                              <div style={{display:"flex",gap:8}}>
                                <span style={{color:"var(--text-muted)"}}>{t?.icon} {t?.label}</span>
                                <span style={{color:"var(--accent)",fontWeight:700}}>¥{s.amount.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 月次表示 */}
              {salesPeriod==="monthly"&&(
                <div>
                  {/* 日次一覧 */}
                  <div style={{...sectionStyle,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:10}}>日次売上一覧</div>
                    {activeDates.length===0?<div style={{textAlign:"center",color:"var(--text-muted)",padding:"16px 0",fontSize:13}}>記録なし</div>:
                      activeDates.map(date=>{
                        const d = allDailySales.find(s=>s.date===date)!;
                        const total = (d.cash_sales||0)+(d.card_sales||0);
                        return (
                          <div key={date} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                            <span style={{color:"var(--text-primary)",fontWeight:600}}>{fmtDate(date)}</span>
                            <div style={{display:"flex",gap:12,alignItems:"center"}}>
                              {(d.cash_sales||0)>0&&<span style={{color:"var(--text-muted)",fontSize:11}}>現 ¥{d.cash_sales.toLocaleString()}</span>}
                              {(d.card_sales||0)>0&&<span style={{color:"var(--text-muted)",fontSize:11}}>カ ¥{d.card_sales.toLocaleString()}</span>}
                              <span style={{color:"var(--accent)",fontWeight:700}}>¥{total.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>

                  {/* キャスト別成績表 */}
                  <div style={{...sectionStyle,overflowX:"auto"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)"}}>キャスト売上・給与</div>
                      <button onClick={()=>printPayslips()} style={{padding:"6px 14px",borderRadius:8,background:"var(--accent)22",border:"1px solid var(--accent)44",color:"var(--accent)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        🖨️ 給与明細を印刷
                      </button>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:520}}>
                      <thead>
                        <tr style={{background:"var(--bg-input)"}}>
                          {["キャスト","出勤","本指名","場内","同伴","売上計","給与","比率"].map((h,i)=>(
                            <th key={h} style={{padding:"8px",textAlign:i===0?"left":"right",color:"var(--text-muted)",fontWeight:700,whiteSpace:"nowrap",borderBottom:"1px solid var(--border)"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {casts.map(cast=>{
                          const d = calcCastMonthly(cast);
                          const ratio = d.totalPay>0 ? d.sales/d.totalPay*100 : 0;
                          return (
                            <tr key={cast.id} style={{borderBottom:"1px solid var(--border)"}}>
                              <td style={{padding:"9px 8px",fontWeight:700,color:"var(--text-primary)"}}>{cast.name}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>{d.days}日</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.honshimei.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.baai.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--text-secondary)"}}>¥{d.douhan.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"var(--accent)",fontWeight:700}}>¥{d.sales.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",color:"#f59e0b",fontWeight:700}}>¥{d.totalPay.toLocaleString()}</td>
                              <td style={{padding:"9px 8px",textAlign:"right",fontWeight:800,color:ratio>=100?"var(--online)":ratio>=70?"#f59e0b":"#ff4444"}}>
                                {d.totalPay>0?`${ratio.toFixed(0)}%`:"—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          </>)}
        </div>
      )}

      {/* キャスト売上詳細モーダル */}
      {selectedCastDetail && (()=>{
        const cast = casts.find(c=>c.id===selectedCastDetail);
        if (!cast) return null;
        return (
          <CastSalesDetail
            cast={cast}
            allCastSales={allCastSales}
            allShifts={allShifts}
            month={month}
            dailyDate={dailyDate}
            weekBase={weekBase}
            period={castSalesPeriod}
            getWeekDates={getWeekDates}
            fmtDate={fmtDate}
            onClose={()=>setSelectedCastDetail(null)}
            sectionStyle={sectionStyle}
          />
        );
      })()}
    </div>
  );
}
