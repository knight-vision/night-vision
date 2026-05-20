import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// 確定シフト取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shop_id");
  const date = searchParams.get("date"); // 特定日
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("confirmed_shifts")
    .select("*, casts(id, name, age, icon)")
    .order("date")
    .order("start_time");

  if (shopId) query = query.eq("shop_id", shopId);
  if (date) query = query.eq("date", date);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// シフト確定（upsert）＋キャストへ通知
export async function POST(req: NextRequest) {
  const { shopId, shifts, notifyCasts } = await req.json();
  // shifts: [{ cast_id, date, start_time, end_time }]

  if (!shopId || !shifts?.length) {
    return NextResponse.json({ error: "入力が不足しています" }, { status: 400 });
  }

  const rows = shifts.map((s: any) => ({
    cast_id: s.cast_id,
    shop_id: shopId,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
  }));

  const { error } = await supabase
    .from("confirmed_shifts")
    .upsert(rows, { onConflict: "cast_id,date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // キャストへ通知メール
  if (notifyCasts) {
    try {
      const { data: shop } = await supabase
        .from("shops")
        .select("name")
        .eq("id", shopId)
        .single();

      // キャストIDごとにグループ化
      const byCast: Record<number, any[]> = {};
      for (const s of shifts) {
        if (!byCast[s.cast_id]) byCast[s.cast_id] = [];
        byCast[s.cast_id].push(s);
      }

      for (const [castId, castShifts] of Object.entries(byCast)) {
        const { data: account } = await supabase
          .from("cast_accounts")
          .select("email, casts(name)")
          .eq("cast_id", Number(castId))
          .single();

        if (account?.email) {
          const dateList = castShifts
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((s) => `${s.date}（${s.start_time}〜${s.end_time}）`)
            .join("<br>");

          await resend.emails.send({
            from: "釧路ナイトビジョン <info@night-vision.jp>",
            to: account.email,
            subject: `【${shop?.name}】シフトが確定しました`,
            html: `
<p>${(account.casts as any)?.name} さん</p>
<p>シフトが確定しました。</p>
<br>
<p><strong>確定シフト：</strong></p>
<p>${dateList}</p>
<br>
<p>ご確認ください。</p>
<p>【${shop?.name}】<br>釧路ナイトビジョン</p>
            `,
          });
        }
      }
    } catch (e) {
      console.error("通知メール送信失敗:", e);
    }
  }

  return NextResponse.json({ success: true });
}

// 確定シフト削除
export async function DELETE(req: NextRequest) {
  const { castId, date } = await req.json();
  const { error } = await supabase
    .from("confirmed_shifts")
    .delete()
    .eq("cast_id", castId)
    .eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
