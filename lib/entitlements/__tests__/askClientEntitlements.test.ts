import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The entitlement lookup says whether the account server was reached for its
 * answer (lib/entitlements/client.ts, askClientEntitlements).
 *
 * A reader with Plus who opened the app with no signal read as a reader
 * without it: the lookup answered FREE for "signed out" and for "could not
 * ask" alike. It still answers FREE for both, so nothing the server grants is
 * opened on a guess; `heard` tells the two apart for the one caller that may
 * act on it, the reading palettes' gate, which keeps a palette the device
 * last knew its reader to have (the arbiter's word, 2026-11-11).
 *
 * What a reader would notice if this broke: their look dropping to Dark in a
 * tunnel; or, worse, a signed-out phone keeping Plus palettes because "signed
 * out" was read as "no signal".
 */
const world = vi.hoisted(() => ({
  enforced: true,
  user: null as { id: string; email?: string } | null,
  authError: null as unknown,
  row: null as Record<string, unknown> | null,
  rowError: null as unknown,
  asked: [] as string[],
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => {
        world.asked.push("who");
        return { data: { user: world.user }, error: world.authError };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            world.asked.push(table);
            return { data: world.row, error: world.rowError };
          },
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => true, nativePlatform: () => "android" }));
vi.mock("@/lib/dev/options", () => ({ devPlusCookiePresent: () => false }));
vi.mock("@/lib/entitlements/entitlements", async (original) => ({
  ...(await original<typeof import("@/lib/entitlements/entitlements")>()),
  plusEnforcedFor: () => world.enforced,
}));

const client = () => import("@/lib/entitlements/client");
const noSignal = async () => new (await import("@supabase/supabase-js")).AuthRetryableFetchError("Failed to fetch", 0);
const signedOut = async () => new (await import("@supabase/supabase-js")).AuthSessionMissingError();
const PLUS = { is_supporter: false, plus_until: "2099-01-01T00:00:00Z", plus_source: "play", pro_until: null };

afterEach(() => {
  world.enforced = true;
  world.user = null;
  world.authError = null;
  world.row = null;
  world.rowError = null;
  world.asked = [];
});

describe("the entitlement lookup, and whether the server was reached", () => {
  it("a reader with Plus, heard", async () => {
    world.user = { id: "u1" };
    world.row = PLUS;
    const { entitlements, heard } = await (await client()).askClientEntitlements();
    expect(heard).toBe(true);
    expect(entitlements.plusFeatures).toBe(true);
  });

  it("a reader without Plus, heard: no row, or a Plus that has ended", async () => {
    world.user = { id: "u1" };
    world.row = null;
    expect(await (await client()).askClientEntitlements()).toMatchObject({ heard: true, entitlements: { plusFeatures: false } });
    world.row = { ...PLUS, plus_until: "2020-01-01T00:00:00Z" };
    expect(await (await client()).askClientEntitlements()).toMatchObject({ heard: true, entitlements: { plusFeatures: false } });
  });

  it("signed out is an answer: heard, and no Plus", async () => {
    world.authError = await signedOut();
    expect(await (await client()).askClientEntitlements()).toMatchObject({ heard: true, entitlements: { plusFeatures: false } });
    // And with no error at all (nobody signed in).
    world.authError = null;
    expect(await (await client()).askClientEntitlements()).toMatchObject({ heard: true, entitlements: { plusFeatures: false } });
    // The entitlements row is not asked for a reader nobody is.
    expect(world.asked).not.toContain("entitlements");
  });

  it("no signal is not an answer: not heard, and still nothing granted", async () => {
    world.authError = await noSignal();
    const { entitlements, heard } = await (await client()).askClientEntitlements();
    expect(heard).toBe(false);
    expect(entitlements.plusFeatures).toBe(false);
    expect(entitlements.sync).toBe(false);
  });

  it("a row that could not be read is not an answer either", async () => {
    world.user = { id: "u1" };
    world.rowError = { message: "TypeError: Failed to fetch" };
    const { entitlements, heard } = await (await client()).askClientEntitlements();
    expect(heard).toBe(false);
    expect(entitlements.plusFeatures).toBe(false);
  });

  it("where Plus is not asked for, everything is open and nobody is asked", async () => {
    world.enforced = false;
    const { entitlements, heard } = await (await client()).askClientEntitlements();
    expect(heard).toBe(true);
    expect(entitlements.plusFeatures).toBe(true);
    expect(world.asked).toEqual([]);
  });

  it("getClientEntitlements answers every other caller exactly as before: FREE on a failed reach", async () => {
    const { getClientEntitlements, canSync } = await client();
    world.authError = await noSignal();
    expect((await getClientEntitlements()).plusFeatures).toBe(false);
    expect(await canSync()).toBe(false);
    world.authError = null;
    world.user = { id: "u1" };
    world.row = PLUS;
    expect((await getClientEntitlements()).plusFeatures).toBe(true);
    expect(await canSync()).toBe(true);
  });
});
