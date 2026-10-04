// The daily page view counts (20261009000000_analytics_daily.sql), held to
// the promises its header makes that a reader of the file could get wrong
// without noticing.
//
// What this cannot show is that the daily path gives the same numbers as
// counting every page view. That was shown on a real Postgres, with made-up
// traffic built to break it, and is written up in
// docs/audit/continuation-ledger.md. This file pins the shape that proof
// rested on: the row by row function unchanged, the two answers assembled the
// same way, a day never added twice, the fallbacks in place, and the tables
// closed to browsers.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "supabase", "migrations");
const read = (name: string) => fs.readFileSync(path.join(DIR, name), "utf8").replace(/\r\n/g, "\n");

const DAILY = read("20261009000000_analytics_daily.sql");
const ROLLUPS = read("20261008000100_admin_rollups.sql");

/** `create or replace function public.<name>(` through the `$$;` that ends it. */
function fn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} is defined`).toBeGreaterThan(-1);
  const end = sql.indexOf("$$;", start);
  expect(end, `${name} ends`).toBeGreaterThan(start);
  return sql.slice(start, end + 3);
}

/** One space for any run of white space, so indentation is not a difference. */
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

/** From `'sessions',` to the end of the answer: everything after the totals. */
function afterTotals(body: string): string {
  const from = body.indexOf("'sessions', (");
  expect(from).toBeGreaterThan(-1);
  return flat(body.slice(from).replace(/\binto v_out;[\s\S]*$/, "").replace(/\);\s*\$\$;\s*$/, ")"));
}

const RAW = fn(DAILY, "admin_pageview_rollup_raw");
const WRAPPER = fn(DAILY, "admin_pageview_rollup");

describe("the daily counts migration", () => {
  it("keeps the row by row function word for word, under its new name", () => {
    // It is the reference the daily path was held to, and what every fallback
    // returns. A change here would move both without any test noticing.
    const was = fn(ROLLUPS, "admin_pageview_rollup");
    expect(RAW).toBe(was.replace("public.admin_pageview_rollup(", "public.admin_pageview_rollup_raw("));
  });

  it("keeps the name, the argument and the answer the code calls", () => {
    expect(WRAPPER).toMatch(/^create or replace function public\.admin_pageview_rollup\(p_since timestamptz\)\nreturns jsonb\n/);
  });

  it("is volatile, because it writes the days it counts", () => {
    // The API runs a stable function in a read-only transaction, and the
    // first insert would fail.
    expect(WRAPPER).toMatch(/\nlanguage plpgsql\nvolatile\nsecurity definer\n/);
    expect(fn(DAILY, "analytics_daily_close")).toMatch(/\nlanguage plpgsql\nsecurity definer\n/);
  });

  it("goes row by row for a window that does not start at midnight UTC, when it is behind, and on any error", () => {
    const fallbacks = WRAPPER.match(/return public\.admin_pageview_rollup_raw\(p_since\);/g) ?? [];
    expect(fallbacks).toHaveLength(3);
    expect(WRAPPER).toContain("if p_since is null or p_since <> (v_from::timestamp at time zone 'UTC') then");
    expect(WRAPPER).toContain("if v_closed is null or v_today - v_closed > 4 then");
    expect(WRAPPER).toContain("exception when others then");
  });

  it("writes an error of the daily path down, since the answer alone would never show it", () => {
    // The row by row answer is the same answer, so a daily path that has
    // stopped working looks like a slow tab and nothing else.
    const write = "set last_error = excluded.last_error, last_error_at = excluded.last_error_at;";
    expect(WRAPPER).toContain("v_error := sqlstate || ' ' || sqlerrm;");
    expect(WRAPPER).toContain(write);
    // And the file's own first count: it must not stop the file.
    const first = /\ndo \$\$[\s\S]*?\n\$\$;/.exec(DAILY)?.[0] ?? "";
    expect(first).toContain("perform public.analytics_daily_close(30);");
    expect(first).toContain("exception when others then");
    expect(first).toContain(write);
  });

  it("never adds a day twice: the counted days stop at the day it read as the last one", () => {
    // Another call may commit a newly counted day between this call reading
    // the state and reading the counts. Without the bound that day would be
    // added once from the table and once from the page views.
    expect(flat(WRAPPER)).toContain("from public.analytics_daily_counts c where c.day >= v_from and c.day <= v_closed");
    expect(flat(WRAPPER)).toContain("from (select v_closed + g as day from generate_series(1, v_today - v_closed) g) o");
  });

  it("counts a session that came back by its first day and its latest, and counts it once", () => {
    expect(flat(WRAPPER)).toContain(
      "from public.analytics_return_visits r where r.first_day < v_from and r.last_day >= v_from union select o.level, o.key, o.session_id from open_days o where o.first_day < v_from",
    );
    expect(flat(fn(DAILY, "analytics_daily_close"))).toContain(
      "set last_day = greatest(public.analytics_return_visits.last_day, excluded.last_day)",
    );
  });

  it("assembles the answer the way the row by row function does, after the totals", () => {
    expect(afterTotals(WRAPPER)).toBe(afterTotals(RAW));
    for (const body of [RAW, WRAPPER]) {
      for (const key of ["totals", "views", "visitors", "sessions", "sections", "topByVisitors", "topByViews", "revisited", "slugs"]) {
        expect(body, key).toContain(`'${key}', `);
      }
    }
  });

  it("cleans a path by the rule the row by row function uses", () => {
    const rule = /regexp_replace\(\s*split_part\(split_part\(coalesce\(nullif\(d\.path, ''\), '\/'\), '#', 1\), '\?', 1\),\s*'\(\.\)\/\$', '\\1'\)/;
    expect(RAW).toMatch(rule);
    expect(fn(DAILY, "analytics_day_pairs")).toMatch(rule);
  });

  it("closes the three tables to browsers", () => {
    for (const table of ["analytics_daily_counts", "analytics_return_visits", "analytics_daily_state"]) {
      expect(DAILY).toContain(`alter table public.${table} enable row level security;`);
      expect(DAILY).toContain(`revoke all on public.${table} from anon, authenticated;`);
      expect(DAILY).not.toMatch(new RegExp(`create policy[^;]*on public\\.${table}\\b`));
    }
  });

  it("counts only the first 30 days itself, so it returns quickly in the SQL editor", () => {
    expect(DAILY).toContain("perform public.analytics_daily_close(30);");
  });
});
