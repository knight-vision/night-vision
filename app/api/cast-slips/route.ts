import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { monthLastDay } from "@/lib/dateRange";
export const dynamic = "force-dynamic";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month  = req.nextUrl.searchParams.get("month");
  const debug  = req.nextUrl.searchParams.get("debug"); // デバッグモード

  if (!shopId) return NextResponse.json([]);

  let q = sb.from("slips").select("id, date, cast_entries").eq("shop_id", Number(shopId)).order("date", { ascending: false });
  if (month) q = q.gte("date", `${month}-01`).lte("date", monthLastDay(month));
  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json([]);

  // デバッグモード: cast_entriesの生データをそのまま返す
  if (debug === "1") {
    return NextResponse.json(data.map((s: any) => ({
      id: s.id, date: s.date,
      cast_entries: s.cast_entries,
      cast_entries_raw: JSON.stringify(s.cast_entries),
    })));
  }

  if (!castId) return NextResponse.json([]);

  // 全カラム取得して返す
  const { data: fullData } = await sb.from("slips").select("*").eq("shop_id", Number(shopId))
    .gte("date", month ? `${month}-01` : "2000-01-01")
    .lte("date", month ? monthLastDay(month) : "2099-12-31")
    .order("date", { ascending: false });

  if (!fullData) return NextResponse.json([]);

  const filtered = fullData.filter((slip: any) => {
    if (!Array.isArray(slip.cast_entries)) return false;
    return slip.cast_entries.some((e: any) => {
      if (e.cast_id === null || e.cast_id === undefined || e.cast_id === "") return false;
      return String(e.cast_id) === String(castId);
    });
  });

  return NextResponse.json(filtered);
}
