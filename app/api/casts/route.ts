import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// キャスト一覧取得
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json([], { status: 400 });
  const { data, error } = await supabase
    .from("casts")
    .select("id, name, age, birthplace, comment, hourly_wage, instagram, x_account, tiktok_account, on_today")
    .eq("shop_id", Number(shopId))
    .order("id");
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}

// キャスト追加
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, name, age, birthplace, comment, hourly_wage, instagram } = body;
  const { data, error } = await supabase
    .from("casts")
    .insert({ shop_id: Number(shop_id), name, age: age || null, birthplace: birthplace || null, comment: comment || null, hourly_wage: hourly_wage || 0, instagram: instagram || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// キャスト更新
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, age, birthplace, comment, hourly_wage, instagram } = body;
  const { data, error } = await supabase
    .from("casts")
    .update({ name, age: age || null, birthplace: birthplace || null, comment: comment || null, hourly_wage: hourly_wage || 0, instagram: instagram || null })
    .eq("id", Number(id))
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// キャスト削除
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  const { error } = await supabase.from("casts").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
