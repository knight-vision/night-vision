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
  const { shop_id, owner_id } = await req.json();
  if (!shop_id || !owner_id) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });

  // 店舗情報取得
  const { data: shop } = await supabase.from("shops").select("name, stripe_customer_id").eq("id", shop_id).single();
  if (!shop) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });

  // オーナーメール取得
  const { data: owner } = await supabase.from("shop_owners").select("email").eq("id", owner_id).single();

  // Stripe顧客を作成 or 既存を使用
  let customerId = shop.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: owner?.email,
      name: shop.name,
      metadata: { shop_id: String(shop_id) },
    });
    customerId = customer.id;
    await supabase.from("shops").update({ stripe_customer_id: customerId }).eq("id", shop_id);
  }

  // チェックアウトセッション作成
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=plan&success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=plan&canceled=1`,
    metadata: { shop_id: String(shop_id) },
    locale: "ja",
  });

  return NextResponse.json({ url: session.url });
}
