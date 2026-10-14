import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ENTRIES } from "@/lib/whatsNew/entries";
import { RELEASE_HIGHLIGHTS } from "@/lib/whatsNew/highlights";
import { RELEASE_EMAIL } from "@/lib/whatsNew/releaseEmail";
import { releaseName } from "@/lib/whatsNew/releaseName";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import {
  checkLive,
  drawnText,
  MAIN_PAGES,
  MISSING_PAGE,
  planFromBranch,
  POLL_MS,
  releaseOfCache,
} from "@/scripts/lib/release-live.mjs";

import nextConfig from "../../../next.config";

/**
 * `node scripts/release.mjs live`, the check after a push, held two ways.
 *
 * What it asks is read from the branch as text, the way the release tool
 * reads everything, so the first half holds each reading to the TypeScript
 * it stands for: if the highlights grow a picture or next.config.ts a
 * redirect, the check asks for it without anyone remembering to add it.
 *
 * How it judges is tried against a fake site, one fault at a time, so a
 * verdict that has stopped catching its fault fails here and not on the night
 * of a release.
 */

const ROOT = path.resolve(__dirname, "../../..");

/**
 * The file in app/ that answers a path: through route groups, static
 * segments, dynamic ones and catch-alls, the way the router walks the tree.
 */
function routeFile(pathname: string): string | null {
  const answers = (dir: string) =>
    fs.readdirSync(dir).find((f) => /^(page|route)\.(tsx|ts|jsx|js)$/.test(f)) ?? null;
  const walk = (dir: string, rest: string[]): string | null => {
    if (!rest.length) {
      const own = answers(dir);
      if (own) return path.join(dir, own);
    }
    for (const kid of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!kid.isDirectory()) continue;
      const sub = path.join(dir, kid.name);
      let found: string | null = null;
      if (/^\(.+\)$/.test(kid.name)) found = walk(sub, rest);
      else if (/^\[\[?\.\.\..+\]\]?$/.test(kid.name)) {
        const own = rest.length || kid.name.startsWith("[[") ? answers(sub) : null;
        found = own ? path.join(sub, own) : null;
      } else if (rest.length && (kid.name === rest[0] || /^\[[^.\]]+\]$/.test(kid.name))) {
        found = walk(sub, rest.slice(1));
      }
      if (found) return found;
    }
    return null;
  };
  return walk(path.join(ROOT, "app"), pathname.split("/").filter(Boolean));
}

describe("what live asks, read from the branch", () => {
  const plan = planFromBranch(ROOT);

  it("waits for the service worker this release ships", () => {
    expect(plan.version).toBe(CURRENT_VERSION);
    expect(plan.cacheName).toMatch(/^purify-\d+\.\d+\.\d+$/);
    expect(releaseOfCache(plan.cacheName!)).toBe(CURRENT_VERSION);
  });

  it("looks for the kind of the current note and the name the page draws", () => {
    const note = ENTRIES.find((e) => e.version === CURRENT_VERSION);
    expect(note, `no ${CURRENT_VERSION} note in data/changelog/entries.json`).toBeDefined();
    expect(plan.kind).toBe(note!.kind);
    expect(plan.name).toBe(releaseName(CURRENT_VERSION, ENTRIES));
  });

  it("asks for every picture the highlights and the release email name, and no other", () => {
    const highlights = RELEASE_HIGHLIGHTS.items.map((i) => i.image.src);
    const email = [RELEASE_EMAIL.picture?.src, ...RELEASE_EMAIL.points.map((p) => p.picture?.src)].filter(
      (s): s is string => Boolean(s),
    );
    expect(plan.pictures.map((p) => p.src).sort()).toEqual([...new Set([...highlights, ...email])].sort());
    // The email's are drawn by mail apps, so they are held to that too.
    for (const src of email) expect(plan.pictures.find((p) => p.src === src)?.elsewhere, src).toBe(true);
  });

  it("asks for the redirects next.config.ts sets, the prayer rope's among them", async () => {
    const rules = (await nextConfig.redirects?.()) ?? [];
    const plain = rules
      .filter((r) => /^\/[\w\-./]*$/.test(r.source))
      .map((r) => ({ from: r.source, to: r.destination, permanent: "permanent" in r ? r.permanent : false }));
    expect(plan.redirects).toEqual(plain);
    expect(plan.redirects).toContainEqual({ from: "/prayers/rope", to: "/prayers", permanent: true });
  });

  it("asks only for pages that are routes in app/, and for a missing one that is not", () => {
    for (const page of MAIN_PAGES) expect(routeFile(page), `${page} has no route in app/`).not.toBeNull();
    for (const rule of plan.redirects) expect(routeFile(rule.to), `${rule.from} goes to ${rule.to}, which has no route`).not.toBeNull();
    expect(routeFile(MISSING_PAGE), `${MISSING_PAGE} is a route now; pick another`).toBeNull();
    expect(plan.pages).toEqual(MAIN_PAGES);
    expect(plan.missing).toBe(MISSING_PAGE);
  });
});

// ---------------------------------------------------------------- a fake site

type Answer = { status?: number; body?: string; headers?: Record<string, string> };
type Site = Record<string, Answer | ((nth: number) => Answer)>;

const PLAN = {
  version: "9.1",
  release: "9.1",
  cacheName: "purify-9.1.0",
  kind: "A test release, with a reader's own & more",
  name: "Lamplight",
  pictures: [
    { src: "/whats-new/9.1/one.webp", from: "highlights" as const, elsewhere: false },
    { src: "/whats-new/9.1/email.jpg", from: "email" as const, elsewhere: true },
  ],
  pages: ["/", "/bible"],
  missing: MISSING_PAGE,
  redirects: [{ from: "/prayers/rope", to: "/prayers", permanent: true }],
};

/** A site that serves 9.1 whole. Each test breaks one thing in it. */
function wholeSite(): Site {
  const html = { "content-type": "text/html; charset=utf-8" };
  return {
    "/sw.js": { body: 'const CACHE_VERSION = "purify-9.1.0";\nconst HTML_CACHE = `${CACHE_VERSION}-html`;', headers: { "content-type": "application/javascript" } },
    "/whats-new": {
      body:
        '<html><body><p class="eyebrow">What is new <span>Lamplight</span></p>' +
        "<p>9.1<!-- --> A test release, with a reader&#x27;s own &amp; more</p>" +
        '<script>self.__next_f.push([1,"words only a script carries"])</script></body></html>',
      headers: html,
    },
    "/whats-new/9.1/one.webp": { body: "RIFF", headers: { "content-type": "image/webp", "cross-origin-resource-policy": "cross-origin" } },
    "/whats-new/9.1/email.jpg": { body: "JFIF", headers: { "content-type": "image/jpeg", "cross-origin-resource-policy": "cross-origin" } },
    "/": { body: "<html></html>", headers: html },
    "/bible": { body: "<html></html>", headers: html },
    "/prayers/rope": { status: 308, headers: { location: "/prayers" } },
  };
}

async function run(site: Site, options: { wait?: number; throws?: boolean } = {}) {
  const asked: string[] = [];
  const seen: Record<string, number> = {};
  const fetch = async (url: string) => {
    if (options.throws) throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
    const { pathname } = new URL(url);
    asked.push(pathname);
    seen[pathname] = (seen[pathname] ?? 0) + 1;
    const rule = site[pathname];
    const answer = typeof rule === "function" ? rule(seen[pathname]) : rule;
    if (!answer) return new Response("<html>Not found</html>", { status: 404, headers: { "content-type": "text/html" } });
    return new Response(answer.body ?? "", { status: answer.status ?? 200, headers: answer.headers ?? {} });
  };
  let clock = 0;
  const slept: number[] = [];
  const lines: string[] = [];
  const result = await checkLive({
    site: "http://127.0.0.1:4000",
    plan: PLAN,
    fetch,
    wait: options.wait ?? 0,
    now: () => clock,
    sleep: async (ms: number) => {
      slept.push(ms);
      clock += ms;
    },
    log: (line: string) => lines.push(...line.split("\n")),
  });
  const no = lines.filter((l) => l.startsWith("  NO  "));
  return { ...result, asked, slept, lines, no };
}

describe("how live judges the site", () => {
  it("passes a site that serves the release whole", async () => {
    const r = await run(wholeSite());
    expect(r.no).toEqual([]);
    expect(r.failed).toBe(0);
    expect(r.serving).toBe(true);
    expect(r.lines).toContain("  ok  /whats-new shows 9.1's kind, \"A test release, with a reader's own & more\"");
    expect(r.lines).toContain("  ok  /prayers/rope goes to /prayers (308)");
    expect(r.lines.at(-1)).toBe("Everything asked of http://127.0.0.1:4000 is right.");
  });

  it("stops at the old version, says which one, and asks nothing else", async () => {
    const site = wholeSite();
    site["/sw.js"] = { body: 'const CACHE_VERSION = "purify-9.0.2";' };
    const r = await run(site);
    expect(r.serving).toBe(false);
    expect(r.failed).toBe(1);
    expect(r.no[0]).toContain("/sw.js says purify-9.0.2, not purify-9.1.0: the live site is still on 9.0.2");
    expect(r.asked).toEqual(["/sw.js"]);
  });

  it("waits for the new deploy, asking every thirty seconds", async () => {
    const site = wholeSite();
    site["/sw.js"] = (nth) => ({ body: `const CACHE_VERSION = "purify-${nth < 3 ? "9.0.2" : "9.1.0"}";` });
    const r = await run(site, { wait: 5 });
    expect(r.serving).toBe(true);
    expect(r.failed).toBe(0);
    expect(r.slept).toEqual([POLL_MS, POLL_MS]);
    expect(r.asked.filter((a) => a === "/sw.js")).toHaveLength(3);
  });

  it("gives up when the wait runs out", async () => {
    const site = wholeSite();
    site["/sw.js"] = { body: 'const CACHE_VERSION = "purify-9.0.2";' };
    const r = await run(site, { wait: 1 });
    expect(r.serving).toBe(false);
    expect(r.asked).toEqual(["/sw.js", "/sw.js", "/sw.js"]);
    expect(r.no[0]).toContain("still on 9.0.2 after 1 minute(s)");
  });

  it("says a site it cannot reach is not right, and does not throw", async () => {
    const r = await run(wholeSite(), { throws: true });
    expect(r.serving).toBe(false);
    expect(r.failed).toBe(1);
    expect(r.no[0]).toContain("/sw.js does not say which deploy is serving (no answer: ECONNREFUSED)");
  });

  it("catches a main page answering 500", async () => {
    const site = wholeSite();
    site["/bible"] = { status: 500, body: "Internal Server Error" };
    const r = await run(site);
    expect(r.no).toEqual(["  NO  /bible answers 500"]);
  });

  it("catches a missing picture", async () => {
    const site = wholeSite();
    delete site["/whats-new/9.1/email.jpg"];
    const r = await run(site);
    expect(r.no).toEqual(["  NO  /whats-new/9.1/email.jpg answers 404"]);
  });

  it("catches a picture that answers 200 as a page", async () => {
    const site = wholeSite();
    site["/whats-new/9.1/one.webp"] = { body: "<html></html>", headers: { "content-type": "text/html" } };
    const r = await run(site);
    expect(r.no).toEqual(["  NO  /whats-new/9.1/one.webp answers 200, but as text/html, not a picture"]);
    expect(r.lines).toContain("        It is named by lib/whatsNew/highlights.ts and should be in public/.");
  });

  it("catches an email picture that another site may not draw", async () => {
    const site = wholeSite();
    site["/whats-new/9.1/email.jpg"] = { body: "JFIF", headers: { "content-type": "image/jpeg", "cross-origin-resource-policy": "same-origin" } };
    const r = await run(site);
    expect(r.no).toHaveLength(1);
    expect(r.no[0]).toContain("Cross-Origin-Resource-Policy is same-origin, so a mail app will not draw it");
    expect(r.lines.join("\n")).toContain("next.config.ts must answer cross-origin for picture files");
  });

  it("catches a page that does not exist answering 200", async () => {
    const site = wholeSite();
    site[MISSING_PAGE] = { body: "<html>Home</html>", headers: { "content-type": "text/html" } };
    const r = await run(site);
    expect(r.no).toEqual([`  NO  ${MISSING_PAGE}, a page that does not exist, answers 200`]);
  });

  it("catches a redirect that is gone, or that leaves the site", async () => {
    const gone = wholeSite();
    gone["/prayers/rope"] = { body: "<html>The prayer rope</html>" };
    expect((await run(gone)).no).toEqual(["  NO  /prayers/rope should go to /prayers, but it answers 200"]);

    const away = wholeSite();
    away["/prayers/rope"] = { status: 308, headers: { location: "http://localhost:10000/prayers" } };
    expect((await run(away)).no).toEqual(["  NO  /prayers/rope should go to /prayers, but it answers 308 to http://localhost:10000/prayers"]);
  });

  it("catches a What's New that does not show the note yet, and says why", async () => {
    const site = wholeSite();
    site["/whats-new"] = { body: "<html><p>9.0.2 An older note</p></html>", headers: { "content-type": "text/html" } };
    const r = await run(site);
    expect(r.no).toHaveLength(2);
    expect(r.lines.join("\n")).toContain("the owner accepts the note in /admin?tab=patch-notes");
  });

  it("reads only the words a page draws, not those its scripts carry", () => {
    const html = (wholeSite()["/whats-new"] as Answer).body!;
    expect(drawnText(html)).toContain("A test release, with a reader's own & more");
    expect(drawnText(html)).not.toContain("words only a script carries");
  });
});
