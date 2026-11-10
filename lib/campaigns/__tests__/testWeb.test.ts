import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The test web stands one step ahead of the branch, and the main web never
// does (2026-11-10; lib/campaigns/opening.ts, serverOpening; lib/testWeb.ts).
//
// His word for a test build is "as if it was public release": the build cut
// as the store builds will be, at "testers", talking to a website that
// answers as the main web will once he has opened campaigns. So where the
// constant says "testers", the test web answers "open" to every account.
//
// What would go wrong if this broke: campaigns opened on the main web by a
// setting, with no line of his in version control, which is the one thing the
// switch was made a constant to prevent (lib/campaigns/flags.ts). So most of
// this file is the main web saying no.

const state = vi.hoisted(() => ({
  /** This server's own address, as lib/site.ts would give it. */
  site: "https://purify-test-web.onrender.com",
  /** Who is signed in on the request, or nobody. */
  user: null as { id: string; email: string } | null,
  /** The accounts the server names as admins. */
  admins: new Set<string>(),
}));

vi.mock("@/lib/site", () => ({
  get SITE_URL() {
    return state.site;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: (email?: string | null) => Boolean(email && state.admins.has(email)) }));

import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import { campaignsCaller, serverOpening } from "@/lib/campaigns/opening";
import { MAIN_DATABASE_REF, MAIN_WEB_HOSTS, TEST_WEB_MARKER, isMainWebHost, onTestWeb } from "@/lib/testWeb";

const TEST_WEB = "https://purify-test-web.onrender.com";
const MAIN_WEB = "https://purifyapp.net";
const TEST_DATABASE = "https://abcdefghijklmnopqrst.supabase.co";
const MAIN_DATABASE = `https://${MAIN_DATABASE_REF}.supabase.co`;

/** The settings of a server: the marker, and the database it talks to. */
const settings = (marker: string | undefined, database: string | undefined = TEST_DATABASE) => ({ [TEST_WEB_MARKER]: marker, NEXT_PUBLIC_SUPABASE_URL: database });

/** Make this process that server. */
function become(site: string, marker: string | undefined, database: string = TEST_DATABASE) {
  state.site = site;
  if (marker === undefined) vi.stubEnv(TEST_WEB_MARKER, "");
  else vi.stubEnv(TEST_WEB_MARKER, marker);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", database);
}

const READER = { id: "22222222-2222-4222-8222-222222222222", email: "reader@example.com" };
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", email: "owner@example.com" };
const ask = () => campaignsCaller(new Request("https://example.test/api/campaigns/open"));

beforeEach(() => {
  state.site = TEST_WEB;
  state.user = null;
  state.admins = new Set([ADMIN.email]);
  __setCampaignsOpening("testers");
});

afterEach(() => {
  vi.unstubAllEnvs();
  __setCampaignsOpening(CAMPAIGNS_OPENING);
});

describe("the marker", () => {
  it("is a server-side name, so no app and no page's script ever carries it", () => {
    expect(TEST_WEB_MARKER).toBe("PURIFY_TEST_WEB");
    // Next compiles every NEXT_PUBLIC value into the pages and the apps.
    expect(TEST_WEB_MARKER.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  it("has one reader in the code: every rule of the test web asks lib/testWeb.ts", () => {
    const root = process.cwd();
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(join(root, dir))) {
        const rel = `${dir}/${name}`;
        if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx|mjs|js)$/.test(name) && readFileSync(join(root, rel), "utf8").includes(TEST_WEB_MARKER)) found.push(rel);
      }
    };
    for (const dir of ["app", "components", "lib"]) walk(dir);
    expect(found).toEqual(["lib/testWeb.ts"]);
  });
});

describe("onTestWeb", () => {
  it("is yes only with the marker, on an address that is not the main web's, on a database that is not the main web's", () => {
    expect(onTestWeb(settings("1"), TEST_WEB)).toBe(true);
  });

  it("is no without the marker, and for any value of it but 1", () => {
    for (const marker of [undefined, "", " ", "0", "true", "yes", "open", "11"]) {
      expect(onTestWeb(settings(marker), TEST_WEB), String(marker)).toBe(false);
    }
  });

  it("is no on the main web's addresses, whatever the marker says there", () => {
    for (const site of [MAIN_WEB, "https://purifyapp.net/", "https://www.purifyapp.net", "https://PURIFYAPP.NET", "https://anything.purifyapp.net", "https://purifyapp.onrender.com"]) {
      expect(onTestWeb(settings("1"), site), site).toBe(false);
    }
    for (const host of MAIN_WEB_HOSTS) expect(isMainWebHost(host)).toBe(true);
    // A name that only looks like it is not the main web, and not turned away as one.
    expect(isMainWebHost("notpurifyapp.net")).toBe(false);
    expect(isMainWebHost("purifyapp.net.example.com")).toBe(false);
  });

  it("is no where the address cannot be read", () => {
    for (const site of ["", "not an address", "purifyapp"]) expect(onTestWeb(settings("1"), site), site).toBe(false);
  });

  it("is no on the main web's database, and where no database is named", () => {
    expect(onTestWeb(settings("1", MAIN_DATABASE), TEST_WEB)).toBe(false);
    expect(onTestWeb(settings("1", MAIN_DATABASE.toUpperCase()), TEST_WEB)).toBe(false);
    expect(onTestWeb({ [TEST_WEB_MARKER]: "1" }, TEST_WEB)).toBe(false);
    expect(onTestWeb(settings("1", ""), TEST_WEB)).toBe(false);
  });
});

describe("the position a server answers by", () => {
  it("is the constant's on a server that is not the test web", () => {
    become(MAIN_WEB, undefined, MAIN_DATABASE);
    for (const position of ["closed", "testers", "open"] as const) {
      __setCampaignsOpening(position);
      expect(serverOpening()).toBe(position);
    }
  });

  it("is open on the test web while the constant says testers", () => {
    become(TEST_WEB, "1");
    expect(serverOpening()).toBe("open");
  });

  it("lifts testers and nothing else: a branch that says closed has no campaigns on the test web either", () => {
    become(TEST_WEB, "1");
    __setCampaignsOpening("closed");
    expect(serverOpening()).toBe("closed");
    __setCampaignsOpening("open");
    expect(serverOpening()).toBe("open");
  });

  it("stays at testers on the main web with the marker pasted into its settings by mistake", () => {
    // Its address says no, even on a database that is not the main one.
    become(MAIN_WEB, "1", TEST_DATABASE);
    expect(serverOpening()).toBe("testers");
    become("https://purifyapp.onrender.com", "1", TEST_DATABASE);
    expect(serverOpening()).toBe("testers");
    // And its database says no, even at an address that is not the main one.
    become(TEST_WEB, "1", MAIN_DATABASE);
    expect(serverOpening()).toBe("testers");
  });
});

describe("who campaigns are open for, at testers", () => {
  it("on the test web: every account, and a reader who is not signed in", async () => {
    become(TEST_WEB, "1");
    expect(await ask()).toEqual({ open: true, user: null });
    state.user = READER;
    expect((await ask()).open).toBe(true);
    state.user = ADMIN;
    expect((await ask()).open).toBe(true);
  });

  it("on the main web: the accounts it names as admins, and nobody else, with the marker pasted in or not", async () => {
    for (const marker of [undefined, "1"]) {
      become(MAIN_WEB, marker, MAIN_DATABASE);
      state.user = null;
      expect((await ask()).open, `nobody signed in, marker ${marker}`).toBe(false);
      state.user = READER;
      expect((await ask()).open, `a reader, marker ${marker}`).toBe(false);
      state.user = ADMIN;
      expect((await ask()).open, `an admin, marker ${marker}`).toBe(true);
    }
  });

  it("a branch that says closed is closed on the test web, and the account is not even looked up", async () => {
    become(TEST_WEB, "1");
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

  it("every campaign route's caller is asked of serverOpening, and the constant's file reads no setting", () => {
    const opening = code("lib/campaigns/opening.ts");
    expect(opening).toContain("const position = serverOpening();");
    // The constant is read once here, inside serverOpening, and nowhere else on the server.
    expect(opening.match(/campaignsOpening\(\)/g)).toHaveLength(1);
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
