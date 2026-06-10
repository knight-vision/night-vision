import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 店舗画像の削除・並び替えをservice role経由で行う（RLS回避）
// クライアント側のanon keyで photo_requests を直接操作すると
// RLSポリシーで弾かれ、店舗ユーザーが操作できない不具合があったため。

// DELETE: 画像削除 + shopsテーブルのimage/photosを更新
export async function DELETE(req: NextRequest) {
  try {
    const { id, shopId } = await req.json();
    if (!id) return NextResponse.json({ error: "idがありません" }, { status: 400 });

    // 削除対象を取得
    const { data: target } = await supabase
      .from("photo_requests").select("url, status").eq("id", id).single();

    // Storageからも削除
    if (target?.url) {
      const path = (target.url as string).split("/shop-images/")[1];
      if (path) await supabase.storage.from("shop-images").remove([path]);
    }

    await supabase.from("photo_requests").delete().eq("id", id);

    // shopsテーブルのimage/photosを残りの承認済み画像で更新
    if (shopId) {
      const { data: remaining } = await supabase
        .from("photo_requests")
        .select("url")
        .eq("shop_id", Number(shopId))
        .eq("status", "approved")
        .order("sort_order");
      const urls = (remaining || []).map((p) => p.url);
      await supabase.from("shops").update({
        image: urls.length > 0 ? urls[0] : null,
        photos: urls,
      }).eq("id", Number(shopId));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("shop photo delete error:", err);
    return NextResponse.json({ error: err?.message || "削除失敗" }, { status: 500 });
  }
}

// PATCH: 並び替え（id配列を受け取りsort_orderを更新 + shops.photosも更新）
export async function PATCH(req: NextRequest) {
  try {
    const { orderedIds, shopId } = await req.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIdsがありません" }, { status: 400 });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from("photo_requests").update({ sort_order: i }).eq("id", orderedIds[i]);
    }
    // shops.image/photosも新しい順で更新
    if (shopId) {
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
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("shop photo reorder error:", err);
    return NextResponse.json({ error: err?.message || "並び替え失敗" }, { status: 500 });
  }
}
