// Media the apps read from the website instead of carrying (1.7).
//
// Each streamed folder needs three things, and none of them shows in a curl
// that answers 200: the native build sets it aside, the website lets the
// apps' origins read it, and the apps ask SITE_URL for it. A folder with two
// of the three either ships inside the app after all or fails in the app
// while it works on the website. So the three lists are held together here,
// as source (lib/media/streamed.ts says why).

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { STREAMED_ROOTS, isStreamedMedia, streamedUrl } from "@/lib/media/streamed";
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
