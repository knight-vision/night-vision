import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_CHARS = 15;

// GET: 店舗のつぶやき取得（期限切れを除く）
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json(null);
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("shop_tweets")
    .select("*")
    .eq("shop_id", Number(shopId))
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return NextResponse.json(data || null);
}

// POST: つぶやき投稿
export async function POST(req: NextRequest) {
  const { shop_id, message } = await req.json();
  if (!shop_id || !message) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });
  if (message.length > MAX_CHARS) return NextResponse.json({ error: `${MAX_CHARS}文字以内にしてください` }, { status: 400 });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  // 既存のつぶやきを削除してから新規投稿
  await supabase.from("shop_tweets").delete().eq("shop_id", Number(shop_id));

  const { data, error } = await supabase.from("shop_tweets").insert({
    shop_id: Number(shop_id),
    message,
    expires_at: expiresAt.toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: つぶやき削除
export async function DELETE(req: NextRequest) {
  const { shop_id } = await req.json();
  await supabase.from("shop_tweets").delete().eq("shop_id", Number(shop_id));
  return NextResponse.json({ success: true });
}
