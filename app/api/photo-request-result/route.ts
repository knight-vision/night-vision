import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/shops";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { requestId, action, rejectReason } = await req.json();

  try {
    // 申請情報を取得
    const { data: request } = await supabase
      .from("photo_requests")
      .select("*, shops(name), shop_owners(email)")
      .eq("id", requestId)
      .single();

    if (!request) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });

    const typeLabels: Record<string, string> = {
      banner: "バナー画像",
      icon: "アイコン画像",
      photos: "店内写真",
    };

    if (action === "approve") {
      // 承認：shopsテーブルを更新
      const updateData: Record<string, any> = {};
      if (request.type === "banner") updateData.image = request.url;
      if (request.type === "icon") updateData.icon = request.url;
      if (request.type === "photos") {
        const { data: shop } = await supabase.from("shops").select("photos").eq("id", request.shop_id).single();
        const currentPhotos = shop?.photos ?? [];
        updateData.photos = [...currentPhotos, request.url];
      }
      await supabase.from("shops").update(updateData).eq("id", request.shop_id);
      await supabase.from("photo_requests").update({ status: "approved" }).eq("id", requestId);

      // 担当者に承認メール
      await resend.emails.send({
        from: "釧路ナイトビジョン <info@night-vision.jp>",
        to: request.shop_owners.email,
        subject: "【釧路ナイトビジョン】写真申請が承認されました",
        html: `
<p>${request.shops.name} ご担当者様</p>
<p>ご申請いただいた${typeLabels[request.type]}が承認されました。</p>
<p>店舗ページに反映されましたのでご確認ください。</p>
<br>
<a href="https://www.night-vision.jp/shop/${request.shop_id}">店舗ページを確認する</a>
<br><br>
<p>釧路ナイトビジョン</p>
        `,
      });
    } else {
      // 却下
      await supabase.from("photo_requests").update({
        status: "rejected",
        reject_reason: rejectReason,
      }).eq("id", requestId);

      // 担当者に却下メール
      await resend.emails.send({
        from: "釧路ナイトビジョン <info@night-vision.jp>",
        to: request.shop_owners.email,
        subject: "【釧路ナイトビジョン】写真申請について",
        html: `
<p>${request.shops.name} ご担当者様</p>
<p>ご申請いただいた${typeLabels[request.type]}について、今回は掲載をお断りさせていただきました。</p>
<br>
<p><strong>理由：</strong>${rejectReason}</p>
<br>
<p>内容を修正の上、再度申請いただくことが可能です。</p>
<p>ご不明な点はお問い合わせください。</p>
<br>
<p>釧路ナイトビジョン<br>info@night-vision.jp</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "処理失敗" }, { status: 500 });
  }
}