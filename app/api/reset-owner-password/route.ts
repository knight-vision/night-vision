import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, password, shopName } = await req.json();
  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: email,
      subject: "【釧路ナイトビジョン】パスワードを再発行しました",
      html: `
<p>${shopName ?? ""} ご担当者様</p>
<p>パスワードの再発行を受け付けました。</p>
<br>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><td>ログインURL</td><td><a href="https://www.night-vision.jp/owner/login">https://www.night-vision.jp/owner/login</a></td></tr>
  <tr><td>メールアドレス</td><td>${email}</td></tr>
  <tr><td>新しいパスワード</td><td><strong>${password}</strong></td></tr>
</table>
<br>
<p>ログイン後、パスワードを変更することをお勧めします。</p>
<p>身に覚えのない場合はお問い合わせください。</p>
<br>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "メール送信失敗" }, { status: 500 });
  }
}