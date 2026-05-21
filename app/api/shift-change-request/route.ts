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

// GET: キャストの変更希望一覧
export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!castId && !shopId) return NextResponse.json([], { status: 400 });

  let query = supabase.from("shift_change_requests").select("*, casts(id, name)").order("date");
  if (castId) query = query.eq("cast_id", Number(castId));
  if (shopId) query = query.eq("shop_id", Number(shopId));

  const { data } = await query;
  return NextResponse.json(data || []);
}

// POST: 変更希望を提出
export async function POST(req: NextRequest) {
  const { cast_id, shop_id, date, type, requested_start_time, requested_end_time, note } = await req.json();
  if (!cast_id || !shop_id || !date || !type) {
    return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });
  }

  const { data: castData } = await supabase.from("casts").select("name").eq("id", cast_id).single();
  const { data: ownerData } = await supabase.from("shop_owners").select("email, shops(name)").eq("shop_id", shop_id).single();

  const { error } = await supabase.from("shift_change_requests").insert({
    cast_id: Number(cast_id), shop_id: Number(shop_id), date,
    type, requested_start_time: requested_start_time || null,
    requested_end_time: requested_end_time || null, note: note || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // オーナーにメール通知
  if (ownerData?.email) {
    const shopName = (ownerData.shops as any)?.name || "お店";
    const castName = castData?.name || "キャスト";
    const typeLabel = type === "day_off" ? "休み希望" : "時間変更希望";
    const detail = type === "day_off"
      ? `${date} 休み希望`
      : `${date} ${requested_start_time}〜${requested_end_time} への変更希望`;

    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: ownerData.email,
      subject: `【シフト${typeLabel}】${castName}からリクエストが届きました`,
      html: emailHtml({
        title: `📝 シフト${typeLabel}が届きました`,
        body: `
          <p style="margin:0 0 6px;color:#c0bdd8;">${shopName} オーナー様</p>
          <p style="margin:0 0 16px;color:#c0bdd8;"><strong style="color:#f0eeff;">${castName}</strong>さんからシフトの${typeLabel}が届きました。</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a1a;border-radius:10px;margin:12px 0;overflow:hidden;">
            <tr><td style="padding:10px 14px;font-size:12px;color:#7c6fa8;width:100px;">種別</td><td style="padding:10px 14px;font-size:14px;color:#e2e0ef;">${typeLabel}</td></tr>
            <tr style="border-top:1px solid #1e1a35;"><td style="padding:10px 14px;font-size:12px;color:#7c6fa8;">詳細</td><td style="padding:10px 14px;font-size:14px;color:#e879f9;font-weight:700;">${detail}</td></tr>
            ${note ? `<tr style="border-top:1px solid #1e1a35;"><td style="padding:10px 14px;font-size:12px;color:#7c6fa8;">メモ</td><td style="padding:10px 14px;font-size:14px;color:#e2e0ef;">${note}</td></tr>` : ""}
          </table>
        `,
        ctaText: "管理画面で確認する",
        ctaUrl: "https://www.night-vision.jp/owner/dashboard?tab=shift",
      }),
    });
  }

  return NextResponse.json({ success: true });
}

// PATCH: ステータス更新（承認/拒否）
export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  await supabase.from("shift_change_requests").update({ status }).eq("id", id);
  return NextResponse.json({ success: true });
}

// DELETE: 削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("shift_change_requests").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
