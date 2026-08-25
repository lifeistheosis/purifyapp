import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The lookup that "assign a console account to this store" depends on.
 *
 * The bug it replaces: every call site read profiles.email, a column that has
 * never existed, and discarded the 42703 with the rest of the destructure. So
 * the owner dashboard answered "No Purify account found for <address>" for
 * every address, and a store could never be attached to the person who runs
 * it. Verified against production 2026-08-24 in both directions.
 *
 * What is tested here is the one piece of real logic: GoTrue's `filter` is a
 * SUBSTRING match, not an equality check. Probed against production, a filter
 * of "gmail.com" returns 50 users. Attaching a store to the wrong account is
 * the failure this lookup exists to get right, so the exact comparison is
 * load-bearing and gets the hardest cases.
 */

vi.mock("server-only", () => ({}));

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};
Object.assign(process.env, ENV);

const { userIdByEmail } = await import("../accountEmails");

function respondWith(users: { id: string; email: string }[], ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ users }),
  } as unknown as Response);
}

afterEach(() => vi.restoreAllMocks());

describe("userIdByEmail", () => {
  it("returns the id for an exact match", async () => {
    respondWith([{ id: "u1", email: "seller@example.com" }]);
    await expect(userIdByEmail("seller@example.com")).resolves.toBe("u1");
  });

  it("ignores a substring near-match and takes the exact one", async () => {
    // THE failure this guards. GoTrue's filter is ILIKE '%value%', so asking
    // for "a@b.com" also returns "xa@b.com". Attaching a store to the wrong
    // account would be silent and permanent.
    respondWith([
      { id: "wrong", email: "notseller@example.com" },
      { id: "alsowrong", email: "seller@example.com.au" },
      { id: "right", email: "seller@example.com" },
    ]);
    await expect(userIdByEmail("seller@example.com")).resolves.toBe("right");
  });

  it("returns null when only near-matches come back", async () => {
    // Not "the first one that looks close". Null, so the caller says it could
    // not find the account instead of binding a store to a stranger.
    respondWith([
      { id: "wrong", email: "xseller@example.com" },
      { id: "alsowrong", email: "seller@example.company" },
    ]);
    await expect(userIdByEmail("seller@example.com")).resolves.toBeNull();
  });

  it("matches case-insensitively and ignores surrounding space", async () => {
    respondWith([{ id: "u1", email: "Seller@Example.com" }]);
    await expect(userIdByEmail("  seller@example.COM  ")).resolves.toBe("u1");
  });

  it("returns null for an empty address without calling out", async () => {
    const f = respondWith([{ id: "u1", email: "seller@example.com" }]);
    await expect(userIdByEmail("   ")).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns null rather than throwing when GoTrue answers an error", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    respondWith([], false);
    await expect(userIdByEmail("seller@example.com")).resolves.toBeNull();
  });

  it("returns null rather than throwing when the request blows up", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection reset"));
    await expect(userIdByEmail("seller@example.com")).resolves.toBeNull();
  });

  it("sends the service role key, not the anon key", async () => {
    // auth.users is not reachable with the anon key at all; a silent downgrade
    // would put this straight back to returning null for everything.
    const f = respondWith([{ id: "u1", email: "seller@example.com" }]);
    await userIdByEmail("seller@example.com");
    const [, init] = f.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe(ENV.SUPABASE_SERVICE_ROLE_KEY);
    expect(headers.Authorization).toBe(`Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`);
  });

  it("asks GoTrue, never PostgREST", async () => {
    // The auth schema is not exposed to PostgREST, so no select-list fix at a
    // call site could ever have worked. Different transport, not a different
    // column.
    const f = respondWith([{ id: "u1", email: "seller@example.com" }]);
    await userIdByEmail("seller@example.com");
    const [url] = f.mock.calls[0] as [string];
    expect(url).toContain("/auth/v1/admin/users");
    expect(url).not.toContain("/rest/v1/");
  });
});
