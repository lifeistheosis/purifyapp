// The error store (A10): a report cut down before it is kept, and two guards
// that keep reporting cheap when it cannot help.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { __resetErrorStore, recordError, rowOf } from "../store";

type Insert = Record<string, unknown>;

function fakeDb(answer: { error: { code?: string; message: string } | null }) {
  const inserts: Insert[] = [];
  const db = {
    from(table: string) {
      expect(table).toBe("app_errors");
      return {
        insert: async (row: Insert) => {
          inserts.push(row);
          return answer;
        },
      };
    },
  };
  return { db: db as never, inserts };
}

beforeEach(() => __resetErrorStore());

describe("rowOf", () => {
  it("keeps the path, a scrubbed message, the route, the status, the version and the device, and nothing else", () => {
    expect(
      rowOf({
        source: "server",
        page: "/shop/eikon?email=a@b.com",
        message: "failed for a@b.com",
        route: "/(app)/shop/[store]/page",
        status: 500,
        appVersion: "1.9",
        platform: "web",
      }),
    ).toEqual({
      source: "server",
      page: "/shop/eikon",
      message: "failed for <email>",
      route: "/(app)/shop/[store]/page",
      status: 500,
      app_version: "1.9",
      platform: "web",
    });
  });

  it("drops a status or a version that is not one", () => {
    const r = rowOf({ source: "request", page: "/x", status: 42, appVersion: "beta; x" });
    expect(r.status).toBeNull();
    expect(r.app_version).toBeNull();
  });
});

describe("recordError", () => {
  it("stores a report", async () => {
    const { db, inserts } = fakeDb({ error: null });
    expect(await recordError({ source: "screen", page: "/today", message: "x", platform: "android" }, db)).toBe("stored");
    expect(inserts).toHaveLength(1);
  });

  it("remembers for ten minutes that the table is not there yet, and then asks again", async () => {
    const { db, inserts } = fakeDb({ error: { code: "42P01", message: "relation does not exist" } });
    const t = 1_000_000;
    expect(await recordError({ source: "server", page: "/a" }, db, t)).toBe("absent");
    expect(await recordError({ source: "server", page: "/a" }, db, t + 60_000)).toBe("skipped");
    expect(inserts).toHaveLength(1);
    expect(await recordError({ source: "server", page: "/a" }, db, t + 11 * 60_000)).toBe("absent");
    expect(inserts).toHaveLength(2);
  });

  it("keeps at most 120 a minute from one server", async () => {
    const { db, inserts } = fakeDb({ error: null });
    const t = 5_000_000;
    for (let i = 0; i < 130; i++) await recordError({ source: "server", page: `/p${i}` }, db, t + i);
    expect(inserts).toHaveLength(120);
    expect(await recordError({ source: "server", page: "/later" }, db, t + 61_000)).toBe("stored");
  });

  it("never throws, whatever the database does", async () => {
    const db = { from: () => ({ insert: async () => { throw new Error("down"); } }) } as never;
    expect(await recordError({ source: "server", page: "/a" }, db)).toBe("failed");
  });
});
