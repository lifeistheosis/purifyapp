import { afterEach, describe, expect, it, vi } from "vitest";

import type { MyProfile } from "../publicProfile";

const sent: { url: string; method: string | undefined; body: unknown }[] = [];

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    sent.push({ url, method: init?.method, body });
    return new Response(JSON.stringify({ profile: { handle: "maria", settings: { calendar: body?.calendar ?? "new" } } }), {
      status: 200,
    });
  }),
}));

const { syncCalendar } = await import("../client");
const { profileSettings } = await import("../server");

function device(style: string | null) {
  vi.stubGlobal("window", { localStorage: { getItem: () => style } });
}

const mine = (calendar: "new" | "old") => ({ handle: "maria", settings: { calendar } }) as unknown as MyProfile;

afterEach(() => {
  vi.unstubAllGlobals();
  sent.length = 0;
});

describe("syncCalendar", () => {
  it("tells the account when this device keeps the old calendar", async () => {
    device("old");
    const next = await syncCalendar(mine("new"));
    expect(sent).toEqual([{ url: "/api/profile/me", method: "PUT", body: { calendar: "old" } }]);
    expect(next?.settings.calendar).toBe("old");
  });

  it("sends nothing when the two already agree", async () => {
    device("old");
    expect(await syncCalendar(mine("old"))).toBeNull();
    device(null);
    expect(await syncCalendar(mine("new"))).toBeNull();
    expect(sent).toEqual([]);
  });

  it("brings an account back to the new calendar when the device moves", async () => {
    device("new");
    await syncCalendar(mine("old"));
    expect(sent.map((s) => s.body)).toEqual([{ calendar: "new" }]);
  });
});

describe("profileSettings", () => {
  const row = { id: "x", handle: "maria" } as Parameters<typeof profileSettings>[0];

  it("reads the stored calendar, and the new one when there is none yet", () => {
    expect(profileSettings({ ...row, calendar_reckoning: "old" }).calendar).toBe("old");
    expect(profileSettings({ ...row, calendar_reckoning: "new" }).calendar).toBe("new");
    // Before 20261002 runs the column is absent from the row.
    expect(profileSettings(row).calendar).toBe("new");
  });
});
