import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month  = req.nextUrl.searchParams.get("month");
  if (!shopId || !castId) return NextResponse.json([]);

  // 全伝票を取得してサーバー側でフィルタ（確実）
  let q = sb.from("slips").select("*").eq("shop_id", Number(shopId)).order("date", { ascending: false });
  if (month) q = q.gte("date", `${month}-01`).lte("date", `${month}-31`);
  const { data, error } = await q;
  if (error || !data) return NextResponse.json([]);

  // cast_entries内のcast_idが一致するものだけ返す（型を問わず文字列比較）
  const filtered = data.filter((slip: any) => {
    if (!Array.isArray(slip.cast_entries)) return false;
    return slip.cast_entries.some((e: any) => {
      if (e.cast_id === null || e.cast_id === undefined || e.cast_id === "") return false;
      return String(e.cast_id) === String(castId);
    });
  });

  return NextResponse.json(filtered);
}
