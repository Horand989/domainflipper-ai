import Stripe from "stripe";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../_core/env";
import * as db from "../db";
import { getDb } from "../db";
import { creditTransactions, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  // CRITICAL: Test event handling for webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return {
      verified: true,
    };
  }

  console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = parseInt(session.metadata?.user_id || "0");
    const packageId = session.metadata?.package_id || "";
    const credits = parseInt(session.metadata?.credits || "0");
    
    if (!userId || !credits) {
      console.error("[Webhook] Missing user_id or credits in session metadata");
      return { received: true };
    }

    console.log(`[Webhook] Adding ${credits} credits to user ${userId}`);

    // Add credits to user
    await db.addCredits(userId, credits);

    // Get current balance
    const database = await getDb();
    if (database) {
      const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
      const newBalance = (user?.credits || 0) + credits;
      
      // Record transaction
      await database.insert(creditTransactions).values({
        userId,
        amount: credits,
        balance: newBalance,
        type: "purchase",
        description: `Purchased ${credits} credits (${packageId})`,
        metadata: JSON.stringify({
          packageId,
          paymentIntentId: session.payment_intent as string || null,
          sessionId: session.id,
        }),
      });
    }

    console.log(`[Webhook] Successfully added ${credits} credits to user ${userId}`);
  }

  return { received: true };
}
