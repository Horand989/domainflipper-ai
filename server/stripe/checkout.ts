import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../_core/env";
import { CREDIT_PACKAGES, getCreditPackage } from "./products";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

export async function createCheckoutSession(params: {
  packageId: string;
  userId: number;
  userEmail: string;
  userName: string;
  origin: string;
}) {
  const creditPackage = getCreditPackage(params.packageId);
  
  if (!creditPackage) {
    throw new Error("Invalid credit package");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: creditPackage.name,
            description: creditPackage.description,
          },
          unit_amount: creditPackage.price,
        },
        quantity: 1,
      },
    ],
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName,
      package_id: params.packageId,
      credits: creditPackage.credits.toString(),
    },
    success_url: `${params.origin}/pricing?success=true`,
    cancel_url: `${params.origin}/pricing?canceled=true`,
    allow_promotion_codes: true,
  });

  return session;
}
