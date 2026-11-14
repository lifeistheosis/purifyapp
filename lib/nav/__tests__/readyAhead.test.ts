// Build 97 note 3: the first opening of each page in the apps, made ready
// ahead (lib/nav/readyAhead.ts). Fails on the code before it: there was no
// ready-ahead, nothing started it at the onboarding's end or on a cold start,
// and a first opening read every code file the page named after the tap.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { READY_AHEAD_PAGES, namedInPayload, readyPages, type ReadyAheadEnv } from "../readyAhead";

const ROOT = path.resolve(__dirname, "../../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

// The shape of a page's index.txt in the export (out/discover/index.txt, 1.9).
const PAYLOAD = [
  '1:"$Sreact.fragment"',
  '4:"/_next/static/chunks/3msnef8ibzxgj.js"',
  '5:"/_next/static/chunks/1guq-fc1i3oge.js"',
  '6:"/_next/static/chunks/0vdsihiq5-unm.css"',
  '7:"https://purifyapp.net/_next/static/chunks/elsewhere.js"',
  '1d:I[552765,["$4","$5"],"AppFrame"]',
  '1e:"/_next/static/chunks/421c_el12128q.js"',
  '1f:I[339756,["$1e"],"default"]',
  '20:I[339756,["$1e"],"default"]',
  '0:{"P":null,"c":["","discover",""]}',
].join("\n");

/** A stand-in for the app: a bundle of payloads, a document of scripts, and a log. */
function fakeEnv(bundle: Record<string, string>, opts: { stopAfter?: number } = {}) {
  const log: string[] = [];
  const scripts = new Set<string>(["/_next/static/chunks/3msnef8ibzxgj.js"]);
  let inFlight = 0;
  let most = 0;
  let steps = 0;
  const env: ReadyAheadEnv = {
    read: async (address) => {
      log.push(`read ${address}`);
      if (!(address in bundle)) throw new Error("404");
      return bundle[address];
    },
    loaded: (file) => scripts.has(file),
    load: async (file) => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      log.push(`load ${file}`);
      await Promise.resolve();
      scripts.add(file);
      inFlight -= 1;
    },
    run: (module) => {
      log.push(`run ${module}`);
    },
    idle: async () => {
      steps += 1;
    },
    going: () => opts.stopAfter === undefined || steps <= opts.stopAfter,
  };
  return { env, log, most: () => most };
}

describe("what a page's payload names", () => {
  it("names its own code files and client modules, once each", () => {
    expect(namedInPayload(PAYLOAD)).toEqual({
      files: ["/_next/static/chunks/3msnef8ibzxgj.js", "/_next/static/chunks/1guq-fc1i3oge.js", "/_next/static/chunks/421c_el12128q.js"],
      modules: [552765, 339756],
    });
  });

  it("never names a file from outside the bundle, a stylesheet, or a page", () => {
    const { files } = namedInPayload(PAYLOAD);
    for (const f of files) expect(f).toMatch(/^\/_next\/static\/chunks\/[A-Za-z0-9_~.-]+\.js$/);
  });
});

describe("readying the pages ahead", () => {
  const bundle = { "/discover/index.txt": PAYLOAD, "/prayers/index.txt": '2:"/_next/static/chunks/9prayers.js"\n3:I[77,["$2"],"default"]' };

  it("reads only each page's own payload from the bundle, then loads what is not loaded, one file at a time, then runs its modules", async () => {
    const { env, log, most } = fakeEnv(bundle);
    const ready = new Set<string>();
    expect(await readyPages(["/discover/", "/prayers/"], ready, env)).toBe(true);
    expect(log).toEqual([
      "read /discover/index.txt",
      "load /_next/static/chunks/1guq-fc1i3oge.js",
      "load /_next/static/chunks/421c_el12128q.js",
      "run 552765",
      "run 339756",
      "read /prayers/index.txt",
      "load /_next/static/chunks/9prayers.js",
      "run 77",
    ]);
    expect(most()).toBe(1);
    expect([...ready]).toEqual(["/discover/", "/prayers/"]);
  });

  it("stops at a tap or the background, and goes on from there the next time", async () => {
    const first = fakeEnv(bundle, { stopAfter: 2 });
    const ready = new Set<string>();
    expect(await readyPages(["/discover/", "/prayers/"], ready, first.env)).toBe(false);
    expect(first.log).toEqual(["read /discover/index.txt", "load /_next/static/chunks/1guq-fc1i3oge.js"]);
    expect(ready.size).toBe(0);
    const again = fakeEnv(bundle);
    expect(await readyPages(["/discover/", "/prayers/"], ready, again.env)).toBe(true);
    expect(await readyPages(["/discover/", "/prayers/"], ready, fakeEnv(bundle).env)).toBe(true);
    expect([...ready]).toEqual(["/discover/", "/prayers/"]);
  });

  it("passes over a page this bundle does not carry", async () => {
    const { env, log } = fakeEnv(bundle);
    const ready = new Set<string>();
    expect(await readyPages(["/nowhere/", "/prayers/"], ready, env)).toBe(true);
    expect(log[0]).toBe("read /nowhere/index.txt");
    expect(ready.has("/prayers/")).toBe(true);
  });
});

describe("the pages and the places that start it", () => {
  const source = read("lib/nav/readyAhead.ts");

  it("readies the five tabs and the page each opens most, all pages the export carries", () => {
    expect(READY_AHEAD_PAGES).toEqual(expect.arrayContaining(["/bible/john/1/", "/prayers/", "/discover/", "/account/", "/saints/", "/settings/"]));
    const stashed = [...read("scripts/native-build.mjs").matchAll(/\["app", "\(app\)", ((?:"[^"]+", )*"[^"]+")\]/g)].map((m) => `/${m[1].replace(/"/g, "").split(", ").join("/")}/`);
    expect(stashed.length).toBeGreaterThan(3);
    for (const page of READY_AHEAD_PAGES) {
      expect(page.startsWith("/") && page.endsWith("/")).toBe(true);
      for (const tree of stashed) expect(page.startsWith(tree), `${page} is under ${tree}, which the export leaves out`).toBe(false);
    }
  });

  it("never asks the router to prefetch, and fetches nothing from outside the bundle", () => {
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(code).not.toMatch(/prefetch/);
    expect(code).not.toMatch(/https?:/);
    expect(code).toMatch(/IS_STATIC_EXPORT/);
  });

  it("is started at the onboarding's end and once a cold start's first screen has settled", () => {
    expect(read("components/onboarding/HandoffSlate.tsx")).toMatch(/startReadyAhead\(\)/);
    expect(read("components/onboarding/OnboardingFlow.tsx")).toMatch(/setExiting\(true\);[\s\S]{0,200}startReadyAhead\(\)/);
    const shell = read("components/nav/ReadyAhead.tsx");
    expect(shell).toMatch(/isOnboarded\(\)\) startReadyAhead\(\)/);
    expect(shell).toMatch(/"load"/);
    expect(read("components/layout/RootFrame.tsx")).toMatch(/<ReadyAhead \/>/);
  });

  it("is stopped by a tap, a key or the background", () => {
    expect(source).toMatch(/addEventListener\("pointerdown", stop/);
    expect(source).toMatch(/addEventListener\("keydown", stop/);
    expect(source).toMatch(/visibilityState === "hidden"\) stop\(\)/);
  });
});
