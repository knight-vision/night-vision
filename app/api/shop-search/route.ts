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
 
  // 既にオーナー登録済みの shop_id 一覧を取得
  const { data: ownedShops } = await supabase
    .from("shop_owners")
    .select("shop_id");
 
  const ownedIds: number[] = (ownedShops || []).map((o) => o.shop_id);
 
  // あいまい検索（ilike）
  let query = supabase
    .from("shops")
    .select("id, name, type, area, slug")
    .ilike("name", `%${q}%`)
    .limit(10);
 
  // 登録済み店舗を除外（ownedIds が空なら除外処理をスキップ）
  if (ownedIds.length > 0) {
    query = query.not("id", "in", `(${ownedIds.join(",")})`);
  }
 
  const { data, error } = await query;
 
  if (error) {
    console.error("[shop-search] error:", error);
  }
 
  return NextResponse.json(data || []);
}
 
