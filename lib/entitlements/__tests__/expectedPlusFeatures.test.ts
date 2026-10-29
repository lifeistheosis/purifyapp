import { afterEach, describe, expect, it, vi } from "vitest";

// The Plus answer as far as it can be known before it comes
// (lib/entitlements/usePlusFeatures.ts, expectedPlusFeatures). It keeps the
// place of a lock that may come, so a control does not move when the answer
// arrives after the first frame (the owner's note 6 of build 80, Pray my
// rule). Yes where the build cannot sell Plus, as getClientEntitlements
// answers there; otherwise each answer the page gets, kept on the device and
// read back on the next visit. Never more than a place: the live answer alone
// draws a lock.

const world = vi.hoisted(() => ({ plusFeatures: false, enforced: true }));

vi.mock("@/lib/entitlements/client", () => ({
  clientSurface: () => "android",
  getClientEntitlements: vi.fn(async () => ({ plusFeatures: world.plusFeatures })),
}));
vi.mock("@/lib/entitlements/entitlements", () => ({
  plusEnforcedFor: () => world.enforced,
}));
vi.mock("@/lib/entitlements/refresh", () => ({
  onEntitlementsChanged: () => () => {},
}));

const KEY = "purify:plusFeatures";

/** A window whose storage holds `kept`, or one that refuses to keep anything. */
function stubWindow(kept: Record<string, string> = {}, refuses = false): Map<string, string> {
  const store = new Map(Object.entries(kept));
  const localStorage = {
    getItem(key: string) {
      if (refuses) throw new Error("storage refused");
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (refuses) throw new Error("storage refused");
      store.set(key, value);
    },
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage };
  return store;
}

/** The module as a fresh page loads it. */
async function freshPage() {
  vi.resetModules();
  return import("@/lib/entitlements/usePlusFeatures");
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  world.plusFeatures = false;
  world.enforced = true;
});

describe("the Plus answer expected before it comes", () => {
  it("is not known on the server", async () => {
    const page = await freshPage();
    expect(page.expectedPlusFeatures()).toBeNull();
  });

  it("is not known before the device has had an answer", async () => {
    stubWindow();
    const page = await freshPage();
    expect(page.expectedPlusFeatures()).toBeNull();
  });

  it("keeps each answer the page gets, and reads it back on the next visit", async () => {
    const store = stubWindow();
    let page = await freshPage();
    await expect(page.plusFeaturesNow()).resolves.toBe(false);
    expect(page.expectedPlusFeatures()).toBe(false);
    expect(store.get(KEY)).toBe("0");

    page = await freshPage();
    expect(page.expectedPlusFeatures()).toBe(false);

    // The reader subscribes: the next answer replaces the last.
    world.plusFeatures = true;
    await expect(page.plusFeaturesNow()).resolves.toBe(true);
    expect(page.expectedPlusFeatures()).toBe(true);
    expect(store.get(KEY)).toBe("1");
    page = await freshPage();
    expect(page.expectedPlusFeatures()).toBe(true);
  });

  it("is yes where the build cannot sell Plus, whatever was kept", async () => {
    stubWindow({ [KEY]: "0" });
    world.enforced = false;
    const page = await freshPage();
    expect(page.expectedPlusFeatures()).toBe(true);
  });

  it("reads back nothing it did not write", async () => {
    stubWindow({ [KEY]: "true" });
    const page = await freshPage();
    expect(page.expectedPlusFeatures()).toBeNull();
  });

  it("keeps the answer for the visit on a device that keeps nothing", async () => {
    stubWindow({}, true);
    world.plusFeatures = true;
    const page = await freshPage();
    expect(page.expectedPlusFeatures()).toBeNull();
    await expect(page.plusFeaturesNow()).resolves.toBe(true);
    expect(page.expectedPlusFeatures()).toBe(true);
  });
});
