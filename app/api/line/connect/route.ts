import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: 連携状態取得
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ connected: false });
  const { data } = await supabase.from("shop_owners").select("line_user_id").eq("shop_id", Number(shopId)).single();
  return NextResponse.json({ connected: !!data?.line_user_id });
}

// POST: ワンタイムトークン発行
export async function POST(req: NextRequest) {
  const { shop_id } = await req.json();
  if (!shop_id) return NextResponse.json({ error: "shop_id必須" }, { status: 400 });

  // 既存トークンを削除
  await supabase.from("line_connect_tokens").delete().eq("shop_id", Number(shop_id));

  // 6桁の英数字トークンを生成
  const token = crypto.randomBytes(3).toString("hex").toUpperCase(); // 例: "A3F9B2"
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分有効

  await supabase.from("line_connect_tokens").insert({
    shop_id: Number(shop_id),
    token,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json({ token });
}

// DELETE: 連携解除
export async function DELETE(req: NextRequest) {
  const { shop_id } = await req.json();
  await supabase.from("shop_owners").update({ line_user_id: null }).eq("shop_id", Number(shop_id));
  return NextResponse.json({ success: true });
}
