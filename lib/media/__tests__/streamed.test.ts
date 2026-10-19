// Media the apps read from the website instead of carrying (1.7).
//
// Each streamed folder needs three things, and none of them shows in a curl
// that answers 200: the native build sets it aside, the website lets the
// apps' origins read it, and the apps ask SITE_URL for it. A folder with two
// of the three either ships inside the app after all or fails in the app
// while it works on the website. So the three lists are held together here,
// as source (lib/media/streamed.ts says why).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { STREAMED_ROOTS, avifFor, isStreamedMedia, streamedUrl } from "@/lib/media/streamed";
import { SITE_URL } from "@/lib/site";

const build = fs.readFileSync("scripts/native-build.mjs", "utf8");
const config = fs.readFileSync("next.config.ts", "utf8");

describe("a streamed file's address", () => {
  it("is the page's own on the website and the website's in the apps", () => {
    expect(streamedUrl("/covers/john.v1.jpg", false)).toBe("/covers/john.v1.jpg");
    expect(streamedUrl("/covers/john.v1.jpg", true)).toBe(`${SITE_URL}/covers/john.v1.jpg`);
    expect(streamedUrl("/audio/chants/x/a.mp3", true)).toBe(`${SITE_URL}/audio/chants/x/a.mp3`);
  });

  it("leaves what the bundle carries as it is, in the apps too", () => {
    for (const bundled of ["/sections/bible.jpg", "/audio/ambience/rain.mp3", "/audio/art/anthem.jpg", "/saints/icons/apostle-john.jpg"]) {
      expect(isStreamedMedia(bundled), bundled).toBe(false);
      expect(streamedUrl(bundled, true)).toBe(bundled);
    }
  });
});

// 1.7.2: "ensure all photos are optimized". Every cover has an AVIF beside
// it, about 40% lighter, which the covers offer first (scripts/covers-avif.mjs).
describe("a cover's lighter copy", () => {
  it("is the AVIF beside a cover's JPEG, on the website and in the apps, and nothing else's", () => {
    expect(avifFor("/covers/authors/apostle-jude.v1.jpg")).toBe("/covers/authors/apostle-jude.v1.avif");
    expect(avifFor(`${SITE_URL}/covers/saints/theotokos.v1.jpg`)).toBe(`${SITE_URL}/covers/saints/theotokos.v1.avif`);
    expect(avifFor("/saints/icons/john-the-baptist.jpg")).toBeNull();
    expect(avifFor("https://m.media-amazon.com/covers/x.jpg")).toBeNull();
    expect(avifFor("/covers/authors/apostle-jude.v1.png")).toBeNull();
    expect(avifFor(null)).toBeNull();
  });

  it("exists for every cover, so a cover never asks for one the website lacks", () => {
    const jpegs = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? jpegs(p) : e.name.endsWith(".jpg") ? [p] : [];
      });
    const covers = jpegs(path.join("public", "covers"));
    expect(covers.length).toBeGreaterThan(80);
    for (const jpg of covers) {
      expect(fs.existsSync(jpg.replace(/\.jpg$/, ".avif")), `${jpg}: no AVIF (run node scripts/covers-avif.mjs)`).toBe(true);
    }
  });
});

describe("every streamed folder", () => {
  const stash = build.slice(build.indexOf("const STASH_PATHS = ["), build.indexOf("function slot("));
  const headers = config.slice(config.indexOf("async headers()"));

  for (const root of STREAMED_ROOTS) {
    describe(root, () => {
      it("is left out of the apps' export", () => {
        const parts = ["public", ...root.split("/").filter(Boolean)].map((p) => `"${p}"`).join(", ");
        expect(stash, `scripts/native-build.mjs STASH_PATHS has no [${parts}]`).toContain(`[${parts}],`);
      });

      it("is on the website, so the apps have something to ask for", () => {
        expect(fs.existsSync(`public${root}`)).toBe(true);
      });

      it("may be read from the apps' origins", () => {
        // The rule names the folder through a constant; find the constant
        // whose value is this folder, then the rule that applies the shared
        // headers to it, after the site-wide rule it overrides.
        const constant = new RegExp(`const ([A-Z_]+) = "${root.replace(/\//g, "\\/")}:path\\*";`).exec(config)?.[1];
        expect(constant, `next.config.ts names no source for ${root}:path*`).toBeTruthy();
        const rule = headers.indexOf(`{ source: ${constant}, headers: streamedMediaHeaders }`);
        expect(rule, `no header rule for ${constant}`).toBeGreaterThan(-1);
        expect(rule).toBeGreaterThan(headers.indexOf('{ source: "/:path*", headers: securityHeaders }'));
      });
    });
  }

  it("is read with the resource policy and CORS the apps need", () => {
    const set = config.slice(config.indexOf("const streamedMediaHeaders"), config.indexOf("const CHANT_MEDIA_SOURCE"));
    expect(set).toMatch(/key: "Cross-Origin-Resource-Policy", value: "cross-origin"/);
    expect(set).toMatch(/key: "Access-Control-Allow-Origin", value: "\*"/);
  });
});
