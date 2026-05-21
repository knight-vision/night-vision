import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: 連携状態取得
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ connected: false });

  const { data } = await supabase
    .from("shop_owners")
    .select("line_user_id")
    .eq("shop_id", Number(shopId))
    .single();

  return NextResponse.json({
    connected: !!data?.line_user_id,
    line_user_id: data?.line_user_id || null,
  });
}

// DELETE: LINE連携解除
export async function DELETE(req: NextRequest) {
  const { shop_id } = await req.json();
  await supabase
    .from("shop_owners")
    .update({ line_user_id: null })
    .eq("shop_id", Number(shop_id));
  return NextResponse.json({ success: true });
}
