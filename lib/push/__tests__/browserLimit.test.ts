import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_BROWSERS, endpointsToLetGo } from "../browserLimit";

/**
 * Audit F-42: one account, a handful of browsers, and only the server
 * writes a row. The first half is the route's ceiling. The second holds the
 * migration and the route to each other, since each is only safe with the
 * other: the policy takes the reader's insert away, so the route must write
 * with the service role, and must still delete as the reader.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const row = (n: number) => ({ endpoint: `https://push.example/${n}`, created_at: `2026-10-${String(n).padStart(2, "0")}T00:00:00Z` });

describe("how many browsers one account keeps", () => {
  it("lets nothing go while there is room", () => {
    const mine = Array.from({ length: MAX_BROWSERS - 1 }, (_, i) => row(i + 1));
    expect(endpointsToLetGo(mine, "https://push.example/new")).toEqual([]);
  });

  it("lets the oldest go when another browser would be one too many", () => {
    const mine = Array.from({ length: MAX_BROWSERS }, (_, i) => row(i + 1));
    expect(endpointsToLetGo(mine, "https://push.example/new")).toEqual(["https://push.example/1"]);
  });

  it("clears a pile down to the ceiling in one go, newest kept", () => {
    const mine = Array.from({ length: 28 }, (_, i) => row(i + 1)).reverse();
    const gone = endpointsToLetGo(mine, "https://push.example/new");
    expect(gone).toHaveLength(28 - (MAX_BROWSERS - 1));
    expect(gone).toContain("https://push.example/1");
    expect(gone).not.toContain("https://push.example/28");
    expect(mine.length - gone.length + 1).toBe(MAX_BROWSERS);
  });

  it("does not count a browser that is saving again as a new one", () => {
    const mine = Array.from({ length: MAX_BROWSERS }, (_, i) => row(i + 1));
    expect(endpointsToLetGo(mine, "https://push.example/3")).toEqual([]);
  });

  it("treats a row with no date as the oldest", () => {
    const mine = [...Array.from({ length: MAX_BROWSERS - 1 }, (_, i) => row(i + 1)), { endpoint: "https://push.example/undated", created_at: null }];
    expect(endpointsToLetGo(mine, "https://push.example/new")).toEqual(["https://push.example/undated"]);
  });
});

describe("who writes a push endpoint", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261010000000_push_subscriptions_server_writes.sql"), "utf8");
  const route = fs.readFileSync(path.join(ROOT, "app/api/push/subscribe/route.ts"), "utf8");
  // The statements, without the header that describes the old policy.
  const statements = sql
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");

  it("leaves the reader select and delete on their own rows, and no way to write one", () => {
    expect(statements).toContain('drop policy if exists "push_subscriptions_self_all"');
    expect(statements).toMatch(/for select to authenticated\s+using \(auth\.uid\(\) = user_id\)/);
    expect(statements).toMatch(/for delete to authenticated\s+using \(auth\.uid\(\) = user_id\)/);
    expect(statements).not.toMatch(/for (all|insert|update)\b/);
    expect(statements).toContain("revoke all on public.push_subscriptions from anon;");
    expect(statements).toContain("revoke insert, update, truncate, references, trigger on public.push_subscriptions from authenticated;");
    expect(statements).not.toMatch(/grant[^;]*\b(insert|update|all)\b[^;]*to (anon|authenticated)/i);
  });

  it("can run twice, since a merge runs it after the owner may have", () => {
    for (const create of statements.match(/create policy "[^"]+"/g) ?? []) {
      const name = create.slice("create policy ".length);
      expect(statements, name).toContain(`drop policy if exists ${name}`);
    }
  });

  it("has a route that saves with the service role and lets go as the reader", () => {
    // The save: the service role, or the policy above refuses it.
    expect(route).toMatch(/admin\s*\.from\("push_subscriptions"\)\s*\.upsert\(/);
    // The reader's own "turn it off": their session, which the delete policy allows.
    expect(route).toMatch(/await supa\s*\.from\("push_subscriptions"\)\s*\.delete\(\)/);
    expect(route).toContain("endpointsToLetGo(");
  });
});
