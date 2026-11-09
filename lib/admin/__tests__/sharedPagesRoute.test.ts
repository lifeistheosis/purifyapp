// /api/admin/shared-pages (admin item A1): admin only; a list by state, never
// the writer; each change logged with what it was before; and the table not
// being there said, never an empty list.

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { serializePage } from "@/lib/journal/page";
import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

const state = vi.hoisted(() => ({
  admin: { id: "a1", email: "owner@example.com" } as { id: string; email: string } | null,
  api: null as null | ReturnType<typeof import("@/lib/supabase/__tests__/cappedApi").cappedApi>,
  logged: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: async (e: Record<string, unknown>) => void state.logged.push(e) }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.api!.client }));

import { GET, POST } from "@/app/api/admin/shared-pages/route";

const ID = "11111111-1111-4111-8111-111111111111";
const row = (over: Record<string, unknown> = {}) => ({
  id: ID,
  owner_id: "owner-uuid",
  title: "On the Psalms",
  body: serializePage({ title: "On the Psalms", blocks: [{ type: "text", text: "The Psalter teaches us to pray." }] }),
  created_at: "2026-11-01T10:00:00Z",
  withdrawn_at: null,
  hidden_at: null,
  reviewed_at: null,
  reports: [],
  ...over,
});

const list = async (show?: string) => (await GET(new NextRequest(`https://purifyapp.net/api/admin/shared-pages${show ? `?show=${show}` : ""}`))).json();
const act = (body: unknown) =>
  POST(new NextRequest("https://purifyapp.net/api/admin/shared-pages", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  state.admin = { id: "a1", email: "owner@example.com" };
  state.logged = [];
  state.api = cappedApi(
    {
      shared_pages: [
        row(),
        row({ id: "22222222-2222-4222-8222-222222222222", reviewed_at: "2026-11-02T00:00:00Z" }),
        row({ id: "33333333-3333-4333-8333-333333333333", reports: [{ reason: "Spam", created_at: "2026-11-03T00:00:00Z" }] }),
      ],
    },
    {},
    { upserts: true },
  );
});

describe("/api/admin/shared-pages", () => {
  it("answers 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await GET(new NextRequest("https://purifyapp.net/api/admin/shared-pages"))).status).toBe(403);
    expect((await act({ id: ID, action: "hide" })).status).toBe(403);
  });

  it("lists the shares in one state, the words as the public page shows them, and never the writer", async () => {
    const body = await list();
    expect(body.show).toBe("unreviewed");
    expect(body.pages.map((p: { id: string }) => p.id)).toEqual([ID]);
    expect(body.pages[0]).toMatchObject({ words: "On the Psalms\nThe Psalter teaches us to pray.", state: "unreviewed", reports: 0 });
    expect(JSON.stringify(body)).not.toContain("owner-uuid");
    expect((await list("reported")).pages[0]).toMatchObject({ state: "reported", reports: 1, reasons: ["Spam"] });
    expect((await list("reviewed")).pages).toHaveLength(1);
  });

  it("hides a page, and logs who did it with what it was before", async () => {
    expect((await act({ id: ID, action: "hide", reason: "Spam" })).status).toBe(200);
    expect((await list("hidden")).pages.map((p: { id: string }) => p.id)).toEqual([ID]);
    expect(state.logged[0]).toMatchObject({
      actorEmail: "owner@example.com",
      action: "shared_page.hide",
      entityId: ID,
      detail: { before: { hidden_at: null, reviewed_at: null }, reason: "Spam" },
    });
  });

  it("keeps or reviews one, so search engines may show it, and can take that back", async () => {
    expect((await act({ id: ID, action: "keep" })).status).toBe(200);
    expect((await list("reviewed")).pages).toHaveLength(2);
    expect((await act({ id: ID, action: "unreview" })).status).toBe(200);
    expect((await list("reviewed")).pages).toHaveLength(1);
  });

  it("refuses what it does not know, and a page that is not there", async () => {
    expect((await act({ id: ID, action: "delete" })).status).toBe(400);
    expect((await act({ id: "not-an-id", action: "hide" })).status).toBe(400);
    expect((await act({ id: "99999999-9999-4999-8999-999999999999", action: "hide" })).status).toBe(404);
  });

  it("says the table is not there yet, on both", async () => {
    state.api = cappedApi({});
    expect(await list()).toEqual({ absent: true });
    expect((await act({ id: ID, action: "hide" })).status).toBe(409);
  });
});
