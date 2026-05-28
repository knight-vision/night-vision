import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { isBlocked, recordAttempt, clearAttempts } from "@/lib/loginLimit";

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

  const identifier = `owner:${email.toLowerCase().trim()}`;
  const { blocked, remainingSeconds } = await isBlocked(identifier);
  if (blocked) {
    const min = Math.ceil(remainingSeconds / 60);
    return NextResponse.json({ error: `ログイン試行が多すぎます。約${min}分後に再試行してください。`, blocked: true, remainingSeconds }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("shop_owners")
    .select("*, shops(*)")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) {
    await recordAttempt(identifier);
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  let passwordMatch = false;
  if (data.password_hash?.startsWith("$2")) {
    passwordMatch = await bcrypt.compare(password, data.password_hash);
  } else {
    passwordMatch = data.password_hash === password;
  }

  if (!passwordMatch) {
    await recordAttempt(identifier);
    const { blocked: nowBlocked, remainingSeconds: sec } = await isBlocked(identifier);
    if (nowBlocked) {
      return NextResponse.json({ error: `5回連続で失敗しました。5分後に再試行してください。`, blocked: true, remainingSeconds: sec }, { status: 429 });
    }
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  await clearAttempts(identifier);
  const shop = data.shops as any;
  return NextResponse.json({
    role: "owner", owner_id: data.id, shop_id: data.shop_id,
    shop_name: shop?.name, shop_slug: shop?.slug, email: data.email,
  });
}
