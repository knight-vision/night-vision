import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // cast_account_id
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${BASE_URL}/cast-portal?tab=line&line_error=1`);
  }

  try {
    // アクセストークン取得
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${BASE_URL}/api/cast-line/callback`,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("token error");

    // ユーザープロフィール取得
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const lineUserId = profile.userId;
    if (!lineUserId) throw new Error("no userId");

    // DBに保存
    await supabase.from("cast_accounts").update({ line_user_id: lineUserId }).eq("id", Number(state));

    // 確認メッセージをLINEで送信
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: "text", text: "✅ LINE通知の連携が完了しました！\n\n確定シフトや写真審査結果の通知がLINEに届きます🦉" }],
        }),
      });
    }

    return NextResponse.redirect(`${BASE_URL}/cast-portal?line_success=1`);
  } catch (e) {
    console.error("Cast LINE callback error:", e);
    return NextResponse.redirect(`${BASE_URL}/cast-portal?line_error=1`);
  }
}
