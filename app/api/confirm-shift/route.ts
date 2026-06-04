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

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({}, { status: 400 });

  // 月指定があればその月、なければ今日から35日
  const yearParam = req.nextUrl.searchParams.get("year");
  const monthParam = req.nextUrl.searchParams.get("month");
  let todayStr: string, futureStr: string;
  if (yearParam && monthParam) {
    const y = Number(yearParam), m = Number(monthParam);
    todayStr = `${y}-${String(m).padStart(2,"0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    futureStr = `${y}-${String(m).padStart(2,"0")}-${lastDay}`;
  } else {
    const today = new Date();
    todayStr = getDateStr(today);
    const future = new Date(today); future.setDate(today.getDate() + 35);
    futureStr = getDateStr(future);
  }
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
  const rows = shifts.map((s: any) => ({ cast_id: Number(s.cast_id), shop_id: Number(shop_id), date: s.date, start_time: s.start_time, end_time: s.end_time }));
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
    const { data: account } = await supabase.from("cast_accounts").select("email, line_user_id, casts(name)").eq("cast_id", castId).single();
    if (!account?.email) continue;
    const castName = (account.casts as any)?.name || "キャスト";
    const myShifts = shifts.filter((s: any) => s.cast_id === castId);
    await resend.emails.send({
      from: "NIGHT VISION <info@night-vision.jp>",
      to: account.email,
      subject: `【${shopName}】確定シフトのお知らせ`,
      html: emailHtml({
        preheader: `${shopName}から${myShifts.length}日分の確定シフトが届きました`,
        title: `📅 確定シフトのお知らせ`,
        body: `
          <p style="margin:0 0 6px;color:#c0bdd8;">${castName}さん</p>
          <p style="margin:0 0 16px;color:#c0bdd8;"><strong style="color:#f0eeff;">${shopName}</strong>の確定シフトが届きました。</p>
          ${emailDateList(myShifts.map((s: any) => ({ date: s.date, time: `${s.start_time}〜${s.end_time}` })))}
        `,
        ctaText: "キャストポータルを開く",
        ctaUrl: "https://www.night-vision.jp/cast-portal",
      }),
    });

    // キャストにLINE通知（line_user_idが登録済みの場合）
    if (account.line_user_id) {
      const dateList = myShifts.map((s: any) => `${s.date} ${s.start_time}〜${s.end_time}`).join("\n");
      await sendLineMessage(
        account.line_user_id,
        `📅 確定シフトが届きました\n\n${shopName}\n\n${dateList}`,
        "https://www.night-vision.jp/cast-portal",
        "ポータルで確認"
      );
    }
    // キャストにExpo Push通知（push_token登録済みの場合）
    try {
      const { data: pushAccounts } = await supabase
        .from("cast_accounts")
        .select("push_token")
        .eq("cast_id", castId);
      const pushTokens = (pushAccounts || []).map((a: any) => a.push_token).filter(Boolean);
      if (pushTokens.length > 0) {
        await Promise.all(pushTokens.map(token =>
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              to: token,
              title: "📅 シフト確定のお知らせ",
              body: `${shopName}から${myShifts.length}日分の確定シフトが届きました`,
              sound: "default",
              data: { type: "shift_confirmed" },
            }),
          })
        ));
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }
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
