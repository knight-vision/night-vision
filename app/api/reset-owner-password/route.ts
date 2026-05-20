import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { emailHtml } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, password, shopName } = await req.json();
  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: email,
      subject: "【釧路ナイトビジョン】パスワード再発行のお知らせ",
      html: emailHtml({
        preheader: "新しいパスワードをお送りします",
        title: "🔑 パスワード再発行",
        body: `
          <p style="margin:0 0 16px;">${shopName} ご担当者様</p>
          <p style="margin:0 0 20px;">パスワードを再発行しました。以下の新しいパスワードでログインしてください。</p>
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin:0 0 16px;text-align:center;">
            <div style="color:#9ca3af;font-size:12px;margin-bottom:8px;">新しいパスワード</div>
            <div style="color:#c084fc;font-size:22px;font-weight:900;letter-spacing:0.15em;">${password}</div>
          </div>
        `,
        ctaText: "管理画面にログインする",
        ctaUrl: "https://www.night-vision.jp/owner/login",
        footerNote: "このメールに心当たりがない場合はすぐにお問い合わせください。",
      }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "メール送信失敗" }, { status: 500 });
  }
}
