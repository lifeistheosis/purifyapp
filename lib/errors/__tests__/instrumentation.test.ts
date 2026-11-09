// The website's server-error hook (A10): what it keeps, and what it leaves.
// Also the daily cleanup that keeps reports only as long as promised.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ recorded: [] as Record<string, unknown>[] }));
vi.mock("@/lib/errors/store", () => ({
  recordError: async (r: Record<string, unknown>) => {
    state.recorded.push(r);
    return "stored";
  },
}));
vi.mock("./lib/errors/store", () => ({
  recordError: async (r: Record<string, unknown>) => {
    state.recorded.push(r);
    return "stored";
  },
}));

import { onRequestError } from "@/instrumentation";
import { pruneReports } from "@/lib/ops/prune";

const request = (path: string) => ({ path, method: "GET", headers: { cookie: "sb=secret" } });
const context = {
  routerKind: "App Router",
  routePath: "/(app)/bible/[book]/[chapter]/page",
  routeType: "render",
  renderSource: "react-server-components",
  revalidateReason: undefined,
  renderType: "dynamic",
} as const;
const fail = (message: string, digest = "123") => Object.assign(new Error(message), { digest });

beforeEach(() => {
  state.recorded = [];
  process.env.NEXT_RUNTIME = "nodejs";
});
afterEach(() => {
  delete process.env.NEXT_RUNTIME;
});

describe("onRequestError", () => {
  it("keeps the page, the message and the route, and nothing of the request's headers", async () => {
    await onRequestError(fail("cannot read 'verses'"), request("/bible/john/1?q=x"), context as never);
    expect(state.recorded).toEqual([
      {
        source: "server",
        page: "/bible/john/1?q=x",
        message: "cannot read 'verses'",
        route: "/(app)/bible/[book]/[chapter]/page",
        status: 500,
        platform: "web",
      },
    ]);
    expect(JSON.stringify(state.recorded)).not.toContain("secret");
  });

  it("leaves Next's own control flow and the report route alone", async () => {
    await onRequestError(fail("NEXT_NOT_FOUND", "NEXT_NOT_FOUND"), request("/x"), context as never);
    await onRequestError(fail("NEXT_REDIRECT", "NEXT_REDIRECT;replace;/a;307;"), request("/x"), context as never);
    await onRequestError(fail("boom"), request("/api/errors"), context as never);
    expect(state.recorded).toHaveLength(0);
  });

  it("does nothing outside the Node runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    await onRequestError(fail("boom"), request("/x"), context as never);
    expect(state.recorded).toHaveLength(0);
  });
});

describe("pruneReports", () => {
  it("deletes errors past 14 days and searches past 90, and says a missing table is missing", async () => {
    const asked: [string, string, string][] = [];
    const db = {
      from(table: string) {
        return {
          delete: () => ({
            lt: async (column: string, bound: string) => {
              asked.push([table, column, bound]);
              return table === "search_misses" ? { error: { code: "42P01", message: "missing" }, count: null } : { error: null, count: 3 };
            },
          }),
        };
      },
    } as never;
    const r = await pruneReports(db, new Date("2026-11-09T12:00:00Z"));
    expect(r).toEqual({ app_errors: 3, search_misses: "absent" });
    expect(asked).toEqual([
      ["app_errors", "at", "2026-10-26T12:00:00.000Z"],
      ["search_misses", "day", "2026-08-11"],
    ]);
  });
});
