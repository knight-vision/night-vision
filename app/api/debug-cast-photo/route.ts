import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// 診断: cast_idへの写真insertが通るか、status制約・スキーマを検証
// GET /api/debug-cast-photo?cast_id=21
export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id") || "21";
  const result: any = { cast_id: castId, checks: {} };

  // 1. approved で test insert を試す（実際に入れて、すぐ消す）
  try {
    const { data, error } = await supabase.from("photo_requests").insert({
      cast_id: Number(castId),
      shop_id: 97,
      owner_id: null,
      type: "cast_photo",
      url: "https://example.com/debug-test.jpg",
      status: "approved",
      sort_order: 999,
    }).select();
    if (error) {
      result.checks.insert_approved = { ok: false, error: error.message, code: error.code, details: error.details, hint: error.hint };
    } else {
      result.checks.insert_approved = { ok: true, inserted_id: data?.[0]?.id };
      if (data?.[0]?.id) await supabase.from("photo_requests").delete().eq("id", data[0].id);
    }
  } catch (e: any) { result.checks.insert_approved = { ok: false, thrown: e.message }; }

  // 2. pending で test insert を試す（比較用）
  try {
    const { data, error } = await supabase.from("photo_requests").insert({
      cast_id: Number(castId),
      shop_id: 97,
      owner_id: null,
      type: "cast_photo",
      url: "https://example.com/debug-test2.jpg",
      status: "pending",
      sort_order: 998,
    }).select();
    if (error) {
      result.checks.insert_pending = { ok: false, error: error.message, code: error.code };
    } else {
      result.checks.insert_pending = { ok: true };
      if (data?.[0]?.id) await supabase.from("photo_requests").delete().eq("id", data[0].id);
    }
  } catch (e: any) { result.checks.insert_pending = { ok: false, thrown: e.message }; }

  // 3. 既存のphoto_requestsのstatus値の種類
  try {
    const { data } = await supabase.from("photo_requests").select("status").limit(100);
    const statuses = [...new Set((data || []).map((r: any) => r.status))];
    result.checks.existing_statuses = statuses;
  } catch (e: any) { result.checks.existing_statuses = { error: e.message }; }

  // 4. casts に cast_id が存在するか
  try {
    const { data } = await supabase.from("casts").select("id, name, shop_id").eq("id", Number(castId)).single();
    result.checks.cast_exists = data || "NOT FOUND";
  } catch (e: any) { result.checks.cast_exists = { error: e.message }; }

  return NextResponse.json(result, { status: 200 });
}
