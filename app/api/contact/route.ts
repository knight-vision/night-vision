import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, shopName, contactName, contactEmail, message } = body;

  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: "kushiro.night.vision@gmail.com",
      replyTo: contactEmail,
      subject: `【お問い合わせ】${type}：${shopName}`,
      html: `
<h2>【釧路ナイトビジョン】お問い合わせがありました</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
  <tr><td>種別</td><td>${type}</td></tr>
  <tr><td>店舗名</td><td>${shopName}</td></tr>
  <tr><td>お名前</td><td>${contactName}</td></tr>
  <tr><td>メール</td><td>${contactEmail}</td></tr>
  <tr><td>内容</td><td>${message}</td></tr>
</table>
      `,
    });

    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: contactEmail,
      subject: "【釧路ナイトビジョン】お問い合わせを受け付けました",
      html: `
<p>${contactName} 様</p>
<p>お問い合わせありがとうございます。内容を確認の上、3営業日以内にご連絡いたします。</p>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}