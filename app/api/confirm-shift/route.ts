import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// GET: 確定シフト一覧取得（オーナー用）
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json([], { status: 400 });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: confirmed } = await supabase
    .from("confirmed_shifts")
    .select("*, casts(id, name)")
    .eq("shop_id", shopId)
    .gte("date", todayStr)
    .order("date");

  const { data: requests } = await supabase
    .from("shift_requests")
    .select("*, casts(id, name)")
    .eq("shop_id", shopId)
    .gte("date", todayStr)
    .order("date");

  return NextResponse.json({ confirmed: confirmed || [], requests: requests || [] });
}

// POST: シフト確定（オーナーが確定シフトを登録）
export async function POST(req: NextRequest) {
  const { shop_id, shifts } = await req.json();
  // shifts: [{ cast_id, date, start_time, end_time }]
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

  const { error } = await supabase
    .from("confirmed_shifts")
    .upsert(rows, { onConflict: "cast_id,date" });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  // 希望シフトのstatusをapprovedに更新
  for (const s of shifts) {
    await supabase
      .from("shift_requests")
      .update({ status: "approved" })
      .eq("cast_id", s.cast_id)
      .eq("date", s.date);
  }

  // on_today を確定シフトから自動更新
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayShifts = shifts.filter((s: any) => s.date === todayStr);
  for (const s of todayShifts) {
    await supabase.from("casts").update({ on_today: true }).eq("id", s.cast_id);
  }

  // キャストへメール通知（cast_accountsからメール取得）
  const castIds = [...new Set(shifts.map((s: any) => s.cast_id))];
  const { data: shopData } = await supabase.from("shops").select("name").eq("id", shop_id).single();
  const shopName = shopData?.name || "お店";

  for (const castId of castIds) {
    const { data: account } = await supabase
      .from("cast_accounts")
      .select("email, casts(name)")
      .eq("cast_id", castId)
      .single();

    if (!account?.email) continue;

    const castName = (account.casts as any)?.name || "キャスト";
    const myShifts = shifts.filter((s: any) => s.cast_id === castId);
    const dateList = myShifts
      .map((s: any) => `・${s.date}（${s.start_time}〜${s.end_time}）`)
      .join("<br>");

    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: account.email,
      subject: `【${shopName}】シフトが確定しました`,
      html: `
<p>${castName}さん</p>
<p>${shopName}のシフトが確定しました。</p>
<br>
<p><strong>確定シフト：</strong></p>
<p>${dateList}</p>
<br>
<p>詳細はポータルからご確認ください。</p>
<p><a href="https://www.night-vision.jp/cast-portal">キャストポータルを開く</a></p>
<br>
<p>釧路ナイトビジョン</p>
      `,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE: 確定シフト削除
export async function DELETE(req: NextRequest) {
  const { cast_id, date } = await req.json();
  await supabase.from("confirmed_shifts").delete().eq("cast_id", cast_id).eq("date", date);
  return NextResponse.json({ success: true });
}
