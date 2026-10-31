import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/health, run for real with the session, the database and the
 * outside world stood in for. What only the handler can get wrong: who may
 * ask, and that a failed deploy on Render comes back as a failed probe with
 * its facts (it reported OK whenever Render answered, r3-17 sheet).
 */

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  deploys: [] as unknown[],
  renderStatus: 200,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/bible/api-bible", () => ({ licensedBibleEnabled: () => false }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("the outbound scope must not read the database");
  },
}));

import { GET } from "@/app/api/admin/health/route";

const ENV = { key: process.env.RENDER_API_KEY, id: process.env.RENDER_SERVICE_ID, bmc: process.env.BMC_ACCESS_TOKEN };
afterAll(() => {
  vi.unstubAllGlobals();
  for (const [k, v] of [
    ["RENDER_API_KEY", ENV.key],
    ["RENDER_SERVICE_ID", ENV.id],
    ["BMC_ACCESS_TOKEN", ENV.bmc],
  ] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.renderStatus = 200;
  state.deploys = [];
  process.env.RENDER_API_KEY = "test-key";
  process.env.RENDER_SERVICE_ID = "srv-test";
  delete process.env.BMC_ACCESS_TOKEN;
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.startsWith("https://api.render.com/")) {
      return new Response(JSON.stringify(state.deploys), { status: state.renderStatus });
    }
    if (url.startsWith("https://ipwho.is/")) return new Response(JSON.stringify({ success: true }), { status: 200 });
    return new Response("{}", { status: 404 });
  });
});

const ask = () => GET(new Request("https://purifyapp.net/api/admin/health?scope=outbound"));
const render = async () => {
  const body = (await (await ask()).json()) as { probes: { service: string; status: string; deploy?: { failed: boolean; commit: string } }[] };
  return body.probes.find((p) => p.service.startsWith("Render"))!;
};

describe("/api/admin/health", () => {
  it("answers 403 to anyone who is not an admin", async () => {
    state.admin = null;
    const res = await ask();
    expect(res.status).toBe(403);
  });

  it("reports a failed deploy as a failed probe, with its commit", async () => {
    state.deploys = [
      { deploy: { id: "dep-2", status: "build_failed", commit: { id: "1a2b3c4d" }, finishedAt: "2026-10-30T18:00:00Z" } },
      { deploy: { id: "dep-1", status: "live", commit: { id: "9f8e7d6c" }, finishedAt: "2026-10-29T18:00:00Z" } },
    ];
    const p = await render();
    expect(p.status).toBe("fail");
    expect(p.deploy).toMatchObject({ failed: true, commit: "1a2b3c4" });
  });

  it("reports a live deploy as OK", async () => {
    state.deploys = [{ deploy: { id: "dep-3", status: "live", commit: { id: "abcdef01" } } }];
    expect((await render()).status).toBe("ok");
  });

  it("still fails when Render does not answer", async () => {
    state.renderStatus = 503;
    const p = await render();
    expect(p.status).toBe("fail");
    expect(p.deploy).toBeNull();
  });
});
