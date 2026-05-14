import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const PLAN_LABELS: Record<string, string> = {
  free: "フリープラン（無料）",
  standard: "ゴールドプラン（月額3,000円）",
  premium: "プレミアムプラン（月額7,000円）",
  close: "掲載終了",
};

export async function POST(req: NextRequest) {
  const { shopName, currentPlan, newPlan } = await req.json();
  try {
    await resend.emails.send({
      from: "釧路ナイトビジョン <info@night-vision.jp>",
      to: "kushiro.night.vision@gmail.com",
      subject: `【${newPlan === "close" ? "掲載終了申請" : "プラン変更申請"}】${shopName}`,
      html: `
<h2>${newPlan === "close" ? "掲載終了申請" : "プラン変更申請"}が届きました</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
  <tr><td>店舗名</td><td>${shopName}</td></tr>
  <tr><td>現在のプラン</td><td>${PLAN_LABELS[currentPlan] ?? currentPlan}</td></tr>
  <tr><td>申請内容</td><td>${PLAN_LABELS[newPlan] ?? newPlan}</td></tr>
</table>
<br>
<p>管理画面で対応してください：</p>
<a href="https://www.night-vision.jp/admin">管理画面を開く</a>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "送信失敗" }, { status: 500 });
  }
}