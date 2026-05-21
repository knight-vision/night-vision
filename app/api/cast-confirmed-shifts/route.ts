import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!castId) return NextResponse.json([]);

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("confirmed_shifts")
    .select("id, cast_id, shop_id, date, start_time, end_time")
    .eq("cast_id", Number(castId))
    .gte("date", today)
    .order("date");

  if (error) {
    console.error("cast confirmed shifts error:", error);
    return NextResponse.json([]);
  }
  return NextResponse.json(data || []);
}
