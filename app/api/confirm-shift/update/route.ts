import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { shop_id, cast_id, date, start_time, end_time } = await req.json();
  if (!shop_id || !cast_id || !date || !start_time || !end_time) {
    return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  }

  const { error } = await supabase
    .from("confirmed_shifts")
    .update({ start_time, end_time })
    .eq("shop_id", Number(shop_id))
    .eq("cast_id", Number(cast_id))
    .eq("date", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
