import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month = req.nextUrl.searchParams.get("month");
  const slipId = req.nextUrl.searchParams.get("slip_id");
  if (!shopId) return NextResponse.json([]);
  let q = sb.from("customer_notes").select("*").eq("shop_id", Number(shopId));
  if (castId) q = q.eq("cast_id", Number(castId));
  if (month) q = q.gte("date", `${month}-01`).lte("date", `${month}-31`);
  if (slipId) q = q.eq("slip_id", slipId);
  const { data } = await q.order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, cast_id, slip_id, date, note, visit_count } = await req.json();
  if (!shop_id || !cast_id || !date || !note) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  const { data, error } = await sb.from("customer_notes").insert({ shop_id: Number(shop_id), cast_id: Number(cast_id), slip_id: slip_id || null, date, note, visit_count: visit_count || 1 }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const { id, note, visit_count } = await req.json();
  if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 });
  const { error } = await sb.from("customer_notes").update({ note, visit_count, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await sb.from("customer_notes").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
