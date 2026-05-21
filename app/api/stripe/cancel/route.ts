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
  const { shop_id } = await req.json();
  if (!shop_id) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });

  const { data: shop } = await supabase
    .from("shops")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", shop_id)
    .single();

  if (!shop) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });

  // Stripeのサブスクリプションがある場合はキャンセル
  if (shop.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(shop.stripe_subscription_id);
    } catch (err: any) {
      console.error("Stripe cancel error:", err.message);
      // サブスクリプションが既に存在しない場合はDBだけ更新
    }
  }

  // DBをフリープランに更新
  await supabase.from("shops").update({
    plan: "free",
    stripe_subscription_id: null,
  }).eq("id", shop_id);

  return NextResponse.json({ success: true });
}
