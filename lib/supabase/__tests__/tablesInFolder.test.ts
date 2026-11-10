// Every table the website reads is made by a file in supabase/migrations.
//
// Found 2026-11-10, planning the test web (docs/1.9-build/notes/test-web.md):
// eight tables the code reads had been made on production by hand, in the SQL
// editor, from files under docs/*/sql or from nothing at all, and never
// entered the folder. Production worked; a database built from the folder
// alone, the test web's, would have had no journal, no circles' days, no
// email suppression, no store ratings, no catechism progress and no palettes.
// 20261110155643_production_baseline.sql makes them there (and does nothing on
// production, which has them). This keeps the folder whole from here: a new
// table goes in as a migration, never only by hand.
//
// It also holds the baseline to its own promise: the list it counts before it
// acts is exactly the list of tables it makes, so it can never make a table
// on production by finding the others there.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase/migrations");
const BASELINE = "20261110155643_production_baseline.sql";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Tables the code names: `.from("x")` on a database client, or a TABLE constant. Storage's `.from` names a bucket. */
function tablesTheCodeReads(): Map<string, string> {
  const found = new Map<string, string>();
  for (const dir of ["app", "lib", "components"]) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/(\bstorage\s*)?\.from\(\s*["']([a-z][a-z0-9_]*)["']\s*\)/g)) {
        if (m[1]) continue;
        if (!found.has(m[2])) found.set(m[2], path.relative(ROOT, file));
      }
      for (const m of text.matchAll(/const\s+[A-Z_]*TABLE[A-Z_]*\s*=\s*["']([a-z][a-z0-9_]*)["']/g)) {
        if (!found.has(m[1])) found.set(m[1], path.relative(ROOT, file));
      }
    }
  }
  return found;
}

/** Tables and views the folder makes, inside a DO block or not. */
function tablesTheFolderMakes(): Set<string> {
  const made = new Set<string>();
  for (const name of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, name), "utf8").replace(/--.*$/gm, "");
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?(?:table|view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z][a-z0-9_]*)"?/gi)) {
      made.add(m[1].toLowerCase());
    }
  }
  return made;
}

describe("the migrations folder makes every table the website reads", () => {
  it("no table the code reads was made only by hand", () => {
    const made = tablesTheFolderMakes();
    const missing = [...tablesTheCodeReads()].filter(([table]) => !made.has(table)).map(([table, file]) => `${table} (read in ${file})`);
    expect(missing, "Make each one in a migration, written to run twice, and get the owner's yes on it (AGENTS.md).").toEqual([]);
  });

  it("the baseline counts exactly the tables it makes, so it does nothing where they all are", () => {
    const sql = fs.readFileSync(path.join(MIGRATIONS, BASELINE), "utf8").replace(/--.*$/gm, "");
    const listed = [...(sql.match(/unnest\(array\[([^\]]*)\]/)?.[1] ?? "").matchAll(/'public\.([a-z_]+)'/g)].map((m) => m[1]).sort();
    const created = [...sql.matchAll(/create table public\.([a-z_]+)/g)].map((m) => m[1]).sort();
    expect(listed).toHaveLength(8);
    expect(created).toEqual(listed);
    // Its one block returns before any statement when all of them are there.
    const block = sql.slice(sql.indexOf("$baseline$"));
    const firstStatement = block.search(/\b(alter|create|update|insert|delete|drop|comment|grant|revoke)\b/i);
    expect(block.indexOf("if present = 8 then")).toBeGreaterThan(0);
    expect(block.indexOf("if present = 8 then")).toBeLessThan(firstStatement);
  });
});
