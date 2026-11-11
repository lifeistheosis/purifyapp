import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HELPLINES_URL } from "@/lib/campaigns/safety";
import { CARE_KIND, CARE_LINKS, careParts } from "@/lib/community/careNote";
import { fromPurify } from "@/lib/community/inbox";
import { notificationTarget, campaignNoticeHref } from "@/lib/community/notificationTarget";
import { getMessages } from "@/lib/i18n";

/**
 * The care note (call 26, his yes of 2026-11-11): a notice a moderator may
 * send, by hand, to a writer whose words may mean they are in danger.
 *
 * What would go wrong if this broke: a reader in danger is handed a number
 * they cannot tap, or a number cut in half ("116" opening one line and "123"
 * nothing), or a language without the help at all; or the database refuses
 * the note because the kind list in its SQL drifted from the list it replaces,
 * and a kind that was allowed yesterday is refused tomorrow.
 */

const ROOT = process.cwd();
const LANGUAGES = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"] as const;

const words = (code: (typeof LANGUAGES)[number]) => getMessages(code) as Record<string, string>;
const links = (text: string) => careParts(text).filter((p): p is { text: string; href: string } => typeof p !== "string");

describe("careParts: the help in the note, as things a phone can open", () => {
  it("finds all three in the English note, in order, and loses no word", () => {
    const note = words("en")["community.careNote"];
    const parts = careParts(note);
    expect(parts.map((p) => (typeof p === "string" ? p : p.text)).join("")).toBe(note);
    expect(links(note)).toEqual([
      { text: "988", href: "tel:988" },
      { text: "116 123", href: "tel:116123" },
      { text: "findahelpline.com", href: HELPLINES_URL },
    ]);
  });

  it("opens the help site over https, and each number as a call", () => {
    for (const l of CARE_LINKS) expect(l.href).toMatch(/^(tel:\d+|https:\/\/)/);
    expect(HELPLINES_URL.startsWith("https://")).toBe(true);
  });

  it("never cuts 116 123, and never lights a piece of a longer number", () => {
    expect(links("call 116 123 now")).toEqual([{ text: "116 123", href: "tel:116123" }]);
    expect(links("ring 19880 or 9881")).toEqual([]);
    expect(links("ring 1116 1234")).toEqual([]);
    expect(links("no help named here")).toEqual([]);
    expect(careParts("")).toEqual([]);
  });
});

describe("the note in every language", () => {
  it("names each piece of help exactly once, so each one can be tapped, and is signed", () => {
    for (const code of LANGUAGES) {
      const m = words(code);
      const note = m["community.careNote"];
      expect(typeof note === "string" && note.trim().length > 0, `${code} careNote`).toBe(true);
      expect(links(note).map((l) => l.href).sort(), code).toEqual([HELPLINES_URL, "tel:116123", "tel:988"].sort());
      expect(m["community.careSign"]?.trim().length, `${code} careSign`).toBeGreaterThan(0);
      expect(m["community.careSign"], code).toContain("Purify");
    }
  });

  it("has no dash in anything a reader sees", () => {
    for (const code of LANGUAGES) {
      const m = words(code);
      for (const k of ["community.careNote", "community.careSign"]) {
        expect(m[k], `${code} ${k}`).not.toMatch(/[–—]/);
      }
    }
  });
});

describe("where the note stands, and what it opens", () => {
  const care = { kind: CARE_KIND, post_id: null, reply_id: null, actor_handle: null, target_kind: null } as const;

  it("is Purify's, never another reader's", () => {
    expect(fromPurify({ kind: "care" })).toBe(true);
  });

  it("opens nothing as a whole row, so the help inside it is what a finger finds", () => {
    expect(notificationTarget(care as Parameters<typeof notificationTarget>[0]).kind).toBe("none");
    expect(campaignNoticeHref(care as Parameters<typeof campaignNoticeHref>[0])).toBeNull();
  });
});

/** The kinds a `community_notifications_kind_check` in this SQL allows. */
function kindsOf(sql: string): string[] {
  const at = sql.lastIndexOf("add constraint community_notifications_kind_check");
  expect(at, "the SQL adds the kind check").toBeGreaterThanOrEqual(0);
  const list = /kind in \(([^)]*)\)/.exec(sql.slice(at));
  expect(list, "the check lists its kinds").not.toBeNull();
  return [...list![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

/** Where the care note's SQL is: waiting in docs/1.9-build/sql, or, after his yes, in supabase/migrations. */
function careSql(): { path: string; sql: string } {
  const waiting = join(ROOT, "docs/1.9-build/sql/care-note.sql");
  if (existsSync(waiting)) return { path: waiting, sql: readFileSync(waiting, "utf8") };
  const dir = join(ROOT, "supabase/migrations");
  const name = readdirSync(dir).find((f) => /^\d{14}_care_note\.sql$/.test(f));
  expect(name, "the care note's SQL is in docs/1.9-build/sql or supabase/migrations").toBeDefined();
  return { path: join(dir, name!), sql: readFileSync(join(dir, name!), "utf8") };
}

describe("the care note's SQL", () => {
  it("allows exactly the removal notice's kinds and one more, care", () => {
    const removal = readFileSync(join(ROOT, "supabase/migrations/20261110204814_removal_notices.sql"), "utf8");
    const before = kindsOf(removal);
    expect(before).toContain("removed");
    expect(kindsOf(careSql().sql)).toEqual([...before, CARE_KIND]);
  });

  it("can run twice, and reads no row already in the table", () => {
    const { sql } = careSql();
    const statements = sql.replace(/--.*$/gm, "");
    expect(statements).toMatch(/drop constraint if exists community_notifications_kind_check;/);
    expect(statements).toMatch(/\)\s*not valid;/);
    // It changes the check and nothing else.
    expect(statements).not.toMatch(/\b(insert|update|delete|truncate|grant|revoke|create)\b/i);
  });

  it("is never undone: a migration that redefines the kinds after it keeps every one of them", () => {
    const { path, sql } = careSql();
    const kinds = kindsOf(sql);
    const dir = join(ROOT, "supabase/migrations");
    const later = readdirSync(dir)
      .filter((f) => f.endsWith(".sql") && f > "20261110204814_removal_notices.sql")
      .filter((f) => !path.startsWith(dir) || f > path.slice(dir.length + 1))
      .filter((f) => readFileSync(join(dir, f), "utf8").includes("add constraint community_notifications_kind_check"));
    for (const f of later) {
      const theirs = kindsOf(readFileSync(join(dir, f), "utf8"));
      expect(kinds.filter((k) => !theirs.includes(k)), `${f} drops a kind the care note's SQL allows`).toEqual([]);
    }
  });
});
