import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml } from "@/lib/emailTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { sender_type, sender_id, shop_id, message, sender_name } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 });

  const { error } = await supabase.from("feedbacks").insert({
    sender_type: sender_type || "unknown",
    sender_id: sender_id ? Number(sender_id) : null,
    shop_id: shop_id ? Number(shop_id) : null,
    message,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await resend.emails.send({
    from: "NIGHT VISION <info@night-vision.jp>",
    to: process.env.ADMIN_EMAIL || "info@night-vision.jp",
    subject: `【ご意見・ご要望】${sender_type === "cast" ? "キャスト" : "オーナー"}から`,
    html: emailHtml({
      title: "💬 ご意見・ご要望が届きました",
      body: `
        <p style="margin:0 0 6px;color:#c0bdd8;">送信者: <strong style="color:#f0eeff;">${sender_name || sender_type}</strong></p>
        ${shop_id ? `<p style="margin:0 0 12px;color:#7c6fa8;font-size:13px;">店舗ID: ${shop_id}</p>` : ""}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a1a;border-radius:10px;margin:12px 0;">
          <tr><td style="padding:16px;font-size:14px;color:#e2e0ef;line-height:1.8;white-space:pre-wrap;">${message}</td></tr>
        </table>
      `,
    }),
  });

  return NextResponse.json({ success: true });
}
