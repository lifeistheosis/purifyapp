import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The test web stands one step ahead of the branch, and the main web never
// does (2026-11-10; lib/campaigns/opening.ts, serverOpening).
//
// His word for a test build is "as if it was public release": the build cut
// as the store builds will be, at "testers", talking to a website that
// answers as the main web will once he has opened campaigns. So where the
// constant says "testers", the test web answers "open" to every account.
//
// What the test web is, the test web's own rules say (lib/testWeb/rules.ts,
// the Admin chat's, held by lib/testWeb/__tests__). This file holds the other
// side of it, by what a campaign route is told: campaigns are never opened
// on the main web by a setting. That is the one thing the switch was made a
// constant to prevent (lib/campaigns/flags.ts), so most of this file is the
// main web saying no. It runs the real rules, not a stand-in for them: if
// they are ever loosened so that a server shaped like the main web passes,
// this fails.

const state = vi.hoisted(() => ({
  /** Who is signed in on the request, or nobody. */
  user: null as { id: string; email: string } | null,
  /** The accounts the server names as admins. */
  admins: new Set<string>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: (email?: string | null) => Boolean(email && state.admins.has(email)) }));

import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import { campaignsCaller, serverOpening } from "@/lib/campaigns/opening";
import { MAIN_SUPABASE_REF, TEST_WEB_FLAG } from "@/lib/testWeb";

/** A public key as Supabase makes one: three parts, the middle naming its project. */
const keyOf = (ref: string) => `x.${Buffer.from(JSON.stringify({ ref, role: "anon" })).toString("base64url")}.y`;

const TEST_REF = "abcdefghijklmnopqrst";
type Server = { flag?: string; database: string; key: string; site?: string; stripe?: string };

/** The test web as it is set up: its flag, its own database and key, its own address, Stripe's test key. */
const TEST_WEB: Server = { flag: "1", database: `https://${TEST_REF}.supabase.co`, key: keyOf(TEST_REF), site: "https://purify-test-web.onrender.com", stripe: "sk_test_123" };
/** The main web as it is set up. */
const MAIN_WEB: Server = { database: `https://${MAIN_SUPABASE_REF}.supabase.co`, key: keyOf(MAIN_SUPABASE_REF), site: "https://purifyapp.net", stripe: "sk_live_123" };

/** Make this process that server. */
function become(server: Server) {
  vi.stubEnv(TEST_WEB_FLAG, server.flag ?? "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", server.database);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", server.key);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", server.site ?? "");
  vi.stubEnv("STRIPE_SECRET_KEY", server.stripe ?? "");
}

const READER = { id: "22222222-2222-4222-8222-222222222222", email: "reader@example.com" };
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", email: "owner@example.com" };
const ask = () => campaignsCaller(new Request("https://example.test/api/campaigns/open"));

beforeEach(() => {
  state.user = null;
  state.admins = new Set([ADMIN.email]);
  __setCampaignsOpening("testers");
});

afterEach(() => {
  vi.unstubAllEnvs();
  __setCampaignsOpening(CAMPAIGNS_OPENING);
});

describe("the position a server answers by", () => {
  it("is the constant's on the main web, in every position", () => {
    become(MAIN_WEB);
    for (const position of ["closed", "testers", "open"] as const) {
      __setCampaignsOpening(position);
      expect(serverOpening()).toBe(position);
    }
  });

  it("is open on the test web while the constant says testers", () => {
    become(TEST_WEB);
    expect(serverOpening()).toBe("open");
  });

  it("lifts testers and nothing else: a branch that says closed has no campaigns on the test web either", () => {
    become(TEST_WEB);
    __setCampaignsOpening("closed");
    expect(serverOpening()).toBe("closed");
    __setCampaignsOpening("open");
    expect(serverOpening()).toBe("open");
  });

  it("is the constant's on a server like the test web in everything but the flag, or with any value of it but 1", () => {
    for (const flag of [undefined, "", "0", "true", "yes", "open", "11", " 1"]) {
      become({ ...TEST_WEB, flag });
      expect(serverOpening(), String(flag)).toBe("testers");
    }
  });
});

describe("the main web is never opened by a setting", () => {
  // Each line is the test web's settings with one thing of the main web's in
  // it, and the flag pasted in. Any one of them alone is enough to say no.
  const MISTAKES: [string, Server][] = [
    ["the flag pasted into the main web's own settings", { ...MAIN_WEB, flag: "1" }],
    ["the main web's database", { ...TEST_WEB, database: MAIN_WEB.database }],
    ["the main web's database, written in capitals", { ...TEST_WEB, database: MAIN_WEB.database.toUpperCase() }],
    ["no database named", { ...TEST_WEB, database: "" }],
    ["the main web's public key", { ...TEST_WEB, key: MAIN_WEB.key }],
    ["the main web's address", { ...TEST_WEB, site: "https://purifyapp.net" }],
    ["the main web's address, with www", { ...TEST_WEB, site: "https://www.purifyapp.net/" }],
    ["a live payment key", { ...TEST_WEB, stripe: "sk_live_123" }],
    ["a live restricted payment key", { ...TEST_WEB, stripe: "rk_live_123" }],
  ];

  it.each(MISTAKES)("with %s, the server stays at testers", (_label, server) => {
    become(server);
    expect(serverOpening()).toBe("testers");
  });

  it.each(MISTAKES)("with %s, campaigns answer for its admins and for nobody else", async (_label, server) => {
    become(server);
    state.user = null;
    expect((await ask()).open, "nobody signed in").toBe(false);
    state.user = READER;
    expect((await ask()).open, "a reader").toBe(false);
    state.user = ADMIN;
    expect((await ask()).open, "an admin").toBe(true);
  });
});

describe("who campaigns are open for, at testers", () => {
  it("on the test web: every account, and a reader who is not signed in", async () => {
    become(TEST_WEB);
    expect(await ask()).toEqual({ open: true, user: null });
    state.user = READER;
    expect((await ask()).open).toBe(true);
    state.user = ADMIN;
    expect((await ask()).open).toBe(true);
  });

  it("on the main web: the accounts it names as admins, and nobody else", async () => {
    become(MAIN_WEB);
    expect((await ask()).open).toBe(false);
    state.user = READER;
    expect((await ask()).open).toBe(false);
    state.user = ADMIN;
    expect((await ask()).open).toBe(true);
  });

  it("a branch that says closed is closed on the test web, and the account is not even looked up", async () => {
    become(TEST_WEB);
    __setCampaignsOpening("closed");
    state.user = ADMIN;
    expect(await ask()).toEqual({ open: false, user: null });
  });
});

describe("the one place a server asks", () => {
  const code = (rel: string) =>
    readFileSync(join(process.cwd(), rel), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("every campaign route's caller is asked of serverOpening, which asks the test web's own rules, and the constant's file reads no setting", () => {
    const opening = code("lib/campaigns/opening.ts");
    expect(opening).toContain("const position = serverOpening();");
    expect(opening).toContain('return position === "testers" && isTestWeb() ? "open" : position;');
    // The constant is read once here, inside serverOpening, and nowhere else on the server.
    expect(opening.match(/campaignsOpening\(\)/g)).toHaveLength(1);
    // What the test web is, is the test web's rules' to say: no setting is read here or in the constant's file.
    expect(opening).not.toMatch(/process\.env/);
    expect(code("lib/campaigns/flags.ts")).not.toMatch(/process\.env/);
    expect(code("lib/campaigns/flags.ts")).not.toContain("testWeb");
  });

  it("no route or library reads the constant's position past it", () => {
    const root = process.cwd();
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(join(root, dir))) {
        const rel = `${dir}/${name}`;
        if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(name) && /\bcampaignsOpening\(\)/.test(code(rel))) found.push(rel);
      }
    };
    for (const dir of ["app", "components", "lib"]) walk(dir);
    expect(found.sort()).toEqual(["lib/campaigns/flags.ts", "lib/campaigns/opening.ts"]);
  });
});
