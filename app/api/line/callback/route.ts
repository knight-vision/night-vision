import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // shop_id
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=line&line_error=1`
    );
  }

  try {
    // 1. アクセストークン取得
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/api/line/callback`,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("token error");

    // 2. ユーザープロフィール取得（User IDを取得するため）
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const lineUserId = profile.userId;
    if (!lineUserId) throw new Error("no userId");

    // 3. DBに保存
    const shopId = Number(state);
    await supabase
      .from("shop_owners")
      .update({ line_user_id: lineUserId })
      .eq("shop_id", shopId);

    // 4. 確認メッセージをLINEで送信
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{
            type: "text",
            text: "✅ LINE通知の連携が完了しました！\n\nシフト申請・写真申請・求人応募などの通知がLINEに届きます🦉",
          }],
        }),
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=line&line_success=1`
    );
  } catch (e) {
    console.error("LINE callback error:", e);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=line&line_error=1`
    );
  }
}
