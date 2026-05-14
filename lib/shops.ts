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
  on_today: boolean;
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
  page_views: number;
  casts: Cast[];
  address: string | null;
  system: string | null;
  open_time: string | null;
  close_time: string | null;
  closed_week_days: string[] | null;
  is_closed: boolean;
};

export async function getShops(): Promise<Shop[]> {
  const { data: shops, error } = await supabase
    .from("shops")
    .select("*, casts(*)")
    .order("plan", { ascending: false })
    .order("id");
  if (error) return [];
  return (shops ?? []) as Shop[];
}

export async function getShopsByType(type: string): Promise<Shop[]> {
  const { data: shops, error } = await supabase
    .from("shops")
    .select("*, casts(*)")
    .eq("type", type)
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
  return shop as Shop;
}

export async function getAllSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("shops")
    .select("slug");
  if (error) return [];
  return data.map((s) => s.slug);
}