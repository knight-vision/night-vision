import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const shop_id = req.nextUrl.searchParams.get("shop_id");
  if (!shop_id) return NextResponse.json([], { status: 400 });
  const { data, error } = await supabase
    .from("allowance_presets")
    .select("*")
    .eq("shop_id", shop_id)
    .order("sort_order")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, name, amount, sign, sort_order } = await req.json();
  if (!shop_id || !name) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  const { data, error } = await supabase
    .from("allowance_presets")
    .insert({ shop_id: Number(shop_id), name, amount: Number(amount) || 0, sign: sign || "+", sort_order: sort_order || 0 })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const { error } = await supabase.from("allowance_presets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const { id, name, amount, sign } = await req.json();
  const { error } = await supabase
    .from("allowance_presets")
    .update({ name, amount: Number(amount), sign })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
