import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml, emailInfoTable } from "@/lib/emailTemplate";
import { sendLineMessage } from "@/lib/line";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { job_id, name, birthday, email, phone } = await req.json();
  if (!job_id || !name || !email) {
    return NextResponse.json({ error: "必須項目が入力されていません" }, { status: 400 });
  }

  // 求人・店舗情報を取得
  const { data: job } = await supabase.from("job_postings").select("title, shop_id, shops(name)").eq("id", job_id).single();
  if (!job) return NextResponse.json({ error: "求人が見つかりません" }, { status: 404 });

  const shopName = (job.shops as any)?.name || "お店";

  // オーナーのメールを取得
  const { data: owner } = await supabase.from("shop_owners").select("email").eq("shop_id", job.shop_id).single();

  if (!owner?.email) {
    // オーナーメールがなければ管理者に送信
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: "info@night-vision.jp",
      subject: `【求人応募】${shopName}「${job.title}」に応募がありました`,
      html: emailHtml({
        title: `📨 求人応募が届きました`,
        body: `
          <p style="margin:0 0 12px;color:#c0bdd8;">${shopName}の「${job.title}」に応募がありました。（オーナーへの転送をお願いします）</p>
          ${emailInfoTable([
            { label: "氏名", value: name },
            { label: "生年月日", value: birthday || "未記入" },
            { label: "メール", value: email, highlight: true },
            { label: "電話番号", value: phone || "未記入" },
          ])}
        `,
      }),
    });
  } else {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: owner.email,
      subject: `【求人応募】「${job.title}」に応募がありました`,
      html: emailHtml({
        preheader: `${name}さんから応募が届きました`,
        title: `📨 求人応募が届きました`,
        body: `
          <p style="margin:0 0 12px;color:#c0bdd8;">${shopName} オーナー様</p>
          <p style="margin:0 0 16px;color:#c0bdd8;">「<strong style="color:#f0eeff;">${job.title}</strong>」への応募が届きました。</p>
          ${emailInfoTable([
            { label: "氏名", value: name },
            { label: "生年月日", value: birthday || "未記入" },
            { label: "メールアドレス", value: email, highlight: true },
            { label: "電話番号", value: phone || "未記入" },
          ])}
        `,
        ctaText: "管理画面を開く",
        ctaUrl: "https://www.night-vision.jp/owner/dashboard",
      }),
    });
  }

  // 応募者に確認メールを送信
  await resend.emails.send({
    from: "釧路ナイトビジョン <info@night-vision.jp>",
    to: email,
    subject: `【応募確認】${shopName}への応募を受け付けました`,
    html: emailHtml({
      title: "応募を受け付けました",
      body: `
        <p style="margin:0 0 12px;color:#c0bdd8;">${name} 様</p>
        <p style="margin:0 0 16px;color:#c0bdd8;">
          <strong style="color:#f0eeff;">${shopName}</strong>の
          「<strong style="color:#f0eeff;">${job.title}</strong>」への応募を受け付けました。
          お店からご連絡をお待ちください。
        </p>
      `,
      footerNote: "このメールは自動送信です。",
    }),
  });

  // オーナーにLINE通知
  if (owner?.email) {
    const { data: ownerLine } = await supabase.from("shop_owners").select("line_user_id").eq("shop_id", job.shop_id).single();
    if (ownerLine?.line_user_id) {
      await sendLineMessage(ownerLine.line_user_id, `📨 求人応募が届きました\n\n求人: ${job.title}\n氏名: ${name}\nメール: ${email}${phone ? `\n電話: ${phone}` : ""}`, "https://www.night-vision.jp/owner/dashboard", "管理画面を開く");
    }
  }

  return NextResponse.json({ success: true });
}
