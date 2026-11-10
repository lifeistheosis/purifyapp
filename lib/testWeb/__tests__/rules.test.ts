// The test web's rules (lib/testWeb/rules.ts; docs/1.9-build/notes/test-web.md).
//
// What would go wrong if this broke: the main web answering as the test web
// (campaigns open to every reader before he opens them, its pages behind a
// password, out of search), the test web touching the main web's database or
// a live payment key, mail from the test web reaching a real person, or a
// store build talking to the test web.

import { describe, expect, it } from "vitest";

import {
  MAIN_SUPABASE_REF,
  appBuildProblems,
  isTestWebEnv,
  keyProject,
  sharesMainWebName,
  testWebGate,
  testWebMayEmail,
  testWebProblems,
} from "@/lib/testWeb/rules";

const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.y`;
const MAIN_DB = `https://${MAIN_SUPABASE_REF}.supabase.co`;
const TEST_DB = "https://testproject0000000000.supabase.co";
const TEST_SITE = "https://purify-test-web.onrender.com";

/** The main web as it is configured: its database, its key, its address. */
const MAIN_WEB = {
  NEXT_PUBLIC_SUPABASE_URL: MAIN_DB,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ iss: "supabase", ref: MAIN_SUPABASE_REF, role: "anon" }),
  NEXT_PUBLIC_SITE_URL: "https://purifyapp.net",
  STRIPE_SECRET_KEY: "sk_live_abc",
};

/** The test web as his steps configure it. */
const TEST_WEB = {
  NEXT_PUBLIC_TEST_WEB: "1",
  NEXT_PUBLIC_SUPABASE_URL: TEST_DB,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ iss: "supabase", ref: "testproject0000000000", role: "anon" }),
  NEXT_PUBLIC_SITE_URL: TEST_SITE,
  STRIPE_SECRET_KEY: "sk_test_abc",
  ADMIN_EMAILS: "Owner@Example.com, mod@example.com",
  TEST_WEB_PASSWORD: "a long phrase: with a colon",
};

describe("the main web can never answer as the test web", () => {
  it("is not the test web, as it is", () => {
    expect(isTestWebEnv(MAIN_WEB)).toBe(false);
    expect(testWebProblems(MAIN_WEB)).toEqual([]);
  });

  it("is still not the test web with the test web's value set on it by mistake, and refuses to start", () => {
    const mistaken = { ...MAIN_WEB, NEXT_PUBLIC_TEST_WEB: "1" };
    expect(isTestWebEnv(mistaken)).toBe(false);
    const problems = testWebProblems(mistaken);
    expect(problems.some((p) => p.includes("main web's database"))).toBe(true);
    expect(problems.some((p) => p.includes("main web's key"))).toBe(true);
    expect(problems.some((p) => p.includes("purifyapp.net"))).toBe(true);
    expect(problems.some((p) => p.includes("live key"))).toBe(true);
  });

  it("refuses each one alone: the main web's database, key or address, or a live key", () => {
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_SUPABASE_URL: MAIN_DB })).toBe(false);
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_SUPABASE_ANON_KEY: MAIN_WEB.NEXT_PUBLIC_SUPABASE_ANON_KEY })).toBe(false);
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_SITE_URL: "https://www.purifyapp.net/" })).toBe(false);
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_SITE_URL: "PURIFYAPP.NET" })).toBe(false);
    expect(isTestWebEnv({ ...TEST_WEB, STRIPE_SECRET_KEY: "rk_live_abc" })).toBe(false);
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_SUPABASE_URL: undefined })).toBe(false);
  });

  it("refuses any name under purifyapp.net and the main web's Render address, not only purifyapp.net", () => {
    // A cookie set for the whole of purifyapp.net reaches every name under it.
    for (const site of [
      "https://test.purifyapp.net",
      "https://Staging.PurifyApp.net/admin",
      "test.purifyapp.net",
      "https://purifyapp.net.",
      "https://purifyapp.net:8443/",
      "https://purifyapp.onrender.com",
      "http://PURIFYAPP.ONRENDER.COM/api",
      "https://exa mple",
    ]) {
      expect(sharesMainWebName(site), site).toBe(true);
      expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_SITE_URL: site }), site).toBe(false);
    }
    // Names that only look alike are the test web's to use.
    for (const site of [TEST_SITE, "https://notpurifyapp.net", "https://purifyapp.net.example.com", "https://purifyapp-test.onrender.com"]) {
      expect(sharesMainWebName(site), site).toBe(false);
    }
    expect(sharesMainWebName(undefined)).toBe(false);
    expect(sharesMainWebName("  ")).toBe(false);
  });

  it("holds the address Render gives the service too, which the website uses when its own is not set", () => {
    // The main web's own service, the test web's value set on it by mistake and its address unset.
    const mainService = { ...MAIN_WEB, NEXT_PUBLIC_TEST_WEB: "1", NEXT_PUBLIC_SITE_URL: undefined, RENDER_EXTERNAL_URL: "https://purifyapp.onrender.com" };
    expect(testWebProblems(mainService).some((p) => p.includes("RENDER_EXTERNAL_URL"))).toBe(true);
    expect(isTestWebEnv({ ...TEST_WEB, RENDER_EXTERNAL_URL: "https://purifyapp.onrender.com" })).toBe(false);
    // The test web's own service.
    expect(isTestWebEnv({ ...TEST_WEB, RENDER_EXTERNAL_URL: TEST_SITE })).toBe(true);
    expect(testWebProblems({ ...MAIN_WEB, RENDER_EXTERNAL_URL: "https://purifyapp.onrender.com" })).toEqual([]);
  });

  it("is the test web when set up as his steps say, and only with its value set to 1", () => {
    expect(isTestWebEnv(TEST_WEB)).toBe(true);
    expect(testWebProblems(TEST_WEB)).toEqual([]);
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_TEST_WEB: "true" })).toBe(false);
    expect(isTestWebEnv({ ...TEST_WEB, NEXT_PUBLIC_TEST_WEB: undefined })).toBe(false);
  });

  it("reads a key's project from the key, and nothing from a key of another shape", () => {
    expect(keyProject(MAIN_WEB.NEXT_PUBLIC_SUPABASE_ANON_KEY)).toBe(MAIN_SUPABASE_REF);
    expect(keyProject("sb_publishable_abc")).toBeNull();
    expect(keyProject(undefined)).toBeNull();
  });
});

describe("the test web emails nobody but an admin or the owner", () => {
  it("lets every address through on the main web", () => {
    expect(testWebMayEmail("reader@example.org", MAIN_WEB)).toBe(true);
  });

  it("keeps to ADMIN_EMAILS and OWNER_EMAILS on the test web, in any case and either form", () => {
    expect(testWebMayEmail("reader@example.org", TEST_WEB)).toBe(false);
    expect(testWebMayEmail("owner@example.com", TEST_WEB)).toBe(true);
    expect(testWebMayEmail("Purify Owner <OWNER@example.com>", TEST_WEB)).toBe(true);
    expect(testWebMayEmail("someone@example.com", { ...TEST_WEB, OWNER_EMAILS: "someone@example.com" })).toBe(true);
    expect(testWebMayEmail("owner@example.com", { ...TEST_WEB, ADMIN_EMAILS: undefined })).toBe(false);
  });
});

describe("the test web's pages ask for its password; the apps' calls do not", () => {
  const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

  it("asks nothing on the main web", () => {
    expect(testWebGate("/", null, MAIN_WEB)).toEqual({ pass: true });
  });

  it("lets the apps' calls, the framework's files and robots.txt through", () => {
    for (const path of ["/api/campaigns", "/_next/static/x.js", "/.well-known/assetlinks.json", "/robots.txt"]) {
      expect(testWebGate(path, null, TEST_WEB), path).toEqual({ pass: true });
    }
  });

  it("asks for the password on a page, refuses a wrong one, and takes the right one with any name", () => {
    expect(testWebGate("/", null, TEST_WEB)).toMatchObject({ pass: false, status: 401 });
    expect(testWebGate("/campaigns", basic("edgar", "wrong"), TEST_WEB)).toMatchObject({ pass: false, status: 401 });
    expect(testWebGate("/campaigns", basic("anyone", TEST_WEB.TEST_WEB_PASSWORD), TEST_WEB)).toEqual({ pass: true });
    expect(testWebGate("/campaigns", basic("", TEST_WEB.TEST_WEB_PASSWORD), TEST_WEB)).toEqual({ pass: true });
    expect(testWebGate("/", "Bearer token", TEST_WEB)).toMatchObject({ pass: false, status: 401 });
    expect(testWebGate("/", "Basic !!!", TEST_WEB)).toMatchObject({ pass: false, status: 401 });
  });

  it("stays shut, not open, when no password is set", () => {
    expect(testWebGate("/", basic("x", ""), { ...TEST_WEB, TEST_WEB_PASSWORD: undefined })).toMatchObject({ pass: false, status: 503 });
  });
});

describe("a store build never talks to the test web", () => {
  it("builds for the stores against the main web, or this machine for a local walk", () => {
    expect(appBuildProblems({ NEXT_PUBLIC_SITE_URL: "https://purifyapp.net" }, { testWeb: false })).toEqual([]);
    expect(appBuildProblems({}, { testWeb: false })).toEqual([]);
    expect(appBuildProblems({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, { testWeb: false })).toEqual([]);
  });

  it("refuses a store build that says it is the test web, or calls any other address", () => {
    expect(appBuildProblems({ NEXT_PUBLIC_TEST_WEB: "1" }, { testWeb: false })).toHaveLength(1);
    expect(appBuildProblems({ NEXT_PUBLIC_SITE_URL: TEST_SITE }, { testWeb: false })).toHaveLength(1);
    // Exactly purifyapp.net: not a name under it, nor the main web's Render address.
    expect(appBuildProblems({ NEXT_PUBLIC_SITE_URL: "https://test.purifyapp.net" }, { testWeb: false })).toHaveLength(1);
    expect(appBuildProblems({ NEXT_PUBLIC_SITE_URL: "https://purifyapp.onrender.com" }, { testWeb: false })).toHaveLength(1);
  });

  it("builds for the test web only as the test web, with its own database and address", () => {
    expect(appBuildProblems(TEST_WEB, { testWeb: true })).toEqual([]);
    expect(appBuildProblems({ ...TEST_WEB, NEXT_PUBLIC_TEST_WEB: undefined }, { testWeb: true }).length).toBeGreaterThan(0);
    expect(appBuildProblems({ ...TEST_WEB, NEXT_PUBLIC_SUPABASE_URL: MAIN_DB }, { testWeb: true }).length).toBeGreaterThan(0);
    expect(appBuildProblems({ ...TEST_WEB, NEXT_PUBLIC_SITE_URL: "https://purifyapp.net" }, { testWeb: true }).length).toBeGreaterThan(0);
    expect(appBuildProblems({ ...TEST_WEB, NEXT_PUBLIC_SITE_URL: undefined }, { testWeb: true }).length).toBeGreaterThan(0);
  });
});
