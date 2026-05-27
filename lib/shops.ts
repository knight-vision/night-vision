import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type PlanType = "free" | "standard" | "premium";

export type Cast = {
  id: number;
  shop_id: number;
  name: string;
  age: number;
  comment: string;
  on_today: boolean | null;
  instagram: string | null;
  x_account: string | null;
  tiktok_account: string | null;
  birthplace: string | null;
  page_views: number;
};

export type Shop = {
  id: number;
  slug: string;
  name: string;
  type: "スナック" | "ガールズバー" | "ラウンジ" | "カジュアルバー";
  area: string;
  area_category: "末広" | "愛国" | "その他";
  budget: string;
  open_hour: string;
  tel: string;
  description: string;
  tags: string[];
  instagram: string | null;
  x_account: string | null;
  tiktok_account: string | null;
  image: string | null;
  icon: string | null;
  photos: string[] | null;
  plan: PlanType;
  referred: boolean;
  seats: number | null;
  age_groups: string[] | null;
  closed_days: string | null;
  casts: Cast[];
  address: string | null;
  system: string | null;
  open_time: string | null;
  close_time: string | null;
  closed_week_days: string[] | null;
  is_closed: boolean;
  weekly_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  display_order: number | null;
  created_at: string | null;
  favorite_count: number | null;
  page_views: number | null;
};

export async function getShops(): Promise<Shop[]> {
  const { data: shops, error } = await supabase
    .from("shops")
    .select("*, casts(*)")
    .neq("hidden", true)  // 非表示を除外
    .order("plan", { ascending: false })
    .order("id");
  if (error) return [];
  if (!shops) return [];

  // 各店舗の承認済み写真を取得
  const shopIds = shops.map((s) => s.id);
  const { data: photoRequests } = await supabase
    .from("photo_requests")
    .select("shop_id, url, sort_order")
    .in("shop_id", shopIds)
    .eq("status", "approved")
    .order("sort_order");

  return shops.map((shop) => {
    const photos = (photoRequests ?? [])
      .filter((p) => p.shop_id === shop.id)
      .map((p) => p.url);
    return {
      ...shop,
      photos: photos.length > 0 ? photos : (shop.photos ?? []),
      image: photos.length > 0 ? photos[0] : shop.image,
    };
  }) as Shop[];
}

export async function getShopsByType(type: string): Promise<Shop[]> {
  const { data: shops, error } = await supabase
    .from("shops")
    .select("*, casts(*)")
    .eq("type", type)
    .neq("hidden", true)
    .order("id");
  if (error) throw error;
  return shops as Shop[];
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const { data: shop, error } = await supabase
    .from("shops")
    .select("*, casts(*)")
    .eq("slug", slug)
    .single();
  if (error) return null;

  // 承認済み店舗写真を取得（cast_photoは除外）
  const { data: photos } = await supabase
    .from("photo_requests")
    .select("url, sort_order")
    .eq("shop_id", shop.id)
    .eq("status", "approved")
    .neq("type", "cast_photo")
    .order("sort_order");

  const photoUrls = (photos ?? []).map((p) => p.url);

  // 各キャストの承認済みアイコン写真（1枚目）を取得
  const castIds = (shop.casts ?? []).map((c: any) => c.id);
  let castIconMap: Record<number, string> = {};
  if (castIds.length > 0) {
    const { data: castPhotos } = await supabase
      .from("photo_requests")
      .select("cast_id, url, sort_order")
      .in("cast_id", castIds)
      .eq("status", "approved")
      .eq("type", "cast_photo")
      .order("sort_order");

    // 各キャストの最初の写真をアイコンとして使用
    for (const p of (castPhotos ?? [])) {
      if (p.cast_id && !castIconMap[p.cast_id]) {
        castIconMap[p.cast_id] = p.url;
      }
    }
  }

  const castsWithIcons = (shop.casts ?? []).map((c: any) => ({
    ...c,
    icon_photo: castIconMap[c.id] || null,
  }));

  return {
    ...shop,
    casts: castsWithIcons,
    photos: photoUrls.length > 0 ? photoUrls : (shop.photos ?? []),
    image: photoUrls.length > 0 ? photoUrls[0] : shop.image,
  } as Shop;
}

export async function getAllSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("shops")
    .select("slug");
  if (error) return [];
  return data.map((s) => s.slug);
}