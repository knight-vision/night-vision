import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const shopId = formData.get("shopId") as string;
    const fileType = formData.get("fileType") as string;
    const ownerId = formData.get("ownerId") as string | null;
    const sortOrder = formData.get("sortOrder") as string | null;

    if (!file || !shopId) {
      return NextResponse.json({ error: "ファイルまたはshopIdがありません" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${shopId}/${fileType}_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("shop-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase.storage
      .from("shop-images")
      .getPublicUrl(fileName);

    const url = urlData.publicUrl;

    // photo_requestsへの登録もservice role経由で行う（RLS回避。
    // 従来はクライアント側のanon keyでinsertしておりRLSで弾かれ
    // 店舗ユーザーが画像をアップロードできない不具合があった）
    const { error: insertError } = await supabase.from("photo_requests").insert({
      shop_id: Number(shopId),
      owner_id: ownerId ? Number(ownerId) : null,
      type: fileType,
      url,
      status: "approved", // 審査なしで即反映（戻す場合は "pending"）
      sort_order: sortOrder ? Number(sortOrder) : 0,
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
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "アップロード失敗" }, { status: 500 });
  }
}