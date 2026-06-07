import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// 診断用: cast_sales と slip_allocations テーブルの状態を確認する
// GET /api/debug-cast-sales?shop_id=XX
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const result: any = { shop_id: shopId, checks: {} };

  // 1. cast_sales テーブルが存在し、読めるか
  try {
    const { data, error, count } = await supabase.from("cast_sales").select("*", { count: "exact" }).eq("shop_id", Number(shopId)).limit(5);
    result.checks.cast_sales = error ? { ok: false, error: error.message } : { ok: true, count, sample: data };
  } catch (e: any) { result.checks.cast_sales = { ok: false, exception: e.message }; }

  // 2. slip_allocations テーブルが存在するか
  try {
    const { data, error, count } = await supabase.from("slip_allocations").select("*", { count: "exact" }).eq("shop_id", Number(shopId)).limit(5);
    result.checks.slip_allocations = error ? { ok: false, error: error.message } : { ok: true, count, sample: data };
  } catch (e: any) { result.checks.slip_allocations = { ok: false, exception: e.message }; }

  // 3. slips テーブルの最新5件（cast_entriesの中身を見る）
  try {
    const { data, error } = await supabase.from("slips").select("id,date,total,cast_entries,items").eq("shop_id", Number(shopId)).order("created_at", { ascending: false }).limit(3);
    result.checks.recent_slips = error ? { ok: false, error: error.message } : { ok: true, slips: data };
  } catch (e: any) { result.checks.recent_slips = { ok: false, exception: e.message }; }

  // 4. 実際にcast_salesへテスト書き込みを試す（cast_id=テスト, すぐ消す）
  try {
    const testRow = { shop_id: Number(shopId), cast_id: 999999, date: "2020-01-01", sales_type: "test", amount: 1, count: 1, memo: "debug-test" };
    const { error: insErr } = await supabase.from("cast_sales").insert(testRow);
    if (insErr) {
      result.checks.write_test = { ok: false, error: insErr.message };
    } else {
      result.checks.write_test = { ok: true, message: "書き込み成功" };
      // テスト行を削除
      await supabase.from("cast_sales").delete().eq("cast_id", 999999).eq("date", "2020-01-01");
    }
  } catch (e: any) { result.checks.write_test = { ok: false, exception: e.message }; }

  return NextResponse.json(result, { status: 200 });
}
