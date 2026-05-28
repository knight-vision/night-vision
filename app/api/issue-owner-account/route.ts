import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { emailHtml, emailInfoTable } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, password, shopName } = await req.json();
  try {
    await resend.emails.send({
      from: "NIGHT VISION <info@night-vision.jp>",
      to: email,
      subject: "【NIGHT VISION】店舗管理画面のご案内",
      html: emailHtml({
        preheader: "店舗管理画面のアクセス情報をお送りします",
        title: "🏪 店舗管理画面のご案内",
        body: `
          <p style="margin:0 0 6px;color:#c0bdd8;">${shopName} ご担当者様</p>
          <p style="margin:0 0 16px;color:#c0bdd8;">この度はNIGHT VISIONへのご掲載ありがとうございます。店舗管理専用ページのアクセス情報をお送りします。</p>
          ${emailInfoTable([
            { label: "ログインURL", value: "night-vision.jp/owner/login" },
            { label: "メールアドレス", value: email },
            { label: "パスワード", value: password, highlight: true },
          ])}
          <p style="margin:16px 0 8px;font-size:13px;color:#7c6fa8;">管理画面でできること</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a1a;border-radius:10px;padding:12px 14px;">
            <tr><td style="font-size:13px;color:#c0bdd8;line-height:2.2;">
              ✦ 店舗情報・営業時間・説明文の編集<br>
              ✦ SNSアカウントの登録<br>
              ✦ 写真の申請（審査制）<br>
              ✦ キャスト情報・確定シフトの管理
            </td></tr>
          </table>
        `,
        ctaText: "管理画面を開く",
        ctaUrl: "https://www.night-vision.jp/owner/login",
        footerNote: "ログイン後、パスワードは必ず変更してください。",
      }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "メール送信失敗" }, { status: 500 });
  }
}
