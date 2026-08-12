// A parish group's thread is private, and three separate things have to hold
// for that to be true. This file pins all three, because each one failed on
// the branch that introduced them and none of the 1043 tests noticed: the
// unit suite never opens a database, so an RLS mistake is invisible to it.
//
//   1. The groups table must not be world-readable. It holds invite_code,
//      RLS is row-scoped rather than column-scoped, and the invite code is
//      the ONLY access control on a group. `using (true)` there handed every
//      parish group and every code to anyone with NEXT_PUBLIC_SUPABASE_ANON_KEY,
//      which ships inside the client bundle.
//
//   2. Membership must be proved through a SECURITY DEFINER function. A
//      policy on prayer_campaign_group_members that selects from
//      prayer_campaign_group_members re-enters its own policy, and Postgres
//      aborts with "42P17 infinite recursion detected in policy". That does
//      not merely break groups: community_posts' read policy consults the
//      same table, so the recursion takes down the read of every PUBLIC post
//      too, for signed-out readers included.
//
//   3. The API routes must check membership themselves. They read with the
//      service role, which BYPASSES row security, so the policies in 1 and 2
//      never run for them. Defence in depth only counts when both layers are
//      actually there.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const GROUPS_MIGRATION =
  "supabase/migrations/20260811_campaign_groups_and_streaks.sql";
const THREADS_MIGRATION =
  "supabase/migrations/20260811_community_group_threads.sql";
const REPLIES_ROUTE = "app/api/community/posts/[id]/replies/route.ts";
const POSTS_ROUTE = "app/api/community/posts/route.ts";

/** Collapse whitespace so assertions survive reformatting. */
const flat = (s: string) => s.replace(/\s+/g, " ");

/** The body of a `create policy "<name>" ... ;` statement. */
function policyBody(sql: string, name: string): string {
  const i = sql.indexOf(`create policy "${name}"`);
  expect(i, `policy ${name} must exist`).toBeGreaterThan(-1);
  const end = sql.indexOf(";", i);
  return flat(sql.slice(i, end));
}

describe("the groups table is not world-readable", () => {
  it("does not select with `using (true)`", () => {
    const body = policyBody(read(GROUPS_MIGRATION), "prayer_campaign_groups_select");
    // The exact shape that shipped, and the reason this file exists.
    expect(body).not.toMatch(/using\s*\(\s*true\s*\)/);
  });

  it("proves membership instead", () => {
    const body = policyBody(read(GROUPS_MIGRATION), "prayer_campaign_groups_select");
    expect(body).toContain("is_campaign_group_member");
  });
});

describe("membership is proved without recursion", () => {
  it("the roster policy does not read its own table", () => {
    const body = policyBody(
      read(GROUPS_MIGRATION),
      "prayer_campaign_group_members_select",
    );
    // An EXISTS back into the same table is the 42P17 shape.
    expect(body).not.toMatch(/from\s+public\.prayer_campaign_group_members/);
    expect(body).toContain("is_campaign_group_member");
  });

  it("neither community policy inlines a lookup into the members table", () => {
    const sql = read(THREADS_MIGRATION);
    for (const name of [
      "community_posts_public_read",
      "community_replies_public_read",
    ]) {
      const body = policyBody(sql, name);
      expect(
        body,
        `${name} must call the helper, not re-enter the members policy`,
      ).not.toMatch(/from\s+public\.prayer_campaign_group_members/);
      expect(body).toContain("is_campaign_group_member");
    }
  });

  it("the helper runs outside row security, with a pinned search_path", () => {
    const sql = flat(read(GROUPS_MIGRATION));
    const i = sql.indexOf("function public.is_campaign_group_member");
    expect(i, "the helper must exist").toBeGreaterThan(-1);
    const decl = sql.slice(i, sql.indexOf("$$", sql.indexOf("$$", i) + 2));
    expect(decl).toContain("security definer");
    // Without this a caller can put their own schema in front and have a
    // definer-rights function read their table instead of ours.
    expect(decl).toContain("set search_path = public");
  });

  it("the helper is not executable by the world", () => {
    const sql = flat(read(GROUPS_MIGRATION));
    expect(sql).toContain(
      "revoke all on function public.is_campaign_group_member(uuid) from public",
    );
    // anon is granted deliberately: the public-post read policy calls this
    // for signed-out readers, and SQL does not promise to short-circuit OR.
    expect(sql).toMatch(
      /grant execute on function public\.is_campaign_group_member\(uuid\)\s*to anon, authenticated/,
    );
  });
});

describe("the routes check membership themselves", () => {
  it("both community read paths gate a group thread", () => {
    for (const rel of [POSTS_ROUTE, REPLIES_ROUTE]) {
      const src = read(rel);
      expect(
        /prayer_campaign_group_members|callerIsGroupMember/.test(src),
        `${rel} reads with the service role, so it must prove membership itself`,
      ).toBe(true);
    }
  });

  it("the replies route resolves the parent post's group before serving", () => {
    const src = flat(read(REPLIES_ROUTE));
    // A reply carries no group of its own; the parent decides the audience.
    expect(src).toContain("group_id");
    expect(src).toContain("callerIsGroupMember");
  });
});

describe("CORS advertises every verb the app actually uses", () => {
  it("allows each method some route exports", () => {
    const cors = read("lib/api/cors.ts");
    const methods = /Access-Control-Allow-Methods":\s*"([^"]+)"/.exec(cors)?.[1];
    expect(methods, "the allow-list must be findable").toBeTruthy();
    const advertised = new Set(
      (methods ?? "").split(",").map((m) => m.trim().toUpperCase()),
    );

    // Walk the route tree for exported handlers. A verb that exists but is
    // not advertised works on the web, where the call is same-origin and
    // never preflights, and fails in both native shells, where every call is
    // cross-origin. That is exactly how PUT shipped broken.
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === "route.ts") {
          const src = fs.readFileSync(p, "utf8");
          for (const m of src.matchAll(
            /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g,
          )) {
            used.add(m[1]);
          }
        }
      }
    };
    walk(path.join(ROOT, "app", "api"));

    for (const verb of used) {
      expect(advertised, `${verb} is exported by a route but not advertised`).toContain(
        verb,
      );
    }
  });
});
