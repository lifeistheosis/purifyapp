import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/activity-log, run for real with the session and the database
 * stood in for. The record (the Audit log's second view, his pick B on
 * r3-17) is the admin's actions and Community's moderation together, and
 * says "You" for the one asking; the route is still the single door to a
 * table only the service role can read.
 */

const state = vi.hoisted(() => ({
  admin: { id: "u-1", email: "owner@example.com" } as { id: string; email: string } | null,
  modFails: false,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/community/moderation", () => ({
  readModLog: async () => {
    if (state.modFails) throw new Error("boom");
    return { rows: [{ id: "m1", actor_name: "Moderator 1", action: "remove_reply", target_kind: "reply", target_id: "x", summary: "Reader A", created_at: "2026-10-29T21:05:00Z" }], live: true };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        eq: () => query,
        ilike: () => query,
        then: <T>(resolve: (r: { data: unknown[]; error: null }) => T) =>
          Promise.resolve({
            data: [{ id: "a1", actor_email: "owner@example.com", action: "refund.approve", entity_type: "shop_orders", entity_id: "1038", detail: {}, created_at: "2026-10-30T08:02:00Z" }],
            error: null,
          }).then(resolve),
      };
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/activity-log/route";

const ask = (q = "") => GET(new NextRequest(`https://purifyapp.net/api/admin/activity-log${q}`));

beforeEach(() => {
  state.admin = { id: "u-1", email: "owner@example.com" };
  state.modFails = false;
});

describe("/api/admin/activity-log", () => {
  it("answers 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await ask()).status).toBe(403);
  });

  it("hands over both logs and who is asking", async () => {
    const body = (await (await ask()).json()) as { entries: unknown[]; mod: unknown[]; me: string; modReadable: boolean };
    expect(body.entries).toHaveLength(1);
    expect(body.mod).toHaveLength(1);
    expect(body.me).toBe("owner@example.com");
    expect(body.modReadable).toBe(true);
  });

  it("keeps the admin's own record whole when the moderation log does not answer", async () => {
    state.modFails = true;
    const res = await ask();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: unknown[]; mod: unknown[]; modReadable: boolean };
    expect(body.entries).toHaveLength(1);
    expect(body.mod).toEqual([]);
    expect(body.modReadable).toBe(false);
  });
});
