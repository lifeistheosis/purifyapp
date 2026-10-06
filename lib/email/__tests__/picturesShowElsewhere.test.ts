// A picture in an email is drawn by somebody else's site, or not at all.
//
// next.config.ts answers every path with Cross-Origin-Resource-Policy:
// same-origin, which tells a browser to show the response on purifyapp.net and
// nowhere else. For a picture, that is a broken image wherever an email is
// read in a browser that loads it straight from here. It was live from the day
// the cross went into the shell until 2026-10-06, when the owner saw it in
// Resend's preview of the welcome email, and nothing had caught it because
// every check asked whether the picture answered 200. It did. The browser then
// declined to draw it.
//
// So this suite asks what the browser asks: for the address of every picture
// an email can carry, what does the site say about showing it elsewhere? It
// reads the real rules out of next.config.ts and matches them with the
// function Next's own server uses, in the order Next applies them.

import fs from "node:fs";
import path from "node:path";

import { modifyRouteRegex } from "next/dist/lib/redirect-status";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { describe, expect, it } from "vitest";

import { avatarSrc } from "@/lib/community/avatarSrc";
import { RELEASE_EMAIL } from "@/lib/whatsNew/releaseEmail";

import nextConfig from "../../../next.config";
import { EMAIL_THEMES } from "../theme";

const ROOT = path.resolve(__dirname, "../../..");
const KEY = "cross-origin-resource-policy";

type Rule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<Rule[]> {
  const found = await nextConfig.headers?.();
  if (!found?.length) throw new Error("next.config.ts has no header rules for the web build.");
  return found as Rule[];
}

/**
 * What the site answers for one path. Each rule is matched the way Next's
 * server builds its matcher for a header rule, the trailing-slash step
 * included (buildCustomRoute in server/lib/router-utils/filesystem.js), and a
 * later rule that sets the same key replaces an earlier one, as the server
 * does (resolve-routes.js) and as Next's headers guide says.
 */
function policyFor(pathname: string, among: Rule[]): string | undefined {
  let policy: string | undefined;
  for (const rule of among) {
    const match = getPathMatch(rule.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (regex) => modifyRouteRegex(regex),
      sensitive: false,
    });
    if (!match(pathname)) continue;
    for (const header of rule.headers) if (header.key.toLowerCase() === KEY) policy = header.value;
  }
  return policy;
}

/** Every picture an email can carry, by its path under public/. */
function emailPictures(): { what: string; src: string }[] {
  const out: { what: string; src: string }[] = [];
  for (const [mode, theme] of Object.entries(EMAIL_THEMES)) {
    if (theme.crossPath) out.push({ what: `the cross at the top (${mode})`, src: theme.crossPath });
  }
  if (RELEASE_EMAIL.picture) out.push({ what: `the ${RELEASE_EMAIL.version} letter's picture`, src: RELEASE_EMAIL.picture.src });
  for (const point of RELEASE_EMAIL.points) {
    if (point.picture) out.push({ what: `the picture under "${point.name}"`, src: point.picture.src });
  }
  return out;
}

describe("a picture in an email shows on somebody else's site", () => {
  it("finds the pictures it is here to check", () => {
    const pictures = emailPictures();
    // A positive control: an empty list would pass every check below.
    expect(pictures.some((p) => p.what.startsWith("the cross"))).toBe(true);
    expect(pictures.length).toBeGreaterThanOrEqual(2);
  });

  it("lets every one of them be drawn outside purifyapp.net", async () => {
    const all = await rules();
    for (const picture of emailPictures()) {
      expect(policyFor(picture.src, all), `${picture.what}, ${picture.src}`).toBe("cross-origin");
    }
  });

  it("would refuse them on the default rule alone, which is the fault this guards", async () => {
    const [everything] = await rules();
    expect(everything.source).toBe("/:path*");
    for (const picture of emailPictures()) {
      expect(policyFor(picture.src, [everything]), picture.src).toBe("same-origin");
    }
  });

  it("names a file that exists, of a kind every mail client draws", () => {
    for (const picture of emailPictures()) {
      expect(picture.src.startsWith("/"), picture.src).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "public", picture.src)), `public${picture.src}`).toBe(true);
      // Outlook draws no WebP or AVIF, and Gmail draws no SVG.
      expect(picture.src, picture.what).toMatch(/\.(png|jpe?g|gif)$/i);
    }
  });
});

describe("the apps, which are another origin too", () => {
  it("may draw a Google account picture the optimizer serves", async () => {
    const served = avatarSrc("https://lh3.googleusercontent.com/a/ACg8ocExample", "https://purifyapp.net");
    expect(served).toMatch(/^https:\/\/purifyapp\.net\/_next\/image\?/);
    expect(policyFor(new URL(served!).pathname, await rules())).toBe("cross-origin");
  });
});

describe("what is not a picture keeps the stricter rule", () => {
  it("answers same-origin for pages, data and the API", async () => {
    const all = await rules();
    const kept = [
      "/",
      "/whats-new",
      "/account",
      "/bible/john/3",
      "/shop/icons/a-png-icon",
      "/email/unsubscribe",
      "/api/email/unsubscribe",
      "/api/admin/drop",
      "/search-corpus.json",
      "/sw.js",
      "/_next/static/chunks/main.js",
    ];
    for (const pathname of kept) expect(policyFor(pathname, all), pathname).toBe("same-origin");
  });

  it("spells the header the same way in both rules, so the later one replaces the earlier", async () => {
    const keys = new Set(
      (await rules()).flatMap((rule) => rule.headers.filter((h) => h.key.toLowerCase() === KEY).map((h) => h.key)),
    );
    expect([...keys]).toEqual(["Cross-Origin-Resource-Policy"]);
  });
});
