import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { emailHtml, emailInfoTable } from "@/lib/emailTemplate";

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
          <p style="margin:0 0 6px;color:#c0bdd8;">${shopName} ご担当者様</p>
          <p style="margin:0 0 16px;color:#c0bdd8;">パスワードを再発行しました。以下の新しいパスワードでログインしてください。</p>
          ${emailInfoTable([
            { label: "メールアドレス", value: email },
            { label: "新しいパスワード", value: password, highlight: true },
          ])}
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
