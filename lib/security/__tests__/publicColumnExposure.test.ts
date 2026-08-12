// No public read path may select the auth uuid.
//
// RLS is row-scoped, not column-scoped, and the anon key ships in the client
// bundle, so a column the API route omits is still reachable through
// PostgREST. supabase/migrations/20260802_revoke_public_user_id.sql closes
// that at the database. This test closes the other half: it stops a public
// read path from being written to select the column again, which would then
// fail at runtime once the grant is gone, or worse, be "fixed" by re-granting.
//
// It also pins the two tables that are knowingly NOT revoked yet, so the
// reason lives in the test rather than only in a migration comment.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Public read paths: reachable without an admin gate. */
const PUBLIC_READ_PATHS = [
  "app/api/community/posts/route.ts",
  "app/api/community/posts/[id]/replies/route.ts",
  "app/api/shop/catalog/reviews/route.ts",
  "app/api/shop/catalog/store-reviews/route.ts",
];

const MIGRATION = "supabase/migrations/20260802_revoke_public_user_id.sql";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** The column list of every .select("...") / .select(`...`) in a file. */
function selectLists(src: string): string[] {
  const out: string[] = [];
  const re = /\.select\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1].slice(1, -1));
  return out;
}

describe("public read paths", () => {
  it("never select user_id", () => {
    const offenders: string[] = [];
    for (const rel of PUBLIC_READ_PATHS) {
      for (const list of selectLists(read(rel))) {
        if (/\buser_id\b/.test(list)) offenders.push(`${rel}: select(${list})`);
      }
    }
    expect(
      offenders,
      `user_id is the Supabase auth uuid, the RevenueCat appUserID and the ` +
        `public avatar path segment. It must not reach an unauthenticated ` +
        `reader.\n  ` + offenders.join("\n  "),
    ).toEqual([]);
  });
});

describe("the revoke migration", () => {
  const sql = read(MIGRATION);

  it("covers the four tables whose public reads are clean", () => {
    for (const table of [
      "community_posts",
      "community_post_replies",
      "shop_reviews",
      "shop_store_reviews",
    ]) {
      expect(sql).toContain(`'${table}'`);
    }
  });

  it("drops the table grant, because a column revoke alone does nothing", () => {
    // This test used to assert the opposite, and so pinned the bug in place.
    // A column privilege is ADDITIVE with a table privilege in Postgres, it
    // does not subtract from one, and Supabase grants SELECT on the whole
    // table to anon by default. So `revoke select (user_id) ...` parses,
    // runs, succeeds, and leaves the uuid readable. Confirmed on production
    // 2026-08-12 before the rewrite.
    expect(sql).toMatch(/revoke select on public\.%I from anon, authenticated/);
    expect(sql).toMatch(/grant select \(%s\) on public\.%I to anon, authenticated/);
    expect(
      sql,
      "a bare column revoke is the shape that silently does nothing",
    ).not.toMatch(/^revoke select \(user_id\)/m);
  });

  it("reads the keep-columns from the catalog rather than a typed list", () => {
    // A hand-written keep-list is one forgotten column away from a surface
    // that returns an empty array with a 200. See the note in the migration.
    expect(sql).toContain("information_schema.columns");
    expect(sql).toContain("column_name <> 'user_id'");
  });

  it("does NOT revoke the two columns the client still reads", () => {
    // Postgres needs SELECT on a column to reference it in a WHERE clause too,
    // so revoking either of these would break a working feature until the
    // client stops shipping the uuid to the browser.
    expect(sql).not.toMatch(/revoke select \(creator_id\)/);
    expect(sql).not.toMatch(/revoke select \(author_id\)/);
  });

  it("carries its own rollback", () => {
    // Restoring the TABLE grant is what undoes this. Re-granting the single
    // column would not: the column grants are already there, and it is the
    // absence of the table grant that does the work.
    expect(sql).toMatch(/grant select on public\.shop_reviews to anon, authenticated/);
  });
});
