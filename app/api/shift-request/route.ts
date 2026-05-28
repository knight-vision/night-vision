import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendExpoPush(tokens: string[], title: string, body: string) {
  if (!tokens.length) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokens.map(token => ({ to: token, title, body, sound: "default" }))),
    });
  } catch (e) {
    console.error("Push notification failed:", e);
  }
}

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

  // cast_nameをフラットに展開
  const result = (data || []).map((r: any) => ({
    ...r,
    cast_name: r.casts?.name,
  }));
  return NextResponse.json(result);
}

// シフト希望提出（アプリ単件 or Webバルク両対応）
export async function POST(req: NextRequest) {
  const body = await req.json();

  // アプリからの単件提出
  if (body.cast_id && body.date && !body.shifts) {
    const { cast_id, shop_id, date, start_time, end_time, note, status } = body;
    if (!cast_id || !shop_id || !date) {
      return NextResponse.json({ error: "入力が不足しています" }, { status: 400 });
    }

    const { error } = await supabase.from("shift_requests").upsert({
      cast_id, shop_id, date, start_time: start_time || null, end_time: end_time || null,
      note: note || null, status: status || "pending",
    }, { onConflict: "cast_id,date" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // オーナーにプッシュ通知
    try {
      const { data: cast } = await supabase.from("casts").select("name").eq("id", cast_id).single();
      const { data: tokens } = await supabase.from("push_tokens").select("token").eq("shop_owner_id",
        (await supabase.from("shop_owners").select("id").eq("shop_id", shop_id).single()).data?.id
      );
      if (tokens?.length) {
        const isOff = !start_time;
        await sendExpoPush(
          tokens.map((t: any) => t.token),
          "シフト希望が届きました",
          `${cast?.name}さんから${date}${isOff ? '（休日希望）' : `（${start_time}〜${end_time}）`}の希望が届きました`
        );
      }
    } catch (e) { console.error("Push notification error:", e); }

    return NextResponse.json({ success: true });
  }

  // Webからのバルク提出（既存処理）
  const { castId, shopId, shifts } = body;
  if (!castId || !shopId || !shifts?.length) {
    return NextResponse.json({ error: "入力が不足しています" }, { status: 400 });
  }

  const rows = shifts.map((s: any) => ({
    cast_id: castId, shop_id: shopId, date: s.date,
    start_time: s.start_time, end_time: s.end_time, note: s.note ?? null,
  }));

  const { error } = await supabase.from("shift_requests").upsert(rows, { onConflict: "cast_id,date" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const { data: cast } = await supabase.from("casts").select("name").eq("id", castId).single();
    const { data: owner } = await supabase.from("shop_owners").select("email, shops(name)").eq("shop_id", shopId).single();
    if (owner?.email) {
      const dateList = shifts.map((s: any) => `${s.date}（${s.start_time}〜${s.end_time}）`).join("<br>");
      await resend.emails.send({
        from: "NIGHT VISION <info@night-vision.jp>",
        to: owner.email,
        subject: `【ナイトビジョン】${cast?.name ?? "キャスト"}さんから希望シフトが届きました`,
        html: `<p>${(owner.shops as any)?.name} オーナー様</p><p>${cast?.name ?? "キャスト"}さんから希望シフトが提出されました。</p><br><p><strong>希望シフト：</strong></p><p>${dateList}</p><br><p><a href="https://www.night-vision.jp/owner/dashboard/shifts">シフト管理画面を開く</a></p>`,
      });
    }
  } catch (e) { console.error("通知メール送信失敗:", e); }

  return NextResponse.json({ success: true });
}

// シフト承認（オーナーがアプリから承認）
export async function PATCH(req: NextRequest) {
  const { id, status, shop_id } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const { data: request, error: fetchError } = await supabase
    .from("shift_requests").select("*, casts(name)").eq("id", id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const { error } = await supabase.from("shift_requests").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // キャストにプッシュ通知
  if (status === "approved" || status === "rejected") {
    try {
      const { data: castAccount } = await supabase.from("cast_accounts").select("id").eq("cast_id", request.cast_id).single();
      if (castAccount) {
        const { data: tokens } = await supabase.from("push_tokens").select("token").eq("cast_account_id", castAccount.id);
        if (tokens?.length) {
          const isApproved = status === "approved";
          await sendExpoPush(
            tokens.map((t: any) => t.token),
            isApproved ? "シフトが承認されました" : "シフトが否認されました",
            `${request.date}のシフト希望が${isApproved ? "承認" : "否認"}されました`
          );
        }
      }
    } catch (e) { console.error("Push notification error:", e); }
  }

  return NextResponse.json({ success: true });
}

// 希望シフト削除
export async function DELETE(req: NextRequest) {
  const { castId, date } = await req.json();
  const { error } = await supabase.from("shift_requests").delete().eq("cast_id", castId).eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
