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

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({}, { status: 400 });
  const today = new Date();
  const todayStr = getDateStr(today);
  const future = new Date(today); future.setDate(today.getDate() + 35);
  const futureStr = getDateStr(future);
  const [{ data: confirmed }, { data: requests }, { data: closedDates }] = await Promise.all([
    supabase.from("confirmed_shifts").select("*, casts(id, name)").eq("shop_id", shopId).gte("date", todayStr).lte("date", futureStr).order("date"),
    supabase.from("shift_requests").select("*, casts(id, name)").eq("shop_id", shopId).gte("date", todayStr).lte("date", futureStr).order("date"),
    supabase.from("shop_closed_dates").select("*").eq("shop_id", shopId).gte("date", todayStr).lte("date", futureStr).order("date"),
  ]);
  return NextResponse.json({ confirmed: confirmed || [], requests: requests || [], closedDates: closedDates || [] });
}

export async function POST(req: NextRequest) {
  const { shop_id, shifts } = await req.json();
  if (!shop_id || !shifts?.length) return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });

  const rows = shifts.map((s: any) => ({
    cast_id: Number(s.cast_id), shop_id: Number(shop_id),
    date: s.date, start_time: s.start_time, end_time: s.end_time,
  }));
  const { error } = await supabase.from("confirmed_shifts").upsert(rows, { onConflict: "cast_id,date" });
  if (error) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });

  for (const s of shifts) {
    await supabase.from("shift_requests").update({ status: "approved" }).eq("cast_id", s.cast_id).eq("date", s.date);
  }
  const todayStr = getDateStr(new Date());
  for (const s of shifts.filter((s: any) => s.date === todayStr)) {
    await supabase.from("casts").update({ on_today: true }).eq("id", s.cast_id);
  }

  const castIds = [...new Set(shifts.map((s: any) => s.cast_id))];
  const { data: shopData } = await supabase.from("shops").select("name").eq("id", shop_id).single();
  const shopName = shopData?.name || "お店";

  for (const castId of castIds) {
    const { data: account } = await supabase.from("cast_accounts").select("email, casts(name)").eq("cast_id", castId).single();
    if (!account?.email) continue;
    const castName = (account.casts as any)?.name || "キャスト";
    const myShifts = shifts.filter((s: any) => s.cast_id === castId);
    const dateList = myShifts.map((s: any) =>
      `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="color:#c084fc;font-weight:700;">${s.date}</span>
        <span style="color:#e2e0ef;margin-left:12px;">${s.start_time} 〜 ${s.end_time}</span>
      </div>`
    ).join("");

    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: account.email,
      subject: `【${shopName}】確定シフトのお知らせ`,
      html: emailHtml({
        preheader: `${shopName}から${myShifts.length}日分の確定シフトが届きました`,
        title: `📅 確定シフトのお知らせ`,
        body: `
          <p style="margin:0 0 16px;">${castName}さん</p>
          <p style="margin:0 0 20px;"><strong style="color:#f1f0f5;">${shopName}</strong>の確定シフトが届きました。</p>
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin:0 0 16px;">
            <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">確定シフト</div>
            ${dateList}
          </div>
        `,
        ctaText: "キャストポータルを開く",
        ctaUrl: "https://www.night-vision.jp/cast-portal",
      }),
    });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (body.type === "closed_date") {
    await supabase.from("shop_closed_dates").delete().eq("shop_id", body.shop_id).eq("date", body.date);
  } else {
    await supabase.from("confirmed_shifts").delete().eq("cast_id", body.cast_id).eq("date", body.date);
  }
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const { shop_id, date, reason } = await req.json();
  if (!shop_id || !date) return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  const { error } = await supabase.from("shop_closed_dates").upsert({ shop_id: Number(shop_id), date, reason: reason || null }, { onConflict: "shop_id,date" });
  if (error) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ success: true });
}
