import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!castId) return NextResponse.json({ hourly_wage: null });
  const { data } = await supabase.from("casts").select("hourly_wage").eq("id", Number(castId)).single();
  return NextResponse.json({ hourly_wage: data?.hourly_wage || null });
}
