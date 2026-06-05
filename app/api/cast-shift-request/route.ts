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
  // Supabase time型は0-23時しか受け付けないので、25:00などを01:00に正規化
  const normalizeTime = (t: string): string => {
    if (!t || !t.includes(':')) return t;
    const [hStr, m = '00'] = t.split(':');
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return t;
    const normH = h >= 24 ? h - 24 : h;
    return `${String(normH).padStart(2, '0')}:${m.slice(0, 2)}`;
  };
  const rows = requests.map((r: any) => ({
    cast_id: Number(cast_id), shop_id: Number(shop_id),
    date: r.date,
    start_time: normalizeTime(r.start_time),
    end_time: normalizeTime(r.end_time),
    note: r.note || null, status: "pending",
  }));
  const { error } = await supabase.from("shift_requests").upsert(rows, { onConflict: "cast_id,date" });
  if (error) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });

  if (ownerData?.email) {
    const shopName = (ownerData.shops as any)?.name || "お店";
    const castName = castData?.name || "キャスト";
    await resend.emails.send({
      from: "NIGHT VISION <info@night-vision.jp>",
      to: ownerData.email,
      subject: `【シフト希望】${castName}さんから希望シフトが届きました`,
      html: emailHtml({
        preheader: `${castName}さんから${requests.length}日分の希望シフトが届きました`,
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
        `📩 シフト希望が届きました\n\nキャスト: ${castName2}さん\n\n${dateList}`,
        "https://www.night-vision.jp/owner/dashboard?tab=shift",
        "シフト管理を開く"
      );
    }
  }
  // Expo Push通知（複数オーナーに対応）
  try {
    const { data: owners } = await supabase
      .from("shop_owners")
      .select("push_token")
      .eq("shop_id", shop_id);
    const tokens = (owners || []).map((o: any) => o.push_token).filter(Boolean);
    if (tokens.length > 0) {
      const castName3 = castData?.name || "キャスト";
      await Promise.all(tokens.map(token => 
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            to: token,
            title: "📩 シフト希望が届きました",
            body: `${castName3}さんから${requests.length}日分の希望シフトが届きました`,
            sound: "default",
            data: { type: "shift_request" },
          }),
        })
      ));
    }
  } catch (e) {
    console.error("Push notification failed:", e);
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
