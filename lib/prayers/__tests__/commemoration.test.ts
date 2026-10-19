import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import compline from "@/data/prayers/hours/compline.json";
import firstHour from "@/data/prayers/hours/first-hour.json";
import evening from "@/data/prayers/rules/evening.json";
import midday from "@/data/prayers/rules/midday.json";
import morning from "@/data/prayers/rules/morning.json";
import { LOCALES } from "@/lib/i18n/locales";
import {
  COMMEMORATION_REVIEW,
  DEFAULT_PLACES,
  DEPARTED_PRAYER,
  LIVING_KEY,
  PLACE_LABEL,
  PLACE_RULES,
  PRAY_PLACES,
  cleanPlaces,
  commemorationPlacement,
  departedPrayer,
  parsePlacesSetting,
  placeOf,
  togglePlace,
  wallLine,
} from "@/lib/prayers/commemoration";
import { getHour } from "@/lib/prayers/hours";
import { MY_RULE_IDS } from "@/lib/prayers/myRule";
import { getRuleMeta } from "@/lib/prayers/rules";
import type { Prayer } from "@/lib/prayers/types";

// "Those I pray for" in the prayers (1.7.1): the reader's diptychs and the
// names from the prayer wall, in the prayers the reader chooses, before the
// dismissal; the Church's words over the departed, ours over the living.

const ROOT = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const catalog = (code: string) => JSON.parse(read("lib", "i18n", "messages", `${code}.json`)) as Record<string, string>;
const EM_DASH = String.fromCharCode(0x2014);

describe("the prayers that can carry the list", () => {
  it("are the ones the owner named, each a real prayer of the app", () => {
    expect([...PRAY_PLACES]).toEqual(["morning", "midday", "evening", "hours", "compline", "mine"]);
    for (const place of PRAY_PLACES) {
      expect(PLACE_RULES[place].length, place).toBeGreaterThan(0);
      for (const id of PLACE_RULES[place]) {
        expect(Boolean(getRuleMeta(id)) || Boolean(getHour(id)) || Object.values(MY_RULE_IDS).includes(id), `${place}: ${id}`).toBe(true);
        expect(placeOf(id), id).toBe(place);
      }
    }
    for (const id of ["creed", "before-sleep", "upon-waking", "pre-communion", "theotokos", "intercessory"]) expect(placeOf(id), id).toBeNull();
  });

  it("start as the morning and evening prayers and the reader's own rule, and keep the reader's choice, none included", () => {
    expect([...DEFAULT_PLACES]).toEqual(["morning", "evening", "mine"]);
    expect(parsePlacesSetting(null)).toEqual(["morning", "evening", "mine"]);
    expect(parsePlacesSetting("not json")).toEqual(["morning", "evening", "mine"]);
    expect(parsePlacesSetting(JSON.stringify({ v: 1, places: ["compline", "noon", "hours", "hours"] }))).toEqual(["hours", "compline"]);
    expect(parsePlacesSetting(JSON.stringify({ v: 1, places: [] }))).toEqual([]);
    expect(cleanPlaces("morning")).toBeNull();
    expect(togglePlace(["morning", "mine"], "evening")).toEqual(["morning", "evening", "mine"]);
    expect(togglePlace(["morning", "mine"], "morning")).toEqual(["mine"]);
  });

  it("are named as the app already names each prayer, in every language", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const place of PRAY_PLACES) expect(m[PLACE_LABEL[place]]?.trim(), `${code} ${PLACE_LABEL[place]}`).toBeTruthy();
    }
  });
});

describe("where the list stands in a prayer", () => {
  const step = (id: string, origin?: string): Prayer => ({ id, title: id, ...(origin ? { origin: { ruleId: "morning", prayerId: origin } } : {}) });

  it("just before the dismissal of the morning, midday and evening prayers, the Hours and Compline", () => {
    for (const rule of [morning, midday, evening, firstHour, compline] as { id: string; prayers: Prayer[] }[]) {
      const { index, replaces } = commemorationPlacement(rule.prayers);
      expect(rule.prayers[index]?.id, rule.id).toBe("dismissal");
      expect(replaces, rule.id).toBe(false);
    }
  });

  it("in the reader's own rule, where they set Those I pray for, else before a dismissal it carries, else at the end", () => {
    expect(commemorationPlacement([step("morning--trisagion", "trisagion"), step("names"), step("morning--dismissal", "dismissal")])).toEqual({ index: 1, replaces: true });
    expect(commemorationPlacement([step("morning--trisagion", "trisagion"), step("morning--dismissal", "dismissal")])).toEqual({ index: 1, replaces: false });
    expect(commemorationPlacement([step("morning--creed", "creed")])).toEqual({ index: 1, replaces: false });
  });
});

describe("the words over the departed", () => {
  const hapgood = read("docs", "editorial", "ingest-review", "hapgood-divine-liturgy.md");
  const page = (n: number) => hapgood.slice(hapgood.indexOf(`### Page ${n}\n`), hapgood.indexOf(`### Page ${n + 1}\n`));

  it("are the Church's own prayer, word for word as Hapgood prints it", () => {
    const at = page(130);
    // The litany it belongs to, and whose it is.
    expect(at).toContain("And if there be offerings on behalf of\nthe dead, the Deacon or the Priest\nshall say the following Litany:");
    const start = at.indexOf("The Priest, secretly.\n");
    const end = at.indexOf("and thy word is\ntrue.") + "and thy word is\ntrue.".length;
    expect(start).toBeGreaterThan(0);
    // The litany's response marks fall between its lines in the scan's reading
    // order ("t&gt;)", "v^"): they are no part of the prayer.
    const words = at
      .slice(start + "The Priest, secretly.\n".length, end)
      .split("\n")
      .filter((line) => line !== "t&gt;)" && line !== "v^")
      .join(" ");
    expect(DEPARTED_PRAYER.lines.join(" ")).toBe(words);
  });

  it("are cited by the edition's own page, the scan's page less the Liturgy's offset", () => {
    // The scan's page 113 is printed 74 (the Office of Oblation): the same
    // offset makes its page 130 the printed 91.
    expect(page(113)).toContain("74 THE DIVINE LITURGY");
    expect(130 - (113 - 74)).toBe(91);
    expect(DEPARTED_PRAYER.source).toBe("Hapgood, Service Book (1906), the Divine Liturgy, the litany for the departed, p. 91");
  });

  it("take the reader's departed where the edition prints NN., as written", () => {
    const lines = departedPrayer(["Eleni", " Georgios "]);
    expect(lines[1]).toBe(
      "Do thou, the same Lord, give rest to the souls of thy departed servants, Eleni, Georgios, in a place of brightness, a place of verdure, a place of repose, whence all sickness, sorrow and sighing have fled away.",
    );
    expect(lines.filter((l) => l.includes("NN."))).toEqual([]);
    expect(departedPrayer(["$& {name}"])[1]).toContain("servants, $& {name}, in a place");
  });
});

describe("the words over the living", () => {
  it("are ours, in the first person, in every language, attributed to no one", () => {
    const en = catalog("en")[LIVING_KEY];
    expect(en).toBe("Remember, O Lord, Thy servants for whom I pray, and have mercy on them.");
    expect(en).toMatch(/\bI pray\b/);
    for (const { code } of LOCALES) {
      const m = catalog(code);
      expect(m[LIVING_KEY]?.trim(), code).toBeTruthy();
      expect(m[LIVING_KEY].includes(EM_DASH), code).toBe(false);
    }
  });

  it("are no longer the priest's words at the Office of Oblation, which the owner set aside", () => {
    for (const file of ["lib/prayers/commemoration.ts", "lib/prayers/wallNames.ts", "components/prayers/service/CommemorationStep.tsx"]) {
      expect(read(file), file).not.toContain("Call to remembrance");
    }
  });

  it("stand over a line of ours under each name from the prayer wall, set in as written", () => {
    const en = catalog("en");
    expect(wallLine(en["prayers.wall.alsoFor"], "Maria", "For my mother")).toBe("I also pray for Maria, for their intention: “For my mother”");
    expect(wallLine(en["prayers.wall.also"], "Ioann", null)).toBe("I also pray for Ioann, for their intention.");
    expect(wallLine(en["prayers.wall.alsoFor"], "{intention} $&", "$' rent")).toBe("I also pray for {intention} $&, for their intention: “$' rent”");
  });
});

describe("what is ours is marked", () => {
  it("for a future clergy review, and the queue names the mark", () => {
    expect(COMMEMORATION_REVIEW.status).toBe("awaiting-clergy-review");
    const queue = read("docs", "editorial-standards.md");
    expect(queue).toContain("COMMEMORATION_REVIEW");
    expect(queue).not.toContain("WALL_NAMES_REVIEW");
  });

  it("and every line of it is in all 21 languages, with no em dash and every placeholder kept", () => {
    const KEYS = [
      LIVING_KEY,
      "prayers.commemorate.whereHint",
      "prayers.wall.also",
      "prayers.wall.alsoFor",
      "prayers.wall.left",
      "prayers.mine.names",
      "prayers.mine.namesInstruction",
      "prayers.mine.namesNone",
      "community.wallAddWhen",
    ];
    expect(LOCALES).toHaveLength(21);
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of KEYS) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
      expect(m["prayers.wall.alsoFor"], code).toContain("{intention}");
      // What the first build had and this one does not use.
      for (const gone of ["prayers.wall.title", "community.wallForToday", "community.wallForTodayHint"]) expect(m, `${code} ${gone}`).not.toHaveProperty(gone);
    }
  });
});
