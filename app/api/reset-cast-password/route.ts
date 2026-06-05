import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { emailHtml, emailInfoTable } from "@/lib/emailTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

function generatePassword(len = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "メールアドレスを入力してください" }, { status: 400 });

  const normalized = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from("cast_accounts")
    .select("id, email, casts(name)")
    .eq("email", normalized)
    .single();

  // メールが見つからなくても同じレスポンスを返す（列挙攻撃対策）
  if (error || !data) {
    return NextResponse.json({ success: true });
  }

  const newPassword = generatePassword();
  const hash = await bcrypt.hash(newPassword, 10);

  await supabase
    .from("cast_accounts")
    .update({ password_hash: hash })
    .eq("id", data.id);

  const castName = (data.casts as any)?.name ?? "キャスト";

  await resend.emails.send({
    from: "NIGHT VISION <info@night-vision.jp>",
    to: normalized,
    subject: "【NIGHT VISION】パスワードをリセットしました",
    html: emailHtml({
      preheader: "新しいパスワードをお送りします",
      title: "🔑 パスワードリセット",
      body: `
        <p style="margin:0 0 6px;color:#c0bdd8;">${castName} さん</p>
        <p style="margin:0 0 16px;color:#c0bdd8;">パスワードリセットのリクエストを受け付けました。以下の新しいパスワードでログインし、設定からパスワードを変更してください。</p>
        ${emailInfoTable([
          { label: "メールアドレス", value: normalized },
          { label: "新しいパスワード", value: newPassword, highlight: true },
        ])}
        <p style="margin:16px 0 0;color:#c0bdd8;font-size:12px;">このメールに心当たりがない場合はすぐにご連絡ください。</p>
      `,
      ctaText: "アプリでログインする",
      ctaUrl: "https://www.night-vision.jp",
    }),
  });

  return NextResponse.json({ success: true });
}
