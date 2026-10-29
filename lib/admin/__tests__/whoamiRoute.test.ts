import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/whoami (1.8): whether the reader signed in here is an admin, the
 * one question Settings asks before it draws Testers mode. Run for real, with
 * the session and the rate limit stood in for.
 *
 * What would go wrong if this broke: Testers mode, which rewrites a reader's
 * answers on their device, offered to every reader; or the admins' list sent
 * to a phone, where anyone could read it.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string | null },
  limited: new Set<string>(),
  asked: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/security/ratelimit", () => ({
  ipKey: () => "203.0.113.7",
  rateLimited: async (key: string) => {
    state.asked.push(key);
    return state.limited.has(key);
  },
}));

import { GET, OPTIONS } from "@/app/api/admin/whoami/route";

const ask = (headers: Record<string, string> = {}) => GET(new Request("https://purifyapp.net/api/admin/whoami", { headers }));

const ADMIN_EMAILS = process.env.ADMIN_EMAILS;
afterAll(() => {
  if (ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ADMIN_EMAILS;
});

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@purify.example, second@purify.example";
  state.user = null;
  state.limited = new Set();
  state.asked = [];
});

describe("/api/admin/whoami", () => {
  it("answers no to a reader who is not signed in", async () => {
    const res = await ask();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ admin: false });
  });

  it("answers no to a signed-in reader who is not on the list", async () => {
    state.user = { id: "u-1", email: "reader@example.com" };
    expect(await (await ask()).json()).toEqual({ admin: false });
    state.user = { id: "u-2", email: null };
    expect(await (await ask()).json()).toEqual({ admin: false });
  });

  it("answers yes to an admin, whatever the letters' case", async () => {
    state.user = { id: "u-3", email: "Owner@Purify.Example" };
    expect(await (await ask()).json()).toEqual({ admin: true });
  });

  it("says yes or no and nothing else: never the list, and never kept by a cache", async () => {
    state.user = { id: "u-3", email: "owner@purify.example" };
    const res = await ask();
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ admin: true });
    expect(body).not.toContain("purify.example");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("holds every caller to a budget, by address and then by account", async () => {
    state.user = { id: "u-3", email: "owner@purify.example" };
    await ask();
    expect(state.asked).toEqual(["admin-whoami:203.0.113.7", "admin-whoami:u-3"]);
    state.limited.add("admin-whoami:203.0.113.7");
    const res = await ask();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ admin: false });
  });

  it("answers the apps across origins, preflight and all", async () => {
    state.user = { id: "u-3", email: "owner@purify.example" };
    const res = await ask({ origin: "https://localhost", authorization: "Bearer token" });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
    const pre = OPTIONS(new Request("https://purifyapp.net/api/admin/whoami", { method: "OPTIONS", headers: { origin: "capacitor://localhost" } }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(pre.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
    // A website that is not one of the apps is not let in.
    const other = await ask({ origin: "https://elsewhere.example" });
    expect(other.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
