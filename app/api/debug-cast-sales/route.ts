import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// 診断: castsとcast_salesのID突合・月フィルタを検証
// GET /api/debug-cast-sales?shop_id=XX&month=2026-06
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const month = req.nextUrl.searchParams.get("month") || "2026-06";
  const result: any = { shop_id: shopId, month, checks: {} };

  // 1. casts配列（在籍キャスト）のIDと型
  try {
    const { data } = await supabase.from("casts").select("id,name,shop_id").eq("shop_id", Number(shopId));
    result.checks.casts = (data||[]).map(c => ({ id: c.id, id_type: typeof c.id, name: c.name }));
  } catch (e: any) { result.checks.casts = { error: e.message }; }

  // 2. cast_sales のcast_idと型（月フィルタなし全件）
  try {
    const { data } = await supabase.from("cast_sales").select("cast_id,date,sales_type,amount").eq("shop_id", Number(shopId));
    result.checks.cast_sales_all = {
      count: (data||[]).length,
      cast_ids: [...new Set((data||[]).map(c => `${c.cast_id}(${typeof c.cast_id})`))],
      dates: [...new Set((data||[]).map(c => c.date))].sort(),
    };
  } catch (e: any) { result.checks.cast_sales_all = { error: e.message }; }

  // 3. 月フィルタ（フロントと同じ start=month-01, end=month-31）を適用した件数
  try {
    const start = `${month}-01`, end = `${month}-31`;
    const { data } = await supabase.from("cast_sales").select("cast_id,date,amount").eq("shop_id", Number(shopId)).gte("date", start).lte("date", end);
    result.checks.cast_sales_this_month = {
      filter: `${start} 〜 ${end}`,
      count: (data||[]).length,
      rows: data,
    };
  } catch (e: any) { result.checks.cast_sales_this_month = { error: e.message }; }

  return NextResponse.json(result, { status: 200 });
}
