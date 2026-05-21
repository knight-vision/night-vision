import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    await supabase.from("photo_requests").insert({
      cast_id: Number(castId),
      shop_id: shopId ? Number(shopId) : null,
      type: "cast_photo",
      url: urlData.publicUrl,
      status: "pending",
      sort_order: nextOrder,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "アップロード失敗" }, { status: 500 });
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
