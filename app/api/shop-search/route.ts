import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  // 既にオーナー登録済みの店舗を除外
  const { data: ownedShops } = await supabase
    .from("shop_owners").select("shop_id");
  const ownedIds = (ownedShops || []).map(o => o.shop_id);

  // あいまい検索（ilike）
  const { data } = await supabase
    .from("shops")
    .select("id, name, type, area, slug")
    .ilike("name", `%${q}%`)
    .not("id", "in", ownedIds.length > 0 ? `(${ownedIds.join(",")})` : "(0)")
    .limit(10);

  return NextResponse.json(data || []);
}
