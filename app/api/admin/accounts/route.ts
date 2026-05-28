import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  // オーナーアカウント
  const { data: owners, error: ownerError } = await supabase
    .from("shop_owners")
    .select("id, email, shop_id, password_hash, shops(name)")
    .order("shop_id");

  if (ownerError) console.error("[accounts] owner error:", ownerError);

  // キャストアカウント
  const { data: casts, error: castError } = await supabase
    .from("cast_accounts")
    .select("id, email, shop_id, cast_id, password_hash, shops(name), casts(name)")
    .order("shop_id");

  if (castError) console.error("[accounts] cast error:", castError);

  const result = [
    ...(owners||[]).map((o: any) => ({
      id: String(o.id), email: o.email, shop_id: o.shop_id, password_hash: o.password_hash,
      shop_name: o.shops?.name || `Shop ID:${o.shop_id}`, account_type: "owner",
    })),
    ...(casts||[]).map((c: any) => ({
      id: String(c.id), email: c.email, shop_id: c.shop_id, cast_id: c.cast_id, password_hash: c.password_hash,
      shop_name: c.shops?.name || "", cast_name: c.casts?.name || "", account_type: "cast",
    })),
  ].sort((a,b) => a.shop_name.localeCompare(b.shop_name));

  console.log(`[accounts] owners=${owners?.length || 0} casts=${casts?.length || 0}`);
  return NextResponse.json(result);
}
