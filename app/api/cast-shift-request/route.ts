import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml, emailDateList } from "@/lib/emailTemplate";
import { sendLineMessage } from "@/lib/line";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!castId) return NextResponse.json({ requests: [], shop: null }, { status: 400 });
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const future = new Date(today); future.setFullYear(today.getFullYear() + 1);
  const futureStr = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,"0")}-${String(future.getDate()).padStart(2,"0")}`;
  const [{ data: requests }, { data: shop }] = await Promise.all([
    supabase.from("shift_requests").select("*").eq("cast_id", castId).order("date"),
    shopId ? supabase.from("shops").select("open_time,close_time,open_hour,closed_week_days,name").eq("id", shopId).single() : Promise.resolve({ data: null }),
  ]);
  return NextResponse.json({ requests: requests || [], shop });
}

export async function POST(req: NextRequest) {
  const { cast_id, shop_id, requests } = await req.json();
  if (!cast_id || !shop_id || !requests?.length) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }
  const { data: castData } = await supabase.from("casts").select("name").eq("id", cast_id).single();
  const { data: ownerData } = await supabase.from("shop_owners").select("email, shops(name)").eq("shop_id", shop_id).single();
  const rows = requests.map((r: any) => ({
    cast_id: Number(cast_id), shop_id: Number(shop_id),
    date: r.date, start_time: r.start_time, end_time: r.end_time,
    note: r.note || null, status: "pending",
  }));
  const { error } = await supabase.from("shift_requests").upsert(rows, { onConflict: "cast_id,date" });
  if (error) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });

  if (ownerData?.email) {
    const shopName = (ownerData.shops as any)?.name || "お店";
    const castName = castData?.name || "キャスト";
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: ownerData.email,
      subject: `【シフト希望】${castName}から希望シフトが届きました`,
      html: emailHtml({
        preheader: `${castName}から${requests.length}日分の希望シフトが届きました`,
        title: `📩 希望シフトが届きました`,
        body: `
          <p style="margin:0 0 6px;color:#c0bdd8;">${shopName} オーナー様</p>
          <p style="margin:0 0 16px;color:#c0bdd8;"><strong style="color:#f0eeff;">${castName}</strong>さんから希望シフトが届きました。</p>
          ${emailDateList(requests.map((r: any) => ({ date: r.date, time: `${r.start_time}〜${r.end_time}`, note: r.note || undefined })))}
        `,
        ctaText: "管理画面でシフトを確認する",
        ctaUrl: "https://www.night-vision.jp/owner/dashboard?tab=shift",
      }),
    });

    // LINE通知
    const { data: ownerLine } = await supabase
      .from("shop_owners")
      .select("line_user_id")
      .eq("shop_id", shop_id)
      .single();
    if (ownerLine?.line_user_id) {
      const castName2 = castData?.name || "キャスト";
      const dateList = requests.map((r: any) => `${r.date} ${r.start_time}〜${r.end_time}`).join("\n");
      await sendLineMessage(
        ownerLine.line_user_id,
        `📩 シフト希望が届きました\n\nキャスト: ${castName2}\n\n${dateList}\n\n管理画面で確認してください。`
      );
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  const { error } = await supabase.from("shift_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
