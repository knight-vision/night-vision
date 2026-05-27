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

  // まず全店舗をあいまい検索
  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, type, area, slug")
    .ilike("name", `%${q}%`)
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shops || shops.length === 0) return NextResponse.json([]);

  // 登録済みのshop_idを取得
  const { data: ownedShops } = await supabase
    .from("shop_owners")
    .select("shop_id");
  const ownedIds = new Set((ownedShops || []).map((o: any) => Number(o.shop_id)));

  // 登録済みを除外
  const results = shops.filter(s => !ownedIds.has(Number(s.id)));

  return NextResponse.json(results);
}
