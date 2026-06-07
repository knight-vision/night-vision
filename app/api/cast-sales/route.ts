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
  const month = req.nextUrl.searchParams.get("month");
  if (!shopId && !castId) return NextResponse.json([]);
  let query = supabase.from("cast_sales").select("*").order("date");
  if (month) {
    // 月の正しい範囲: その月の1日 〜 翌月1日の手前（月末が28/30/31でも正しく動く）
    const [y, mo] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonth = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
    query = query.gte("date", start).lt("date", nextMonth);
  }
  if (shopId) query = query.eq("shop_id", Number(shopId));
  if (castId) query = query.eq("cast_id", Number(castId));
  const { data } = await query;
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, cast_id, date, sales_type, amount, count, memo } = await req.json();
  if (!shop_id || !cast_id || !date || amount === undefined || amount === null) {
    return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });
  }
  const { error } = await supabase.from("cast_sales").insert({
    shop_id: Number(shop_id), cast_id: Number(cast_id), date,
    sales_type, amount: Number(amount), count: Number(count)||1, memo: memo||null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("cast_sales").delete().eq("id", id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const { id, amount, count, memo } = await req.json();
  if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 });
  const { error } = await supabase.from("cast_sales").update({ amount: Number(amount), count: Number(count)||1, memo: memo||null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
