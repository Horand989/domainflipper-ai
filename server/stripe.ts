import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? "";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

export async function createCheckoutSession(
  userId: number,
  userEmail: string | null | undefined,
  origin: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "FlipandSift Pro",
            description: "Unlimited AI domain analyses, Sherlock checks, and due diligence reports",
          },
          unit_amount: 9700, // $97.00
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: String(userId) },
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/pricing`,
  });

  return session.url ?? `${origin}/pricing`;
}

export async function createBillingPortal(
  stripeCustomerId: string,
  origin: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/settings`,
  });
  return session.url;
}

export async function handleWebhookEvent(
  payload: Buffer,
  signature: string
): Promise<{ userId?: number; tier?: "free" | "pro"; customerId?: string; subscriptionId?: string }> {
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Webhook signature verification failed: ${message}`);
  }

  const result: { userId?: number; tier?: "free" | "pro"; customerId?: string; subscriptionId?: string } = {};

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    result.customerId = customerId;
    result.subscriptionId = sub.id;
    result.tier = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";

    // Try to get userId from metadata on the checkout session
    const sessions = await stripe.checkout.sessions.list({ subscription: sub.id, limit: 1 });
    const checkoutSession = sessions.data[0];
    if (checkoutSession?.metadata?.userId) {
      result.userId = parseInt(checkoutSession.metadata.userId, 10);
    }
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    result.customerId = customerId;
    result.subscriptionId = sub.id;
    result.tier = "free";
  }

  return result;
}
