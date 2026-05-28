import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!shopId) return NextResponse.json([], { status: 400 });
  let query = supabase.from("customers").select("*").eq("shop_id", Number(shopId)).order("last_visited", { ascending: false });
  if (castId) query = query.eq("cast_id", Number(castId));
  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, cast_id, name, memo, visited_at } = await req.json();
  if (!shop_id) return NextResponse.json({ error: "shop_id required" }, { status: 400 });
  const { data, error } = await supabase.from("customers").insert({
    shop_id: Number(shop_id),
    cast_id: cast_id ? Number(cast_id) : null,
    name: name || "名前なし",
    memo: memo || null,
    last_visited: visited_at || new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { id, name, memo, visited_at, cast_id } = await req.json();
  const { data, error } = await supabase.from("customers").update({
    name, memo, last_visited: visited_at, cast_id: cast_id ? Number(cast_id) : null,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("customers").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
