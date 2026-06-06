import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json([]);
  const { data } = await supabase.from("shop_menus").select("*").eq("shop_id", Number(shopId)).order("sort_order").order("created_at");
  return NextResponse.json(data || []);
}
export async function POST(req: NextRequest) {
  const { shop_id, name, price, back_type, back_value, is_default } = await req.json();
  if (!shop_id || !name) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });
  const { data: existing } = await supabase.from("shop_menus").select("sort_order").eq("shop_id", Number(shop_id)).order("sort_order", { ascending: false }).limit(1).single();
  const { error } = await supabase.from("shop_menus").insert({
    shop_id: Number(shop_id), name, price: Number(price) || 0,
    back_type: back_type || "none",
    back_value: Number(back_value) || 0,
    is_default: !!is_default,
    sort_order: (existing?.sort_order || 0) + 1,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("shop_menus").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
export async function PATCH(req: NextRequest) {
  const { id, name, price, back_type, back_value, is_default } = await req.json();
  const patch: Record<string, any> = {};
  if (name !== undefined) patch.name = name;
  if (price !== undefined) patch.price = Number(price) || 0;
  if (back_type !== undefined) patch.back_type = back_type;
  if (back_value !== undefined) patch.back_value = Number(back_value) || 0;
  if (is_default !== undefined) patch.is_default = !!is_default;
  const { error } = await supabase.from("shop_menus").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
