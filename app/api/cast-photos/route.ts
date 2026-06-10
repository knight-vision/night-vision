import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLineMessage } from "@/lib/line";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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

// POST: 2アクション
//  action="sign": Storage直接アップロード用の署名付きURLを発行（4MB制限を回避）
//  action="register": アップロード済みファイルをphoto_requestsに登録
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    const castId = body.cast_id as string | number;
    if (!castId) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });

    if (action === "sign") {
      // 枚数チェック
      const { count } = await supabase
        .from("photo_requests")
        .select("id", { count: "exact" })
        .eq("cast_id", Number(castId))
        .neq("status", "rejected");
      if ((count || 0) >= MAX_PHOTOS) {
        return NextResponse.json({ error: `写真は最大${MAX_PHOTOS}枚までです` }, { status: 400 });
      }
      const ext = (body.ext as string || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const fileName = `cast/${castId}/photo_${Date.now()}.${ext}`;
      // 署名付きアップロードURLを発行（service role）
      const { data, error } = await supabase.storage
        .from("shop-images")
        .createSignedUploadUrl(fileName);
      if (error || !data) return NextResponse.json({ error: error?.message || "URL発行失敗" }, { status: 500 });
      const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(fileName);
      return NextResponse.json({ token: data.token, path: data.path, publicUrl: urlData.publicUrl });
    }

    if (action === "register") {
      const publicUrl = body.url as string;
      const shopId = body.shop_id as string | number | null;
      if (!publicUrl) return NextResponse.json({ error: "URLがありません" }, { status: 400 });

      const { data: existing } = await supabase
        .from("photo_requests")
        .select("sort_order")
        .eq("cast_id", Number(castId))
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;

      const { error: insertError } = await supabase.from("photo_requests").insert({
        cast_id: Number(castId),
        shop_id: shopId ? Number(shopId) : null,
        owner_id: null,
        type: "cast_photo",
        url: publicUrl,
        status: "approved", // 審査なしで即反映（戻す場合は "pending"）
        sort_order: nextOrder,
      });
      if (insertError) {
        console.error("Insert error:", JSON.stringify(insertError));
        return NextResponse.json({ error: "写真の登録に失敗しました: " + insertError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "不明なアクション" }, { status: 400 });
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
