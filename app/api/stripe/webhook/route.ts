import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailHtml } from "@/lib/emailTemplate";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const getShopByCustomer = async (customerId: string) => {
    const { data } = await supabase.from("shops").select("id, name").eq("stripe_customer_id", customerId).single();
    return data;
  };

  const getOwnerEmail = async (shopId: number) => {
    const { data } = await supabase.from("shop_owners").select("email").eq("shop_id", shopId).single();
    return data?.email;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;
      const shopId = session.metadata?.shop_id;
      const planType = session.metadata?.plan || "standard";
      if (!shopId) break;

      await supabase.from("shops").update({
        plan: planType,
        stripe_subscription_id: session.subscription as string,
      }).eq("id", Number(shopId));

      const ownerEmail = await getOwnerEmail(Number(shopId));
      const { data: shop } = await supabase.from("shops").select("name").eq("id", Number(shopId)).single();
      const planLabels: Record<string,string> = { standard:"スタンダード🌙", premium:"プレミアム💡", pro:"プロ🌃", gold:"ゴールド💎" };
      const planLabel = planLabels[planType] || planType;
      if (ownerEmail) {
        await resend.emails.send({
          from: "釧路ナイトビジョン <info@night-vision.jp>",
          to: ownerEmail,
          subject: `【釧路ナイトビジョン】${planLabel}プランへのアップグレード完了`,
          html: emailHtml({
            title: `${planLabel}プランへのアップグレード完了`,
            body: `<p style="margin:0 0 12px;color:#c0bdd8;">${shop?.name || "お店"} ご担当者様</p><p style="margin:0 0 16px;color:#c0bdd8;">1ヶ月間の無料トライアルが開始されました。翌月以降のご請求となります。</p>`,
            ctaText: "管理画面を開く",
            ctaUrl: "https://www.night-vision.jp/owner/dashboard",
          }),
        });
      }
      break;
    }

    // サブスクリプション有効中（毎月の支払い成功）
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const shop = await getShopByCustomer(customerId);
      if (shop) {
        const { data: shopData } = await supabase.from("shops").select("plan").eq("id", shop.id).single();
        if (!shopData?.plan || (shopData.plan !== "gold" && shopData.plan !== "premium")) {
          await supabase.from("shops").update({ plan: "gold" }).eq("id", shop.id);
        }
      }
      break;
    }

    // 支払い失敗
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const shop = await getShopByCustomer(customerId);
      if (!shop) break;

      const ownerEmail = await getOwnerEmail(shop.id);
      if (ownerEmail) {
        await resend.emails.send({
          from: "釧路ナイトビジョン <info@night-vision.jp>",
          to: ownerEmail,
          subject: "【釧路ナイトビジョン】お支払いの確認をお願いします",
          html: emailHtml({
            title: "⚠️ お支払いの確認をお願いします",
            body: `
              <p style="margin:0 0 12px;color:#c0bdd8;">${shop.name} ご担当者様</p>
              <p style="margin:0 0 16px;color:#c0bdd8;">ゴールドプランの月額料金（3,000円）のお支払いに失敗しました。カード情報をご確認ください。</p>
            `,
            ctaText: "お支払い情報を更新する",
            ctaUrl: "https://www.night-vision.jp/owner/dashboard?tab=plan",
          }),
        });
      }
      break;
    }

    // サブスクリプション解約・キャンセル
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const shop = await getShopByCustomer(customerId);
      if (!shop) break;

      await supabase.from("shops").update({
        plan: "free",
        stripe_subscription_id: null,
      }).eq("id", shop.id);

      const ownerEmail = await getOwnerEmail(shop.id);
      if (ownerEmail) {
        await resend.emails.send({
          from: "釧路ナイトビジョン <info@night-vision.jp>",
          to: ownerEmail,
          subject: "【釧路ナイトビジョン】ゴールドプランを解約しました",
          html: emailHtml({
            title: "プランをフリーに変更しました",
            body: `
              <p style="margin:0 0 12px;color:#c0bdd8;">${shop.name} ご担当者様</p>
              <p style="margin:0 0 16px;color:#c0bdd8;">ゴールドプランの解約が完了しました。フリープランに移行されました。</p>
              <p style="margin:0 0 16px;color:#c0bdd8;">またいつでもアップグレードいただけます。</p>
            `,
            ctaText: "管理画面を開く",
            ctaUrl: "https://www.night-vision.jp/owner/dashboard?tab=plan",
          }),
        });
      }
      break;
    }

    // サブスクリプション更新（期間終了による解約予約）
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const shop = await getShopByCustomer(customerId);
      if (!shop) break;

      // cancel_at_period_end が true = 期間終了後に解約予定
      if (subscription.cancel_at_period_end) {
        // まだアクティブなので plan は維持、解約予定をログ
        console.log(`Shop ${shop.id} subscription will cancel at period end`);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
