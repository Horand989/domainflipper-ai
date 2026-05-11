/**
 * Credit System
 * Manages user credit balances and transaction history.
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { users, creditTransactions } from "../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Get user's current credit balance
 */
export async function getCreditBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.credits ?? 0;
}

/**
 * Get credit transaction history for a user
 */
export async function getCreditHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

/**
 * Add credits to a user's account
 */
export async function addCredits(
  userId: number,
  amount: number,
  description: string,
  stripePaymentIntentId?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Get current balance
  const current = await getCreditBalance(userId);
  const newBalance = current + amount;

  // Update user credits
  await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));

  // Record transaction
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type: "purchase",
    description,
    balance: newBalance,
    metadata: stripePaymentIntentId ? JSON.stringify({ stripePaymentIntentId }) : null,
  });

  return newBalance;
}

/**
 * Deduct credits from a user's account
 */
export async function deductCredits(
  userId: number,
  amount: number,
  description: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const current = await getCreditBalance(userId);
  if (current < amount) {
    throw new Error(`Insufficient credits. Required: ${amount}, Available: ${current}`);
  }

  const newBalance = current - amount;

  await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));

  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type: "deduction",
    description,
    balance: newBalance,
    metadata: null,
  });

  return newBalance;
}
