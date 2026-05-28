import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const month = req.nextUrl.searchParams.get("month");
  const date = req.nextUrl.searchParams.get("date");
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!shopId) return NextResponse.json([]);
  let query = supabase.from("slips").select("*").eq("shop_id", Number(shopId)).order("date", { ascending: false }).order("created_at", { ascending: false });
  if (date) query = query.eq("date", date);
  else if (month) query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  const { data } = await query;
  // cast_idフィルタはJSONBなのでクライアント側で絞る
  if (castId && data) {
    return NextResponse.json(data.filter((s: any) =>
      Array.isArray(s.cast_entries) && s.cast_entries.some((e: any) => String(e.cast_id) === castId)
    ));
  }
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, date, payment, subtotal, tax, total, items, cast_entries, memo } = body;
  const { data, error } = await supabase.from("slips").insert({
    shop_id: Number(shop_id), date, payment, subtotal, tax, total,
    items: items || [], cast_entries: cast_entries || [], memo: memo || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const { id, payment, subtotal, tax, total, items, cast_entries, memo } = await req.json();
  const { error } = await supabase.from("slips").update({
    payment, subtotal, tax, total,
    items: items || [], cast_entries: cast_entries || [],
    memo: memo || null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("slips").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
