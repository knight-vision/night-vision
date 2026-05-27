import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "idが必要です" }, { status: 400 });

  const { data: app } = await supabase
    .from("owner_applications")
    .select("*, shops(name)")
    .eq("id", id).single();
  if (!app) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "すでに処理済みの申請です" }, { status: 400 });

  // オーナーアカウントを作成
  console.log(`[approve] inserting owner: shop_id=${app.shop_id} email=${app.email} hash_prefix=${app.password_hash?.slice(0,10)}`);
  const { data: owner, error } = await supabase.from("shop_owners")
    .insert({ shop_id: app.shop_id, email: app.email, password_hash: app.password_hash })
    .select().single();
  if (error) {
    console.error("[approve] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[approve] owner created: id=${owner.id}`);

  // 申請を承認済みに
  await supabase.from("owner_applications").update({ status: "approved" }).eq("id", id);

  // 申請者にメール通知
  await resend.emails.send({
    from: "釧路ナイトビジョン <info@night-vision.jp>",
    to: app.email,
    subject: "【釧路ナイトビジョン】アカウントが承認されました",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#e8e0f0;">
        <h2 style="color:#10b981;">✅ アカウントが承認されました</h2>
        <p style="color:#c0bdd8;">${app.shops?.name} ご担当者様</p>
        <p style="color:#c0bdd8;">本人確認が完了し、ナイトビジョンのアカウントが有効化されました。</p>
        <a href="https://www.night-vision.jp/owner/login" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;margin-top:16px;">管理画面にログイン →</a>
      </div>
    `,
  });

  return NextResponse.json({ success: true, owner_id: owner.id });
}
