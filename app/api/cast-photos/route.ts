import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_PHOTOS = 5;

// GET: キャストの写真一覧
export async function GET(req: NextRequest) {
  const castId = req.nextUrl.searchParams.get("cast_id");
  if (!castId) return NextResponse.json({ photos: [] });
  const { data } = await supabase.from("casts").select("photos").eq("id", Number(castId)).single();
  return NextResponse.json({ photos: data?.photos || [] });
}

// POST: 写真アップロード
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const castId = formData.get("cast_id") as string;
    if (!file || !castId) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });

    // 現在の写真数を確認
    const { data: cast } = await supabase.from("casts").select("photos, shop_id").eq("id", Number(castId)).single();
    const currentPhotos: string[] = cast?.photos || [];
    if (currentPhotos.length >= MAX_PHOTOS) {
      return NextResponse.json({ error: `写真は最大${MAX_PHOTOS}枚までです` }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `cast/${castId}/photo_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("shop-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(fileName);
    const newPhotos = [...currentPhotos, urlData.publicUrl];

    await supabase.from("casts").update({ photos: newPhotos }).eq("id", Number(castId));
    return NextResponse.json({ url: urlData.publicUrl, photos: newPhotos });
  } catch (err) {
    return NextResponse.json({ error: "アップロード失敗" }, { status: 500 });
  }
}

// DELETE: 写真削除
export async function DELETE(req: NextRequest) {
  const { cast_id, url } = await req.json();
  const { data: cast } = await supabase.from("casts").select("photos").eq("id", Number(cast_id)).single();
  const newPhotos = (cast?.photos || []).filter((p: string) => p !== url);
  await supabase.from("casts").update({ photos: newPhotos }).eq("id", Number(cast_id));

  // Storageからも削除
  const path = url.split("/shop-images/")[1];
  if (path) await supabase.storage.from("shop-images").remove([path]);

  return NextResponse.json({ success: true, photos: newPhotos });
}
