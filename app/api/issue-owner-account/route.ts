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
      subject: "【釧路ナイトビジョン】店舗管理画面のご案内",
      html: emailHtml({
        preheader: "店舗管理画面のアクセス情報をお送りします",
        title: "🏪 店舗管理画面のご案内",
        body: `
          <p style="margin:0 0 16px;">${shopName} ご担当者様</p>
          <p style="margin:0 0 20px;">この度は釧路ナイトビジョンにご掲載いただきありがとうございます。店舗情報を管理できる専用ページのアクセス情報をお送りします。</p>
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin:0 0 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#9ca3af;font-size:12px;padding:6px 0;width:160px;">メールアドレス</td>
                <td style="color:#e2e0ef;font-size:14px;font-weight:600;padding:6px 0;">${email}</td>
              </tr>
              <tr>
                <td style="color:#9ca3af;font-size:12px;padding:6px 0;">パスワード</td>
                <td style="color:#c084fc;font-size:16px;font-weight:800;padding:6px 0;letter-spacing:0.1em;">${password}</td>
              </tr>
            </table>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">管理画面でできること：</p>
          <ul style="margin:0 0 16px;padding-left:20px;color:#9ca3af;font-size:13px;line-height:2;">
            <li>店舗情報・営業時間・説明文の編集</li>
            <li>SNSアカウントの登録</li>
            <li>写真の申請（審査制）</li>
            <li>キャスト情報・確定シフトの管理</li>
          </ul>
        `,
        ctaText: "管理画面を開く",
        ctaUrl: "https://www.night-vision.jp/owner/login",
        footerNote: "ログイン後、パスワードは必ず変更してください。",
      }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "メール送信失敗" }, { status: 500 });
  }
}
