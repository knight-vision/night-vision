import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// GET: shop_idで月次手当一覧取得（cast_id指定可）
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!shopId) return NextResponse.json([], { status: 400 });

  const target = month || new Date().toISOString().slice(0, 7);
  const startDate = `${target}-01`;
  const endDate = `${target}-31`;

  let query = supabase
    .from("cast_daily_allowances")
    .select("*")
    .eq("shop_id", shopId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (castId) query = query.eq("cast_id", Number(castId));

  const { data, error } = await query;

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

// POST: 手当追加
export async function POST(req: NextRequest) {
  const { cast_id, shop_id, date, label, amount } = await req.json();
  if (!cast_id || !shop_id || !date || !label || amount === undefined) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("cast_daily_allowances")
    .insert({ cast_id: Number(cast_id), shop_id: Number(shop_id), date, label, amount: Number(amount) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: 手当削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("cast_daily_allowances").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
