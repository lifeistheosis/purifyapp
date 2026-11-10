// The florilegium's two new kinds (council, prayer), signed by the owner on
// 2026-11-10 ("yes florilegium") and moved into supabase/migrations so that
// the merge of 1.9 runs them. The copy he was shown stays in
// docs/1.9-build/sql/ for reading; this holds the two together, so the SQL
// that runs is the SQL that was signed and reviewed.
//
// What would go wrong if this broke: a migration that says something other
// than what he signed, or one that sorts before a file it should follow.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const MIGRATION = "20261110090516_florilegium_kinds.sql";
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/** The SQL from its first statement down: the header above it is each copy's own. */
const statements = (sql: string) => sql.slice(sql.indexOf("\ndo $$") + 1);

describe("the florilegium kinds migration", () => {
  const migration = read(`supabase/migrations/${MIGRATION}`);
  const signed = read("docs/1.9-build/sql/florilegium-kinds.sql");

  it("is the signed SQL, word for word, from its first statement", () => {
    expect(statements(migration).length).toBeGreaterThan(200);
    expect(statements(migration)).toBe(statements(signed));
  });

  it("allows the two kinds live 1.8 writes, and the two 1.9 adds", () => {
    expect(statements(migration)).toContain("check (kind in ('scripture', 'father', 'council', 'prayer'));");
  });

  it("says it is signed and runs with the merge, and claims no hand run", () => {
    expect(migration).toContain("SIGNED 2026-11-10, AND RUNS WITH THE MERGE.");
    expect(migration).toContain("Not applied by hand");
    expect(migration).not.toMatch(/applied by hand on|ran by hand on|run by hand on 20/i);
  });

  it("sorts after the campaigns rework", () => {
    const names = fs.readdirSync(path.join(ROOT, "supabase/migrations")).sort();
    expect(names.indexOf(MIGRATION)).toBeGreaterThan(names.indexOf("20261110084116_campaigns_rework.sql"));
  });
});
