import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    shopName,
    address,
    shopTel,
    type,
    typeOther,
    area,
    areaOther,
    openHour,
    closedDays,
    seats,
    instagram,
    xAccount,
    tiktok,
    pr,
    contactName,
    contactEmail,
    contactTel,
    plan,
    notes,
  } = body;

  const planLabels: Record<string, string> = {
    free: "フリープラン（無料）",
    gold: "ゴールドプラン（月額3,000円）",
    premium: "プレミアムプラン（月額7,000円）",
  };

  const html = `
<h2>【NIGHT VISION】掲載申し込みがありました</h2>

<h3>■ 店舗情報</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
  <tr><td>店舗名</td><td>${shopName}</td></tr>
  <tr><td>所在地</td><td>${address}</td></tr>
  <tr><td>店舗電話番号</td><td>${shopTel || "未入力"}</td></tr>
  <tr><td>業種</td><td>${type === "other" ? "その他：" + typeOther : type}</td></tr>
  <tr><td>エリア</td><td>${area === "other" ? "その他：" + areaOther : area}</td></tr>
  <tr><td>営業時間</td><td>${openHour || "未入力"}</td></tr>
  <tr><td>定休日</td><td>${closedDays || "未入力"}</td></tr>
  <tr><td>席数</td><td>${seats || "未入力"}</td></tr>
  <tr><td>Instagram</td><td>${instagram || "未入力"}</td></tr>
  <tr><td>X（Twitter）</td><td>${xAccount || "未入力"}</td></tr>
  <tr><td>TikTok</td><td>${tiktok || "未入力"}</td></tr>
  <tr><td>一言PR</td><td>${pr || "未入力"}</td></tr>
</table>

<h3>■ 担当者情報</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
  <tr><td>担当者氏名</td><td>${contactName}</td></tr>
  <tr><td>メールアドレス</td><td>${contactEmail}</td></tr>
  <tr><td>電話番号</td><td>${contactTel || "未入力"}</td></tr>
</table>

<h3>■ 申し込みプラン</h3>
<p><strong>${planLabels[plan] ?? plan}</strong></p>

<h3>■ 備考・要望</h3>
<p>${notes || "なし"}</p>
  `;

  try {
    await resend.emails.send({
      from: "NIGHT VISION <info@night-vision.jp>",
      to: "kushiro.night.vision@gmail.com",
      replyTo: contactEmail,
      subject: `【掲載申し込み】${shopName}`,
      html,
    });

    // 申し込み者への自動返信
    await resend.emails.send({
      from: "NIGHT VISION <info@night-vision.jp>",
      to: contactEmail,
      subject: "【NIGHT VISION】掲載申し込みを受け付けました",
      html: `
<p>${contactName} 様</p>
<p>この度はNIGHT VISIONへの掲載申し込みありがとうございます。</p>
<p>内容を確認の上、3営業日以内にご連絡いたします。</p>
<br>
<p>申し込み内容：</p>
<ul>
  <li>店舗名：${shopName}</li>
  <li>プラン：${planLabels[plan] ?? plan}</li>
</ul>
<br>
<p>NIGHT VISION</p>
<p>info@night-vision.jp</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}