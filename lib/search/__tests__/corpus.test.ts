import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import el from "@/lib/i18n/messages/el.json";
import en from "@/lib/i18n/messages/en.json";
import fil from "@/lib/i18n/messages/fil.json";
import ro from "@/lib/i18n/messages/ro.json";
import { buildSearchCorpus } from "@/lib/search/buildCorpus";
import { inReadersLanguage, matches } from "@/lib/search/match";
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

/**
 * The list as the fullest build ships it: the shop switched on. The Kitchen's
 * switch is on too, as the website still has it set for the 1.6 apps' calls
 * to /api/trapeza: since 1.7 it must bring no row back.
 */
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
    // Chants (1.7), where the Kitchen was, and each chant by name.
    expect(finds("chants")).toContain("page-chants");
    expect(finds("byzantine")).toContain("page-chants");
    expect(finds("prayer rope anthem")).toContain("chant-prayer-rope-anthem");
    expect(finds("recipes")).not.toContain("page-kitchen");
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

  it("leaves out the shop where the build has it switched off", async () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = "";
    const off = (await buildSearchCorpus()).map((i) => i.href);
    expect(off).not.toContain("/shop");

    const on = (await fullCorpus()).map((i) => i.href);
    expect(on).toContain("/shop");
  });

  it("has no Kitchen in any build, and Chants and every live chant in all of them", async () => {
    // The owner, 2026-10-16: the Kitchen comes off every reader surface, its
    // search row with it, whatever the website's switch says.
    for (const flag of ["", "1"]) {
      process.env.NEXT_PUBLIC_TRAPEZA_ENABLED = flag;
      const items = await buildSearchCorpus();
      const hrefs = items.map((i) => i.href);
      expect(hrefs.filter((h) => h.startsWith("/kitchen") || h.startsWith("/trapeza"))).toEqual([]);
      expect(hrefs).toContain("/chants");
      expect(hrefs).toContain("/chants/prayer-rope-anthem");
      // The Anthem is found at its chant, not at the old page.
      expect(hrefs).not.toContain("/prayers/anthem");
    }
  });

  it("names settings and screens in the words the app itself uses for them", () => {
    // Each say("key", "English") in the builder is a promise that the row
    // reads as the screen does. If the catalog's wording moves, this is where
    // it is noticed, not in a search result that no longer matches its page.
    const source = fs.readFileSync("lib/search/buildCorpus.ts", "utf8");
    const said = [...source.matchAll(/\bsa(?:y|id)\("([^"]+)", "([^"]+)"\)/g)];
    expect(said.length).toBeGreaterThanOrEqual(14);
    for (const [, key, english] of said) {
      expect(MESSAGES[key], key).toBe(english);
    }
  });

  it("says which catalog line a row's name is, and that line is the name", async () => {
    // A row that carries a key is shown in the reader's language by that key.
    // If the key and the English name ever part, a Greek reader would be shown
    // a different thing from the one an English reader is.
    const keyed = (await fullCorpus()).filter((i) => i.labelKey || i.sublabelKey);
    // The 78 books, the four passages, the plans, the settings, some screens.
    expect(keyed.length).toBeGreaterThan(100);
    for (const item of keyed) {
      if (item.labelKey) expect(MESSAGES[item.labelKey], `${item.id} label`).toBe(item.label);
      if (item.sublabelKey && item.sublabelCount === undefined) {
        expect(MESSAGES[item.sublabelKey], `${item.id} sublabel`).toBe(item.sublabel);
      }
      if (item.sublabelKey && item.sublabelCount !== undefined) {
        const form = MESSAGES[`${item.sublabelKey}.${item.sublabelCount === 1 ? "one" : "other"}`];
        expect(form?.replace("{count}", String(item.sublabelCount)), `${item.id} sublabel`).toBe(item.sublabel);
      }
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

  it("is shown, and found, in the reader's own language where the catalog has the words", async () => {
    const items = await fullCorpus();
    // The catalogs' own plural forms, picked the simple way: one, or other.
    const read = (messages: Record<string, string>) =>
      inReadersLanguage(
        items,
        (key) => messages[key] ?? key,
        (base, count) => (messages[`${base}.${count === 1 ? "one" : "other"}`] ?? base).replace("{count}", String(count)),
      );
    const greek = read(el as Record<string, string>);
    const romanian = read(ro as Record<string, string>);
    const filipino = read(fil as Record<string, string>);
    const finds = (list: SearchItem[], query: string) => matches(list, query).map((i) => i.id);
    const row = (list: SearchItem[], id: string) => list.find((i) => i.id === id);

    // The books, as the reader's Bible names them.
    expect(row(greek, "book-psalms")?.label).toBe("Ψαλμοί");
    // And how many chapters, said the reader's way.
    expect(row(greek, "book-psalms")?.sublabel).toBe("151 κεφάλαια");
    expect(row(romanian, "book-jude")?.sublabel).toMatch(/^1 /);
    expect(row(romanian, "book-jude")?.sublabel).not.toBe("1 chapter");
    expect(finds(greek, "Ψαλμοί")).toContain("book-psalms");
    expect(finds(greek, "ψαλμοι")).toContain("book-psalms");
    expect(finds(romanian, "Facerea")).toContain("book-genesis");
    expect(finds(filipino, "Juan")).toContain("book-john");

    // The settings, under the names the reader's Settings screen shows.
    expect(row(greek, "setting-all")?.label).toBe("Ρυθμίσεις");
    expect(finds(greek, "Ρυθμίσεις")[0]).toBe("setting-all");
    expect(row(romanian, "setting-reading-mode")).toMatchObject({ label: "Mod de citire", sublabel: "Setări" });
    expect(finds(romanian, "Limbă")).toContain("setting-language");
    expect(finds(filipino, "Wika")).toContain("setting-language");

    // The English name still finds it: plenty of readers know a book by it.
    expect(finds(greek, "Psalms")).toContain("book-psalms");
    expect(finds(romanian, "dark mode")).toContain("setting-reading-mode");
    expect(finds(filipino, "Settings")).toContain("setting-all");

    // What the app has not translated anywhere stays as it is.
    expect(row(greek, "saint-basil-the-great")).toBe(row(items, "saint-basil-the-great"));
  });

  it("is handed to an English reader untouched", async () => {
    const items = await fullCorpus();
    const english = inReadersLanguage(items, (key) => MESSAGES[key] ?? key);
    expect(english).toHaveLength(items.length);
    expect(english.every((item, i) => item === items[i])).toBe(true);
    // And a catalog with nothing in it changes nothing either.
    expect(inReadersLanguage(items, (key) => key).every((item, i) => item === items[i])).toBe(true);
  });

  it("carries the pictures the search draws, all of them files the apps ship", async () => {
    // 1.8, r3-12: the saints by their faces, the top result over its picture.
    // (Until then an empty search opened on the first eight prayer rows,
    // which this test held; it opens on the library's doors now.)
    const items = await fullCorpus();
    const pictured = items.filter((i) => i.picture);
    expect(pictured.filter((i) => i.group === "Saints").length).toBeGreaterThan(100);
    for (const item of pictured) {
      expect(item.picture!.startsWith("/"), item.id).toBe(true);
      expect(fs.existsSync(path.join("public", item.picture!)), `${item.id}: ${item.picture}`).toBe(true);
    }
    expect(items.find((i) => i.href === "/theology")?.picture).toBe("/discover/tiles/theology.v2.webp");
  });

  it("names the prayer book's rules as the prayer book does, in every language", async () => {
    const rules = (await fullCorpus()).filter((i) => i.id.startsWith("rule-"));
    expect(rules.length).toBeGreaterThan(10);
    expect(rules.filter((i) => i.labelKey).length).toBeGreaterThan(10);
    const greek = inReadersLanguage(rules, (key) => (el as Record<string, string>)[key] ?? key);
    const morning = greek.find((i) => i.id === "rule-morning");
    expect(morning?.label).toBe((el as Record<string, string>)["prayers.rule.morning.title"]);
  });
});
