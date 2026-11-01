import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { LOCALES } from "@/lib/i18n/locales";
import { PRAY_PLACES } from "@/lib/prayers/commemoration";
import { MY_RULE_IDS } from "@/lib/prayers/myRule";
import { PRAYER_INTENTION_MAX } from "@/lib/profile/server";
import {
  WALL_CAP,
  WALL_DAYS,
  WALL_INTENTION_MAX,
  WALL_TAG,
  activeWallName,
  addWallName,
  cleanWallNames,
  isWallRow,
  markWallPrayed,
  mergeWallNames,
  parseWallNames,
  setWallPlaces,
  unmarkWallPrayed,
  waitingWallNames,
  wallFromRow,
  wallId,
  wallLeavesText,
  wallNamesFor,
  wallToRow,
  type WallName,
} from "@/lib/prayers/wallNames";

// The names a reader carries from the prayer wall into their own prayers
// (1.7.1): what is kept, which prayers each waits in, when it leaves, and how
// the list travels between devices. Where they stand and the words over them
// are lib/prayers/__tests__/commemoration.test.ts.

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
  it("keeps the name as shown, the words of the request and the prayers chosen, and nothing else", () => {
    const [n] = addWallName([], MARIA, ["evening", "morning"], T0);
    expect(Object.keys(n).sort()).toEqual(["addedAt", "changedAt", "doneAt", "id", "intention", "name", "places", "until"]);
    expect(n).toMatchObject({ id: MARIA.id, name: "Maria", intention: MARIA.intention, places: ["morning", "evening"], doneAt: null });
    expect(Date.parse(n.until) - Date.parse(n.addedAt)).toBe(WALL_DAYS * DAY);
  });

  it("holds a name and the words to their limits, on one line", () => {
    const [n] = addWallName([], { id: MARIA.id, name: `  ${"N".repeat(200)} `, intention: `  For   my\nfather  ${"a".repeat(300)}` }, ["mine"], T0);
    expect([...n.name].length).toBe(80);
    expect([...(n.intention ?? "")].length).toBe(WALL_INTENTION_MAX);
    expect(n.intention).toMatch(/^For my father a+$/);
  });

  it("adds nothing with no name, a malformed id, or no prayer to wait in", () => {
    expect(addWallName([], { ...MARIA, name: "   " }, ["morning"], T0)).toEqual([]);
    expect(addWallName([], { ...MARIA, id: "maria" }, ["morning"], T0)).toEqual([]);
    expect(addWallName([], MARIA, [], T0)).toEqual([]);
  });

  it("adds a request again from now, and gives one other prayers without new days", () => {
    let list = addWallName([], MARIA, ["morning"], T0);
    list = markWallPrayed(list, [MARIA.id], at(1));
    expect(activeWallName(list, MARIA.id, at(1).getTime())).toBeNull();
    list = addWallName(list, MARIA, ["midday"], at(2));
    expect(list).toHaveLength(1);
    expect(activeWallName(list, MARIA.id, at(2).getTime())).toMatchObject({ places: ["midday"], addedAt: at(2).toISOString() });
    const moved = setWallPlaces(list, MARIA.id, ["compline", "hours"], at(3));
    expect(moved[0]).toMatchObject({ places: ["hours", "compline"], addedAt: at(2).toISOString(), changedAt: at(3).toISOString() });
    // Never into no prayer at all.
    expect(setWallPlaces(moved, MARIA.id, [], at(4))).toEqual(moved);
  });

  it("leaves after its days, and then is gone from the device", () => {
    const list = addWallName([], MARIA, ["morning"], T0);
    expect(activeWallName(list, MARIA.id, at(WALL_DAYS, -1).getTime())).not.toBeNull();
    expect(activeWallName(list, MARIA.id, at(WALL_DAYS, 1).getTime())).toBeNull();
    expect(cleanWallNames(list, at(WALL_DAYS, 1).getTime())).toEqual([]);
  });

  it("keeps a handful at most, those still waiting first", () => {
    let list: WallName[] = [];
    for (let i = 0; i < WALL_CAP + 5; i++) list = addWallName(list, { id: wallId(`r${i}`, T0.toISOString()), name: `R${i}` }, ["morning"], at(0, i / 100));
    expect(list).toHaveLength(WALL_CAP);
    const done = markWallPrayed(list, [list[0].id], at(1));
    expect(cleanWallNames(done, at(1).getTime()).at(-1)?.id).toBe(list[0].id);
  });
});

describe("which prayers a name waits in", () => {
  const list = [
    ...addWallName([], MARIA, ["morning", "mine"], T0),
    ...addWallName([], IOANN, [...PRAY_PLACES], at(0, 1)),
    ...addWallName([], { id: wallId("anna", T0.toISOString()), name: "Anna" }, ["evening"], at(0, 2)),
  ];
  const opened = at(0, 3).getTime();
  const names = (ruleId: string) => wallNamesFor(list, ruleId, opened, opened).map((n) => n.name);

  it("the ones chosen for it, the reader's own rule and the Hours included", () => {
    expect(names("morning")).toEqual(["Maria", "Ioann"]);
    expect(names(MY_RULE_IDS.morning)).toEqual(["Maria", "Ioann"]);
    expect(names(MY_RULE_IDS.evening)).toEqual(["Maria", "Ioann"]);
    expect(names("midday")).toEqual(["Ioann"]);
    expect(names("evening")).toEqual(["Ioann", "Anna"]);
    expect(names("third-hour")).toEqual(["Ioann"]);
    expect(names("compline")).toEqual(["Ioann"]);
  });

  it("and no other prayer", () => {
    for (const id of ["creed", "before-sleep", "upon-waking", "pre-communion"]) expect(names(id), id).toEqual([]);
  });

  it("leave once marked prayed, but stay on the page they were marked on", () => {
    const prayed = markWallPrayed(list, [IOANN.id], at(0, 4));
    // On the page open since before the mark: still there, marked.
    const here = wallNamesFor(prayed, "morning", opened, at(0, 5).getTime());
    expect(here.map((n) => [n.name, Boolean(n.doneAt)])).toEqual([["Maria", false], ["Ioann", true]]);
    // In prayers opened after it, gone, wherever else it was to wait.
    const later = at(0, 6).getTime();
    expect(wallNamesFor(prayed, "evening", later, later).map((n) => n.name)).toEqual(["Anna"]);
    expect(wallNamesFor(prayed, "compline", later, later)).toEqual([]);
    // The mark taken back: waiting again.
    const undone = unmarkWallPrayed(prayed, [IOANN.id], at(0, 7));
    expect(wallNamesFor(undone, "evening", later, later).map((n) => n.name)).toEqual(["Ioann", "Anna"]);
  });
});

describe("on the page of Your rule (the owner's note 73)", () => {
  // Read in Those I pray for for a week, and never shown where the names are kept.
  const list = addWallName(addWallName([], IOANN, ["morning"], T0), MARIA, ["evening", "mine"], at(2));

  it("lists those still waiting, the first to leave first, and none prayed for, taken out or out of days", () => {
    expect(waitingWallNames(list, at(3).getTime()).map((n) => n.name)).toEqual(["Ioann", "Maria"]);
    // Taken out (Remove here, or Take out on the wall): gone from the list, kept on the device.
    const out = markWallPrayed(list, [IOANN.id], at(3));
    expect(waitingWallNames(out, at(3, 1).getTime()).map((n) => n.name)).toEqual(["Maria"]);
    expect(out).toHaveLength(2);
    // Undo: back, until its own days are out, which are unchanged.
    const back = unmarkWallPrayed(out, [IOANN.id], at(3, 2));
    expect(waitingWallNames(back, at(3, 3).getTime()).map((n) => n.name)).toEqual(["Ioann", "Maria"]);
    expect(back.find((n) => n.id === IOANN.id)?.until).toBe(at(WALL_DAYS).toISOString());
    // A week on, Ioann's days are out; Maria, added two days later, waits on.
    expect(waitingWallNames(back, at(WALL_DAYS, 1).getTime()).map((n) => n.name)).toEqual(["Maria"]);
  });

  it("says the day each leaves as the reader's language writes a day", () => {
    const until = at(WALL_DAYS).toISOString();
    expect(until).toBe("2026-10-25T09:00:00.000Z");
    expect(wallLeavesText(until, "en", "UTC")).toBe("Oct 25");
    expect(wallLeavesText(until, "de", "UTC")).toBe("25. Okt.");
    // On the reader's own clock: late on the 24th in Honolulu, the 25th in London.
    expect(wallLeavesText("2026-10-25T05:00:00.000Z", "en", "Pacific/Honolulu")).toBe("Oct 24");
    expect(wallLeavesText("2026-10-25T05:00:00.000Z", "en", "Europe/London")).toBe("Oct 25");
    expect(wallLeavesText("not a date", "en")).toBe("");
  });

  it("are drawn on the page, with the day each leaves, and taken out with an Undo", () => {
    const src = read("components", "prayers", "Diptychs.tsx");
    expect(src).toContain("<WallSection />");
    expect(src).toContain("waitingWallNames(useWallNames())");
    expect(src).toContain('t("prayers.diptychs.wallUntil", { date: wallLeavesText(name.until, locale) })');
    expect(src).toContain("updateWallNames((list) => markWallPrayed(list, [name.id]))");
    expect(src).toContain("updateWallNames((list) => unmarkWallPrayed(list, [undo.id]))");
  });

  it("in words of every language", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      expect(m["prayers.diptychs.wallHeading"], code).toBeTruthy();
      expect(m["prayers.diptychs.wallUntil"], code).toContain("{date}");
      expect(m["prayers.diptychs.wallHeading"] + m["prayers.diptychs.wallUntil"], code).not.toContain(EM_DASH);
      if (code !== "en") expect(m["prayers.diptychs.wallHeading"], code).not.toBe(catalog("en")["prayers.diptychs.wallHeading"]);
    }
  });
});

describe("in the reader's own account", () => {
  const list = markWallPrayed(addWallName(addWallName([], MARIA, ["evening"], T0), IOANN, [...PRAY_PLACES], at(0, 1)), [IOANN.id], at(0, 2));

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

  it("reads an early build's single choice as the prayers it meant", () => {
    const row = wallToRow(list[0]);
    const early = row.tags.map((t) => (t.startsWith("places:") ? "for:today" : t));
    expect(wallFromRow({ ...row, tags: early, added_at: row.addedAt })?.places).toEqual(["morning", "midday", "evening", "mine"]);
    const stored = JSON.stringify([{ ...list[0], places: undefined, for: "evening" }]);
    expect(parseWallNames(stored, at(0, 3).getTime())[0].places).toEqual(["evening", "mine"]);
  });

  it("the later change wins, so a name prayed for on one device leaves on the others, and an undo comes back", () => {
    const here = addWallName([], MARIA, ["evening"], T0);
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
    const raw = JSON.stringify([...list, { id: "x" }, null, 3, { ...list[0], places: ["noon"] }]);
    expect(parseWallNames(raw, at(0, 3).getTime())).toEqual(cleanWallNames(list, at(0, 3).getTime()));
  });
});

describe("the words the reader sees on the wall", () => {
  const KEYS = [
    "community.wallIntentionLabel",
    "community.wallIntentionPlaceholder",
    "community.wallIntentionHint",
    "community.wallNoLinks",
    "community.wallAdd",
    "community.wallInMyPrayers",
    "community.wallAddWhen",
    "community.wallAddNote",
    "community.wallAdded",
    "community.wallTakeOut",
    "community.wallTakenOut",
    "mod.prayerRequest",
    "mod.action.remove_request_words",
  ];

  it("are in all 21 languages, with no em dash", () => {
    expect(LOCALES).toHaveLength(21);
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of KEYS) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
    }
  });

  it("say the days as the model keeps them: a week", () => {
    expect(WALL_DAYS).toBe(7);
    expect(catalog("en")["community.wallAddNote"]).toContain("for a week");
  });

  it("keep the request's words to the limit the server and the column keep", () => {
    expect(WALL_INTENTION_MAX).toBe(PRAYER_INTENTION_MAX);
    const sql = read("docs", "1.8-build", "sql", "prayer-request-intention.sql");
    expect(sql).toContain(`char_length(prayer_request_intention) <= ${PRAYER_INTENTION_MAX}`);
    // Run by the owner's hand, never by a merge.
    expect(fs.readdirSync(path.join(ROOT, "supabase", "migrations")).some((f) => f.includes("prayer_request_intention"))).toBe(false);
  });
});
