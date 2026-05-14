import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { shopName, photoType, url } = await req.json();

  const typeLabels: Record<string, string> = {
    banner: "バナー画像",
    icon: "アイコン画像",
    photos: "店内写真",
  };

  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: "kushiro.night.vision@gmail.com",
      subject: `【写真申請】${shopName} - ${typeLabels[photoType] ?? photoType}`,
      html: `
<h2>写真申請が届きました</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
  <tr><td>店舗名</td><td>${shopName}</td></tr>
  <tr><td>種類</td><td>${typeLabels[photoType] ?? photoType}</td></tr>
  <tr><td>URL</td><td><a href="${url}">${url}</a></td></tr>
</table>
<br>
<p>審査ページで承認・却下してください：</p>
<a href="https://www.night-vision.jp/admin/photo-requests" style="background:#ff6b9d;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;">審査ページを開く</a>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "通知失敗" }, { status: 500 });
  }
}