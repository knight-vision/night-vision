import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// GET: キャストの既存希望シフト取得
export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!castId) return NextResponse.json([], { status: 400 });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("shift_requests")
    .select("*")
    .eq("cast_id", castId)
    .gte("date", todayStr)
    .order("date");

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

// POST: シフト希望を提出
export async function POST(req: NextRequest) {
  const { cast_id, shop_id, requests } = await req.json();
  if (!cast_id || !shop_id || !requests?.length) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  // キャスト名を取得
  const { data: castData } = await supabase
    .from("casts")
    .select("name")
    .eq("id", cast_id)
    .single();

  // オーナーのメールを取得
  const { data: ownerData } = await supabase
    .from("shop_owners")
    .select("email, shops(name)")
    .eq("shop_id", shop_id)
    .single();

  // upsert（同じcast_id+dateの場合は更新）
  const rows = requests.map((r: any) => ({
    cast_id: Number(cast_id),
    shop_id: Number(shop_id),
    date: r.date,
    start_time: r.start_time,
    end_time: r.end_time,
    note: r.note || null,
    status: "pending",
  }));

  const { error } = await supabase
    .from("shift_requests")
    .upsert(rows, { onConflict: "cast_id,date" });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  // オーナーにメール通知
  if (ownerData?.email) {
    const shopName = (ownerData.shops as any)?.name || "お店";
    const castName = castData?.name || "キャスト";
    const dateList = requests
      .map((r: any) => `・${r.date}（${r.start_time}〜${r.end_time}）${r.note ? `※${r.note}` : ""}`)
      .join("<br>");

    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: ownerData.email,
      subject: `【シフト希望】${castName}から希望シフトが届きました`,
      html: `
<p>${shopName} オーナー様</p>
<p>${castName}さんからシフト希望が届きました。</p>
<br>
<p><strong>希望日程：</strong></p>
<p>${dateList}</p>
<br>
<p>管理画面でシフトを確定してください。</p>
<p><a href="https://www.night-vision.jp/owner/dashboard">管理画面を開く</a></p>
<br>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
      `,
    });
  }

  return NextResponse.json({ success: true });
}
