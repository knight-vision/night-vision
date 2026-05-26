import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { token, shop_id, email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "パスワードは6文字以上で入力してください" }, { status: 400 });

  let resolvedShopId: number;
  let shopName: string;

  if (token) {
    // 招待トークン経由
    const { data: invite } = await supabase.from("invite_tokens")
      .select("*, shops(id, name)")
      .eq("token", token)
      .is("used_at", null)
      .single();
    if (!invite) return NextResponse.json({ error: "無効または使用済みのURLです" }, { status: 404 });
    resolvedShopId = invite.shop_id;
    shopName = (invite.shops as any)?.name || "";
    // トークンを使用済みに
    await supabase.from("invite_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
  } else if (shop_id) {
    // 店舗検索から直接
    const { data: shop } = await supabase.from("shops").select("id, name").eq("id", shop_id).single();
    if (!shop) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    // 既にオーナー登録済みかチェック
    const { data: existing } = await supabase.from("shop_owners").select("id").eq("shop_id", shop_id).single();
    if (existing) return NextResponse.json({ error: "この店舗はすでにアカウントが登録されています。ログインからお試しください" }, { status: 400 });
    resolvedShopId = shop.id;
    shopName = shop.name;
  } else {
    return NextResponse.json({ error: "shop_idまたはtokenが必要です" }, { status: 400 });
  }

  // メール重複チェック
  const { data: existingEmail } = await supabase.from("shop_owners").select("id").eq("email", email.toLowerCase()).single();
  if (existingEmail) return NextResponse.json({ error: "このメールアドレスはすでに登録されています" }, { status: 400 });

  // アカウント作成
  const hash = await bcrypt.hash(password, 10);
  const { data: owner, error } = await supabase.from("shop_owners")
    .insert({ shop_id: resolvedShopId, email: email.toLowerCase(), password_hash: hash })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, shop_id: resolvedShopId, owner_id: owner.id, shop_name: shopName });
}
