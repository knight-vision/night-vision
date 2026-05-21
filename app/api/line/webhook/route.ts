import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature");

  // 署名検証
  if (process.env.LINE_CHANNEL_SECRET && signature) {
    const hash = crypto
      .createHmac("sha256", process.env.LINE_CHANNEL_SECRET)
      .update(body)
      .digest("base64");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const data = JSON.parse(body);
  for (const event of data.events || []) {
    const userId = event.source?.userId;
    if (!userId) continue;

    // フォロー or メッセージイベント
    if (event.type === "follow" || event.type === "message") {
      // このユーザーIDを一時的にキャッシュ（shop_ownerに紐付けるため）
      // linkTokenを使ってオーナーと紐付け
      console.log("LINE follow/message from:", userId);

      // メッセージにshop_idが含まれる場合（連携コード）
      if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text.trim();
        // 例: "connect:5" のような連携コード
        if (text.startsWith("connect:")) {
          const shopId = text.replace("connect:", "").trim();
          if (shopId) {
            await supabase
              .from("shop_owners")
              .update({ line_user_id: userId })
              .eq("shop_id", Number(shopId));

            // 確認メッセージを送信
            await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{
                  type: "text",
                  text: "✅ LINE通知の連携が完了しました！\n\nシフト申請・写真申請などの通知をLINEでお受け取りいただけます。",
                }],
              }),
            });
          }
        }
      }

      // フォロー時の案内メッセージ
      if (event.type === "follow") {
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [{
              type: "text",
              text: "🦉 釧路ナイトビジョンです！\n\nLINE通知を有効にするには、オーナーダッシュボードの「LINE連携」から連携コードを取得してこのトークルームに送信してください。",
            }],
          }),
        });
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
