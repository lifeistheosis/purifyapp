import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A sign-in with Plus opens every Plus gate at once (Fable Themes' finding
 * with build 93 note 3, 2026-11-11; the arbiter: Admin's for 1.9).
 *
 * What was wrong: the signal that tells the gates to ask again
 * (lib/entitlements/refresh.ts) was sent only on a purchase. The Plus answer
 * is shared for a minute (usePlusFeatures, TTL_MS), so a reader who signed in
 * with Plus and opened a Plus feature within that minute met its lock: a tap
 * that showed the wrong thing, the kind of fault note 3 was.
 *
 * What would go wrong if this broke: the same lock after signing in, or a
 * reader who signed out keeping Plus's tools for a minute.
 */

const world = vi.hoisted(() => ({
  plus: false,
  authCb: null as null | ((event: string, session?: unknown) => void),
  authCallsInside: 0,
}));

vi.mock("@/lib/entitlements/client", () => ({
  clientSurface: () => "android",
  getClientEntitlements: vi.fn(async () => ({ plusFeatures: world.plus })),
}));
vi.mock("@/lib/entitlements/entitlements", () => ({ plusEnforcedFor: () => true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: (event: string, session?: unknown) => void) => {
        world.authCb = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      // An auth call made inside the callback never returns in the apps; count any.
      getSession: () => {
        world.authCallsInside += 1;
        return Promise.resolve({ data: { session: null } });
      },
    },
  }),
}));

/** A window that holds the event and the timer the signal uses. */
function stubWindow() {
  const target = new EventTarget();
  const store = new Map<string, string>();
  Object.assign(target, {
    setTimeout,
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  });
  (globalThis as unknown as { window: unknown }).window = target;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  world.plus = false;
  world.authCb = null;
  world.authCallsInside = 0;
  stubWindow();
});

describe("the Plus answer after a sign-in or a sign-out", () => {
  // Build 93 note 21, "the themes doesn't change": the looks a Plus reader chose stayed locked after
  // signing in, for this same stale answer (note 3).
  it("a sign-in with Plus is asked again at once, not after the minute, so the themes change (build 93 note 21)", async () => {
    const { plusFeaturesNow } = await import("@/lib/entitlements/usePlusFeatures");
    const { getClientEntitlements } = await import("@/lib/entitlements/client");
    expect(await plusFeaturesNow()).toBe(false);
    world.plus = true;
    world.authCb?.("SIGNED_IN", { user: { id: "u" } });
    await tick();
    expect(await plusFeaturesNow()).toBe(true);
    expect(vi.mocked(getClientEntitlements)).toHaveBeenCalledTimes(2);
  });

  it("a sign-out takes Plus away at once", async () => {
    world.plus = true;
    const { plusFeaturesNow } = await import("@/lib/entitlements/usePlusFeatures");
    expect(await plusFeaturesNow()).toBe(true);
    world.plus = false;
    world.authCb?.("SIGNED_OUT");
    await tick();
    expect(await plusFeaturesNow()).toBe(false);
  });

  it("a refreshed token asks nothing again, and the callback makes no auth call of its own", async () => {
    const { plusFeaturesNow } = await import("@/lib/entitlements/usePlusFeatures");
    const { getClientEntitlements } = await import("@/lib/entitlements/client");
    await plusFeaturesNow();
    world.authCb?.("TOKEN_REFRESHED");
    world.authCb?.("SIGNED_IN", { user: { id: "u" } });
    expect(world.authCallsInside).toBe(0);
    await tick();
    world.authCb?.("TOKEN_REFRESHED");
    await tick();
    await plusFeaturesNow();
    // Once at first, once after the sign-in; the refreshed tokens added none.
    expect(vi.mocked(getClientEntitlements)).toHaveBeenCalledTimes(2);
  });
});
