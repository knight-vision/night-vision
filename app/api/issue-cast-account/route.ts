import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { cast_id, email, shop_name } = await req.json();
  if (!cast_id || !email) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  // パスワード生成
  const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

  // キャスト名取得
  const { data: castData } = await supabase
    .from("casts")
    .select("name")
    .eq("id", cast_id)
    .single();

  // アカウント作成（既存なら更新）
  const { error } = await supabase
    .from("cast_accounts")
    .upsert({
      cast_id: Number(cast_id),
      email: email.toLowerCase().trim(),
      password_hash: password,
    }, { onConflict: "cast_id" });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "アカウント作成に失敗しました" }, { status: 500 });
  }

  // キャストにメール送信
  await resend.emails.send({
    from: "釧路ナイトビジョン <info@night-vision.jp>",
    to: email,
    subject: "【釧路ナイトビジョン】キャストポータルのご案内",
    html: `
<p>${castData?.name || "キャスト"}さん</p>
<p>${shop_name}からキャストポータルのアカウントが発行されました。</p>
<p>以下の情報でログインし、シフト希望を提出できます。</p>
<br>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><td>ポータルURL</td><td><a href="https://www.night-vision.jp/cast-login">https://www.night-vision.jp/cast-login</a></td></tr>
  <tr><td>メールアドレス</td><td>${email}</td></tr>
  <tr><td>パスワード</td><td>${password}</td></tr>
</table>
<br>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
    `,
  });

  return NextResponse.json({ success: true });
}
