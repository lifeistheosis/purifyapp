import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { checkDrop } from "../check";
import { fillDrafts } from "../compose";
import { CURRENT_DROP, DROPS, DROP_RELEASE } from "../current";
import type { Drop } from "../kit";
import { dropKey, dueOn, liveDrop, readPlan, type DropRow } from "../live";

/**
 * The Drop tab's live state: the owner's own task rows laid over the file.
 *
 * What is held here is the part that can do harm quietly: a row read as the
 * wrong thing, another release's mark counted for this one, and a piece
 * marked as sent that the order of a drop does not allow yet.
 */

const NOTES = [
  { version: "9.1", kind: "A lamp", blurb: "The largest yet.", items: ["A lamp. It burns through the night."] },
  { version: "9.1.1", kind: "Lighter", blurb: "Lighter.", items: [{ category: "fixes" as const, text: "The apps are lighter." }] },
];

function made(): Drop {
  return fillDrafts({
    release: "9.1",
    version: "9.1.1",
    covers: ["9.1", "9.1.1"],
    name: "A lamp",
    line: "The largest release yet.",
    closing: "The library stays free.",
    links: { whatsNew: "https://purifyapp.net/whats-new", appStore: "https://apps.apple.com/app/id1", play: "https://play.google.com/store/apps/details?id=x" },
    hashtags: ["#orthodox"],
    notes: [
      { version: "9.1", state: "queued" },
      { version: "9.1.1", state: "written" },
    ],
    builds: { android: { build: 7, served: null }, ios: { build: 3, served: null } },
    never: [],
    figures: [{ figure: "9.1", source: "the release's name" }],
    points: [{ id: "lamp", emoji: "🔥", name: "A lamp", text: "It burns through the night.", short: "A lamp for the night", from: [{ version: "9.1", has: "A lamp." }] }],
    also: [],
    pieces: [],
  }).drop;
}

const row = (rule_key: string, over: Partial<DropRow> = {}): DropRow => ({ rule_key, due_on: "2026-01-10", status: "open", ...over });
const errorsFor = (drop: Drop, piece: string) =>
  checkDrop(drop, { entries: NOTES, email: null }).filter((f) => f.level === "error" && f.where === piece);

describe("reading the plan out of the task rows", () => {
  const drop = made();

  it("reads a moment's day, a piece that went out, a store that serves the build, and an update to come", () => {
    const plan = readPlan(drop, [
      row(dropKey.moment("9.1", "web"), { due_on: "2026-01-12" }),
      row(dropKey.piece("9.1", "discord-announcement"), { status: "done", done_at: "2026-01-12T15:04:05.000Z" }),
      row(dropKey.store("9.1", "android"), { status: "done", done_at: "2026-01-14T09:00:00.000Z" }),
      row(dropKey.update("9.2"), { title: "Saints of October", due_on: "2026-02-01", notes: "Profiles and icons." }),
    ]);
    expect(plan.moments).toEqual({ web: "2026-01-12" });
    expect(plan.done).toEqual({ "discord-announcement": { on: "2026-01-12", notes: null } });
    expect(plan.stores).toEqual({ android: "2026-01-14" });
    expect(plan.upcoming).toEqual([{ version: "9.2", title: "Saints of October", dueOn: "2026-02-01", notes: "Profiles and icons.", done: false }]);
    expect(dueOn(drop, plan, "discord-announcement")).toBe("2026-01-12");
    expect(dueOn(drop, plan, "push")).toBeNull();
  });

  it("counts nothing that is not this drop's", () => {
    const plan = readPlan(drop, [
      row(dropKey.piece("9.0", "discord-announcement"), { status: "done" }), // another release
      row(dropKey.piece("9.1", "no-such-piece"), { status: "done" }), // a piece the drop no longer has
      row("drop:9.1:m:someday", { due_on: "2026-01-12" }), // not a moment
      row("drop:9.1:s:windows", { status: "done" }), // not a store
      row("update:2026-W02", { status: "done" }), // the Calendar's own rule
      row("release:soon"), // not a version
      { rule_key: null, due_on: "2026-01-12", status: "done" }, // a task he wrote himself
    ]);
    expect(plan).toEqual({ moments: {}, done: {}, stores: {}, upcoming: [] });
  });

  it("does not count a piece as sent while its row is still open", () => {
    const plan = readPlan(drop, [row(dropKey.piece("9.1", "discord-short"), { status: "open" }), row(dropKey.store("9.1", "ios"), { status: "skipped" })]);
    expect(plan.done).toEqual({});
    expect(plan.stores).toEqual({});
  });

  it("lists the updates to come soonest first", () => {
    const plan = readPlan(drop, [row(dropKey.update("9.3"), { due_on: "2026-03-01" }), row(dropKey.update("9.2"), { due_on: "2026-02-01", status: "done" })]);
    expect(plan.upcoming.map((u) => [u.version, u.done])).toEqual([
      ["9.2", true],
      ["9.3", false],
    ]);
    expect(plan.upcoming[1].title).toBe("Purify 9.3");
  });
});

describe("the drop as it stands now", () => {
  const drop = made();
  const sentWeb = readPlan(drop, [row(dropKey.piece("9.1", "discord-announcement"), { status: "done", done_at: "2026-01-12T10:00:00Z" })]);
  const sentStore = readPlan(drop, [row(dropKey.piece("9.1", "discord-stores"), { status: "done", done_at: "2026-01-14T10:00:00Z" })]);

  it("takes What's New at its word about which notes are accepted, both ways", () => {
    expect(liveDrop(drop, readPlan(drop, []), ["9.1"]).notes.map((n) => n.state)).toEqual(["accepted", "written"]);
    const claimed = { ...drop, notes: [{ version: "9.1", state: "accepted" as const }, { version: "9.1.1", state: "written" as const }] };
    expect(liveDrop(claimed, readPlan(drop, []), ["8.0"]).notes[0].state).toBe("queued");
    // When the site could not be read, the file stands.
    expect(liveDrop(claimed, readPlan(drop, []), null).notes[0].state).toBe("accepted");
  });

  it("refuses an announcement marked before the note is showing, and lets it through once it is", () => {
    expect(errorsFor(liveDrop(drop, sentWeb, ["8.0"]), "discord-announcement").map((f) => f.rule)).toEqual(["D3.1"]);
    expect(errorsFor(liveDrop(drop, sentWeb, ["9.1"]), "discord-announcement")).toEqual([]);
  });

  it("refuses a store post before a store serves the build, and lets it through once one does", () => {
    expect(errorsFor(liveDrop(drop, sentStore, ["9.1"]), "discord-stores").map((f) => f.rule)).toEqual(["D3.1"]);
    const served = readPlan(drop, [
      row(dropKey.piece("9.1", "discord-stores"), { status: "done", done_at: "2026-01-14T10:00:00Z" }),
      row(dropKey.store("9.1", "ios"), { status: "done", done_at: "2026-01-14T08:00:00Z" }),
    ]);
    const now = liveDrop(drop, served, ["9.1"]);
    expect(now.builds.ios.served).toBe("2026-01-14");
    expect(errorsFor(now, "discord-stores")).toEqual([]);
  });

  it("never changes the file's own record of a send", () => {
    const recorded = { ...drop, pieces: drop.pieces.map((p) => (p.id === "discord-short" ? { ...p, sent: { on: "2026-01-11", by: "owner" } } : p)) };
    const plan = readPlan(recorded, [row(dropKey.piece("9.1", "discord-short"), { status: "done", done_at: "2026-01-20T10:00:00Z" })]);
    expect(liveDrop(recorded, plan, null).pieces.find((p) => p.id === "discord-short")?.sent).toEqual({ on: "2026-01-11", by: "owner" });
    // And the drop handed in is not touched.
    expect(drop.pieces.every((p) => !p.sent)).toBe(true);
  });
});

describe("the drops the panel can show", () => {
  const plans = path.resolve(__dirname, "..", "..", "..", "docs", "plans");

  it("carries every drop.json there is, as it is on disk", () => {
    const onDisk = fs
      .readdirSync(plans)
      .filter((d) => /^v\d+\.\d+$/.test(d) && fs.existsSync(path.join(plans, d, "drop.json")))
      .map((d) => d.slice(1));
    expect(Object.keys(DROPS).sort(), "name each release's drop.json in lib/drop/current.ts").toEqual(onDisk.sort());
    for (const release of onDisk) {
      expect(DROPS[release], release).toEqual(JSON.parse(fs.readFileSync(path.join(plans, `v${release}`, "drop.json"), "utf8")));
    }
  });

  it("offers the drop of the release this build is", () => {
    expect(CURRENT_DROP?.release ?? null).toBe(DROPS[DROP_RELEASE] ? DROP_RELEASE : null);
  });

  it("keeps a rule key inside what the Calendar's table and its route allow", () => {
    // admin_tasks.rule_key is unique text, and the planner route reads keys of 120 characters at most.
    for (const drop of Object.values(DROPS)) {
      for (const piece of drop.pieces) expect(dropKey.piece(drop.release, piece.id).length, piece.id).toBeLessThanOrEqual(120);
    }
  });
});
