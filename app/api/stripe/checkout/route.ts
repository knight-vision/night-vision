import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { shop_id, owner_id, plan } = await req.json();
    if (!shop_id || !owner_id) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "STRIPE_SECRET_KEY未設定" }, { status: 500 });

    // プランに応じたprice_idを選択
    const priceMap: Record<string, string | undefined> = {
      standard: process.env.STRIPE_STANDARD_PRICE_ID,
      premium:  process.env.STRIPE_PREMIUM_PRICE_ID,
      pro:      process.env.STRIPE_PRO_PRICE_ID,
      gold:     process.env.STRIPE_PRICE_ID, // 旧プラン互換
    };
    const priceId = priceMap[plan] || process.env.STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: `${plan}プランのPrice IDが未設定です` }, { status: 500 });
    if (!priceId.startsWith("price_")) return NextResponse.json({ error: `Price IDの形式が不正: ${priceId.slice(0,10)}` }, { status: 500 });

    const { data: shop } = await supabase.from("shops").select("name, stripe_customer_id").eq("id", shop_id).single();
    if (!shop) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    const { data: owner } = await supabase.from("shop_owners").select("email").eq("id", owner_id).single();

    let customerId = shop.stripe_customer_id;
    if (customerId && !customerId.startsWith("cus_")) {
      customerId = null;
      await supabase.from("shops").update({ stripe_customer_id: null }).eq("id", shop_id);
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: owner?.email, name: shop.name,
        metadata: { shop_id: String(shop_id) },
      });
      customerId = customer.id;
      await supabase.from("shops").update({ stripe_customer_id: customerId }).eq("id", shop_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 30, // 1ヶ月無料トライアル
        metadata: { shop_id: String(shop_id), plan },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/owner/dashboard?tab=plan&success=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.night-vision.jp"}/for-owners#plans`,
      metadata: { shop_id: String(shop_id), plan },
      locale: "ja",
    });

    return NextResponse.json({ url: session.url });
  } catch(e: any) {
    return NextResponse.json({ error: e.message || "Stripeエラー" }, { status: 500 });
  }
}
