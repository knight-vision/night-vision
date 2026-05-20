import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { emailHtml } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { reportType, shopName, instagram, note } = await req.json();
  const typeLabel = reportType === "new_shop" ? "未掲載店舗の情報提供" : "閉店済み店舗の報告";
  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: "kushiro.night.vision@gmail.com",
      subject: `【店舗報告】${typeLabel}：${shopName}`,
      html: emailHtml({
        title: `📋 店舗情報の報告が届きました`,
        body: `
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin:0 0 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="color:#9ca3af;font-size:12px;padding:6px 0;width:120px;">報告種別</td><td style="color:#e2e0ef;font-size:14px;padding:6px 0;">${typeLabel}</td></tr>
              <tr><td style="color:#9ca3af;font-size:12px;padding:6px 0;">店舗名</td><td style="color:#e2e0ef;font-size:14px;font-weight:700;padding:6px 0;">${shopName}</td></tr>
              <tr><td style="color:#9ca3af;font-size:12px;padding:6px 0;">Instagram</td><td style="color:#e2e0ef;font-size:14px;padding:6px 0;">${instagram ? "@" + instagram : "未入力"}</td></tr>
              <tr><td style="color:#9ca3af;font-size:12px;padding:6px 0;">備考</td><td style="color:#e2e0ef;font-size:14px;padding:6px 0;">${note || "なし"}</td></tr>
            </table>
          </div>
        `,
      }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "送信失敗" }, { status: 500 });
  }
}
