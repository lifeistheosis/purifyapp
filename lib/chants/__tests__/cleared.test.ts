// Chant words as sung, cleared by their rights holder and switched on in the
// admin (build 86 note 78): "then make the system and add a button to the
// back end so I can switch it on when I receive clearance".

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { CLEARED_PUBLIC_COLUMNS, readCleared, readClearedList, timingFits, withCleared } from "@/lib/chants/cleared";
import { ChantWordsAction } from "@/lib/chants/clearedInput";
import type { Chant } from "@/lib/chants/types";

const MIGRATION = fs.readFileSync("supabase/migrations/20261101000000_chant_cleared_words.sql", "utf8");
const PUBLIC_READ = fs.readFileSync("lib/chants/cleared.server.ts", "utf8");
const PUBLIC_ROUTE = fs.readFileSync("app/api/chants/cleared/route.ts", "utf8");
const ADMIN_ROUTE = fs.readFileSync("app/api/admin/chant-words/route.ts", "utf8");

const timing = {
  v: 2 as const,
  durationSec: 30,
  made: { by: "whisper-small.en_timestamped (q8)", on: "2026-11-01" },
  lines: [
    { at: 1, end: 4, text: "O give thanks", words: [[1, 1.4], [1.4, 2.2], [2.2, 4]] as [number, number][] },
    { at: 4, end: 7, text: "Alleluia.", words: [[4, 7]] as [number, number][] },
  ],
};
const row = {
  chant_slug: "psalm-135",
  variant_id: "en",
  lines: [{ text: "O give thanks" }, { text: "Alleluia." }],
  timing,
  words_source: "The words as the choir sings them, shown with its leave.",
};

describe("the table", () => {
  const sql = MIGRATION.replace(/--.*$/gm, "");

  it("is read by anyone only while a row is switched on", () => {
    expect(sql).toMatch(/alter table public\.chant_cleared_words enable row level security/);
    expect(sql).toMatch(/for select\s+to anon, authenticated\s+using \(enabled\)/);
    // No policy lets the API keys write: the admin route's service role does.
    expect(sql).not.toMatch(/for (insert|update|delete|all)/);
  });

  it("gives readers the words and never the clearance record", () => {
    expect(sql).toMatch(/revoke all on table public\.chant_cleared_words from anon, authenticated;/);
    const grant = /grant select \(([^)]*)\)\s+on table public\.chant_cleared_words to anon, authenticated/.exec(sql);
    expect(grant).not.toBeNull();
    const columns = grant![1].split(",").map((c) => c.trim());
    for (const c of CLEARED_PUBLIC_COLUMNS.split(",").map((x) => x.trim())) expect(columns).toContain(c);
    for (const secret of ["cleared_by", "cleared_on", "clearance_reply", "updated_by_email"]) expect(columns).not.toContain(secret);
  });

  it("is switched on only with the clearance kept and the words and their timing entered", () => {
    expect(sql).toMatch(/enabled boolean not null default false/);
    expect(sql).toMatch(/not enabled\s+or \(/);
    for (const needed of ["cleared_by", "cleared_on", "clearance_reply", "words_source", "jsonb_array_length\\(lines\\) > 0", "timing is not null"]) {
      expect(sql).toMatch(new RegExp(`not enabled[\\s\\S]*${needed}`));
    }
  });
});

describe("the reads and the writes", () => {
  it("reads the public list with the anon key and no cookies, only the reader's columns, only what is on", () => {
    expect(PUBLIC_READ).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(PUBLIC_READ).toContain("getAll: () => []");
    expect(PUBLIC_READ).not.toMatch(/createAdminClient|SERVICE_ROLE/);
    expect(PUBLIC_READ).toContain(".select(CLEARED_PUBLIC_COLUMNS)");
    expect(PUBLIC_READ).toContain('.eq("enabled", true)');
    // Kept briefly at the edge, so a switch reaches every app within minutes.
    expect(PUBLIC_ROUTE).toMatch(/max-age=60/);
    expect(PUBLIC_ROUTE).toContain("OPTIONS = corsPreflight");
  });

  it("writes only through the admin route: the admin gate, a rate limit, zod and the service role", () => {
    expect(ADMIN_ROUTE).toContain("await getAdminUser()");
    expect(ADMIN_ROUTE).toMatch(/rateLimited\(`admin-chant-words-write:/);
    expect(ADMIN_ROUTE).toContain("ChantWordsAction.parse(");
    expect(ADMIN_ROUTE).toContain("createAdminClient()");
  });

  it("takes cleared words only with a clearance and a timing that is these words, line for line and word for word", () => {
    const save = {
      action: "save",
      slug: "psalm-135",
      variant: "en",
      lines: row.lines,
      timing,
      wordsSource: row.words_source,
      clearedBy: "The rights holder",
      clearedOn: "2026-11-20",
      reply: "Yes, you may show the words.",
    };
    expect(ChantWordsAction.safeParse(save).success).toBe(true);
    expect(ChantWordsAction.safeParse({ ...save, lines: [{ text: "O give thanks unto" }, { text: "Alleluia." }] }).success).toBe(false);
    expect(ChantWordsAction.safeParse({ ...save, reply: "" }).success).toBe(false);
    expect(ChantWordsAction.safeParse({ ...save, clearedOn: "soon" }).success).toBe(false);
    expect(ChantWordsAction.safeParse({ action: "switch", slug: "psalm-135", variant: "en", on: true }).success).toBe(true);
    expect(ChantWordsAction.safeParse({ action: "switch", slug: "../x", variant: "en", on: true }).success).toBe(false);
  });
});

describe("what a reader's app shows", () => {
  it("takes a row only when its words and timing check out", () => {
    const c = readCleared(row)!;
    expect(c).toMatchObject({ slug: "psalm-135", variant: "en", wordsSource: row.words_source });
    expect(c.lines.map((l) => l.text)).toEqual(["O give thanks", "Alleluia."]);
    expect(timingFits(c.lines, c.timing)).toBe(true);
    expect(readCleared({ ...row, lines: [{ text: "O give" }, { text: "Alleluia." }] })).toBeNull();
    expect(readCleared({ ...row, timing: { ...timing, lines: timing.lines.slice(0, 1) } })).toBeNull();
    expect(readCleared({ ...row, words_source: "" })).toBeNull();
    expect(readCleared({ ...row, chant_slug: "../etc" })).toBeNull();
    expect(readClearedList({ cleared: [row, row, { nonsense: true }] })).toHaveLength(1);
    expect(readClearedList(null)).toEqual([]);
  });

  it("shows the cleared words where they are on, and the carried words everywhere else", () => {
    const chant = JSON.parse(fs.readFileSync("data/chants/psalm-135.json", "utf8")) as Chant;
    expect(withCleared(chant, [])).toBe(chant);
    const shown = withCleared(chant, [readCleared(row)!]);
    const en = shown.variants.find((v) => v.id === "en")!;
    expect(en.lines.map((l) => l.text)).toEqual(["O give thanks", "Alleluia."]);
    expect(en.wordsSource).toBe(row.words_source);
    expect(en.clearedTiming?.lines.map((l) => l.text)).toEqual(["O give thanks", "Alleluia."]);
    // Every other version, untouched.
    for (const v of shown.variants.filter((x) => x.id !== "en")) expect(v).toBe(chant.variants.find((x) => x.id === v.id));
  });

  it("carries no cleared words in the repository: they arrive with the clearance, in the admin", () => {
    for (const f of fs.readdirSync("data/chants").filter((x) => x.endsWith(".json"))) {
      expect(fs.readFileSync(`data/chants/${f}`, "utf8")).not.toMatch(/clearance|"cleared/i);
    }
  });
});
