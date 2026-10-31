import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/actions, saint-complete: the editors' desk's Mark complete and
 * its Undo (his pick A for Content on r3-17). Run for real with the session,
 * the database and the audit log stood in for. What only the handler can get
 * wrong: who may write, that a failed write is not reported as done, and
 * that every change leaves one line in the audit log with what it was before.
 */

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  override: null as { complete: boolean } | null,
  writes: [] as { op: string; row?: unknown }[],
  fail: false,
  logged: [] as Record<string, unknown>[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/admin/activityLog", () => ({
  logActivity: async (e: Record<string, unknown>) => {
    state.logged.push(e);
  },
}));
vi.mock("@/lib/saints/saints", () => ({ SAINTS: [{ slug: "seraphim-of-sarov" }, { slug: "mary-of-egypt" }] }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "saint_overrides") throw new Error(`unexpected table ${table}`);
      const result = () => ({ error: state.fail ? { message: "boom" } : null });
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.override, error: null }) }) }),
        delete: () => ({
          eq: async () => {
            state.writes.push({ op: "delete" });
            return result();
          },
        }),
        upsert: async (row: unknown) => {
          state.writes.push({ op: "upsert", row });
          return result();
        },
      };
    },
  }),
}));

import { POST } from "@/app/api/admin/actions/route";

const send = (body: unknown) =>
  POST(
    new Request("https://purifyapp.net/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.override = null;
  state.writes = [];
  state.fail = false;
  state.logged = [];
});

describe("/api/admin/actions, saint-complete", () => {
  it("answers 403 to anyone who is not an admin, and writes nothing", async () => {
    state.admin = null;
    const res = await send({ action: "saint-complete", slug: "seraphim-of-sarov", complete: true });
    expect(res.status).toBe(403);
    expect(state.writes).toEqual([]);
    expect(state.logged).toEqual([]);
  });

  it("marks a saint complete and records it, with what it was before", async () => {
    const res = await send({ action: "saint-complete", slug: "seraphim-of-sarov", complete: true });
    expect(res.status).toBe(200);
    expect(state.writes[0]).toMatchObject({ op: "upsert", row: { slug: "seraphim-of-sarov", complete: true, updated_by_email: "owner@example.com" } });
    expect(state.logged).toEqual([
      {
        actorEmail: "owner@example.com",
        action: "saint.complete",
        entityType: "saint",
        entityId: "seraphim-of-sarov",
        detail: { complete: true, before: "registry" },
      },
    ]);
  });

  it("records Undo back to the registry as its own line", async () => {
    state.override = { complete: true };
    await send({ action: "saint-complete", slug: "seraphim-of-sarov", complete: null });
    expect(state.writes).toEqual([{ op: "delete" }]);
    expect(state.logged[0]).toMatchObject({ action: "saint.registry", detail: { complete: null, before: true } });
  });

  it("does not say done when the write failed, and records nothing", async () => {
    state.fail = true;
    const res = await send({ action: "saint-complete", slug: "mary-of-egypt", complete: true });
    expect(res.status).toBe(500);
    expect(state.logged).toEqual([]);
  });

  it("refuses a saint the registry does not hold", async () => {
    const res = await send({ action: "saint-complete", slug: "not-a-saint", complete: true });
    expect(res.status).toBe(404);
    expect(state.writes).toEqual([]);
  });
});
