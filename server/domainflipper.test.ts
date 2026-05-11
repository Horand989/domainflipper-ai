import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    tier: "FREE",
    credits: 0,
    analysisCount: 0,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionExpiry: null,
    onboardingCompleted: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

type CookieCall = { name: string; options: Record<string, unknown> };

function makeContext(user: AuthenticatedUser | null = makeUser()): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = makeContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("returns null for unauthenticated auth.me", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated auth.me", async () => {
    const user = makeUser({ name: "Alice" });
    const { ctx } = makeContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.name).toBe("Alice");
  });
});

// ─── Analysis Router Tests ────────────────────────────────────────────────────

describe("analysis router", () => {
  it("throws UNAUTHORIZED when not authenticated for createSession", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.createSession({
        imageData: "data:image/png;base64,abc123",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when not authenticated for listSessions", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.analysis.listSessions({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when not authenticated for getRecommendations", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.getRecommendations({ sessionId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Watchlist Router Tests ───────────────────────────────────────────────────

describe("watchlist router", () => {
  it("throws UNAUTHORIZED when not authenticated for list", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.watchlist.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when not authenticated for add", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.watchlist.add({ domainName: "example.com" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when not authenticated for remove", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.watchlist.remove({ domainId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Settings Router Tests ────────────────────────────────────────────────────

describe("settings router", () => {
  it("throws UNAUTHORIZED when not authenticated for get", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.settings.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when not authenticated for update", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.settings.update({ namecheapApiKey: "test" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Pricing Router Tests ─────────────────────────────────────────────────────

describe("pricing router", () => {
  it("throws UNAUTHORIZED when not authenticated for createCheckout", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pricing.createCheckout({ origin: "https://example.com" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when not authenticated for createPortal", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pricing.createPortal({ origin: "https://example.com" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Free Tier Limit Tests ────────────────────────────────────────────────────

describe("free tier analysis limit", () => {
  it("throws FORBIDDEN when free user has used 3 analyses", async () => {
    // Mock ipRateLimiting to allow the request
    vi.mock("./ipRateLimiting", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./ipRateLimiting")>();
      return {
        ...actual,
        checkIpRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
        logIpRequest: vi.fn().mockResolvedValue(undefined),
        extractIpAddress: vi.fn().mockReturnValue("127.0.0.1"),
      };
    });
    // Mock usageTracking to simulate limit reached
    vi.mock("./usageTracking", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./usageTracking")>();
      return {
        ...actual,
        checkFreeTierLimit: vi.fn().mockResolvedValue({
          allowed: false,
          reason: "Free tier limit reached (1 scan per 5 minutes)",
        }),
        logUsage: vi.fn().mockResolvedValue(undefined),
      };
    });

    const user = makeUser({ tier: "FREE", analysisCount: 3 });
    const { ctx } = makeContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.analysis.createSession({
        imageData: "data:image/png;base64,abc",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
