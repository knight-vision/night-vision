import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 招待URL生成
export async function POST(req: NextRequest) {
  const { shop_id } = await req.json();
  if (!shop_id) return NextResponse.json({ error: "shop_id必須" }, { status: 400 });

  const token = crypto.randomBytes(20).toString("hex");
  const { error } = await supabase.from("invite_tokens").insert({ shop_id: Number(shop_id), token });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = `https://www.night-vision.jp/join/${token}`;
  return NextResponse.json({ url, token });
}

// トークン検証
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token必須" }, { status: 400 });

  const { data } = await supabase.from("invite_tokens")
    .select("*, shops(id, name, type, area, slug)")
    .eq("token", token)
    .is("used_at", null)
    .single();

  if (!data) return NextResponse.json({ error: "無効または使用済みのURLです" }, { status: 404 });
  return NextResponse.json({ shop: data.shops, token });
}
