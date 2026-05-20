import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// GET: 確定シフト・希望シフト・店休日を取得
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({}, { status: 400 });

  const today = new Date();
  const todayStr = getDateStr(today);
  const future = new Date(today);
  future.setDate(today.getDate() + 35);
  const futureStr = getDateStr(future);

  const [{ data: confirmed }, { data: requests }, { data: closedDates }] = await Promise.all([
    supabase.from("confirmed_shifts").select("*, casts(id, name)").eq("shop_id", shopId).gte("date", todayStr).lte("date", futureStr).order("date"),
    supabase.from("shift_requests").select("*, casts(id, name)").eq("shop_id", shopId).gte("date", todayStr).lte("date", futureStr).order("date"),
    supabase.from("shop_closed_dates").select("*").eq("shop_id", shopId).gte("date", todayStr).lte("date", futureStr).order("date"),
  ]);

  return NextResponse.json({
    confirmed: confirmed || [],
    requests: requests || [],
    closedDates: closedDates || [],
  });
}

// POST: 確定シフト保存
export async function POST(req: NextRequest) {
  const { shop_id, shifts } = await req.json();
  if (!shop_id || !shifts?.length) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  const rows = shifts.map((s: any) => ({
    cast_id: Number(s.cast_id),
    shop_id: Number(shop_id),
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
  }));

  const { error } = await supabase.from("confirmed_shifts").upsert(rows, { onConflict: "cast_id,date" });
  if (error) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });

  // 希望シフトのstatusをapprovedに更新
  for (const s of shifts) {
    await supabase.from("shift_requests").update({ status: "approved" }).eq("cast_id", s.cast_id).eq("date", s.date);
  }

  // 今日分はon_todayを更新
  const todayStr = getDateStr(new Date());
  for (const s of shifts.filter((s: any) => s.date === todayStr)) {
    await supabase.from("casts").update({ on_today: true }).eq("id", s.cast_id);
  }

  // キャストへメール通知
  const castIds = [...new Set(shifts.map((s: any) => s.cast_id))];
  const { data: shopData } = await supabase.from("shops").select("name").eq("id", shop_id).single();
  const shopName = shopData?.name || "お店";

  for (const castId of castIds) {
    const { data: account } = await supabase.from("cast_accounts").select("email, casts(name)").eq("cast_id", castId).single();
    if (!account?.email) continue;
    const castName = (account.casts as any)?.name || "キャスト";
    const myShifts = shifts.filter((s: any) => s.cast_id === castId);
    const dateList = myShifts.map((s: any) => `・${s.date}（${s.start_time}〜${s.end_time}）`).join("<br>");
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: account.email,
      subject: `【${shopName}】確定シフトのお知らせ`,
      html: `<p>${castName}さん</p><p>${shopName}の確定シフトが届きました。</p><br><p><strong>確定シフト：</strong></p><p>${dateList}</p><br><p><a href="https://www.night-vision.jp/cast-portal">キャストポータルを開く</a></p><br><p>釧路ナイトビジョン</p>`,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE: 確定シフト削除 or 店休日削除
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (body.type === "closed_date") {
    await supabase.from("shop_closed_dates").delete().eq("shop_id", body.shop_id).eq("date", body.date);
  } else {
    await supabase.from("confirmed_shifts").delete().eq("cast_id", body.cast_id).eq("date", body.date);
  }
  return NextResponse.json({ success: true });
}

// PUT: 店休日の追加
export async function PUT(req: NextRequest) {
  const { shop_id, date, reason } = await req.json();
  if (!shop_id || !date) return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });

  const { error } = await supabase.from("shop_closed_dates").upsert({ shop_id: Number(shop_id), date, reason: reason || null }, { onConflict: "shop_id,date" });
  if (error) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ success: true });
}
