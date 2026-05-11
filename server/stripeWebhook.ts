import type { Express } from "express";
import * as db from "./db";

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    // express.raw is applied in index.ts before this
    async (req, res) => {
      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        res.status(400).send("Missing stripe-signature header");
        return;
      }

      try {
        const { handleWebhookEvent, STRIPE_WEBHOOK_SECRET } = await import("./stripe");

        // Detect test events and return verification response
        const rawBody = req.body as Buffer;
        const rawStr = rawBody.toString();
        let parsedEvent: { id?: string } | null = null;
        try { parsedEvent = JSON.parse(rawStr); } catch { /* ignore */ }
        if (parsedEvent?.id?.startsWith("evt_test_")) {
          console.log("[Webhook] Test event detected, returning verification response");
          res.json({ verified: true });
          return;
        }

        const result = await handleWebhookEvent(rawBody, signature);

        if (result.tier !== undefined) {
          if (result.userId) {
            await db.updateUserTier(
              result.userId,
              result.tier,
              result.customerId,
              result.subscriptionId
            );
          } else if (result.customerId) {
            const user = await db.getUserByStripeCustomerId(result.customerId);
            if (user) {
              await db.updateUserTier(
                user.id,
                result.tier,
                result.customerId,
                result.subscriptionId
              );
            }
          }
        }

        res.json({ received: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Stripe Webhook] Error:", message);
        res.status(400).send(`Webhook Error: ${message}`);
      }
    }
  );
}
