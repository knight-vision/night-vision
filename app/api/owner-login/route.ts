import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shop_owners")
    .select("*, shops(*)")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) {
    console.log(`[owner-login] not found: email=${email}`);
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  console.log(`[owner-login] found: id=${data.id} hash_prefix=${data.password_hash?.slice(0,10)}`);

  // bcryptハッシュと平文の両方に対応
  let passwordMatch = false;
  if (data.password_hash?.startsWith("$2")) {
    passwordMatch = await bcrypt.compare(password, data.password_hash);
    console.log(`[owner-login] bcrypt compare result: ${passwordMatch}`);
  } else {
    passwordMatch = data.password_hash === password;
    console.log(`[owner-login] plain compare result: ${passwordMatch}`);
  }

  if (!passwordMatch) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  const shop = data.shops as any;
  return NextResponse.json({
    role: "owner",
    owner_id: data.id,
    shop_id: data.shop_id,
    shop_name: shop?.name,
    shop_slug: shop?.slug,
    email: data.email,
  });
}
