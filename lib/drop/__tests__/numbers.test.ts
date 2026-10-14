import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fillDrafts } from "../compose";
import type { Drop } from "../kit";
import { firstDayOf, numbersSql } from "../numbers";

/**
 * The first week's numbers: SQL the owner pastes into the production
 * database's editor himself. So it is held here to two things no reader of
 * it should have to take on trust: it only reads, and every table and column
 * it names is one a file in supabase/migrations creates, which the comment
 * above each part of it names.
 *
 * The migrations are read as files, with their comments taken out, so a
 * rollback written in a comment is never taken for a statement that ran.
 */

const MIGRATIONS = path.resolve(__dirname, "..", "..", "..", "supabase", "migrations");
const FILES = fs
  .readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const statements = (file: string) => fs.readFileSync(path.join(MIGRATIONS, file), "utf8").replace(/--.*$/gm, "");

/** The columns the migrations give a table, in the order they run: created with it, added, and not dropped since. */
function tableOf(table: string): { createdIn: string[]; columns: Set<string> } {
  const createdIn: string[] = [];
  const columns = new Set<string>();
  for (const file of FILES) {
    const text = statements(file);
    const created = new RegExp(`create table (?:if not exists )?public\\.${table}\\s*\\(([\\s\\S]*?)\\r?\\n\\);`, "i").exec(text);
    if (created) {
      createdIn.push(file);
      for (const line of created[1].split(/\r?\n/)) {
        const name = /^\s*([a-z_][a-z0-9_]*)\s/i.exec(line)?.[1]?.toLowerCase();
        if (name && !["primary", "unique", "check", "constraint", "foreign", "exclude"].includes(name)) columns.add(name);
      }
    }
    const altered = new RegExp(`alter table (?:only )?(?:if exists )?public\\.${table}\\s+(add|drop) column (?:if (?:not )?exists )?([a-z_][a-z0-9_]*)`, "gi");
    for (const [, how, column] of text.matchAll(altered)) {
      if (how.toLowerCase() === "add") columns.add(column.toLowerCase());
      else columns.delete(column.toLowerCase());
    }
  }
  return { createdIn, columns };
}

/** The SQL as Postgres reads its names: no comments, and every quoted text made empty. */
const bare = (sql: string) => sql.replace(/--.*$/gm, "").replace(/'(?:[^']|'')*'/g, "''");

function made(over: Partial<Drop> = {}): Drop {
  return fillDrafts({
    release: "9.1",
    version: "9.1",
    covers: ["9.1"],
    name: "A lamp",
    line: "The largest release yet.",
    closing: "The library stays free.",
    links: { whatsNew: "https://purifyapp.net/whats-new", appStore: "https://apps.apple.com/app/id1", play: "https://play.google.com/store/apps/details?id=x" },
    hashtags: ["#orthodox"],
    notes: [{ version: "9.1", state: "accepted" }],
    builds: { android: { build: 7, served: null }, ios: { build: 3, served: null } },
    never: [],
    figures: [{ figure: "9.1", source: "the release's name" }],
    points: [{ id: "lamp", emoji: "🔥", name: "A lamp", text: "It burns through the night.", short: "A lamp for the night", from: [{ version: "9.1", has: "A lamp." }] }],
    also: [],
    pieces: [],
    ...over,
  }).drop;
}

/** The SQL for each way a week can start: from the note, from the drop day, from the announcement. */
function everyWeek(): [string, string][] {
  const told = made({ day: "2026-01-17" });
  const announcement = told.pieces.find((p) => p.id === "discord-announcement");
  if (announcement) announcement.sent = { on: "2026-01-19", by: "owner" };
  return [
    ["no day yet", numbersSql(made())],
    ["a drop day", numbersSql(made({ day: "2026-01-17" }))],
    ["an announcement on record", numbersSql(told)],
  ];
}

describe("the first week's numbers", () => {
  it.each(everyWeek())("only reads (%s)", (_name, sql) => {
    const read = bare(sql).trim();
    expect(read.startsWith("with ")).toBe(true);
    // One statement: a single semicolon, at the very end.
    expect(read.indexOf(";")).toBe(read.length - 1);
    const writes = /\b(insert|update|delete|merge|upsert|drop|alter|create|grant|revoke|truncate|copy|call|do|set|reset|notify|listen|perform|execute|prepare|vacuum|analyze|comment|lock|refresh|reindex|cluster|begin|commit|rollback|savepoint)\b/i;
    expect(read.match(writes)?.[0] ?? null).toBeNull();
    // No function that could write on its own: only these are called.
    const called = new Set([...read.matchAll(/\b([a-z_]+)\s*\(/gi)].map((m) => m[1].toLowerCase()));
    const allowed = new Set(["as", "select", "filter", "values", "lateral", "r", "count", "coalesce", "to_char", "max"]);
    expect([...called].filter((name) => !allowed.has(name))).toEqual([]);
  });

  it.each(everyWeek())("names only tables and columns the migrations create (%s)", (_name, sql) => {
    const read = bare(sql);
    const aliases = new Map<string, string>();
    for (const [, table, alias] of read.matchAll(/\bpublic\.([a-z_]+)\s+([a-z]+)\b/g)) {
      expect(aliases.get(alias) ?? table, `${alias} stands for one table`).toBe(table);
      aliases.set(alias, table);
    }
    expect(aliases.size).toBeGreaterThan(0);
    for (const [alias, table] of aliases) {
      const { createdIn, columns } = tableOf(table);
      expect(createdIn, `public.${table} is created in supabase/migrations`).not.toEqual([]);
      const used = [...read.matchAll(new RegExp(`\\b${alias}\\.([a-z_]+)\\b`, "g"))].map((m) => m[1]);
      expect(used.length, `${alias}, public.${table}, is read`).toBeGreaterThan(0);
      for (const column of used) expect(columns.has(column), `public.${table}.${column} is in supabase/migrations`).toBe(true);
      // The comment above the part that reads it names a migration that creates it.
      const named = [...sql.matchAll(/\d{14}_[a-z0-9_]+\.sql/g)].map((m) => m[0]);
      expect(named.some((file) => createdIn.includes(file)), `a comment names the migration that creates public.${table}`).toBe(true);
    }
  });

  it("puts the migration it relies on above each part that reads a table", () => {
    for (const [, sql] of everyWeek()) {
      const parts = sql.split(/\n(?=[a-z_]+ as \()/);
      for (const part of parts.filter((p) => /\bpublic\./.test(bare(p)))) {
        expect(part, part.split("\n")[0]).toMatch(/-- Relies on \d{14}_[a-z0-9_]+\.sql: public\./);
      }
    }
  });

  it("counts the drop's own week, from the best day it knows", () => {
    expect(firstDayOf(made())).toBeNull();
    expect(numbersSql(made())).toContain("from public.patch_notes pn");
    expect(numbersSql(made())).toContain("where pn.version = '9.1' and pn.status = 'published'");

    expect(firstDayOf(made({ day: "2026-01-17" }))).toEqual({ day: "2026-01-17", why: "the drop day" });
    expect(numbersSql(made({ day: "2026-01-17" }))).toContain("select date '2026-01-17' as first_day");
    expect(numbersSql(made({ day: "2026-01-17" }))).toContain("the seven days from Sat 17 Jan 2026, the drop day");

    const [, , [, told]] = everyWeek();
    expect(told).toContain("select date '2026-01-19' as first_day");
    expect(told).toContain("the day the announcement went out");
  });

  it("counts this release's email and no other", () => {
    const sql = numbersSql(made());
    expect(sql).toContain("s.referrer = 'purify-link://email-release-9.1'");
    expect(sql).toContain("es.dedupe_key like 'release:9.1:%'");
  });

  it("says what it cannot count, and where that is shown instead", () => {
    const sql = numbersSql(made());
    expect(sql).toContain("which version of Purify an app is on");
    expect(sql).toContain("Play Console");
    expect(sql).toContain("App Store Connect");
    expect(sql).not.toContain(String.fromCharCode(0x2014));
  });
});
