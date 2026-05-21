import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml } from "@/lib/emailTemplate";
import { sendLineMessage } from "@/lib/line";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);
const MAX_PHOTOS = 5;

// GET: キャストの写真申請一覧
export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!castId) return NextResponse.json([]);
  const { data } = await supabase
    .from("photo_requests")
    .select("id, url, status, sort_order, reject_reason")
    .eq("cast_id", Number(castId))
    .order("sort_order");
  return NextResponse.json(data || []);
}

// POST: 写真アップロード → photo_requestsにpending登録
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const castId = formData.get("cast_id") as string;
    const shopId = formData.get("shop_id") as string;
    if (!file || !castId) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });

    // 現在の申請数を確認
    const { count } = await supabase
      .from("photo_requests")
      .select("id", { count: "exact" })
      .eq("cast_id", Number(castId))
      .neq("status", "rejected");
    if ((count || 0) >= MAX_PHOTOS) {
      return NextResponse.json({ error: `写真は最大${MAX_PHOTOS}枚までです` }, { status: 400 });
    }

    // Storageにアップロード
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `cast/${castId}/photo_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("shop-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(fileName);

    // sort_orderを現在の最大+1に
    const { data: existing } = await supabase
      .from("photo_requests")
      .select("sort_order")
      .eq("cast_id", Number(castId))
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;

    // photo_requestsにpendingで登録
    const { error: insertError } = await supabase.from("photo_requests").insert({
      cast_id: Number(castId),
      shop_id: shopId ? Number(shopId) : null,
      owner_id: null,
      type: "cast_photo",
      url: urlData.publicUrl,
      status: "pending",
      sort_order: nextOrder,
    });
    if (insertError) {
      console.error("Insert error:", JSON.stringify(insertError));
      // エラーを日本語で返す
      let errMsg = "写真の申請に失敗しました。しばらく経ってからお試しください。";
      if (insertError.message?.includes("violates check constraint")) {
        errMsg = "写真の種別が正しくありません。管理者にお問い合わせください。";
      } else if (insertError.message?.includes("violates not-null")) {
        errMsg = "必須項目が不足しています。";
      } else if (insertError.message?.includes("duplicate")) {
        errMsg = "同じ写真がすでに申請されています。";
      }
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    // キャスト名・店名を取得してメール通知
    const { data: castData } = await supabase.from("casts").select("name, shop_id").eq("id", Number(castId)).single();
    const castName = castData?.name || "キャスト";
    let shopName = "お店";
    if (castData?.shop_id) {
      const { data: shopData } = await supabase.from("shops").select("name").eq("id", castData.shop_id).single();
      shopName = shopData?.name || "お店";
    }

    try {
      const mailResult = await resend.emails.send({
        from: "釧路ナイトビジョン <info@night-vision.jp>",
        to: process.env.ADMIN_EMAIL || "info@night-vision.jp",
        subject: `【写真審査依頼】${castName}（${shopName}）から写真申請が届きました`,
        html: emailHtml({
          title: "📷 キャスト写真の審査依頼",
          body: `
            <p style="margin:0 0 12px;color:#c0bdd8;">
              <strong style="color:#f0eeff;">${shopName}</strong> の
              <strong style="color:#f0eeff;">${castName}</strong>
              さんからプロフィール写真の申請が届きました。
            </p>
            <div style="margin:12px 0;">
              <img src="${urlData.publicUrl}" alt="申請写真" style="max-width:240px;border-radius:12px;border:1px solid #2d1b4e;" />
            </div>
          `,
          ctaText: "管理画面で審査する",
          ctaUrl: "https://www.night-vision.jp/admin/photo-requests",
        }),
      });
      console.log("Mail sent:", JSON.stringify(mailResult));
    } catch (mailErr: any) {
      console.error("Mail send error:", mailErr?.message || mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cast photo upload error:", err);
    return NextResponse.json({ error: err?.message || "アップロード失敗" }, { status: 500 });
  }
}

// DELETE: 申請削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  // Storageからも削除
  const { data: req_ } = await supabase.from("photo_requests").select("url").eq("id", id).single();
  if (req_?.url) {
    const path = req_.url.split("/shop-images/")[1];
    if (path) await supabase.storage.from("shop-images").remove([path]);
  }
  await supabase.from("photo_requests").delete().eq("id", id);
  return NextResponse.json({ success: true });
}

// PATCH: sort_order更新
export async function PATCH(req: NextRequest) {
  const { id, sort_order } = await req.json();
  await supabase.from("photo_requests").update({ sort_order }).eq("id", id);
  return NextResponse.json({ success: true });
}
