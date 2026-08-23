import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The point of this module is that it CANNOT fail the thing it records.
 *
 * The table does not exist in production yet, and AGENTS.md is explicit that
 * a file sitting in supabase/migrations tells you nothing about whether it has
 * been applied. So the absent-table path is not an edge case to tolerate, it
 * is the path that runs on every comp grant today, and it is the one tested
 * hardest here.
 *
 * The PostgREST error shape is stubbed the same way lib/push/__tests__ stubs
 * it: a plain object with a `code`, because that is what the client returns.
 */

const insert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert }) }),
}));
vi.mock("server-only", () => ({}));

const { logActivity } = await import("../activityLog");

afterEach(() => {
  vi.restoreAllMocks();
  insert.mockReset();
});

describe("logActivity", () => {
  it("writes the stdout line BEFORE it touches the database", async () => {
    // The ordering is the whole design. If the insert throws, the record still
    // exists in the deploy log, which is the only sink until the table lands.
    const order: string[] = [];
    const log = vi.spyOn(console, "log").mockImplementation(() => {
      order.push("stdout");
    });
    insert.mockImplementation(async () => {
      order.push("insert");
      return { error: null };
    });

    await logActivity({
      actorEmail: "a@example.com",
      action: "comp.grant",
      entityType: "entitlement",
      entityId: "u1",
    });

    expect(order).toEqual(["stdout", "insert"]);
    const line = JSON.parse(log.mock.calls[0][0] as string);
    expect(line.tag).toBe("admin-activity");
    expect(line.action).toBe("comp.grant");
    expect(line.actorEmail).toBe("a@example.com");
  });

  it("does not throw when the table is absent", async () => {
    // 42P01 undefined_table. This is production today.
    vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    insert.mockResolvedValue({ error: { code: "42P01", message: "does not exist" } });

    await expect(
      logActivity({ actorEmail: null, action: "x", entityType: "y", entityId: null }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("warns about the absent table once per process, not once per grant", async () => {
    // A warning on every comp would train the operator to ignore the log.
    vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    insert.mockResolvedValue({ error: { code: "42P01", message: "does not exist" } });

    const before = warn.mock.calls.length;
    for (let i = 0; i < 3; i++) {
      await logActivity({ actorEmail: null, action: "x", entityType: "y", entityId: null });
    }
    expect(warn.mock.calls.length - before).toBeLessThanOrEqual(1);
  });

  it("does not throw when the client itself blows up", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    insert.mockRejectedValue(new Error("connection reset"));

    await expect(
      logActivity({ actorEmail: null, action: "x", entityType: "y", entityId: null }),
    ).resolves.toBeUndefined();
  });

  it("carries the prior values, because the row no longer holds them", async () => {
    // A comp grant overwrites plus_until and replaces plus_source, so the fact
    // that the account used to be a PAYING subscriber survives nowhere else.
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    insert.mockResolvedValue({ error: null });

    await logActivity({
      actorEmail: "a@example.com",
      action: "comp.grant",
      entityType: "entitlement",
      entityId: "u1",
      detail: { tier: "plus", days: 3660, previous: { plus_source: "google" } },
    });

    const line = JSON.parse(log.mock.calls[0][0] as string);
    expect(line.detail.previous.plus_source).toBe("google");
    expect(line.detail.days).toBe(3660);
  });
});
