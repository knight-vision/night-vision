import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month  = req.nextUrl.searchParams.get("month");
  const slipId = req.nextUrl.searchParams.get("slip_id");
  if (!shopId) return NextResponse.json([]);
  let q = sb.from("customers").select("*").eq("shop_id", Number(shopId));
  if (castId) q = q.eq("cast_id", Number(castId));
  if (month)  q = q.gte("visit_date", `${month}-01`).lte("visit_date", `${month}-31`);
  if (slipId) q = q.eq("slip_id", slipId);
  const { data } = await q.order("last_visited", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, cast_id, slip_id, visit_date, name, memo, visit_count } = await req.json();
  if (!shop_id || !visit_date) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await sb.from("customers").insert({
    shop_id: Number(shop_id),
    cast_id: cast_id ? Number(cast_id) : null,
    slip_id: slip_id || null,
    visit_date,
    name: name || "名前なし",
    memo: memo || null,
    visit_count: visit_count || 1,
    last_visited: now,
    updated_at: now,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const { id, name, memo, visit_count } = await req.json();
  if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 });
  const { error } = await sb.from("customers").update({
    name, memo, visit_count,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await sb.from("customers").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
