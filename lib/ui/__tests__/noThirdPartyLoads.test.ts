// Nothing a reader opens is fetched from another company (143, the owner's
// word of 2026-11-10: "do 143"). A saint's Books in print loaded each book's
// cover straight from m.media-amazon.com, so opening St John Chrysostom's
// Writings made a reader's device call Amazon twice: the privacy page did not
// say so, and the content policy the site reports under would block it once
// enforced. The covers went (Amazon's terms do not let us copy them, so they
// are not hosted here either) and the link to buy stayed: Amazon is reached
// only when a reader taps it. The investor overview's fonts, which came from
// Google, are served from our own site.
//
// The rules, read from the code:
//   1. Nothing in app/ or components/ points a picture, a source, a
//      background, a stylesheet, a font, a script or a frame at a host that is
//      not ours, and no client component fetches from one.
//   2. Nothing in app/, components/ or lib/ writes the address of a picture,
//      font, style, script or sound on a host that is not ours, which is how
//      the Amazon covers were made (lib/affiliate/amazon.ts). lib/ is held to
//      this rule only: it also writes documents that are not pages (the
//      letters in lib/email, the owner's drop kit in lib/drop).
//   3. No picture field in data/ holds an address on a host that is not ours.
// Ours is purifyapp.net and its subdomains; the Supabase project is reached
// through its environment variable and is never written here. A true
// exception is named below, with its reason, in the one file it may stand in,
// and the privacy page names it in English and German.
//
// What would go wrong if this broke: a reader's device calling a company they
// were never told about, the moment a page opens.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const PAGES = ["app", "components"];
const KINDS = /\.(css|html|m?js|tsx?)$/;

function walk(dir: string, kinds: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, kinds, out);
    else if (kinds.test(name)) out.push(file);
  }
  return out;
}

/** Ours: the website and its subdomains (audio.purifyapp.net among them). */
const isOurs = (host: string) => /(^|\.)purifyapp\.net$/i.test(host) || /^(localhost|127\.0\.0\.1)$/i.test(host);

/** The hosts a page may load from that are not ours: where each may stand, why, and how the privacy page names it. */
const EXCEPTIONS: Record<string, { file: string; why: string; privacy: string[] }> = {
  "fums.api.bible": {
    file: "components/bible/Fums.tsx",
    why:
      "API.Bible's licence for the copyrighted translations requires its usage reporter (FUMS) on every licensed passage " +
      "a reader opens. It runs on a licensed chapter only, never on the public-domain ones (KJV, Brenton).",
    privacy: ["FUMS usage token", "FUMS-Nutzungs-Token"],
  },
};

const HOST = String.raw`(?:https?:)?//([a-z0-9-]+(?:\.[a-z0-9-]+)+)`;

/** Rule 1: the places a page asks for something as it opens. */
const LOADS: Array<[string, RegExp]> = [
  ["src", new RegExp(String.raw`\b(?:src|srcSet|srcset|poster)\s*[=:]\s*\{?\s*["'\x60]\s*` + HOST, "gi")],
  ["url()", new RegExp(String.raw`url\(\s*["']?\s*` + HOST, "gi")],
  ["@import", new RegExp(String.raw`@import\s+(?:url\(\s*)?["']?\s*` + HOST, "gi")],
  ["<link>", new RegExp(String.raw`<link\b[^>]*?\bhref\s*=\s*\{?\s*["'\x60]\s*` + HOST, "gi")],
];
const CLIENT_FETCH = new RegExp(String.raw`\b(?:fetch|new\s+EventSource|new\s+WebSocket)\(\s*["'\x60]\s*(?:wss?:|https?:)?//([a-z0-9-]+(?:\.[a-z0-9-]+)+)`, "gi");

/** Rule 2: the address of a file a page would load. */
const FILE = new RegExp(
  String.raw`["'\x60]${HOST}(/[^"'\x60\s]*?\.(?:jpe?g|png|gif|webp|avif|svg|ico|woff2?|ttf|otf|css|js|mp3|m4a|aac|ogg|opus|mp4|webm))(?:[?#][^"'\x60\s]*)?["'\x60]`,
  "gi",
);

/** A Commons "File:" page (written File: or File%3A) is a credit link a reader taps, not the picture. */
const CREDIT_PAGE = /\/wiki\/File(?::|%3A)/i;

type Find = { file: string; host: string; how: string };

function loadsIn(rel: string, text: string): Find[] {
  const found: Find[] = [];
  for (const [how, re] of LOADS) for (const m of text.matchAll(re)) found.push({ file: rel, host: m[1].toLowerCase(), how });
  if (/^\s*["']use client["']/m.test(text)) for (const m of text.matchAll(CLIENT_FETCH)) found.push({ file: rel, host: m[1].toLowerCase(), how: "fetch" });
  return found;
}

function filesIn(rel: string, text: string): Find[] {
  return [...text.matchAll(FILE)].filter((m) => !CREDIT_PAGE.test(m[2])).map((m) => ({ file: rel, host: m[1].toLowerCase(), how: "address" }));
}

/** A find that is neither ours nor its host's named exception in its named file. */
const outside = (f: Find) => !isOurs(f.host) && EXCEPTIONS[f.host]?.file !== f.file;

describe("nothing a reader opens is fetched from another company (143)", () => {
  const pages = PAGES.flatMap((r) => walk(path.join(ROOT, r), KINDS));
  const lib = walk(path.join(ROOT, "lib"), KINDS);
  const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");

  it("reads the site's code", () => {
    expect(pages.length).toBeGreaterThan(500);
    expect(lib.length).toBeGreaterThan(300);
  });

  it("the rules catch what they are for, and let ours through", () => {
    const sample = [
      `<img src="https://m.media-amazon.com/images/P/x.jpg" />`,
      `<source srcSet={"https://cdn.example.com/a.avif"} />`,
      `style={{ backgroundImage: "url(https://images.example.org/b.png)" }}`,
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora">`,
      `@import "https://fonts.googleapis.com/css2?family=Lora";`,
      `<Script src={\`https://tracker.example.net/t.js?k=\${k}\`} />`,
    ].join("\n");
    expect(loadsIn("sample.tsx", sample).map((f) => f.host)).toEqual([
      "m.media-amazon.com",
      "cdn.example.com",
      "tracker.example.net",
      "images.example.org",
      "fonts.googleapis.com",
      "fonts.googleapis.com",
    ]);
    expect(loadsIn("sample.tsx", `"use client";\nfetch("https://api.example.com/x")`).map((f) => f.host)).toEqual(["api.example.com"]);
    expect(filesIn("amazon.ts", "`https://m.media-amazon.com/images/P/${encodeURIComponent(asin)}.jpg`").map((f) => f.host)).toEqual(["m.media-amazon.com"]);
    expect(filesIn("events.ts", '"https://commons.wikimedia.org/wiki/File:Triumph_orthodoxy.jpg"')).toEqual([]);
    expect(filesIn("sections.ts", '"https://commons.wikimedia.org/wiki/File%3AOstromir_luke.jpg"')).toEqual([]);
    const ours = `<img src="https://purifyapp.net/icon-192.png" /><audio src="https://audio.purifyapp.net/c.mp3" /><img src="/covers/a.jpg" />`;
    expect(loadsIn("ours.tsx", ours).filter(outside)).toEqual([]);
  });

  it("no page or component asks another host for anything as it opens", () => {
    const found = pages.flatMap((f) => loadsIn(rel(f), readFileSync(f, "utf8"))).filter(outside);
    expect(found).toEqual([]);
  });

  it("nothing writes the address of a picture, font, style, script or sound on another host", () => {
    const found = [...pages, ...lib].flatMap((f) => filesIn(rel(f), readFileSync(f, "utf8"))).filter(outside);
    expect(found).toEqual([]);
  });

  it("no picture field in data/ points at another host", () => {
    const field = /"([A-Za-z_]*(?:image|cover|picture|icon|thumb|poster|avatar|photo|src)[A-Za-z_]*)"\s*:\s*"((?:https?:)?\/\/([^"/]+)[^"]*)"/gi;
    const found = walk(path.join(ROOT, "data"), /\.json$/).flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(field)]
        .filter((m) => !isOurs(m[3]) && !CREDIT_PAGE.test(m[2]))
        .map((m) => `${rel(f)}: ${m[1]} ${m[2]}`),
    );
    expect(found).toEqual([]);
  });

  it("each exception is still in use where it is named, and the privacy page names it in both languages", () => {
    const privacy = read("app/(app)/privacy/page.tsx");
    for (const [host, { file, why, privacy: says }] of Object.entries(EXCEPTIONS)) {
      expect(why.length, host).toBeGreaterThan(40);
      expect(loadsIn(file, read(file)).map((f) => f.host), host).toContain(host);
      for (const words of says) expect(privacy, `${host}: ${words}`).toContain(words);
    }
  });

  it("a book in print shows our cover or the plate, and its link to buy stays, with its rel and disclosure", () => {
    const section = read("components/saints/LicensedWorksSection.tsx");
    expect(section).toContain("imageUrl={w.coverImageUrl}");
    // The plate carries the Father's own icon where the app has one (the books write "John Chrysostom", the icons "St. John Chrysostom").
    expect(section).toContain("iconUrl={authorIcon(w.author) ?? authorIcon(`St. ${w.author}`)}");
    expect(section).toContain("href={buildAmazonUrl(w.amazonAsin)}");
    expect(section).toContain('rel="noopener nofollow sponsored"');
    expect(section).toContain('<T k="saints.affiliateDisclosure" />');
    const amazon = read("lib/affiliate/amazon.ts");
    expect(amazon).not.toMatch(/https:\/\/m\.media-amazon|function getAmazonCoverUrl/);
  });

  it("the investor overview's fonts are its own files, and its policy allows nothing else", () => {
    const deck = read("app/invest/deck.html");
    const fonts = [...deck.matchAll(/src:url\((\/invest\/fonts\/[a-z-]+\.woff2)\)/g)].map((m) => m[1]);
    expect(fonts.length).toBe(6);
    for (const font of fonts) expect(statSync(path.join(ROOT, "public", font)).size, font).toBeGreaterThan(5000);
    expect(statSync(path.join(ROOT, "public/invest/fonts/OFL.txt")).size).toBeGreaterThan(4000);
    const route = read("app/invest/route.ts");
    expect(route).toContain(`"font-src 'self'"`);
    expect(route).not.toMatch(/googleapis|gstatic/);
  });
});
