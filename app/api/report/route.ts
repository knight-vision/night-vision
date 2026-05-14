import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { reportType, shopName, instagram, note } = await req.json();

  const typeLabel = reportType === "new_shop" ? "未掲載店舗の情報提供" : "閉店済み店舗の報告";

  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: "kushiro.night.vision@gmail.com",
      subject: `【店舗報告】${typeLabel}：${shopName}`,
      html: `
<h2>店舗情報の報告が届きました</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
  <tr><td>報告種別</td><td>${typeLabel}</td></tr>
  <tr><td>店舗名</td><td>${shopName}</td></tr>
  <tr><td>Instagram</td><td>${instagram ? "@" + instagram : "未入力"}</td></tr>
  <tr><td>備考</td><td>${note || "なし"}</td></tr>
</table>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "送信失敗" }, { status: 500 });
  }
}