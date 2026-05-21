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

    // フォロー時の案内
    if (event.type === "follow") {
      await replyMessage(event.replyToken,
        "🦉 釧路ナイトビジョンです！\n\nLINE通知を有効にするには、オーナーダッシュボードの「LINE通知」タブから連携してください。"
      );
    }

    // メッセージ受信：ワンタイムトークン照合
    if (event.type === "message" && event.message?.type === "text") {
      const token = event.message.text.trim();

      // line_connect_tokensテーブルでトークンを照合
      const { data: tokenData } = await supabase
        .from("line_connect_tokens")
        .select("shop_id, expires_at")
        .eq("token", token)
        .single();

      if (tokenData && new Date(tokenData.expires_at) > new Date()) {
        // 有効なトークン → shop_ownerのline_user_idを更新
        await supabase.from("shop_owners")
          .update({ line_user_id: userId })
          .eq("shop_id", tokenData.shop_id);

        // 使用済みトークンを削除
        await supabase.from("line_connect_tokens")
          .delete().eq("token", token);

        await replyMessage(event.replyToken,
          "✅ LINE通知の連携が完了しました！\n\nシフト申請・写真申請などの通知をこのLINEでお受け取りいただけます。"
        );
      } else {
        await replyMessage(event.replyToken,
          "このコードは無効または期限切れです。\nオーナーダッシュボードから新しいコードを取得してください。"
        );
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}
