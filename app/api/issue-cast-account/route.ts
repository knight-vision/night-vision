import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
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

  // 既存アカウントを確認
  const { data: existing } = await supabase
    .from("cast_accounts")
    .select("id")
    .eq("cast_id", Number(cast_id))
    .single();

  let dbError;
  if (existing) {
    // 既存なら更新
    const { error } = await supabase
      .from("cast_accounts")
      .update({
        email: email.toLowerCase().trim(),
        password_hash: password,
      })
      .eq("cast_id", Number(cast_id));
    dbError = error;
  } else {
    // 新規作成
    const { error } = await supabase
      .from("cast_accounts")
      .insert({
        cast_id: Number(cast_id),
        email: email.toLowerCase().trim(),
        password_hash: password,
      });
    dbError = error;
  }

  if (dbError) {
    console.error("DB error:", JSON.stringify(dbError));
    return NextResponse.json({ error: `DB: ${dbError.message}` }, { status: 500 });
  }

  // キャストにメール送信
  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: email,
      subject: "【釧路ナイトビジョン】キャストポータルのご案内",
      html: `
<p>${castData?.name || "キャスト"}さん</p>
<p>${shop_name || "お店"}からキャストポータルのアカウントが発行されました。</p>
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
  } catch (mailError) {
    console.error("Mail error:", mailError);
    // メール失敗でもアカウント作成は成功扱いにする
  }

  return NextResponse.json({ success: true });
}
