import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { monthLastDay } from "@/lib/dateRange";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const month = req.nextUrl.searchParams.get("month");
  if (!shopId) return NextResponse.json([]);
  let q = supabase.from("expenses").select("*").eq("shop_id", Number(shopId)).order("date", { ascending: false });
  if (month) q = q.gte("date", `${month}-01`).lte("date", monthLastDay(month));
  const { data } = await q;
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { shop_id, date, name, amount } = await req.json();
  if (!shop_id || !date || !name || !amount) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  const { error } = await supabase.from("expenses").insert({ shop_id: Number(shop_id), date, name, amount: Number(amount) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("expenses").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
