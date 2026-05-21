import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { shop_id } = await req.json();
  if (!shop_id) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });

  const { data: shop } = await supabase.from("shops").select("stripe_customer_id").eq("id", shop_id).single();
  if (!shop?.stripe_customer_id) {
    return NextResponse.json({ error: "Stripe顧客情報がありません" }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: shop.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=plan`,
  });

  return NextResponse.json({ url: session.url });
}
