import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml, emailInfoTable } from "@/lib/emailTemplate";

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
      from: "NIGHT VISION <info@night-vision.jp>",
      to: email,
      subject: "【NIGHT VISION】キャストポータルのご案内",
      html: emailHtml({
        preheader: "キャストポータルのアカウントが発行されました",
        title: "💃 キャストポータルへようこそ",
        body: `
          <p style="margin:0 0 6px;color:#c0bdd8;">${castData?.name || "キャスト"}さん</p>
          <p style="margin:0 0 16px;color:#c0bdd8;"><strong style="color:#f0eeff;">${shop_name || "お店"}</strong>からキャストポータルのアカウントが発行されました。以下の情報でログインしてシフト希望を提出できます。</p>
          ${emailInfoTable([
            { label: "ポータルURL", value: "night-vision.jp/cast-login" },
            { label: "メールアドレス", value: email },
            { label: "パスワード", value: password, highlight: true },
          ])}
        `,
        ctaText: "キャストポータルを開く",
        ctaUrl: "https://www.night-vision.jp/cast-login",
        footerNote: "このメールに心当たりがない場合は無視してください。",
      }),
    });
  } catch (e) { console.error("Mail error:", e); }
  return NextResponse.json({ success: true });
}
