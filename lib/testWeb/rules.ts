// The test web's rules, in one place, with no imports: the website reads them
// (lib/testWeb/index.ts, proxy.ts, instrumentation.ts, next.config.ts), and so
// does the apps' build script (scripts/native-build.mjs), which is plain Node.
//
// THE TEST WEB (his word, 2026-11-10; CLAUDE.md, "The test web and the main
// web"; docs/1.9-build/notes/test-web.md) is a second, private website on
// Render that runs the branch with its own database, for test builds to talk
// to. The main web is purifyapp.net. A build or a server is the test web when
// NEXT_PUBLIC_TEST_WEB is "1", and only then; that value is set on the test
// web's own Render service and in a test build, nowhere else.
//
// WHAT THE RULES PROMISE, whatever a setting says:
//   - the test web never touches the main web's database, never holds a live
//     payment key and never calls itself purifyapp.net, a name under it or
//     the main web's Render address (sharesMainWebName): a server or a build
//     that says it is the test web and breaks one of these refuses to start
//     (testWebProblems), and isTestWeb() answers false for it, so nothing that
//     only the test web may do (campaigns open to every account there, its
//     password, its noindex) can happen on the main web by a setting;
//   - it never emails real people: only an admin's or the owner's address
//     (testWebMayEmail);
//   - its pages ask for its password; the apps' calls to /api do not
//     (testWebGate);
//   - a store build never talks to it (storeBuildProblems).
//
// Erasable TypeScript only (no enums, no namespaces), so Node runs this file
// as it is.

/** The main web's Supabase project: the test web must never point at it. */
export const MAIN_SUPABASE_REF = "avbqyvjgcrucjwevwixt";
/** The main web's address. */
export const MAIN_WEB_ORIGIN = "https://purifyapp.net";
/** The one value that says "this is the test web". */
export const TEST_WEB_FLAG = "NEXT_PUBLIC_TEST_WEB";

export type TestWebEnv = Readonly<Record<string, string | undefined>>;

/** True when the value names purifyapp.net (or www.), in any case, with or without a path. */
export function namesMainWeb(url: string | undefined): boolean {
  if (!url) return false;
  return /^(https?:\/\/)?(www\.)?purifyapp\.net(?=$|[/:?#])/i.test(url.trim());
}

/** The main web's own address on Render, which answers as the main web. */
export const MAIN_WEB_RENDER_HOST = "purifyapp.onrender.com";

/**
 * True when the value's host is the main web's or shares its name:
 * purifyapp.net, any name under it (a cookie set for the whole of
 * purifyapp.net reaches every one of them, so a test web there could read a
 * reader's sign-in), or the main web's own Render address. The test web may
 * use none of them; its address is a name of its own on onrender.com, which
 * shares cookies with nothing. A value that cannot be read as an address
 * counts as the main web's, so a mistyped setting refuses to start rather
 * than passing.
 */
export function sharesMainWebName(url: string | undefined): boolean {
  const value = (url ?? "").trim();
  if (!value) return false;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`).hostname;
  } catch {
    return true;
  }
  host = host.toLowerCase().replace(/\.+$/, "");
  return host === "purifyapp.net" || host.endsWith(".purifyapp.net") || host === MAIN_WEB_RENDER_HOST;
}

/** True when the value is the main web's Supabase project. */
export function namesMainDatabase(url: string | undefined): boolean {
  if (!url) return false;
  return url.toLowerCase().includes(MAIN_SUPABASE_REF);
}

/**
 * The Supabase project a public key belongs to, read from the key itself (a
 * legacy anon key is a JWT whose payload names its project as "ref"). Null
 * for a key of another shape, which then cannot be told apart here.
 */
export function keyProject(key: string | undefined): string | null {
  const part = (key ?? "").split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const ref = (JSON.parse(json) as { ref?: unknown }).ref;
    return typeof ref === "string" ? ref : null;
  } catch {
    return null;
  }
}

/** A Stripe key that moves real money: a live secret or restricted key. */
export function isLiveStripeKey(key: string | undefined): boolean {
  return /^(sk|rk)_live_/.test((key ?? "").trim());
}

/**
 * What is wrong with a server or a build that says it is the test web. Empty
 * when it does not say so, or says so safely.
 */
export function testWebProblems(env: TestWebEnv): string[] {
  if (env[TEST_WEB_FLAG] !== "1") return [];
  const problems: string[] = [];
  const supabase = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL is not set: the test web needs its own Supabase project.");
  } else if (namesMainDatabase(supabase)) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL is the main web's database. The test web has its own project and never touches the main web's.");
  }
  if (keyProject(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) === MAIN_SUPABASE_REF) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is the main web's key. The test web uses its own project's key.");
  }
  if (sharesMainWebName(env.NEXT_PUBLIC_SITE_URL)) {
    problems.push("NEXT_PUBLIC_SITE_URL is purifyapp.net, a name under it, or the main web's Render address. The test web has its own address.");
  }
  // Where NEXT_PUBLIC_SITE_URL is not set, the website takes its address from
  // the one Render gives the service (lib/site.ts), so that one is held too:
  // on the main web's own service it is the main web's Render address.
  if (sharesMainWebName(env.RENDER_EXTERNAL_URL)) {
    problems.push("RENDER_EXTERNAL_URL is the main web's Render address: this is the main web's service, not the test web's.");
  }
  if (isLiveStripeKey(env.STRIPE_SECRET_KEY)) {
    problems.push("STRIPE_SECRET_KEY is a live key. The test web holds Stripe's test keys only.");
  }
  return problems;
}

/** This server or build is the test web, safely. False on the main web whatever its settings say. */
export function isTestWebEnv(env: TestWebEnv): boolean {
  return env[TEST_WEB_FLAG] === "1" && testWebProblems(env).length === 0;
}

/** The comma-separated address lists, lower case. */
function addresses(list: string | undefined): string[] {
  return (list ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** The bare address inside "Name <a@b>" or "a@b", lower case. */
function bare(address: string): string {
  const m = address.match(/<([^>]+)>/);
  return (m ? m[1] : address).trim().toLowerCase();
}

/**
 * On the test web, mail may go only to an admin's or the owner's address
 * (ADMIN_EMAILS, OWNER_EMAILS). Everywhere else every address may be mailed.
 */
export function testWebMayEmail(address: string, env: TestWebEnv): boolean {
  if (env[TEST_WEB_FLAG] !== "1") return true;
  const allowed = new Set([...addresses(env.ADMIN_EMAILS), ...addresses(env.OWNER_EMAILS)]);
  return allowed.has(bare(address));
}

/** What the proxy does with a request on the test web. */
export type GateAnswer = { pass: true } | { pass: false; status: 401 | 503; body: string };

/** Paths the apps and the platform reach without the password. */
export function passesWithoutPassword(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico"
  );
}

/** Same length and same characters, compared in a time that does not depend on where they differ. */
function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * The test web's pages ask for its password (HTTP Basic: any name, the
 * password set as TEST_WEB_PASSWORD on its Render service). With no password
 * set, the pages stay shut rather than open. Off the test web, everything
 * passes.
 */
export function testWebGate(pathname: string, authorization: string | null, env: TestWebEnv): GateAnswer {
  if (env[TEST_WEB_FLAG] !== "1") return { pass: true };
  if (passesWithoutPassword(pathname)) return { pass: true };
  const password = env.TEST_WEB_PASSWORD ?? "";
  if (!password) {
    return { pass: false, status: 503, body: "The test web has no password set yet (TEST_WEB_PASSWORD on its Render service)." };
  }
  const m = (authorization ?? "").match(/^Basic\s+([A-Za-z0-9+/=]+)$/);
  if (m) {
    let decoded = "";
    try {
      decoded = atob(m[1]);
    } catch {
      decoded = "";
    }
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (decoded.includes(":") && sameText(given, password)) return { pass: true };
  }
  return { pass: false, status: 401, body: "The test web is private." };
}

/**
 * What stops an app build. A build for the stores never says it is the test
 * web and never names its database or address; a build for the test web says
 * so, with its own database and address.
 */
export function appBuildProblems(env: TestWebEnv, opts: { testWeb: boolean }): string[] {
  const flagged = env[TEST_WEB_FLAG] === "1";
  if (!opts.testWeb) {
    const problems: string[] = [];
    if (flagged) problems.push(`${TEST_WEB_FLAG} is set, but this is a store build. A store build never talks to the test web; build with --test-web instead.`);
    // The address it calls: the main web, or this machine for a local walk.
    // (Its database is the workflow's to choose, from the main web's secrets;
    // a local build may stand on any project.)
    const site = env.NEXT_PUBLIC_SITE_URL;
    if (site && !namesMainWeb(site) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(site)) {
      problems.push(`NEXT_PUBLIC_SITE_URL is ${site}. A store build talks to ${MAIN_WEB_ORIGIN} only.`);
    }
    return problems;
  }
  const problems: string[] = [];
  if (!flagged) problems.push(`A test web build needs ${TEST_WEB_FLAG}=1.`);
  if (!env.NEXT_PUBLIC_SITE_URL) problems.push("A test web build needs NEXT_PUBLIC_SITE_URL, the test web's own address.");
  return problems.concat(testWebProblems({ ...env, [TEST_WEB_FLAG]: "1" }));
}
