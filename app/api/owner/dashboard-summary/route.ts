import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop_id = searchParams.get("shop_id");
  if (!shop_id) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().slice(0, 10);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // 今月の日次売上合計
  const { data: salesData } = await supabase
    .from("daily_sales")
    .select("cash_sales, card_sales, invoice_sales")
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  const monthlySales = (salesData || []).reduce(
    (sum, r) => sum + (r.cash_sales || 0) + (r.card_sales || 0) + (r.invoice_sales || 0), 0
  );

  // 先月売上
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const { data: prevSalesData } = await supabase
    .from("daily_sales")
    .select("cash_sales, card_sales, invoice_sales")
    .eq("shop_id", shop_id)
    .gte("date", `${prevMonthStr}-01`)
    .lte("date", `${prevMonthStr}-31`);

  const prevMonthlySales = (prevSalesData || []).reduce(
    (sum, r) => sum + (r.cash_sales || 0) + (r.card_sales || 0) + (r.invoice_sales || 0), 0
  );

  // 今月の伝票から客単価計算
  const { data: slipsData } = await supabase
    .from("slips")
    .select("total")
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  const avgSpend = slipsData && slipsData.length > 0
    ? Math.round(slipsData.reduce((sum, s) => sum + (s.total || 0), 0) / slipsData.length)
    : 0;

  // 今日のシフト出勤数
  const { data: todayShifts } = await supabase
    .from("confirmed_shifts")
    .select("id")
    .eq("shop_id", shop_id)
    .eq("date", today);

  // シフト承認待ち数
  const { data: pendingShifts } = await supabase
    .from("shift_requests")
    .select("id")
    .eq("shop_id", shop_id)
    .eq("status", "pending");

  // キャスト売上ランキング（今月）
  const { data: castSales } = await supabase
    .from("cast_sales")
    .select("cast_id, amount, casts(name)")
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  // キャスト別集計
  const castMap: Record<string, { name: string; total: number }> = {};
  for (const s of castSales || []) {
    const cid = String(s.cast_id);
    if (!castMap[cid]) castMap[cid] = { name: (s.casts as any)?.name || "", total: 0 };
    castMap[cid].total += s.amount || 0;
  }
  const ranking = Object.entries(castMap)
    .map(([cast_id, v]) => ({ cast_id, name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 今週の日別売上（月〜日）
  const weekSales: { day: string; date: string; total: number }[] = [];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = (salesData || []).find((_, idx) => {
      // 今月データから日付で検索
      return false;
    });
    weekSales.push({ day: dayNames[d.getDay()], date: dateStr, total: 0 });
  }

  // 今週の売上を別途取得
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const { data: weekSalesData } = await supabase
    .from("daily_sales")
    .select("date, cash_sales, card_sales, invoice_sales")
    .eq("shop_id", shop_id)
    .gte("date", weekStart.toISOString().slice(0, 10))
    .lte("date", today);

  const weekSalesFinal = weekSales.map(w => {
    const found = (weekSalesData || []).find(s => s.date === w.date);
    return {
      ...w,
      total: found ? (found.cash_sales || 0) + (found.card_sales || 0) + (found.invoice_sales || 0) : 0,
    };
  });

  const salesGrowth = prevMonthlySales > 0
    ? Math.round(((monthlySales - prevMonthlySales) / prevMonthlySales) * 100)
    : null;

  return NextResponse.json({
    monthly_sales: monthlySales,
    sales_growth: salesGrowth,
    avg_spend: avgSpend,
    today_staff_count: todayShifts?.length || 0,
    pending_shift_count: pendingShifts?.length || 0,
    cast_ranking: ranking,
    week_sales: weekSalesFinal,
  });
}
