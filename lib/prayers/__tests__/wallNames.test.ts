import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import evening from "@/data/prayers/rules/evening.json";
import midday from "@/data/prayers/rules/midday.json";
import morning from "@/data/prayers/rules/morning.json";
import { LOCALES } from "@/lib/i18n/locales";
import { MY_RULE_IDS } from "@/lib/prayers/myRule";
import { getRuleMeta } from "@/lib/prayers/rules";
import type { Prayer } from "@/lib/prayers/types";
import { PRAYER_INTENTION_MAX } from "@/lib/profile/server";
import {
  WALL_CAP,
  WALL_COMMEMORATION,
  WALL_DAYS,
  WALL_FOR,
  WALL_FOR_LABEL,
  WALL_INTENTION_MAX,
  WALL_NAMES_REVIEW,
  WALL_RULE_PART,
  WALL_TAG,
  activeWallName,
  addWallName,
  cleanWallNames,
  commemorate,
  isWallRow,
  markWallPrayed,
  mergeWallNames,
  moveWallName,
  parseWallNames,
  unmarkWallPrayed,
  wallFromRow,
  wallId,
  wallLine,
  wallNamesFor,
  wallPartOf,
  wallPlacement,
  wallToRow,
  type WallName,
} from "@/lib/prayers/wallNames";

// The names a reader carries from the prayer wall into their own prayers
// (1.7.1): what is kept, where the section stands in a rule, the Church's
// words it uses, and how the list travels between devices.

const ROOT = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const catalog = (code: string) => JSON.parse(read("lib", "i18n", "messages", `${code}.json`)) as Record<string, string>;
const EM_DASH = String.fromCharCode(0x2014);
const DAY = 86_400_000;

const T0 = new Date("2026-10-18T09:00:00.000Z");
const at = (days: number, hours = 0) => new Date(T0.getTime() + days * DAY + hours * 3_600_000);

const MARIA = { id: wallId("maria", "2026-10-17T20:00:00.000Z"), name: "Maria", intention: "For my mother's surgery on Thursday" };
const IOANN = { id: wallId("ioann", "2026-10-16T08:30:00.000Z"), name: "Ioann", intention: null };

describe("a request's id on the reader's side", () => {
  it("is the same for the same request, and never the handle", () => {
    const a = wallId("maria", "2026-10-17T20:00:00.000Z");
    expect(wallId("Maria", "2026-10-17T20:00:00Z")).toBe(a);
    expect(a).not.toContain("maria");
    // Asked again, a new request: a new id.
    expect(wallId("maria", "2026-10-18T20:00:00.000Z")).not.toBe(a);
    expect(wallId("marie", "2026-10-17T20:00:00.000Z")).not.toBe(a);
  });

  it("is a version-4 uuid, which the account's own list and the sync route require", () => {
    for (const id of [MARIA.id, IOANN.id, wallId("x", "not a date")]) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(z.string().uuid().safeParse(id).success, id).toBe(true);
    }
  });
});

describe("adding someone to the reader's prayers", () => {
  it("keeps the name as shown and the words of the request, and nothing else", () => {
    const [n] = addWallName([], MARIA, "evening", T0);
    expect(Object.keys(n).sort()).toEqual(["addedAt", "changedAt", "doneAt", "for", "id", "intention", "name", "until"]);
    expect(n).toMatchObject({ id: MARIA.id, name: "Maria", intention: MARIA.intention, for: "evening", doneAt: null });
    expect(Date.parse(n.until) - Date.parse(n.addedAt)).toBe(WALL_DAYS * DAY);
  });

  it("holds a name and the words to their limits, on one line", () => {
    const [n] = addWallName([], { id: MARIA.id, name: `  ${"N".repeat(200)} `, intention: `  For   my\nfather  ${"a".repeat(300)}` }, "today", T0);
    expect([...n.name].length).toBe(80);
    expect([...(n.intention ?? "")].length).toBe(WALL_INTENTION_MAX);
    expect(n.intention).toMatch(/^For my father a+$/);
  });

  it("refuses a request with no name or a malformed id", () => {
    expect(addWallName([], { ...MARIA, name: "   " }, "today", T0)).toEqual([]);
    expect(addWallName([], { ...MARIA, id: "maria" }, "today", T0)).toEqual([]);
  });

  it("adds a request again from now, and moves one to other prayers without new days", () => {
    let list = addWallName([], MARIA, "morning", T0);
    list = markWallPrayed(list, [MARIA.id], at(1));
    expect(activeWallName(list, MARIA.id, at(1).getTime())).toBeNull();
    list = addWallName(list, MARIA, "midday", at(2));
    expect(list).toHaveLength(1);
    expect(activeWallName(list, MARIA.id, at(2).getTime())).toMatchObject({ for: "midday", addedAt: at(2).toISOString() });
    const moved = moveWallName(list, MARIA.id, "evening", at(3));
    expect(moved[0]).toMatchObject({ for: "evening", addedAt: at(2).toISOString(), changedAt: at(3).toISOString() });
  });

  it("leaves after its days, and then is gone from the device", () => {
    const list = addWallName([], MARIA, "today", T0);
    expect(activeWallName(list, MARIA.id, at(WALL_DAYS, -1).getTime())).not.toBeNull();
    expect(activeWallName(list, MARIA.id, at(WALL_DAYS, 1).getTime())).toBeNull();
    expect(cleanWallNames(list, at(WALL_DAYS, 1).getTime())).toEqual([]);
  });

  it("keeps a handful at most, those still waiting first", () => {
    let list: WallName[] = [];
    for (let i = 0; i < WALL_CAP + 5; i++) list = addWallName(list, { id: wallId(`r${i}`, T0.toISOString()), name: `R${i}` }, "today", at(0, i / 100));
    expect(list).toHaveLength(WALL_CAP);
    const done = markWallPrayed(list, [list[0].id], at(1));
    expect(cleanWallNames(done, at(1).getTime()).at(-1)?.id).toBe(list[0].id);
  });
});

describe("where the names wait", () => {
  const list = [
    ...addWallName([], MARIA, "morning", T0),
    ...addWallName([], IOANN, "today", at(0, 1)),
    ...addWallName([], { id: wallId("anna", T0.toISOString()), name: "Anna" }, "evening", at(0, 2)),
  ];
  const opened = at(0, 3).getTime();
  const names = (ruleId: string) => wallNamesFor(list, ruleId, opened, opened).map((n) => n.name);

  it("in the prayers chosen, the reader's own included, and in whichever comes next for today", () => {
    expect(names("morning")).toEqual(["Maria", "Ioann"]);
    expect(names(MY_RULE_IDS.morning)).toEqual(["Maria", "Ioann"]);
    expect(names("midday")).toEqual(["Ioann"]);
    expect(names("evening")).toEqual(["Ioann", "Anna"]);
    expect(names(MY_RULE_IDS.evening)).toEqual(["Ioann", "Anna"]);
  });

  it("and in no other prayer", () => {
    for (const id of ["compline", "creed", "first-hour", "sixth-hour", "before-sleep", "upon-waking", "theotokos"]) {
      expect(wallPartOf(id), id).toBeNull();
      expect(names(id), id).toEqual([]);
    }
  });

  it("names rules that exist", () => {
    for (const id of Object.keys(WALL_RULE_PART)) {
      expect(Boolean(getRuleMeta(id)) || Object.values(MY_RULE_IDS).includes(id), id).toBe(true);
    }
  });

  it("leave once marked prayed, but stay on the page they were marked on", () => {
    const prayed = markWallPrayed(list, [IOANN.id], at(0, 4));
    // On the page open since before the mark: still there, marked.
    const here = wallNamesFor(prayed, "morning", opened, at(0, 5).getTime());
    expect(here.map((n) => [n.name, Boolean(n.doneAt)])).toEqual([["Maria", false], ["Ioann", true]]);
    // In prayers opened after it, gone.
    const later = at(0, 6).getTime();
    expect(wallNamesFor(prayed, "evening", later, later).map((n) => n.name)).toEqual(["Anna"]);
    // The mark taken back: waiting again.
    const undone = unmarkWallPrayed(prayed, [IOANN.id], at(0, 7));
    expect(wallNamesFor(undone, "evening", later, later).map((n) => n.name)).toEqual(["Ioann", "Anna"]);
  });
});

describe("where the section stands in a rule", () => {
  const ids = (prayers: { id: string }[]) => prayers.map((p) => p.id);

  it("just before the dismissal in the morning, midday and evening rules", () => {
    for (const rule of [morning, midday, evening] as { id: string; prayers: Prayer[] }[]) {
      const at = wallPlacement(rule.prayers);
      expect(ids(rule.prayers)[at], rule.id).toBe("dismissal");
      expect(at, rule.id).toBe(rule.prayers.length - 1);
    }
  });

  it("after the reader's own names in their own rule, else before a dismissal it carries, else at the end", () => {
    const step = (id: string, origin?: string): Prayer => ({ id, title: id, ...(origin ? { origin: { ruleId: "morning", prayerId: origin } } : {}) });
    expect(wallPlacement([step("morning--trisagion", "trisagion"), step("names"), step("morning--dismissal", "dismissal")])).toBe(2);
    expect(wallPlacement([step("morning--trisagion", "trisagion"), step("morning--dismissal", "dismissal")])).toBe(1);
    expect(wallPlacement([step("morning--trisagion", "trisagion"), step("morning--creed", "creed")])).toBe(2);
    expect(wallPlacement([])).toBe(0);
  });
});

describe("the Church's words for it", () => {
  const hapgood = read("docs", "editorial", "ingest-review", "hapgood-divine-liturgy.md");

  it("are Hapgood's, verbatim, where the Office of Oblation commemorates the living by name", () => {
    expect(hapgood).toContain("Isabel Florence Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church. Houghton Mifflin, Boston, 1906. Public domain.");
    const page = hapgood.slice(hapgood.indexOf("### Page 113"), hapgood.indexOf("### Page 114"));
    expect(page).toContain("74 THE DIVINE LITURGY");
    const rubric = "Then,he maketh mention, by name, of the living who are to be prayed for, if\nany such there be; and at each name he taketh out a particle, saying:\n";
    expect(page).toContain(`${rubric}${WALL_COMMEMORATION.text}\n`);
    expect(hapgood.indexOf("I. THE OFFICE OF OBLATION")).toBeLessThan(hapgood.indexOf("### Page 113"));
    expect(WALL_COMMEMORATION.source).toContain("Hapgood");
    expect(WALL_COMMEMORATION.source).toContain("p. 74");
  });

  it("give each name the edition's N.", () => {
    expect(commemorate("Maria")).toBe("Call to remembrance, O Lord, Maria.");
    expect(commemorate("  Fr. John Jr. ")).toBe("Call to remembrance, O Lord, Fr. John Jr.");
    // A name is set as written, never read as a pattern.
    expect(commemorate("$& $1")).toBe("Call to remembrance, O Lord, $& $1.");
  });

  it("stand above a line of ours with the name and the request's words, set in as written", () => {
    const en = catalog("en");
    expect(wallLine(en["prayers.wall.alsoFor"], "Maria", "For my mother")).toBe("I also pray for Maria, for their intention: “For my mother”");
    expect(wallLine(en["prayers.wall.also"], "Ioann", null)).toBe("I also pray for Ioann, for their intention.");
    // A stranger's words are never read as a pattern, nor as a placeholder.
    expect(wallLine(en["prayers.wall.alsoFor"], "{intention} $&", "$' rent")).toBe("I also pray for {intention} $&, for their intention: “$' rent”");
  });

  it("are the only words of the section not ours, and ours are marked for a future clergy review", () => {
    expect(WALL_NAMES_REVIEW.status).toBe("awaiting-clergy-review");
    expect(read("docs", "editorial-standards.md")).toContain("WALL_NAMES_REVIEW");
  });
});

describe("in the reader's own account", () => {
  const list = markWallPrayed(addWallName(addWallName([], MARIA, "evening", T0), IOANN, "today", at(0, 1)), [IOANN.id], at(0, 2));

  it("each name is a row of their list of the living, marked so the diptychs never show it", () => {
    for (const n of list) {
      const row = wallToRow(n);
      expect(isWallRow(row.tags)).toBe(true);
      expect(row.tags).toContain(WALL_TAG);
      for (const tag of row.tags) expect(tag.length, tag).toBeLessThanOrEqual(50);
      expect(wallFromRow({ id: row.id, name: row.name, note: row.note, tags: row.tags, added_at: row.addedAt })).toEqual(n);
    }
    // The reader's own names are left alone.
    expect(wallFromRow({ id: MARIA.id, name: "Maria", note: null, tags: ["family"], added_at: T0.toISOString() })).toBeNull();
    expect(isWallRow([])).toBe(false);
    expect(isWallRow(null)).toBe(false);
  });

  it("the later change wins, so a name prayed for on one device leaves on the others, and an undo comes back", () => {
    const here = addWallName([], MARIA, "evening", T0);
    const there = markWallPrayed(here, [MARIA.id], at(0, 5));
    expect(mergeWallNames(here, there, at(0, 6).getTime())[0].doneAt).toBe(at(0, 5).toISOString());
    const undone = unmarkWallPrayed(there, [MARIA.id], at(0, 7));
    expect(mergeWallNames(there, undone, at(0, 8).getTime())[0].doneAt).toBeNull();
    // A device that never had it learns of it.
    expect(mergeWallNames([], there, at(0, 6).getTime()).map((n) => n.id)).toEqual([MARIA.id]);
  });

  it("a stored list that is not well formed is read as what it can be", () => {
    expect(parseWallNames(null)).toEqual([]);
    expect(parseWallNames("not json")).toEqual([]);
    expect(parseWallNames(JSON.stringify({ a: 1 }))).toEqual([]);
    const raw = JSON.stringify([...list, { id: "x" }, null, 3, { ...list[0], for: "noon" }]);
    expect(parseWallNames(raw, at(0, 3).getTime())).toEqual(cleanWallNames(list, at(0, 3).getTime()));
  });
});

describe("the words the reader sees", () => {
  const KEYS = [
    "community.wallIntentionLabel",
    "community.wallIntentionPlaceholder",
    "community.wallIntentionHint",
    "community.wallNoLinks",
    "community.wallAdd",
    "community.wallInMyPrayers",
    "community.wallAddWhen",
    "community.wallForToday",
    "community.wallForTodayHint",
    "community.wallAddNote",
    "community.wallAdded",
    "community.wallTakeOut",
    "community.wallTakenOut",
    "prayers.wall.title",
    "prayers.wall.also",
    "prayers.wall.alsoFor",
    "prayers.wall.left",
    "mod.prayerRequest",
    "mod.action.remove_request_words",
    ...Object.values(WALL_FOR_LABEL),
  ];

  it("are in all 21 languages, with no em dash and every placeholder kept", () => {
    expect(LOCALES).toHaveLength(21);
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of KEYS) {
        expect(typeof m[key] === "string" && m[key].trim().length > 0, `${code} ${key}`).toBe(true);
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
      expect(m["prayers.wall.also"], code).toContain("{name}");
      expect(m["prayers.wall.alsoFor"], code).toContain("{name}");
      expect(m["prayers.wall.alsoFor"], code).toContain("{intention}");
    }
  });

  it("offer every choice, and say the days as the model keeps them: a week", () => {
    expect([...WALL_FOR].sort()).toEqual(["evening", "midday", "morning", "today"]);
    expect(Object.keys(WALL_FOR_LABEL).sort()).toEqual([...WALL_FOR].sort());
    expect(WALL_DAYS).toBe(7);
    expect(catalog("en")["community.wallAddNote"]).toContain("for a week");
  });

  it("keep the request's words to the limit the server and the column keep", () => {
    expect(WALL_INTENTION_MAX).toBe(PRAYER_INTENTION_MAX);
    const sql = read("docs", "1.8-build", "sql", "prayer-request-intention.sql");
    expect(sql).toContain(`char_length(prayer_request_intention) <= ${PRAYER_INTENTION_MAX}`);
    // Run by the owner's hand, never by a merge.
    expect(fs.existsSync(path.join(ROOT, "supabase", "migrations"))).toBe(true);
    expect(fs.readdirSync(path.join(ROOT, "supabase", "migrations")).some((f) => f.includes("prayer_request_intention"))).toBe(false);
  });
});
