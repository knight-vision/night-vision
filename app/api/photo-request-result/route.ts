import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml } from "@/lib/emailTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { requestId, action, rejectReason } = await req.json();

  const { data: request } = await supabase
    .from("photo_requests")
    .select("*, shops(name, slug), casts(id, name, shop_id), shop_owners(email)")
    .eq("id", requestId)
    .single();

  if (!request) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });

  if (action === "approve") {
    await supabase.from("photo_requests").update({ status: "approved" }).eq("id", requestId);

    if (request.type === "cast_photo") {
      // ===== キャスト写真の承認 =====
      // photo_requestsのステータス更新のみ（castsテーブルは変更しない）
      // cast/[id]/page.tsx が photo_requests から承認済みを取得して表示する
      
      // キャストにメール通知
      const castId = request.cast_id;
      if (castId) {
        const { data: account } = await supabase
          .from("cast_accounts")
          .select("email")
          .eq("cast_id", castId)
          .single();
        
        const castName = (request.casts as any)?.name || "キャスト";
        const shopId = (request.casts as any)?.shop_id;
        let shopName = "お店";
        if (shopId) {
          const { data: shopData } = await supabase.from("shops").select("name").eq("id", shopId).single();
          shopName = shopData?.name || "お店";
        }

        if (account?.email) {
          await resend.emails.send({
            from: "釧路ナイトビジョン <info@night-vision.jp>",
            to: account.email,
            subject: "【釧路ナイトビジョン】写真が承認されました",
            html: emailHtml({
              title: "📷 写真が承認されました",
              body: `
                <p style="margin:0 0 12px;color:#c0bdd8;">${castName} さん</p>
                <p style="margin:0 0 16px;color:#c0bdd8;">申請されたプロフィール写真が承認されました。キャストプロフィールページに掲載されています。</p>
              `,
              ctaText: "キャストポータルを確認",
              ctaUrl: "https://www.night-vision.jp/cast-portal",
            }),
          }).catch(e => console.error("Mail error:", e));
        }
      }

    } else {
      // ===== 店舗写真の承認 =====
      const updateData: Record<string, any> = {};
      if (request.type === "banner") updateData.image = request.url;
      if (request.type === "icon") updateData.icon = request.url;
      if (request.type === "photos") {
        const { data: shop } = await supabase.from("shops").select("photos").eq("id", request.shop_id).single();
        updateData.photos = [...(shop?.photos ?? []), request.url];
      }
      if (Object.keys(updateData).length > 0) {
        await supabase.from("shops").update(updateData).eq("id", request.shop_id);
      }

      // オーナーにメール通知
      const ownerEmail = (request.shop_owners as any)?.email;
      const shopName = (request.shops as any)?.name || "お店";
      const shopSlug = (request.shops as any)?.slug || "";
      const typeLabels: Record<string, string> = { banner: "バナー画像", icon: "アイコン画像", photos: "店内写真" };

      if (ownerEmail) {
        await resend.emails.send({
          from: "釧路ナイトビジョン <info@night-vision.jp>",
          to: ownerEmail,
          subject: "【釧路ナイトビジョン】写真申請が承認されました",
          html: emailHtml({
            title: "✅ 写真申請が承認されました",
            body: `
              <p style="margin:0 0 12px;color:#c0bdd8;">${shopName} ご担当者様</p>
              <p style="margin:0 0 16px;color:#c0bdd8;">ご申請いただいた<strong style="color:#f0eeff;">${typeLabels[request.type] || request.type}</strong>が承認されました。</p>
            `,
            ctaText: "店舗ページを確認する",
            ctaUrl: `https://www.night-vision.jp/shop/${shopSlug}`,
          }),
        }).catch(e => console.error("Mail error:", e));
      }
    }

  } else {
    // ===== 却下 =====
    await supabase.from("photo_requests").update({
      status: "rejected",
      reject_reason: rejectReason,
    }).eq("id", requestId);

    if (request.type === "cast_photo") {
      const castId = request.cast_id;
      if (castId) {
        const { data: account } = await supabase.from("cast_accounts").select("email").eq("cast_id", castId).single();
        const castName = (request.casts as any)?.name || "キャスト";
        if (account?.email) {
          await resend.emails.send({
            from: "釧路ナイトビジョン <info@night-vision.jp>",
            to: account.email,
            subject: "【釧路ナイトビジョン】写真申請について",
            html: emailHtml({
              title: "写真申請について",
              body: `
                <p style="margin:0 0 12px;color:#c0bdd8;">${castName} さん</p>
                <p style="margin:0 0 16px;color:#c0bdd8;">申請された写真は今回掲載をお断りさせていただきました。</p>
                ${rejectReason ? `<p style="margin:0 0 12px;color:#c0bdd8;">理由: ${rejectReason}</p>` : ""}
              `,
              ctaText: "キャストポータルで再申請",
              ctaUrl: "https://www.night-vision.jp/cast-portal",
            }),
          }).catch(e => console.error("Mail error:", e));
        }
      }
    } else {
      const ownerEmail = (request.shop_owners as any)?.email;
      const shopName = (request.shops as any)?.name || "お店";
      if (ownerEmail) {
        await resend.emails.send({
          from: "釧路ナイトビジョン <info@night-vision.jp>",
          to: ownerEmail,
          subject: "【釧路ナイトビジョン】写真申請について",
          html: emailHtml({
            title: "写真申請について",
            body: `
              <p style="margin:0 0 12px;color:#c0bdd8;">${shopName} ご担当者様</p>
              <p style="margin:0 0 16px;color:#c0bdd8;">ご申請いただいた写真は今回掲載をお断りさせていただきました。</p>
              ${rejectReason ? `<p style="margin:0 0 12px;color:#c0bdd8;">理由: ${rejectReason}</p>` : ""}
            `,
          }),
        }).catch(e => console.error("Mail error:", e));
      }
    }
  }

  return NextResponse.json({ success: true });
}
