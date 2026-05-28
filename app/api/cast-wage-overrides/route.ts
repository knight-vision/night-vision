import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month = req.nextUrl.searchParams.get("month");
  if (!shopId) return NextResponse.json([]);
  let q = sb.from("cast_wage_overrides").select("*").eq("shop_id", Number(shopId));
  if (castId) q = q.eq("cast_id", Number(castId));
  if (month) q = q.gte("date", `${month}-01`).lte("date", `${month}-31`);
  const { data } = await q.order("date");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, cast_id, date, hourly_wage, memo } = await req.json();
  if (!shop_id || !cast_id || !date || !hourly_wage) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  const { error } = await sb.from("cast_wage_overrides").upsert({ shop_id: Number(shop_id), cast_id: Number(cast_id), date, hourly_wage: Number(hourly_wage), memo: memo || null }, { onConflict: "cast_id,date" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await sb.from("cast_wage_overrides").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
