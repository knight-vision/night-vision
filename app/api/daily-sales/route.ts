import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const month = req.nextUrl.searchParams.get("month");
  if (!shopId) return NextResponse.json([]);
  const start = `${month}-01`, end = `${month}-31`;
  const { data } = await supabase.from("daily_sales").select("*")
    .eq("shop_id", Number(shopId)).gte("date", start).lte("date", end).order("date");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, date, opening_cash, cash_sales, card_sales, invoice_sales, cost, memo } = await req.json();
  const { error } = await supabase.from("daily_sales").upsert({
    shop_id: Number(shop_id), date,
    opening_cash: opening_cash||0, cash_sales: cash_sales||0,
    card_sales: card_sales||0, invoice_sales: invoice_sales||0,
    cost: cost||0, memo: memo||null,
  }, { onConflict: "shop_id,date" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("daily_sales").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
