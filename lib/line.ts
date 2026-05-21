// LINE Messaging API でプッシュ通知を送る共通関数

export async function sendLineMessage(userId: string, message: string): Promise<boolean> {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return false;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("LINE push error:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("LINE send error:", e);
    return false;
  }
}
