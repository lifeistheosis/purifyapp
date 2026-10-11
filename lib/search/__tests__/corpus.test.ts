import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { buildSearchCorpus } from "@/lib/search/buildCorpus";
import { matches } from "@/lib/search/match";
import { GROUP_ORDER, type SearchItem } from "@/lib/search/types";

const MESSAGES = en as Record<string, string>;

/**
 * Whether the app has a screen at a path, read off the app/ tree the way the
 * router reads it: a (group) folder is see-through, and a [name] folder takes
 * any one segment.
 */
function hasScreen(dir: string, segments: string[]): boolean {
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const groups = folders.filter((n) => n.startsWith("(") && n.endsWith(")"));
  if (groups.some((g) => hasScreen(path.join(dir, g), segments))) return true;
  if (segments.length === 0) return fs.existsSync(path.join(dir, "page.tsx"));
  const [head, ...rest] = segments;
  return folders.some(
    (n) =>
      (n === head || (n.startsWith("[") && !n.startsWith("[..."))) &&
      hasScreen(path.join(dir, n), rest),
  );
}

function screenFor(href: string): boolean {
  const address = href.split("#")[0].split("?")[0];
  return hasScreen("app", address.split("/").filter(Boolean));
}

const ENV_KEYS = ["NEXT_PUBLIC_SHOP_ENABLED", "NEXT_PUBLIC_TRAPEZA_ENABLED"] as const;
const before = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (before[k] === undefined) delete process.env[k];
    else process.env[k] = before[k];
  }
});

/** The list as the fullest build ships it: the shop and the Kitchen switched on. */
async function fullCorpus(): Promise<SearchItem[]> {
  process.env.NEXT_PUBLIC_SHOP_ENABLED = "1";
  process.env.NEXT_PUBLIC_TRAPEZA_ENABLED = "1";
  return buildSearchCorpus();
}

describe("the one search's list", () => {
  it("gives every row a name, a group and an id of its own", async () => {
    const items = await fullCorpus();
    expect(items.length).toBeGreaterThan(450);
    const ids = new Set<string>();
    for (const item of items) {
      expect(item.label.trim(), item.id).not.toBe("");
      // A catalog key that was never filled in reads "plans.x.name".
      expect(item.label, item.id).not.toMatch(/^[a-z][\w-]*(\.[\w-]+)+$/);
      expect(GROUP_ORDER, item.id).toContain(item.group);
      expect(item.href.startsWith("/"), item.id).toBe(true);
      expect(ids.has(item.id), `two rows share the id ${item.id}`).toBe(false);
      ids.add(item.id);
    }
  });

  it("opens a screen the app has, for every row", async () => {
    const lost = (await fullCorpus()).filter((item) => !screenFor(item.href));
    expect(lost.map((item) => `${item.label} -> ${item.href}`)).toEqual([]);
  });

  it("lists one screen once, except in Settings where several rows open one screen", async () => {
    const seen = new Map<string, string>();
    const twice: string[] = [];
    for (const item of await fullCorpus()) {
      if (item.group === "Settings") continue;
      const first = seen.get(item.href);
      if (first) twice.push(`${item.href}: ${first} and ${item.id}`);
      else seen.set(item.href, item.id);
    }
    expect(twice).toEqual([]);
  });

  it("finds prayers, saints, the Fathers' works, plans, screens and settings by what a reader types", async () => {
    const items = await fullCorpus();
    const finds = (query: string) => matches(items, query).map((i) => i.id);

    // The owner's test for one search: prayers, saints, verses and settings.
    expect(finds("morning")).toContain("rule-morning");
    expect(finds("basil")).toContain("saint-basil-the-great");
    expect(finds("incarnation")).toContain("work-athanasius-the-great-on-the-incarnation");
    expect(finds("akathist")).toContain("akathist-theotokos");
    expect(finds("sign of the cross")).toContain("lesson-sign-of-the-cross");
    expect(finds("psalter")).toContain("plan-psalter");
    expect(finds("walking with job")).toContain("walkthrough-job");
    expect(finds("filioque")).toContain("theology-filioque");

    // Passages a reader knows by name and the Septuagint files inside Daniel.
    expect(finds("susanna")).toEqual(["passage-susanna"]);
    expect(finds("bel and the dragon")).toContain("passage-bel");
    expect(finds("benedicite")).toContain("passage-song-of-the-three");

    // Screens that only a menu led to.
    expect(finds("journal")).toContain("page-journal");
    expect(finds("hours")).toContain("page-hours");
    expect(finds("fasting")).toContain("page-fasting");
    expect(finds("bookmarks")).toContain("page-saved");
    expect(finds("parish")).toContain("page-parishes");
    expect(finds("recipes")).toContain("page-kitchen");
    expect(finds("shop")).toContain("page-shop");

    // Settings, by the words a reader has for them and by the app's own.
    expect(finds("dark mode")).toEqual(["setting-reading-mode"]);
    expect(finds("true black")).toEqual(["setting-reading-mode"]);
    expect(finds("font size")).toContain("setting-reader-size");
    expect(finds("old calendar")).toContain("setting-calendar");
    expect(finds("julian")).toContain("setting-calendar");
    expect(finds("language")[0]).toBe("setting-language");
    expect(finds("notifications")).toContain("setting-notifications");
    expect(finds("password")).toContain("setting-security");
    expect(finds("settings")[0]).toBe("setting-all");
  });

  it("leaves out the shop and the Kitchen where the build has them switched off", async () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = "";
    process.env.NEXT_PUBLIC_TRAPEZA_ENABLED = "";
    const off = (await buildSearchCorpus()).map((i) => i.href);
    expect(off).not.toContain("/shop");
    expect(off).not.toContain("/kitchen");

    const on = (await fullCorpus()).map((i) => i.href);
    expect(on).toContain("/shop");
    expect(on).toContain("/kitchen");
  });

  it("names settings and screens in the words the app itself uses for them", () => {
    // Each say("key", "English") in the builder is a promise that the row
    // reads as the screen does. If the catalog's wording moves, this is where
    // it is noticed, not in a search result that no longer matches its page.
    const source = fs.readFileSync("lib/search/buildCorpus.ts", "utf8");
    const said = [...source.matchAll(/say\("([^"]+)", "([^"]+)"\)/g)];
    expect(said.length).toBeGreaterThanOrEqual(14);
    for (const [, key, english] of said) {
      expect(MESSAGES[key], key).toBe(english);
    }
  });

  it("opens Settings at a section that is there", async () => {
    // A row for a setting points at /settings#<section>. An id that has gone
    // would still open Settings, at its top, and nothing would say so.
    const screen = fs.readFileSync("components/settings/SettingsClient.tsx", "utf8");
    const anchored = (await fullCorpus()).filter((i) => i.href.startsWith("/settings#"));
    expect(anchored.length).toBeGreaterThanOrEqual(8);
    for (const item of anchored) {
      const id = item.href.split("#")[1];
      expect(screen, `${item.id} opens #${id}`).toContain(`id="${id}"`);
    }
  });

  it("keeps the first screen of an empty search to prayers", async () => {
    // The palette opens on the first eight Prayers and Other rows, in list
    // order. New rows go after the prayer rules so that screen does not move.
    const first = (await fullCorpus())
      .filter((i) => i.group === "Prayers" || i.group === "Other")
      .slice(0, 8);
    expect(first.every((i) => i.id.startsWith("rule-"))).toBe(true);
  });
});
