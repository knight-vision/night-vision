import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// 希望シフト一覧取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shop_id");
  const castId = searchParams.get("cast_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("shift_requests")
    .select("*, casts(name)")
    .order("date")
    .order("start_time");

  if (shopId) query = query.eq("shop_id", shopId);
  if (castId) query = query.eq("cast_id", castId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 希望シフト提出
export async function POST(req: NextRequest) {
  const { castId, shopId, shifts } = await req.json();
  // shifts: [{ date, start_time, end_time, note }]

  if (!castId || !shopId || !shifts?.length) {
    return NextResponse.json({ error: "入力が不足しています" }, { status: 400 });
  }

  // upsert（同じcast_id+dateは上書き）
  const rows = shifts.map((s: any) => ({
    cast_id: castId,
    shop_id: shopId,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    note: s.note ?? null,
  }));

  const { error } = await supabase
    .from("shift_requests")
    .upsert(rows, { onConflict: "cast_id,date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // オーナーへのメール通知
  try {
    const { data: cast } = await supabase
      .from("casts")
      .select("name")
      .eq("id", castId)
      .single();

    const { data: owner } = await supabase
      .from("shop_owners")
      .select("email, shops(name)")
      .eq("shop_id", shopId)
      .single();

    if (owner?.email) {
      const dateList = shifts
        .map((s: any) => `${s.date}（${s.start_time}〜${s.end_time}）`)
        .join("<br>");

      await resend.emails.send({
        from: "釧路ナイトビジョン <info@night-vision.jp>",
        to: owner.email,
        subject: `【ナイトビジョン】${cast?.name ?? "キャスト"}さんから希望シフトが届きました`,
        html: `
<p>${(owner.shops as any)?.name} オーナー様</p>
<p>${cast?.name ?? "キャスト"}さんから希望シフトが提出されました。</p>
<br>
<p><strong>希望シフト：</strong></p>
<p>${dateList}</p>
<br>
<p>管理画面でシフトを確定してください。</p>
<p><a href="https://www.night-vision.jp/owner/dashboard/shifts">シフト管理画面を開く</a></p>
<br>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
        `,
      });
    }
  } catch (e) {
    console.error("通知メール送信失敗:", e);
  }

  return NextResponse.json({ success: true });
}

// 希望シフト削除
export async function DELETE(req: NextRequest) {
  const { castId, date } = await req.json();
  const { error } = await supabase
    .from("shift_requests")
    .delete()
    .eq("cast_id", castId)
    .eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
