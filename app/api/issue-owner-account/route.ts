import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, password, shopName } = await req.json();

  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: email,
      subject: "【釧路ナイトビジョン】店舗管理画面のご案内",
      html: `
<p>${shopName} ご担当者様</p>
<p>この度は釧路ナイトビジョンにご掲載いただきありがとうございます。</p>
<p>店舗情報を管理できる専用ページのアクセス情報をお送りします。</p>
<br>
<table border="1" cellpadding="8" style="border-collapse:collapse;">
  <tr><td>ログインURL</td><td><a href="https://www.night-vision.jp/owner/login">https://www.night-vision.jp/owner/login</a></td></tr>
  <tr><td>メールアドレス</td><td>${email}</td></tr>
  <tr><td>パスワード</td><td>${password}</td></tr>
</table>
<br>
<p>ログイン後、パスワードは必ず変更してください。</p>
<p>管理画面では以下の操作が可能です：</p>
<ul>
  <li>店舗情報（営業時間・説明文・システムなど）の編集</li>
  <li>SNSアカウントの登録</li>
  <li>写真の申請（審査制）</li>
  <li>キャスト情報の管理・出勤設定</li>
</ul>
<br>
<p>ご不明な点はお気軽にご連絡ください。</p>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "メール送信失敗" }, { status: 500 });
  }
}