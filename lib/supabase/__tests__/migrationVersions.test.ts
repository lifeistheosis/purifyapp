// Every file in supabase/migrations carries a version of its own.
//
// The Supabase GitHub integration takes the leading digits of a filename as
// that file's version, and the version is the primary key of
// supabase_migrations.schema_migrations. Two files sharing a prefix cannot
// both be recorded: the second one runs, fails to record itself, is rolled
// back, and stops the run, so nothing after it is ever applied.
//
// That is what happened from 2026-07-04 to 2026-10-03. The folder was named
// by date, two files were dated 20260527, and the "Supabase Preview" check
// failed on every push to main, 257 times with
//
//   duplicate key value violates unique constraint "schema_migrations_pkey"
//   Key (version)=(20260527) already exists.
//
// No merge applied a migration in that time, while AGENTS.md said the merge
// was the apply. docs/audit/findings.yaml F-28 has the record.
//
// Fourteen digits and not eight, because the runner lists files by name and
// reads the history ordered by version, and the two orders agree only while
// every version is the same width: `20260527000100_b.sql` sorts BEFORE
// `20260527_a.sql` by name and AFTER it by version. One eight-digit file
// among fourteen-digit ones can stop every run after it, with the history
// and the folder each naming a version the other puts somewhere else.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "supabase/migrations");

/** What the runner accepts: migrateFilePattern in the Supabase CLI. */
const RUNNER = /^([0-9]+)_(.*)\.sql$/;
/** What this repo accepts: a UTC timestamp, then a lowercase name. */
const OURS = /^([0-9]{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

const HOW =
  "Name a migration <YYYYMMDDHHMMSS>_<name>.sql from the current UTC time " +
  "(`date -u +%Y%m%d%H%M%S`). It must sort after every file already in the " +
  "folder, so if the newest file is dated ahead of today, go one past it.";

const files = fs.readdirSync(DIR).sort();

describe("supabase/migrations", () => {
  it("holds only files named <14 digits>_<name>.sql", () => {
    const odd = files.filter((f) => !OURS.test(f));
    expect(odd, `${HOW}\n  ` + odd.join("\n  ")).toEqual([]);
  });

  it("gives every file a version of its own", () => {
    const byVersion = new Map<string, string[]>();
    for (const f of files) {
      const m = RUNNER.exec(f);
      if (!m) continue;
      byVersion.set(m[1], [...(byVersion.get(m[1]) ?? []), f]);
    }
    const shared = [...byVersion.values()].filter((group) => group.length > 1);
    expect(
      shared,
      `These share a version, so the second of each can never be recorded ` +
        `and every migration after it stops being applied. ${HOW}\n  ` +
        shared.map((group) => group.join(" + ")).join("\n  "),
    ).toEqual([]);
  });

  it("uses versions that are real timestamps", () => {
    const unreal = files.filter((f) => {
      const m = OURS.exec(f);
      if (!m) return false;
      const [y, mo, d, h, mi, s] = [0, 4, 6, 8, 10, 12].map((at, i) =>
        Number(m[1].slice(at, at + (i === 0 ? 4 : 2))),
      );
      const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
      return (
        date.getUTCFullYear() !== y ||
        date.getUTCMonth() !== mo - 1 ||
        date.getUTCDate() !== d ||
        date.getUTCHours() !== h ||
        date.getUTCMinutes() !== mi ||
        date.getUTCSeconds() !== s
      );
    });
    expect(unreal, `${HOW}\n  ` + unreal.join("\n  ")).toEqual([]);
  });
});
