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
  const { cast_id, email, shop_name } = await req.json();
  if (!cast_id || !email) return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });

  const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  const { data: castData } = await supabase.from("casts").select("name").eq("id", cast_id).single();
  const { data: existing } = await supabase.from("cast_accounts").select("id").eq("cast_id", Number(cast_id)).single();

  let dbError;
  if (existing) {
    const { error } = await supabase.from("cast_accounts").update({ email: email.toLowerCase().trim(), password_hash: password }).eq("cast_id", Number(cast_id));
    dbError = error;
  } else {
    const { error } = await supabase.from("cast_accounts").insert({ cast_id: Number(cast_id), email: email.toLowerCase().trim(), password_hash: password });
    dbError = error;
  }
  if (dbError) return NextResponse.json({ error: `DB: ${dbError.message}` }, { status: 500 });

  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: email,
      subject: "【釧路ナイトビジョン】キャストポータルのご案内",
      html: emailHtml({
        preheader: "キャストポータルのアカウントが発行されました",
        title: "💃 キャストポータルへようこそ",
        body: `
          <p style="margin:0 0 16px;">${castData?.name || "キャスト"}さん</p>
          <p style="margin:0 0 20px;"><strong style="color:#f1f0f5;">${shop_name || "お店"}</strong>からキャストポータルのアカウントが発行されました。以下の情報でログインしてシフト希望を提出できます。</p>
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin:0 0 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#9ca3af;font-size:12px;padding:6px 0;width:140px;">メールアドレス</td>
                <td style="color:#e2e0ef;font-size:14px;font-weight:600;padding:6px 0;">${email}</td>
              </tr>
              <tr>
                <td style="color:#9ca3af;font-size:12px;padding:6px 0;">パスワード</td>
                <td style="color:#c084fc;font-size:16px;font-weight:800;padding:6px 0;letter-spacing:0.1em;">${password}</td>
              </tr>
            </table>
          </div>
        `,
        ctaText: "キャストポータルを開く",
        ctaUrl: "https://www.night-vision.jp/cast-login",
        footerNote: "このメールに心当たりがない場合は無視してください。",
      }),
    });
  } catch (e) { console.error("Mail error:", e); }

  return NextResponse.json({ success: true });
}
