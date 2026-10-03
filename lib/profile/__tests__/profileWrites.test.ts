import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What the browser may write to its own profiles row.
 *
 * Until 20261003000000_profile_pictures.sql a reader could update ANY column of
 * their own row from the browser (profiles_self_update has no column list):
 * a handle the API reserves, a banner pointing at any address, the picture
 * shown on every post. The migration grants UPDATE and INSERT per column,
 * for the columns the app writes from the browser. This test reads that list
 * from the migration and every browser-side write from the code, so a new
 * client write cannot ship without its grant (it would fail with "permission
 * denied" in production and nowhere else), and the list cannot quietly grow
 * a column that belongs behind the API.
 */

const ROOT = process.cwd();
const MIGRATION = readFileSync(join(ROOT, "supabase/migrations/20261003000000_profile_pictures.sql"), "utf8");

const GRANTED = (() => {
  const m = /foreach col in array array\[([^\]]+)\]/.exec(MIGRATION);
  if (!m) throw new Error("the grant list moved; update this test");
  return m[1].split(",").map((c) => c.trim().replace(/'/g, ""));
})();

/** Columns that stay behind the API, whatever happens to the list above. */
const API_ONLY = ["handle", "avatar_url", "banner_url", "avatar_decoration", "profile_effect", "theme_primary", "theme_accent", "prayer_request_at", "now_reading", "patron_saint", "bio", "status_text"];

function files(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) files(p, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(p);
  }
  return acc;
}

/** Code that runs with the reader's own session: not a route, not server-only, not the service role. */
const browserFiles = ["components", "lib"]
  .flatMap((d) => files(join(ROOT, d)))
  .filter((f) => {
    const src = readFileSync(f, "utf8");
    return !src.includes('import "server-only"') && !src.includes("createAdminClient");
  });

type Write = { file: string; columns: string[] };

function browserWrites(): Write[] {
  const out: Write[] = [];
  for (const f of browserFiles) {
    const src = readFileSync(f, "utf8");
    const file = relative(ROOT, f).split(sep).join("/");
    for (const m of src.matchAll(/\.from\("profiles"\)\s*\.(update|insert|upsert)\(\s*(\{[\s\S]*?\}|\w+)\s*\)/g)) {
      const arg = m[2];
      if (arg.startsWith("{")) {
        out.push({ file, columns: [...arg.matchAll(/([a-z_]+)\s*:/g)].map((k) => k[1]) });
      } else {
        // A variable: only lib/profile/preferences.ts does this, with its
        // PROFILE_PREFS allowlist.
        const prefs = /const PROFILE_PREFS = \[([^\]]+)\]/.exec(src);
        out.push({ file, columns: prefs ? prefs[1].split(",").map((c) => c.trim().replace(/["' ]|as const/g, "")).filter(Boolean) : [`<${arg}>`] });
      }
    }
  }
  return out;
}

describe("browser writes to profiles", () => {
  const writes = browserWrites();

  it("finds the writes the app is known to make (the scan works)", () => {
    const seen = new Set(writes.flatMap((w) => w.columns));
    for (const col of ["display_name", "preferred_language", "focus", "depth"]) expect(seen, col).toContain(col);
  });

  it("every column the browser writes is granted", () => {
    const missing = writes.flatMap((w) => w.columns.filter((c) => !GRANTED.includes(c)).map((c) => `${w.file}: ${c}`));
    expect(missing, "add the column to the grant list in a migration, or move the write behind the API").toEqual([]);
  });

  it("no profile or community column is granted to the browser", () => {
    for (const col of API_ONLY) expect(GRANTED, col).not.toContain(col);
  });

  it("the table-wide grant is taken back before the columns are given", () => {
    const revoke = MIGRATION.indexOf("revoke insert, update on public.profiles from anon, authenticated;");
    const grant = MIGRATION.indexOf("grant update (%I) on public.profiles to authenticated");
    expect(revoke).toBeGreaterThan(0);
    expect(grant).toBeGreaterThan(revoke);
  });
});
