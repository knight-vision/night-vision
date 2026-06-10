import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 店舗画像アップロード（署名URL方式）
//  action="sign": Storage直接アップロード用の署名URLを発行（4MB制限を回避・無劣化）
//  action="register": アップロード済みファイルをphoto_requests/shopsに登録
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    const shopId = body.shopId as string | number;
    const fileType = (body.fileType as string) || "photos";
    if (!shopId) return NextResponse.json({ error: "shopIdがありません" }, { status: 400 });

    if (action === "sign") {
      const ext = (body.ext as string || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const fileName = `${shopId}/${fileType}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("shop-images")
        .createSignedUploadUrl(fileName);
      if (error || !data) return NextResponse.json({ error: error?.message || "URL発行失敗" }, { status: 500 });
      const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(fileName);
      return NextResponse.json({ token: data.token, path: data.path, publicUrl: urlData.publicUrl });
    }

    if (action === "register") {
      const url = body.url as string;
      const ownerId = body.ownerId as string | number | null;
      const sortOrder = body.sortOrder;
      if (!url) return NextResponse.json({ error: "URLがありません" }, { status: 400 });

      const { error: insertError } = await supabase.from("photo_requests").insert({
        shop_id: Number(shopId),
        owner_id: ownerId ? Number(ownerId) : null,
        type: fileType,
        url,
        status: "approved", // 審査なしで即反映（戻す場合は "pending"）
        sort_order: sortOrder != null ? Number(sortOrder) : 0,
      });
      if (insertError) {
        console.error("photo_requests insert error:", JSON.stringify(insertError));
        return NextResponse.json({ error: "画像情報の保存に失敗しました: " + insertError.message }, { status: 500 });
      }

      // shopsテーブルのimage/photosを承認済み画像で更新（公開ページが参照）
      if (fileType === "photos") {
        const { data: approved } = await supabase
          .from("photo_requests")
          .select("url")
          .eq("shop_id", Number(shopId))
          .eq("status", "approved")
          .order("sort_order");
        const urls = (approved || []).map((p) => p.url);
        await supabase.from("shops").update({
          image: urls.length > 0 ? urls[0] : null,
          photos: urls,
        }).eq("id", Number(shopId));
      }

      return NextResponse.json({ url });
    }

    return NextResponse.json({ error: "不明なアクション" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "アップロード失敗" }, { status: 500 });
  }
}
