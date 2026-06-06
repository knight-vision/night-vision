import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// GET: 店舗+期間、またはキャスト+期間で配分明細を取得
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!shopId) return NextResponse.json([]);
  let q = supabase.from("slip_allocations").select("*").eq("shop_id", Number(shopId));
  if (castId) q = q.eq("cast_id", Number(castId));
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  const { data, error } = await q.order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: 配分明細を1行追加
export async function POST(req: NextRequest) {
  const b = await req.json();
  const { error } = await supabase.from("slip_allocations").insert({
    shop_id: Number(b.shop_id),
    slip_id: b.slip_id,
    menu_id: b.menu_id || null,
    cast_id: Number(b.cast_id),
    date: b.date,
    category: b.category || "free",
    item_name: b.item_name || null,
    share_ratio: Number(b.share_ratio) || 1,
    allocated_sales: Math.round(Number(b.allocated_sales) || 0),
    allocated_back: Math.round(Number(b.allocated_back) || 0),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE: 伝票IDに紐づく配分を全削除（伝票の編集・削除時に使う）
export async function DELETE(req: NextRequest) {
  const { slip_id } = await req.json();
  if (!slip_id) return NextResponse.json({ error: "slip_id必須" }, { status: 400 });
  await supabase.from("slip_allocations").delete().eq("slip_id", slip_id);
  return NextResponse.json({ success: true });
}
