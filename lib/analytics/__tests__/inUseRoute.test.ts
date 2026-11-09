// Traffic > In use (admin item A5): the route. Admin only, the six events
// alone, summed; and an absent table said, never zeros.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  tables: {} as Record<string, unknown>,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => cappedApi(state.tables as never).client }));

import { GET } from "@/app/api/admin/in-use/route";

const ask = (q = "") => GET(new Request(`https://purifyapp.net/api/admin/in-use${q}`));
const today = new Date().toISOString().slice(0, 10);
const row = (id: number, name: string, props: Record<string, unknown>, ts = `${today}T00:00:00Z`) => ({ id, name, props, ts });

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.tables = {};
});

describe("/api/admin/in-use", () => {
  it("answers 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await ask()).status).toBe(403);
  });

  it("says the events table is not there, rather than zeros", async () => {
    expect(await (await ask()).json()).toEqual({ absent: true });
  });

  it("sums only the six events in the window, a lock or an old row left out", async () => {
    state.tables = {
      analytics_events: [
        row(1, "bible_downloaded", { translation: "ru-synodal", platform: "android" }),
        row(2, "plan_begun", { plan: "psalter", platform: "web" }),
        row(3, "journal_page_written", { platform: "ios" }),
        row(4, "version_in_use", { version: "1.9", platform: "android" }),
        row(5, "lock_tapped", { lock: "plans", platform: "web" }),
        row(6, "plan_begun", { plan: "john", platform: "web" }, "2020-01-01T00:00:00Z"),
      ],
    };
    const body = await (await ask("?days=7")).json();
    expect(body).toMatchObject({
      absent: false,
      days: 7,
      truncated: false,
      bibles: [{ translation: "ru-synodal", downloads: 1 }],
      plans: [{ plan: "psalter", begun: 1, finished: 0 }],
      journal: { written: 1, shared: 0 },
      versions: [{ version: "1.9", deviceDays: 1, share: 1 }],
    });
  });
});
