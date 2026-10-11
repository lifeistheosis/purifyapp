// The Find a parish list (lib/parishes/finders.ts) and the page that shows it.
//
// The page is only as good as its addresses, and an address is the one thing
// typecheck cannot read. A row with no date was never checked, a row over
// http sends the reader down an open line, and the same address twice is a
// paste that went wrong. These hold the shape of the list still. They do not
// load anything: whether an address still answers is checked by hand, and
// `verifiedOn` is the record of when.
//
// The second half holds the page to what it was built to be: links out and
// nothing more. No map, no location, nothing loaded from the sites it names.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { findersByRegion, PARISH_FINDERS, PARISH_REGIONS } from "@/lib/parishes/finders";

const ROOT = path.resolve(__dirname, "..", "..", "..");

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
}

/** Code only. Half of what these files say about maps is in their comments. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const EN = JSON.parse(read("lib", "i18n", "messages", "en.json")) as Record<string, string>;

const regionIds = new Set<string>(PARISH_REGIONS.map((r) => r.id));

// Built from code points so this file never holds the characters themselves.
const EM_DASH = String.fromCharCode(0x2014);
const NO_BREAK_SPACE = String.fromCharCode(0x00a0);

describe("the parish directories", () => {
  it("has a list to check", () => {
    // Every loop below passes on an empty array.
    expect(PARISH_FINDERS.length).toBeGreaterThan(10);
  });

  it("gives every entry a name, a region, a place, an address and a date", () => {
    for (const f of PARISH_FINDERS) {
      expect(f.name.trim(), `name of ${f.url}`).not.toBe("");
      expect(f.serves.trim(), `${f.name}: serves`).not.toBe("");
      expect(f.url.trim(), `${f.name}: url`).not.toBe("");
      expect(f.verifiedOn.trim(), `${f.name}: verifiedOn`).not.toBe("");
      expect(regionIds.has(f.region), `${f.name}: region "${f.region}"`).toBe(true);
    }
  });

  it("links over https only", () => {
    for (const f of PARISH_FINDERS) {
      expect(f.url.startsWith("https://"), `${f.name}: ${f.url}`).toBe(true);
      expect(new URL(f.url).protocol, f.name).toBe("https:");
    }
  });

  it("links to the directory itself, not to a home page", () => {
    // A home page leaves the reader to hunt for the list, which is the work
    // this page exists to save them.
    for (const f of PARISH_FINDERS) {
      expect(new URL(f.url).pathname.length, `${f.name}: ${f.url}`).toBeGreaterThan(1);
    }
  });

  it("carries no query string and no fragment", () => {
    // Nothing rides along with the reader: no campaign tag, no referrer code.
    for (const f of PARISH_FINDERS) {
      const u = new URL(f.url);
      expect(u.search, `${f.name}: ${f.url}`).toBe("");
      expect(u.hash, `${f.name}: ${f.url}`).toBe("");
    }
  });

  it("lists no address twice", () => {
    // Compared without the trailing slash and in one case, so the same page
    // cannot hide behind two spellings.
    const seen = new Map<string, string>();
    for (const f of PARISH_FINDERS) {
      const key = f.url.toLowerCase().replace(/\/+$/, "");
      expect(seen.get(key), `${f.name} repeats the address of ${seen.get(key)}`).toBeUndefined();
      seen.set(key, f.name);
    }
  });

  it("lists no body twice", () => {
    const names = PARISH_FINDERS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("dates every check with a real day that has already happened", () => {
    for (const f of PARISH_FINDERS) {
      expect(f.verifiedOn, f.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const day = new Date(`${f.verifiedOn}T00:00:00Z`);
      // An impossible day (2026-02-31) parses to another one or to nothing.
      expect(Number.isNaN(day.getTime()), `${f.name}: ${f.verifiedOn}`).toBe(false);
      expect(day.toISOString().slice(0, 10), f.name).toBe(f.verifiedOn);
      // The list was first checked on 2026-10-10, and nobody checks tomorrow.
      expect(f.verifiedOn >= "2026-10-10", `${f.name}: ${f.verifiedOn}`).toBe(true);
      expect(day.getTime(), `${f.name}: ${f.verifiedOn}`).toBeLessThanOrEqual(Date.now());
    }
  });

  it("keeps the house punctuation in what the reader sees", () => {
    for (const f of PARISH_FINDERS) {
      for (const text of [f.name, f.serves]) {
        expect(text.includes(EM_DASH), `${f.name}: em dash`).toBe(false);
        expect(text.includes(NO_BREAK_SPACE), `${f.name}: no-break space`).toBe(false);
        expect(text, f.name).toBe(text.trim());
      }
    }
  });
});

describe("the groups", () => {
  it("names each group once", () => {
    expect(regionIds.size).toBe(PARISH_REGIONS.length);
    const keys = PARISH_REGIONS.map((r) => r.labelKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has no empty group", () => {
    // An empty group is a heading with nothing under it.
    for (const { region, finders } of findersByRegion()) {
      expect(finders.length, region.id).toBeGreaterThan(0);
    }
  });

  it("puts every directory in exactly one group", () => {
    const grouped = findersByRegion().flatMap((g) => g.finders);
    expect(grouped.length).toBe(PARISH_FINDERS.length);
    expect(new Set(grouped.map((f) => f.url)).size).toBe(PARISH_FINDERS.length);
  });

  it("has an English heading for every group", () => {
    // The page renders these through a computed key, which keysExist.test.ts
    // cannot see. Without the string the reader is shown the key itself.
    for (const r of PARISH_REGIONS) {
      expect(EN[r.labelKey], r.labelKey).toBeTruthy();
    }
  });
});

describe("the page", () => {
  const page = read("app", "(app)", "parishes", "page.tsx");
  const list = read("components", "parishes", "ParishFinderList.tsx");

  it("stays a page the apps can ship", () => {
    // The static export has no server: a cookie or a session read here bakes
    // a redirect or breaks the build.
    const sources = {
      "page.tsx": withoutComments(page),
      "ParishFinderList.tsx": withoutComments(list),
    };
    for (const [name, src] of Object.entries(sources)) {
      expect(src, name).not.toMatch(/cookies\(|headers\(|force-dynamic/);
    }
    expect(page).toContain("export const metadata");
  });

  it("is links out and nothing more", () => {
    // No map, no location, nothing of theirs running inside Purify.
    const code = withoutComments(page) + withoutComments(list);
    expect(code).not.toMatch(/geolocation/i);
    expect(code).not.toMatch(/<iframe|<script|next\/script/i);
  });

  it("opens each directory outside Purify", () => {
    const code = withoutComments(list);
    expect(code).toContain('target="_blank"');
    expect(code).toContain('rel="noopener noreferrer"');
  });
});

describe("the words", () => {
  // keysExist.test.ts reads `t("key")` and `<T k="key">`. The phone row and
  // the desktop pill ask through the server form, `t(m, "key")`, which it
  // does not match, and it skips a namespace en.json does not have yet, which
  // "parishes" was when this page was written. So each key is held to its
  // call site and to English here. Without the string the reader is shown
  // the key itself.
  const SAID: [key: string, file: string[]][] = [
    ["discover.tile.parishes", ["components", "mobile", "DiscoverMobile.tsx"]],
    ["discover.tile.parishesBlurb", ["components", "mobile", "DiscoverMobile.tsx"]],
    ["discover.tile.parishes", ["app", "(app)", "discover", "page.tsx"]],
    ["parishes.title", ["components", "parishes", "ParishFinderList.tsx"]],
    ["parishes.intro", ["components", "parishes", "ParishFinderList.tsx"]],
    ["parishes.leaving", ["components", "parishes", "ParishFinderList.tsx"]],
    ["nav.discover", ["components", "parishes", "ParishFinderList.tsx"]],
  ];

  it("has English for everything the page and its ways in say", () => {
    for (const [key, file] of SAID) {
      // The call site first, so a renamed key cannot leave a stale row here.
      expect(read(...file), `${file.join("/")} asks for ${key}`).toContain(`"${key}"`);
      expect(EN[key], key).toBeTruthy();
    }
  });
});

describe("the ways in", () => {
  it("is on Discover, on a phone and on a desktop", () => {
    expect(read("components", "mobile", "DiscoverMobile.tsx")).toContain('href: "/parishes"');
    expect(read("app", "(app)", "discover", "page.tsx")).toContain('href: "/parishes"');
    expect(read("components", "nav", "DiscoverDropdown.tsx")).toContain('href: "/parishes"');
  });

  it("is in the sitemap", () => {
    expect(read("app", "sitemap.ts")).toContain('"/parishes"');
  });
});
