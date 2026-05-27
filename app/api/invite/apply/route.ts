import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { token, shop_id, email, password, tel } = await req.json();
  if (!email || !password || !tel) return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "パスワードは6文字以上で入力してください" }, { status: 400 });

  // shop_idを解決
  let resolvedShopId: number;
  let shopName: string;

  if (token) {
    try {
      const { data: invite } = await supabase.from("invite_tokens")
        .select("*, shops(id, name)")
        .eq("token", token).is("used_at", null).single();
      if (!invite) return NextResponse.json({ error: "無効または使用済みのURLです" }, { status: 404 });
      resolvedShopId = invite.shop_id;
      shopName = (invite.shops as any)?.name || "";
      await supabase.from("invite_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
    } catch {
      if (!shop_id) return NextResponse.json({ error: "招待URLが無効です" }, { status: 404 });
      const { data: shop } = await supabase.from("shops").select("id, name").eq("id", shop_id).single();
      if (!shop) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
      resolvedShopId = shop.id;
      shopName = shop.name;
    }
  } else if (shop_id) {
    const { data: shop } = await supabase.from("shops").select("id, name").eq("id", shop_id).single();
    if (!shop) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    // 既存オーナーチェック
    const { data: existing } = await supabase.from("shop_owners").select("id").eq("shop_id", shop_id).single();
    if (existing) return NextResponse.json({ error: "この店舗はすでにアカウントが登録されています" }, { status: 400 });
    resolvedShopId = shop.id;
    shopName = shop.name;
  } else {
    return NextResponse.json({ error: "shop_idが必要です" }, { status: 400 });
  }

  // メール重複チェック（申請テーブル + オーナーテーブル）
  const { data: existingEmail } = await supabase.from("shop_owners").select("id").eq("email", email.toLowerCase()).single();
  if (existingEmail) return NextResponse.json({ error: "このメールアドレスはすでに登録されています" }, { status: 400 });

  // パスワードハッシュ
  const passwordHash = await bcrypt.hash(password, 10);

  // 申請テーブルに保存
  const { data: application, error } = await supabase.from("owner_applications")
    .insert({ shop_id: resolvedShopId, email: email.toLowerCase(), password_hash: passwordHash, tel, status: "pending" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 管理者へ確認依頼メール
  await resend.emails.send({
    from: "釧路ナイトビジョン <info@night-vision.jp>",
    to: process.env.ADMIN_EMAIL || "kushiro.night.vision@gmail.com",
    subject: `【要対応】店舗会員登録申請：${shopName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#e8e0f0;">
        <h2 style="color:#a78bfa;">🔔 店舗会員登録の申請がありました</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 0;color:#9ca3af;width:120px;">店舗名</td><td style="padding:8px 0;font-weight:bold;">${shopName}</td></tr>
          <tr><td style="padding:8px 0;color:#9ca3af;">メール</td><td style="padding:8px 0;">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#9ca3af;">電話番号</td><td style="padding:8px 0;font-size:20px;font-weight:bold;color:#f472b6;">${tel}</td></tr>
          <tr><td style="padding:8px 0;color:#9ca3af;">申請日時</td><td style="padding:8px 0;">${new Date().toLocaleString("ja-JP")}</td></tr>
          <tr><td style="padding:8px 0;color:#9ca3af;">申請ID</td><td style="padding:8px 0;font-size:11px;color:#6b7280;">${application.id}</td></tr>
        </table>
        <div style="background:#1a1a2e;border:1px solid #7c3aed44;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-weight:bold;color:#a78bfa;">📞 次のアクション</p>
          <ol style="margin:0;padding-left:20px;color:#c0bdd8;line-height:2;">
            <li>${tel} に電話して本人確認を行う</li>
            <li>確認完了後、管理画面から申請を承認する</li>
          </ol>
        </div>
        <a href="https://www.night-vision.jp/admin" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">管理画面を開く →</a>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
