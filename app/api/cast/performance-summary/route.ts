import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cast_id = searchParams.get("cast_id");
  const shop_id = searchParams.get("shop_id");
  if (!cast_id || !shop_id) return NextResponse.json({ error: "cast_id and shop_id required" }, { status: 400 });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // 先月
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  // 今月のキャスト売上
  const { data: salesData } = await supabase
    .from("cast_sales")
    .select("amount, sales_type, date")
    .eq("cast_id", cast_id)
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  // 先月のキャスト売上
  const { data: prevSalesData } = await supabase
    .from("cast_sales")
    .select("amount")
    .eq("cast_id", cast_id)
    .eq("shop_id", shop_id)
    .gte("date", `${prevMonthStr}-01`)
    .lte("date", `${prevMonthStr}-31`);

  const monthlySales = (salesData || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const prevMonthlySales = (prevSalesData || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const drinkBack = (salesData || [])
    .filter(s => s.sales_type === "bottle")
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const salesGrowth = prevMonthlySales > 0
    ? Math.round(((monthlySales - prevMonthlySales) / prevMonthlySales) * 100)
    : null;

  // 今月の確定シフト（出勤日数）
  const { data: shiftsData } = await supabase
    .from("confirmed_shifts")
    .select("date, start_time, end_time")
    .eq("cast_id", cast_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  const shiftCount = shiftsData?.length || 0;

  // 時給取得
  const { data: castData } = await supabase
    .from("casts")
    .select("hourly_wage, name")
    .eq("id", cast_id)
    .single();

  const hourlyWage = castData?.hourly_wage || 0;

  // 基本給計算（確定シフトの勤務時間 × 時給）
  let totalMinutes = 0;
  for (const shift of shiftsData || []) {
    if (shift.start_time && shift.end_time) {
      const [sh, sm] = shift.start_time.split(":").map(Number);
      const [eh, em] = shift.end_time.split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60; // 深夜超え
      totalMinutes += mins;
    }
  }
  const basicPay = Math.floor((totalMinutes / 60) * hourlyWage);

  // 手当・控除
  const { data: allowancesData } = await supabase
    .from("cast_daily_allowances")
    .select("label, amount")
    .eq("cast_id", cast_id)
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  const allowances = allowancesData || [];
  const totalAllowance = allowances
    .filter(a => a.amount > 0)
    .reduce((sum, a) => sum + a.amount, 0);
  const totalDeduction = allowances
    .filter(a => a.amount < 0)
    .reduce((sum, a) => sum + a.amount, 0);

  const totalPay = basicPay + totalAllowance + drinkBack + totalDeduction;

  // 店内ランキング
  const { data: allCastSales } = await supabase
    .from("cast_sales")
    .select("cast_id, amount")
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`);

  const castTotals: Record<string, number> = {};
  for (const s of allCastSales || []) {
    const cid = String(s.cast_id);
    castTotals[cid] = (castTotals[cid] || 0) + (s.amount || 0);
  }
  const sortedCasts = Object.entries(castTotals).sort((a, b) => b[1] - a[1]);
  const myRank = sortedCasts.findIndex(([cid]) => cid === String(cast_id)) + 1;

  // 月別売上推移（過去5ヶ月）
  const monthlySalesTrend: { month: string; total: number }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const { data: md } = await supabase
      .from("cast_sales")
      .select("amount")
      .eq("cast_id", cast_id)
      .gte("date", `${mStr}-01`)
      .lte("date", `${mStr}-31`);
    const total = (md || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    monthlySalesTrend.push({ month: `${d.getMonth() + 1}月`, total });
  }

  // シフト一覧（今月）
  const { data: shiftRequests } = await supabase
    .from("shift_requests")
    .select("date, start_time, end_time, status, note")
    .eq("cast_id", cast_id)
    .eq("shop_id", shop_id)
    .gte("date", `${monthStr}-01`)
    .lte("date", `${monthStr}-31`)
    .order("date");

  return NextResponse.json({
    cast_name: castData?.name,
    monthly_sales: monthlySales,
    sales_growth: salesGrowth,
    shift_count: shiftCount,
    drink_back: drinkBack,
    shop_rank: myRank || null,
    salary: {
      basic_pay: basicPay,
      incentive: monthlySales, // 売上インセンティブは売上合計
      drink_back: drinkBack,
      allowances: allowances.filter(a => a.amount > 0),
      deductions: allowances.filter(a => a.amount < 0),
      total: totalPay,
    },
    monthly_sales_trend: monthlySalesTrend,
    shift_requests: shiftRequests || [],
    confirmed_shifts: shiftsData || [],
  });
}
