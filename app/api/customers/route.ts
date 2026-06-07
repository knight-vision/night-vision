import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const castId = req.nextUrl.searchParams.get("cast_id");
  const month  = req.nextUrl.searchParams.get("month");
  const slipId = req.nextUrl.searchParams.get("slip_id");
  if (!shopId) return NextResponse.json([]);
  let q = sb.from("customers").select("*").eq("shop_id", Number(shopId));
  if (castId) q = q.eq("cast_id", Number(castId));
  if (month)  q = q.gte("visit_date", `${month}-01`).lte("visit_date", `${month}-31`);
  if (slipId) q = q.eq("slip_id", slipId);
  const { data } = await q.order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

const ALLOWED_FIELDS = [
  'name', 'nickname', 'birthday', 'memo', 'is_favorite', 'visit_date',
  'favorite_drink', 'contact', 'occupation', 'referral_source',
  'ng_topics', 'vip_rank', 'budget', 'tags',
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, cast_id, slip_id, visit_date } = body;
  if (!shop_id) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  const now = new Date().toISOString();
  const insert: any = {
    shop_id: Number(shop_id),
    cast_id: cast_id ? Number(cast_id) : null,
    slip_id: slip_id || null,
    visit_date: visit_date || now.slice(0, 10),
    last_visited: now,
    updated_at: now,
  };
  ALLOWED_FIELDS.forEach(k => {
    if (body[k] !== undefined) insert[k] = body[k];
  });
  if (!insert.name) insert.name = '名前なし';
  const { data, error } = await sb.from("customers").insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 });
  const update: any = { updated_at: new Date().toISOString() };
  ALLOWED_FIELDS.forEach(k => {
    if (body[k] !== undefined) update[k] = body[k];
  });
  const { error } = await sb.from("customers").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await sb.from("customers").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
