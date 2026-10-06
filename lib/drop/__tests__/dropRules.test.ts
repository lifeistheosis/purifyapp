import { describe, expect, it } from "vitest";

import { checkDrop, tally, type DropContext } from "../check";
import { fillDrafts, listOf, standardPieces, wholeNote } from "../compose";
import { CHANNELS, MOMENTS, length, pasted, pieceState, releaseOf, type Drop, type Piece } from "../kit";
import { pasteFiles, renderKit, renderMarkdown } from "../page";

/**
 * The rules of a drop, tried on a made-up release.
 *
 * The check is only worth trusting if it catches what it says it catches. So,
 * as purify-ads/ssm does for its own check: one clean drop that must pass
 * clean, then one fault planted at a time, each of which must be caught under
 * the rule it breaks. A rule added to lib/drop/check.ts gets a planted fault
 * here in the same sitting.
 */

const EM_DASH = String.fromCharCode(0x2014);

const NOTES: DropContext["entries"] = [
  {
    version: "9.1",
    kind: "A lamp, and a door that opens",
    blurb: "Purify 9.1 is the largest release yet.",
    items: [
      "A lamp. It burns through the night, and you can trim it.",
      { category: "library", text: "A reading room. Forty desks, each with its own light." },
      { category: "fixes", text: "The door opens. It used to stick in the damp." },
    ],
  },
  {
    version: "9.1.1",
    kind: "Lighter",
    blurb: "The same, lighter.",
    items: [{ category: "fixes", text: "The apps are lighter by half." }],
  },
];

function clean(): Drop {
  const drop: Drop = {
    release: "9.1",
    version: "9.1.1",
    covers: ["9.1", "9.1.1"],
    name: "A lamp, and a door that opens",
    line: "The largest release yet.",
    closing: "The library stays free.",
    links: { whatsNew: "https://purifyapp.net/whats-new", appStore: "https://apps.apple.com/app/id1", play: "https://play.google.com/store/apps/details?id=x" },
    hashtags: ["#orthodox", "#bible"],
    notes: [
      { version: "9.1", state: "accepted" },
      { version: "9.1.1", state: "accepted" },
    ],
    builds: { android: { build: 7, served: "2026-01-02" }, ios: { build: 3, served: null } },
    never: [{ word: "cellar", why: "it is not dug yet" }],
    figures: [{ figure: "9.1", source: "the release's name" }],
    points: [
      { id: "lamp", emoji: "🪔", name: "A lamp", text: "It burns through the night.", short: "A lamp for the night", from: [{ version: "9.1", has: "A lamp." }], email: true },
      { id: "room", emoji: "📖", name: "A reading room", text: "Forty desks, each with its own light.", short: "A reading room", from: [{ version: "9.1", has: "A reading room." }], email: true },
      { id: "light", emoji: "📱", name: "Lighter", text: "The apps are lighter.", short: "Lighter apps", from: [{ version: "9.1.1", has: "The apps are lighter" }], needs: "apps", email: true },
    ],
    also: [{ text: "The door opens.", from: { version: "9.1", has: "The door opens." } }],
    pieces: [],
  };
  return fillDrafts(drop).drop;
}

const EMAIL: NonNullable<DropContext["email"]> = {
  version: "9.1",
  points: clean()
    .points.filter((p) => p.email)
    .map(({ emoji, name, text }) => ({ emoji, name, text })),
};

const run = (drop: Drop, email: DropContext["email"] = EMAIL) => checkDrop(drop, { entries: NOTES, email });
const piece = (drop: Drop, id: string): Piece => {
  const found = drop.pieces.find((p) => p.id === id);
  if (!found) throw new Error(`the made-up drop has no ${id}`);
  return found;
};
const SENT = { on: "2026-01-03", by: "owner" };

describe("a clean drop", () => {
  it("passes with nothing to say", () => {
    expect(run(clean())).toEqual([]);
  });

  it("is drafted whole: every piece the list names, each in a known place and moment", () => {
    const drop = clean();
    expect(drop.pieces.map((p) => p.id)).toEqual(standardPieces(drop).map((p) => p.id));
    for (const p of drop.pieces) {
      expect(CHANNELS[p.channel], p.id).toBeTruthy();
      expect(MOMENTS, p.id).toContain(p.moment);
    }
    // In the order they go out.
    const order = drop.pieces.map((p) => MOMENTS.indexOf(p.moment));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("has a first draft for every place a store, a server or a caption will take", () => {
    const drop = clean();
    for (const id of ["play-whats-new", "appstore-whats-new", "appstore-promo", "discord-announcement", "discord-stores", "community-post", "instagram-caption", "tiktok-caption", "push", "letter", "board"]) {
      expect(piece(drop, id).text, id).toBeTruthy();
    }
    expect(length(piece(drop, "play-whats-new").text ?? "")).toBeLessThanOrEqual(500);
    // What only a store build has is said as the apps', after the line about the stores.
    const announcement = piece(drop, "discord-announcement").text ?? "";
    expect(announcement.indexOf("Lighter")).toBeGreaterThan(announcement.indexOf("once the stores approve"));
  });
});

/** One fault at a time: what is planted, and the rule that must catch it. */
const FAULTS: [string, string, (drop: Drop) => void, ("error" | "warn")?][] = [
  ["a point no note says", "D1.1", (d) => void (d.points[0].from = [{ version: "9.1", has: "A lantern." }])],
  ["a point from a note the drop does not cover", "D1.1", (d) => void (d.points[0].from = [{ version: "8.0", has: "A lamp." }])],
  ["a point with no source", "D1.1", (d) => void (d.points[0].from = [])],
  ["an eleventh point", "D1.1", (d) => void (d.points = Array.from({ length: 11 }, (_, i) => ({ ...d.points[0], id: `p${i}`, email: false })))],
  ["a point's name with a full stop", "D1.1", (d) => void (d.points[0].name = "A lamp.")],
  ["a point's line over its length", "D1.1", (d) => void (d.points[0].text = `${"word ".repeat(50)}end.`)],
  ["an also line no note says", "D1.1", (d) => void (d.also[0].from = { version: "9.1", has: "The window opens." })],
  ["a dark thing in a piece", "D1.2", (d) => void (piece(d, "discord-short").text += " The cellar is open.")],
  ["an em dash", "D1.3", (d) => void (piece(d, "community-post").text += ` A lamp ${EM_DASH} and a door.`)],
  ["an exclamation mark", "D1.3", (d) => void (piece(d, "discord-short").text += " Come and see!")],
  ["a clock on the reader", "D1.3", (d) => void (piece(d, "letter").text += " Hurry, it is the last chance.")],
  ["a voice that is not ours", "D1.4", (d) => void (piece(d, "letter").text += " I'm solo on this.")],
  ["a number that ages in a caption", "D1.5", (d) => void (piece(d, "tiktok-caption").text += " 5000 readers."), "warn"],
  ["a store text over its limit", "D2.1", (d) => void (piece(d, "play-whats-new").text = "a".repeat(501))],
  ["a title line over its limit", "D2.1", (d) => void (piece(d, "community-post").subject = "a".repeat(161))],
  ["an emoji where none goes", "D2.2", (d) => void (piece(d, "play-whats-new").text += " 🕯️")],
  ["a link in a caption", "D2.2", (d) => void (piece(d, "instagram-caption").text += " purifyapp.net")],
  ["six hashtags", "D2.2", (d) => void (piece(d, "tiktok-caption").text += " #a #b #c #d #e")],
  ["a line break on Instagram", "D2.2", (d) => void (piece(d, "instagram-caption").text += "\nA second paragraph.")],
  ["Android named to Apple", "D2.2", (d) => void (piece(d, "appstore-whats-new").text += " Also on Android.")],
  ["the App Store named to Google", "D2.2", (d) => void (piece(d, "play-whats-new").text += " Also on iPhone.")],
  ["a digit in a notification", "D2.3", (d) => void (piece(d, "push").subject = "Purify 9 is here")],
  ["a notification with no title", "D2.3", (d) => void delete piece(d, "push").subject],
  ["a point the release email words differently", "D2.4", (d) => void (d.points[1].text = "Forty desks.")],
  ["a point the release email does not have", "D2.4", (d) => void (d.points[2].email = false)],
  ["sent before the note was accepted", "D3.1", (d) => { d.notes[0].state = "queued"; piece(d, "discord-announcement").sent = SENT; }],
  ["a store post before that store serves the build", "D3.1", (d) => { const p = piece(d, "discord-stores"); p.store = "ios"; p.sent = SENT; }],
  ["sent while it still waits", "D3.1", (d) => { const p = piece(d, "discord-short"); p.waits = "a word"; p.sent = SENT; }],
  ["a send with no day", "D3.2", (d) => void (piece(d, "discord-short").sent = { on: "yesterday", by: "owner" })],
  ["a send by us with none of his words", "D3.2", (d) => void (piece(d, "discord-short").sent = { on: "2026-01-03", by: "Claude" })],
  ["two pieces with one id", "D3.3", (d) => void d.pieces.push({ ...piece(d, "discord-short") })],
  ["a place that is not one", "D3.3", (d) => void ((piece(d, "discord-short") as { channel: string }).channel = "billboard")],
  ["a piece with no words", "D3.3", (d) => void delete piece(d, "discord-short").text, "warn"],
  ["a build that is not the release's", "D4.1", (d) => void (d.version = "9.2")],
  ["a note that does not exist", "D4.1", (d) => void d.covers.push("9.1.7")],
  ["a note of this release left out", "D4.1", (d) => void (d.covers = ["9.1.1"]), "warn"],
  ["cards with no files and nothing to wait for", "D4.2", (d) => void delete piece(d, "cards").waits],
];

describe("a planted fault", () => {
  it.each(FAULTS)("%s is caught (%s)", (_name, rule, plant, level = "error") => {
    const drop = clean();
    plant(drop);
    const found = run(drop).filter((f) => f.rule === rule && f.level === level);
    expect(found.length, JSON.stringify(run(drop), null, 1)).toBeGreaterThan(0);
  });

  it("covers every rule the check has", () => {
    // A rule with no planted fault is a rule nobody has seen fire.
    const planted = new Set(FAULTS.map((f) => f[1]));
    expect([...planted].sort()).toEqual(["D1.1", "D1.2", "D1.3", "D1.4", "D1.5", "D2.1", "D2.2", "D2.3", "D2.4", "D3.1", "D3.2", "D3.3", "D4.1", "D4.2"]);
  });
});

describe("the release email", () => {
  it("warns, and refuses nothing, when it is still an older release's", () => {
    const found = run(clean(), { version: "9.0", points: [] });
    expect(found.map((f) => f.level)).toEqual(["warn"]);
    expect(found[0].rule).toBe("D2.4");
  });

  it("is not looked at when there is none to compare", () => {
    expect(run(clean(), null)).toEqual([]);
  });
});

describe("drafts", () => {
  it("never write over a piece somebody has written, sent or parked", () => {
    const drop = clean();
    piece(drop, "discord-short").text = "Mine.";
    delete piece(drop, "letter").text;
    piece(drop, "letter").waits = "the owner's own opening";
    delete piece(drop, "board").text;
    const { drop: again, added, filled } = fillDrafts(drop);
    expect(piece(again, "discord-short").text).toBe("Mine.");
    expect(piece(again, "letter").text).toBeUndefined();
    expect(added).toEqual([]);
    expect(filled).toEqual(["board"]);
  });

  it("set the whole note out from every line of every note covered", () => {
    const drop = clean();
    const note = wholeNote(drop, NOTES);
    for (const entry of NOTES) for (const item of entry.items) expect(note).toContain(typeof item === "string" ? item : item.text);
    expect(note).toContain("9.1 and 9.1.1 together.");
    // The plain lines lead, and fixes come first among the categories, as on the page.
    expect(note.indexOf("WHAT IS NEW")).toBeLessThan(note.indexOf("BUGS AND MAINTENANCE"));
    expect(note.indexOf("BUGS AND MAINTENANCE")).toBeLessThan(note.indexOf("LIBRARY EXPERIENCE"));
  });

  it("join a list the way a sentence does", () => {
    expect(listOf(["1.5"])).toBe("1.5");
    expect(listOf(["1.5", "1.5.1"])).toBe("1.5 and 1.5.1");
    expect(listOf(["1.5", "1.5.1", "1.5.2"])).toBe("1.5, 1.5.1 and 1.5.2");
  });
});

describe("a drop written out", () => {
  const drop = clean();
  const page = renderKit({ drop, findings: run(drop), entries: NOTES, made: "2026-01-01" });

  it("is a page for an artifact: a title, its own style, and no document skeleton", () => {
    expect(page.startsWith("<title>Purify Drop Kit</title>")).toBe(true);
    expect(page).not.toMatch(/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i);
    // Every colour is a token that both themes define.
    expect(page).toContain(':root[data-theme="light"]');
    expect(page).toContain("prefers-color-scheme:light");
    expect(page).not.toContain(EM_DASH);
  });

  it("carries every pasted piece once, with a button that copies it", () => {
    for (const p of drop.pieces.filter((x) => CHANNELS[x.channel].paste)) {
      expect(page, p.id).toContain(`id="t-${p.id}"`);
      expect(page, p.id).toContain(`data-copy="t-${p.id}"`);
    }
    // Words are escaped: a piece may hold anything a person can type.
    const sharp = clean();
    piece(sharp, "discord-short").text = "<script>alert(1)</script> & more";
    const out = renderKit({ drop: sharp, findings: [], entries: NOTES, made: "x" });
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; more");
    expect(out).not.toContain("<script>alert(1)");
  });

  it("says what the check found, and counts what is left", () => {
    const broken = clean();
    piece(broken, "discord-short").text += " Come and see!";
    const out = renderKit({ drop: broken, findings: run(broken), entries: NOTES, made: "x" });
    expect(out).toContain("1 refused by the check");
    expect(out).toContain("What the check found");
    expect(page).toContain("The check passes");
    const counts = tally(drop);
    expect(counts.sent + counts.waits + counts.ready + counts.empty).toBe(drop.pieces.length);
  });

  it("gives a text file for each pasted piece, numbered by its moment", () => {
    const files = pasteFiles(drop, NOTES);
    expect(files.map((f) => f.file)).toContain("2-submit--play-whats-new.txt");
    expect(files.find((f) => f.file.endsWith("--push.txt"))?.text).toBe(`${pasted(piece(drop, "push"))}\n`);
    expect(files.find((f) => f.file.endsWith("--notes-all.txt"))?.text).toContain("The door opens.");
  });

  it("reads the same twice, so a diff of drop.md is a diff of the drop", () => {
    expect(renderMarkdown(drop)).toBe(renderMarkdown(clean()));
    expect(renderMarkdown(drop)).toContain("### The announcement");
    expect(renderMarkdown(drop)).not.toContain(EM_DASH);
  });
});

describe("the small things", () => {
  it("counts characters as a person does", () => {
    // One flame and one letter. A count of UTF-16 units would say three.
    expect(length("🔥a")).toBe(2);
    expect(length("abc")).toBe(3);
  });

  it("knows a patch's release, and where a piece stands", () => {
    expect(releaseOf("1.5.2")).toBe("1.5");
    expect(releaseOf("1.5")).toBe("1.5");
    const drop = clean();
    expect(pieceState(piece(drop, "cards"))).toBe("waits");
    expect(pieceState(piece(drop, "notes-all"))).toBe("ready");
    expect(pieceState({ ...piece(drop, "push"), text: "" })).toBe("empty");
    expect(pieceState({ ...piece(drop, "push"), sent: SENT })).toBe("sent");
  });
});
