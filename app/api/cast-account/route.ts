import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// キャストアカウント発行 (オーナーダッシュボードから呼ぶ)
export async function POST(req: NextRequest) {
  const { castId, email, shopName, castName } = await req.json();
  if (!castId || !email) {
    return NextResponse.json({ error: "入力が不足しています" }, { status: 400 });
  }

  // 既存チェック
  const { data: existing } = await supabase
    .from("cast_accounts")
    .select("id")
    .eq("cast_id", castId)
    .single();

  const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

  if (existing) {
    // 既存アカウントのパスワードをリセット
    await supabase
      .from("cast_accounts")
      .update({ email: email.toLowerCase().trim(), password_hash: password })
      .eq("cast_id", castId);
  } else {
    // 新規作成
    const { error } = await supabase.from("cast_accounts").insert({
      cast_id: castId,
      email: email.toLowerCase().trim(),
      password_hash: password,
    });
    if (error) {
      return NextResponse.json({ error: "アカウント作成失敗: " + error.message }, { status: 500 });
    }
  }

  // メール送信
  await resend.emails.send({
    from: "NIGHT VISION <info@night-vision.jp>",
    to: email,
    subject: "【NIGHT VISION】キャスト専用ページのご案内",
    html: `
<p>${castName} さん</p>
<p>NIGHT VISION キャスト専用ページへのアクセス情報をお送りします。</p>
<br>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><td>ログインURL</td><td><a href="https://www.night-vision.jp/cast/login">https://www.night-vision.jp/cast/login</a></td></tr>
  <tr><td>メールアドレス</td><td>${email}</td></tr>
  <tr><td>パスワード</td><td>${password}</td></tr>
</table>
<br>
<p>ログイン後、シフト希望を提出できます。</p>
<p>【${shopName}】</p>
<p>NIGHT VISION<br>info@night-vision.jp</p>
    `,
  });

  return NextResponse.json({ success: true });
}
