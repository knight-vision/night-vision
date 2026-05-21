import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json([], { status: 400 });
  const { data } = await supabase.from("job_postings").select("*").eq("shop_id", Number(shopId)).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, title, description, hourly_wage_min, hourly_wage_max, work_days, requirements, benefits } = body;
  if (!shop_id || !title) return NextResponse.json({ error: "必須パラメータ不足" }, { status: 400 });
  const { data, error } = await supabase.from("job_postings").insert({
    shop_id: Number(shop_id), title, description: description || null,
    hourly_wage_min: hourly_wage_min || null, hourly_wage_max: hourly_wage_max || null,
    work_days: work_days || null, requirements: requirements || null,
    benefits: benefits || null, is_active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const { id, ...updates } = await req.json();
  const { error } = await supabase.from("job_postings").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabase.from("job_postings").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
