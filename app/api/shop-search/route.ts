import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// SERVICE_ROLE_KEY でRLSをバイパス
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  // 全店舗をあいまい検索
  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, type, area, slug")
    .ilike("name", `%${q}%`)
    .limit(20);

  if (error) {
    console.error("[shop-search] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!shops || shops.length === 0) {
    console.log("[shop-search] No shops found for query:", q);
    return NextResponse.json([]);
  }

  // 登録済みのshop_idをJS側で除外
  const { data: ownedShops } = await supabase
    .from("shop_owners")
    .select("shop_id");
  const ownedIds = new Set((ownedShops || []).map((o: any) => Number(o.shop_id)));
  const results = shops.filter(s => !ownedIds.has(Number(s.id)));

  console.log(`[shop-search] q="${q}" found=${shops.length} after_filter=${results.length}`);
  return NextResponse.json(results);
}
