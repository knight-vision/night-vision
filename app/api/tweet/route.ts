import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache, revalidateTag } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_CHARS = 15;

// owner_id が当該 shop_id の所有者か検証
async function verifyOwner(ownerId: unknown, shopId: number): Promise<boolean> {
  const oid = Number(ownerId);
  if (!Number.isInteger(oid) || oid <= 0) return false;
  const { data } = await supabase
    .from("shop_owners")
    .select("id, shop_id")
    .eq("id", oid)
    .eq("shop_id", shopId)
    .single();
  return !!data;
}

// shop_id ごとのつぶやき取得をキャッシュ（60秒）
const getTweetCached = (shopId: number) =>
  unstable_cache(
    async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("shop_tweets")
        .select("*")
        .eq("shop_id", shopId)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data || null;
    },
    [`tweet-${shopId}`],
    { revalidate: 60, tags: [`tweet-${shopId}`] }
  )();

// GET: 店舗のつぶやき取得（期限切れを除く・公開・キャッシュ付き）
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json(null);
  const id = Number(shopId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json(null);

  const data = await getTweetCached(id);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}

// POST: つぶやき投稿（オーナー認証必須）
export async function POST(req: NextRequest) {
  const { shop_id, message, owner_id } = await req.json();
  if (!shop_id || !message) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });
  if (message.length > MAX_CHARS) return NextResponse.json({ error: `${MAX_CHARS}文字以内にしてください` }, { status: 400 });

  const id = Number(shop_id);
  if (!(await verifyOwner(owner_id, id))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  // 既存のつぶやきを削除してから新規投稿
  await supabase.from("shop_tweets").delete().eq("shop_id", id);

  const { data, error } = await supabase.from("shop_tweets").insert({
    shop_id: id,
    message,
    expires_at: expiresAt.toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag(`tweet-${id}`);
  return NextResponse.json(data);
}

// DELETE: つぶやき削除（オーナー認証必須）
export async function DELETE(req: NextRequest) {
  const { shop_id, owner_id } = await req.json();
  const id = Number(shop_id);
  if (!(await verifyOwner(owner_id, id))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  await supabase.from("shop_tweets").delete().eq("shop_id", id);
  revalidateTag(`tweet-${id}`);
  return NextResponse.json({ success: true });
}
