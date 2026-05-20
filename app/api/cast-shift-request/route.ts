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

// GET: キャストの既存希望シフト＋店の営業時間を取得
export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!castId) return NextResponse.json({ requests: [], shop: null }, { status: 400 });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const future = new Date(today); future.setDate(today.getDate() + 35);
  const futureStr = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,"0")}-${String(future.getDate()).padStart(2,"0")}`;

  const [{ data: requests }, { data: shop }] = await Promise.all([
    supabase.from("shift_requests").select("*").eq("cast_id", castId).gte("date", todayStr).lte("date", futureStr).order("date"),
    shopId ? supabase.from("shops").select("open_time,close_time,open_hour,closed_week_days,name").eq("id", shopId).single() : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({ requests: requests || [], shop });
}

// POST: シフト希望を提出
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
    const dateList = requests.map((r: any) =>
      `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="color:#c084fc;font-weight:700;">${r.date}</span>
        <span style="color:#e2e0ef;margin-left:12px;">${r.start_time} 〜 ${r.end_time}</span>
        ${r.note ? `<span style="color:#9ca3af;margin-left:8px;">※${r.note}</span>` : ""}
      </div>`
    ).join("");

    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: ownerData.email,
      subject: `【シフト希望】${castName}から希望シフトが届きました`,
      html: emailHtml({
        preheader: `${castName}から${requests.length}日分の希望シフトが届きました`,
        title: `📩 ${castName}から希望シフトが届きました`,
        body: `
          <p style="margin:0 0 16px;">${shopName} オーナー様</p>
          <p style="margin:0 0 20px;"><strong style="color:#f1f0f5;">${castName}</strong>さんから希望シフトが届きました。管理画面でご確認ください。</p>
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin:0 0 16px;">
            <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">希望日程</div>
            ${dateList}
          </div>
        `,
        ctaText: "管理画面でシフトを確認する",
        ctaUrl: "https://www.night-vision.jp/owner/dashboard?tab=shift",
      }),
    });
  }

  return NextResponse.json({ success: true });
}
