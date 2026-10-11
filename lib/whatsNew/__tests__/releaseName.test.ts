import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReleaseDetails } from "@/components/whats-new/ReleaseDetails";
import { releaseBody } from "@/lib/email/templates/contentBodies";
import { ENTRIES, type Entry } from "@/lib/whatsNew/entries";
import {
  PATCH_NOTE_COLUMNS,
  PATCH_NOTE_COLUMNS_NAMED,
  rowToEntry,
  withNameColumn,
  type PatchNoteRow,
} from "@/lib/whatsNew/notes";
import { PatchNoteInput, describeChange, emDashField } from "@/lib/whatsNew/patchNoteShape";
import {
  NAME_ONE_LINE,
  RELEASE_NAME_MAX,
  nameToWrite,
  ownsName,
  proposedName,
  releaseName,
  versionLabel,
  withReleaseNames,
} from "@/lib/whatsNew/releaseName";

/**
 * A release's name, held.
 *
 * A release may go by a name beside its number, and no release before 1.6
 * has one. So the half of this file that matters most is the half about
 * nothing: a name that is absent, empty or only spaces must leave a release
 * drawn, emailed and saved exactly as it was before there were names. The
 * other half is the name itself: short, one line, written on the release's
 * own note and carried by its patches.
 *
 * The versions here are scratch ones (9.1), and so is the name. No release
 * that exists is named by this file.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const EM_DASH = String.fromCharCode(0x2014);
const LINE_BREAK = String.fromCharCode(10);
const TAB = String.fromCharCode(9);
// Marks nobody sees: the line and paragraph separators, and the ones that
// turn the reading direction of whatever follows them. Built from their
// numbers, so none of them sits in this file.
const UNSEEN_MARKS = [
  0x2028, 0x2029, 0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
].map((code) => String.fromCharCode(code));

const html = (entry: Entry) => renderToStaticMarkup(createElement(ReleaseDetails, { entry }));

describe("a name, as a note carries it", () => {
  const base = { version: "9.1", date: "2026-10-01" };

  it("is optional: absent, empty and only spaces are all no name", () => {
    expect(PatchNoteInput.parse(base).name).toBe("");
    expect(PatchNoteInput.parse({ ...base, name: "" }).name).toBe("");
    expect(PatchNoteInput.parse({ ...base, name: "     " }).name).toBe("");
  });

  it("is kept trimmed", () => {
    expect(PatchNoteInput.parse({ ...base, name: "  Lamplight  " }).name).toBe("Lamplight");
  });

  it("is short, measured after the trim", () => {
    const longest = "x".repeat(RELEASE_NAME_MAX);
    expect(PatchNoteInput.parse({ ...base, name: longest }).name).toBe(longest);
    expect(PatchNoteInput.parse({ ...base, name: `  ${longest}  ` }).name).toBe(longest);
    expect(PatchNoteInput.safeParse({ ...base, name: `${longest}x` }).success).toBe(false);
    // Short enough to sit beside a number: a sentence is a headline, not a name.
    expect(RELEASE_NAME_MAX).toBeLessThanOrEqual(40);
  });

  it("is one line of plain text", () => {
    expect(PatchNoteInput.safeParse({ ...base, name: `Lamp${LINE_BREAK}light` }).success).toBe(false);
    expect(PatchNoteInput.safeParse({ ...base, name: `Lamp${TAB}light` }).success).toBe(false);
    expect(PatchNoteInput.safeParse({ ...base, name: 7 }).success).toBe(false);
    expect(NAME_ONE_LINE.test("Lamplight")).toBe(true);
    expect(NAME_ONE_LINE.test("")).toBe(true);
  });

  it("has something to read: a name of only unseen characters is refused", () => {
    // A zero width space, a word joiner and a soft hyphen survive the trim.
    for (const code of [0x200b, 0x2060, 0x00ad]) {
      const unseen = String.fromCharCode(code);
      const which = `U+${code.toString(16)}`;
      expect(PatchNoteInput.safeParse({ ...base, name: unseen }).success, which).toBe(false);
      expect(PatchNoteInput.safeParse({ ...base, name: `Lamp${unseen}light` }).success, which).toBe(true);
    }
    expect(PatchNoteInput.safeParse({ ...base, name: "..." }).success).toBe(false);
    expect(PatchNoteInput.safeParse({ ...base, name: "40" }).success).toBe(true);
  });

  it("carries no unseen mark that breaks the line or turns the reading direction", () => {
    for (const mark of UNSEEN_MARKS) {
      const which = `U+${mark.charCodeAt(0).toString(16)}`;
      expect(NAME_ONE_LINE.test(`Lamp${mark}light`), which).toBe(false);
      expect(PatchNoteInput.safeParse({ ...base, name: `Lamp${mark}light` }).success, which).toBe(false);
    }
    // Letters are plain text in any script, read in either direction.
    expect(NAME_ONE_LINE.test(String.fromCharCode(0x0646, 0x0648, 0x0631))).toBe(true);
    expect(NAME_ONE_LINE.test(`Caf${String.fromCharCode(0xe9)}`)).toBe(true);
  });

  it("may not carry an em dash, and the editor is told which field does", () => {
    const note = PatchNoteInput.parse({ ...base, name: `Lamp ${EM_DASH} light` });
    expect(emDashField(note)).toBe("name");
    expect(emDashField(PatchNoteInput.parse({ ...base, name: "Lamplight" }))).toBeNull();
  });

  it("is a field the review queue names when it changes", () => {
    const before = PatchNoteInput.parse(base);
    expect(describeChange(before, { ...before, name: "Lamplight" })).toBe("Claude changed the name in 9.1");
    // A proposal filed before names existed has none, and that is not a change.
    expect(describeChange(before, PatchNoteInput.parse({ ...base, name: "  " }))).toBeNull();
  });
});

describe("the name a version goes by", () => {
  const notes = [
    { version: "9.1.2" },
    { version: "9.1.1", name: "Not this one" },
    { version: "9.1", name: "Lamplight" },
    { version: "9.0.1" },
    { version: "9.0", name: "   " },
    { version: "8.4" },
  ];

  it("is its own, on a release", () => {
    expect(releaseName("9.1", notes)).toBe("Lamplight");
  });

  it("is its release's, on a patch", () => {
    expect(releaseName("9.1.2", notes)).toBe("Lamplight");
    // A name written on a patch is not that patch's name. The release's is.
    expect(releaseName("9.1.1", notes)).toBe("Lamplight");
  });

  it("is nothing when the release has none: absent, empty, only spaces, or no such note", () => {
    expect(releaseName("8.4", notes)).toBe("");
    expect(releaseName("9.0", notes)).toBe("");
    expect(releaseName("9.0.1", notes)).toBe("");
    expect(releaseName("7.2.1", notes)).toBe("");
    expect(releaseName("9.1", [{ version: "9.1", name: null }])).toBe("");
  });

  it("is written on a release's note and never on a patch's", () => {
    expect(ownsName("9.1")).toBe(true);
    expect(ownsName("9.1.2")).toBe(false);
    // The Beta series numbered the same way, with a word in front.
    expect(ownsName("Beta 2.4")).toBe(true);
    expect(ownsName("Beta 2.4.1")).toBe(false);
    expect(ownsName("")).toBe(false);
  });

  it("reads beside the number as one label, and leaves the number alone when there is none", () => {
    expect(versionLabel("9.1", "Lamplight")).toBe("9.1 Lamplight");
    expect(versionLabel("9.1", "  Lamplight ")).toBe("9.1 Lamplight");
    expect(versionLabel("9.1")).toBe("9.1");
    expect(versionLabel("9.1", "")).toBe("9.1");
    expect(versionLabel("9.1", "    ")).toBe("9.1");
    expect(versionLabel("9.1", null)).toBe("9.1");
  });

  it("is stamped on every note that shows it, and only on those", () => {
    const out = withReleaseNames(notes);
    expect(out.map((n) => [n.version, n.name ?? ""])).toEqual([
      ["9.1.2", "Lamplight"],
      ["9.1.1", "Lamplight"],
      ["9.1", "Lamplight"],
      ["9.0.1", ""],
      ["9.0", ""],
      ["8.4", ""],
    ]);
    // Nothing is copied for a note whose name does not change.
    expect(out[2]).toBe(notes[2]);
    expect(out[3]).toBe(notes[3]);
    expect(out[5]).toBe(notes[5]);
    expect("name" in out[5]).toBe(false);
  });
});

describe("what a write puts in the name column", () => {
  it("never mentions the column for a note with no name, so the save cannot depend on it", () => {
    expect(nameToWrite({ version: "9.1" })).toBeUndefined();
    expect(nameToWrite({ version: "9.1", name: "" })).toBeUndefined();
    expect(nameToWrite({ version: "9.1", name: "   " })).toBeUndefined();
    // A row read from a table without the column has no name at all.
    expect(nameToWrite({ version: "9.1", name: "" }, {})).toBeUndefined();
    expect(nameToWrite({ version: "9.1", name: "" }, { name: "" })).toBeUndefined();
    expect(nameToWrite({ version: "9.1", name: "" }, null)).toBeUndefined();
  });

  it("sends a name there is to keep", () => {
    expect(nameToWrite({ version: "9.1", name: " Lamplight " })).toBe("Lamplight");
    expect(nameToWrite({ version: "9.1", name: "Lamplight" }, { name: "An older one" })).toBe("Lamplight");
  });

  it("sends an empty one only to take off a name the row holds", () => {
    expect(nameToWrite({ version: "9.1", name: "" }, { name: "Lamplight" })).toBe("");
  });

  it("keeps no name on a patch", () => {
    expect(nameToWrite({ version: "9.1.2", name: "Lamplight" })).toBeUndefined();
    expect(nameToWrite({ version: "9.1.2", name: "Lamplight" }, { name: "A stray one" })).toBe("");
  });
});

describe("a proposal waiting in the review queue", () => {
  // As the queue holds one filed before names existed: no `name` key at all.
  const old = { version: "9.1", kind: "A lamp", date: "2026-10-01", title: "", blurb: "Reworded.", items: [] };
  const prior = { name: "Lamplight" };

  it("keeps the release's name when it says nothing about the name", () => {
    // The parsed copy cannot tell: the default has already filled the name in.
    expect(PatchNoteInput.parse(old).name).toBe("");
    expect(proposedName(old, prior)).toBe("Lamplight");
    expect(nameToWrite({ version: "9.1", name: proposedName(old, prior) }, prior)).toBe("Lamplight");
  });

  it("takes the name off only when it says so", () => {
    expect(proposedName({ ...old, name: "" }, prior)).toBe("");
    expect(proposedName({ ...old, name: "   " }, prior)).toBe("");
    expect(nameToWrite({ version: "9.1", name: proposedName({ ...old, name: "" }, prior) }, prior)).toBe("");
  });

  it("gives the name it does say, trimmed", () => {
    expect(proposedName({ ...old, name: " Harbour " }, prior)).toBe("Harbour");
    expect(proposedName({ ...old, name: "Harbour" })).toBe("Harbour");
  });

  it("has no name to keep on a new note, or from a table with no name column", () => {
    expect(proposedName(old)).toBe("");
    expect(proposedName(old, null)).toBe("");
    expect(proposedName(old, {})).toBe("");
    // So accepting it still never mentions the column.
    expect(nameToWrite({ version: "9.1", name: proposedName(old, {}) }, {})).toBeUndefined();
  });

  it("is read that way where it is accepted", () => {
    const route = fs.readFileSync(path.join(ROOT, "app/api/admin/patch-notes/actions/route.ts"), "utf8");
    expect(route).toContain("name: proposedName(rev.after, prior)");
  });
});

describe("a table that may not have the name column yet", () => {
  const rows = [{ version: "9.1" }];

  it("names the column only in the second list", () => {
    expect(PATCH_NOTE_COLUMNS.split(", ")).not.toContain("name");
    expect(PATCH_NOTE_COLUMNS_NAMED).toBe(`${PATCH_NOTE_COLUMNS}, name`);
  });

  it("is asked once when it has the column", async () => {
    const asked: string[] = [];
    const out = await withNameColumn(async (columns) => {
      asked.push(columns);
      return { data: [{ version: "9.1", name: "Lamplight" }], error: null };
    });
    expect(asked).toEqual([PATCH_NOTE_COLUMNS_NAMED]);
    expect(out.named).toBe(true);
    expect(out.data).toEqual([{ version: "9.1", name: "Lamplight" }]);
  });

  it("is asked again without the name when the column is missing, however that is reported", async () => {
    const reports = [
      { code: "42703", message: "column patch_notes.name does not exist" },
      { code: "PGRST204", message: "Could not find the 'name' column of 'patch_notes' in the schema cache" },
    ];
    for (const error of reports) {
      const asked: string[] = [];
      const out = await withNameColumn(async (columns) => {
        asked.push(columns);
        return columns === PATCH_NOTE_COLUMNS ? { data: rows, error: null } : { data: null, error };
      });
      expect(asked, error.code).toEqual([PATCH_NOTE_COLUMNS_NAMED, PATCH_NOTE_COLUMNS]);
      expect(out.named, error.code).toBe(false);
      expect(out.error, error.code).toBeNull();
      expect(out.data, error.code).toEqual(rows);
    }
  });

  it("is not asked twice for any other failure", async () => {
    const error = { code: "PGRST205", message: "Could not find the table 'public.patch_notes' in the schema cache" };
    const asked: string[] = [];
    const out = await withNameColumn(async (columns) => {
      asked.push(columns);
      return { data: null, error };
    });
    expect(asked).toEqual([PATCH_NOTE_COLUMNS_NAMED]);
    expect(out.named).toBe(false);
    expect(out.error).toBe(error);
  });

  it("hands back the refusal when the write itself carried a name", async () => {
    // The second try drops the name from what is read back, not from what is
    // written, so a row that carries one is still refused, and says so.
    const error = { code: "PGRST204", message: "Could not find the 'name' column of 'patch_notes' in the schema cache" };
    const out = await withNameColumn(async () => ({ data: null, error }));
    expect(out.named).toBe(false);
    expect(out.error).toBe(error);
  });

  it("gives a reader the entry it always gave when a row has no name", () => {
    const row: PatchNoteRow = {
      id: "1",
      version: "9.1",
      kind: "A lamp",
      date: "2026-10-01",
      title: "",
      blurb: "What changed.",
      items: ["A plain line."],
      status: "published",
      published_at: null,
      updated_at: "",
      updated_by_email: null,
    };
    const bare = { version: "9.1", kind: "A lamp", date: "October 1, 2026", blurb: "What changed.", items: ["A plain line."] };
    expect(rowToEntry(row)).toEqual(bare);
    expect("name" in rowToEntry(row)).toBe(false);
    expect("name" in rowToEntry({ ...row, name: "" })).toBe(false);
    expect("name" in rowToEntry({ ...row, name: "   " })).toBe(false);
    expect(rowToEntry({ ...row, name: " Lamplight " })).toEqual({ ...bare, name: "Lamplight" });
  });
});

describe("what a reader sees on /whats-new", () => {
  const entry: Entry = {
    version: "9.1",
    kind: "A lamp",
    date: "October 1, 2026",
    blurb: "What changed.",
    items: ["A plain line."],
  };
  // The number's span as it has always been written: the number and nothing after it.
  const numberAlone = (version: string) =>
    `<span class="font-sans text-body font-bold text-paper tracking-[-0.01em]">${version}</span>`;

  it("draws a release with no name exactly as before: absent, empty and only spaces", () => {
    const bare = html(entry);
    expect(bare).toContain(numberAlone("9.1"));
    expect(html({ ...entry, name: "" })).toBe(bare);
    expect(html({ ...entry, name: "     " })).toBe(bare);
  });

  it("draws every committed release that has no name with its number alone", () => {
    const shown = withReleaseNames(ENTRIES);
    const unnamed = shown.filter((e) => !e.name);
    // Every release before names began is one of these, so the loop is never empty.
    expect(unnamed.length).toBeGreaterThan(0);
    for (const e of unnamed) expect(html(e), e.version).toContain(numberAlone(e.version));
  });

  it("draws the name beside the number, in the number's own span", () => {
    const out = html({ ...entry, name: "  Lamplight " });
    expect(out).toMatch(/>9\.1(?:<!-- -->)? (?:<!-- -->)?<span class="[^"]*">Lamplight<\/span><\/span>/);
    expect(out).not.toContain(numberAlone("9.1"));
    // The headline and the summary are where they were.
    expect(out).toContain(">A lamp</span>");
    expect(out).toContain("What changed.");
  });

  it("draws a patch with its release's name", () => {
    const [patch, release] = withReleaseNames([{ ...entry, version: "9.1.2" }, { ...entry, name: "Lamplight" }]);
    expect(html(patch)).toMatch(/>9\.1\.2(?:<!-- -->)? (?:<!-- -->)?<span class="[^"]*">Lamplight<\/span>/);
    expect(html(release)).toMatch(/>9\.1(?:<!-- -->)? (?:<!-- -->)?<span class="[^"]*">Lamplight<\/span>/);
  });

  it("draws a name as text, whatever is in it", () => {
    const out = html({ ...entry, name: "<b>Salt & Light</b>" });
    expect(out).toContain("&lt;b&gt;Salt &amp; Light&lt;/b&gt;");
    expect(out).not.toContain("<b>");
  });
});

describe("the release email", () => {
  const note = { version: "9.1", kind: "A lamp", blurb: "What changed." };

  it("calls a release with no name by its number alone, as every letter so far", () => {
    for (const name of [undefined, "", "    "]) {
      const body = releaseBody({ ...note, name });
      expect(body.subject).toBe("Purify 9.1: A lamp");
      expect(body.heading).toBe("Purify 9.1");
    }
    const bare = releaseBody({ version: "9.1.2", kind: "", blurb: "", name: "  " });
    expect(bare.subject).toBe("Purify 9.1.2");
    expect(bare.paragraphs).toEqual(["What changed in Purify 9.1.2 is on the What's New page."]);
  });

  it("calls a named release by its number and its name, wherever it says the number", () => {
    const body = releaseBody({ ...note, name: " Lamplight " });
    expect(body.subject).toBe("Purify 9.1 Lamplight: A lamp");
    expect(body.heading).toBe("Purify 9.1 Lamplight");
    // The headline stays the line under the heading.
    expect(body.deck).toBe("A lamp");
    const bare = releaseBody({ version: "9.1", kind: "", blurb: "", name: "Lamplight" });
    expect(bare.subject).toBe("Purify 9.1 Lamplight");
    expect(bare.paragraphs).toEqual(["What changed in Purify 9.1 Lamplight is on the What's New page."]);
  });
});

describe("the committed notes", () => {
  it("name a release on its own entry, within the rules, and never a patch", () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data/changelog/entries.json"), "utf8"),
    ) as Record<string, unknown>[];
    for (const e of raw) {
      if (!("name" in e)) continue;
      const version = String(e.version);
      expect(typeof e.name, `name on ${version}`).toBe("string");
      const name = e.name as string;
      // No name is no key. An empty one is a leftover, and so is a padded one.
      expect(name.length, `${version} has an empty name: leave the key out`).toBeGreaterThan(0);
      expect(name, `name on ${version}`).toBe(name.trim());
      expect(name.length, `name on ${version}`).toBeLessThanOrEqual(RELEASE_NAME_MAX);
      expect(NAME_ONE_LINE.test(name), `name on ${version}`).toBe(true);
      expect(name, `name on ${version}`).not.toContain(EM_DASH);
      expect(ownsName(version), `${version} is a patch: it goes by its release's name`).toBe(true);
    }
  });
});

describe("scripts/patch-notes.mjs, which cannot import TypeScript", () => {
  const script = fs.readFileSync(path.join(ROOT, "scripts/patch-notes.mjs"), "utf8");

  it("holds names to the same length", () => {
    const m = script.match(/const NAME_MAX = (\d+);/);
    expect(m, "NAME_MAX not found in scripts/patch-notes.mjs").toBeTruthy();
    expect(Number(m![1])).toBe(RELEASE_NAME_MAX);
  });

  it("holds names to the same plain line", () => {
    // The four classes NAME_ONE_LINE refuses, spelled the same way in both files.
    const classes = "\\p{Cc}\\p{Zl}\\p{Zp}\\p{Bidi_Control}";
    expect(NAME_ONE_LINE.source).toContain(classes);
    expect(script).toContain(`/[${classes}]/u.test(after.name)`);
  });

  it("carries the name both ways: proposed with the note, and pulled back into the file", () => {
    const fields = script.match(/const FIELDS = (\[[^\]]*\]);/);
    expect(fields, "FIELDS not found in scripts/patch-notes.mjs").toBeTruthy();
    expect(JSON.parse(fields![1])).toContain("name");
    const pull = script.slice(script.indexOf('if (cmd === "pull")'));
    expect(pull).toContain("...(name ? { name } : {})");
  });
});
