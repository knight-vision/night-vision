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

  const identifier = `cast:${email.toLowerCase().trim()}`;
  const { blocked, remainingSeconds } = await isBlocked(identifier);
  if (blocked) {
    const min = Math.ceil(remainingSeconds / 60);
    return NextResponse.json({ error: `ログイン試行が多すぎます。約${min}分後に再試行してください。`, blocked: true, remainingSeconds }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("cast_accounts")
    .select("*, casts(id, name, shop_id)")
    .eq("email", email)
    .single();

  if (error || !data) {
    await recordAttempt(identifier);
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  const passwordMatch = data.password_hash.startsWith("$2")
    ? await bcrypt.compare(password, data.password_hash)
    : data.password_hash === password;

  if (!passwordMatch) {
    await recordAttempt(identifier);
    const { blocked: nowBlocked, remainingSeconds: sec } = await isBlocked(identifier);
    if (nowBlocked) {
      return NextResponse.json({ error: "5回連続で失敗しました。5分後に再試行してください。", blocked: true, remainingSeconds: sec }, { status: 429 });
    }
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  await clearAttempts(identifier);
  return NextResponse.json({
    id: data.id, cast_id: data.cast_id,
    cast_name: (data.casts as any)?.name,
    shop_id: (data.casts as any)?.shop_id,
  });
}
