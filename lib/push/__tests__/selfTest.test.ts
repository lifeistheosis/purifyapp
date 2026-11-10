import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The panel's test notification to the admin's own devices
 * (app/api/admin/push/test, lib/push/selfTest.ts).
 *
 * What would go wrong if this broke: a test meant for the owner's phone
 * reaching a reader, a device's token or push address shown on a screen that
 * may be shared, or a send the owner was told went through when it did not.
 * The route is run for real here against an in-memory pair of tables holding
 * the owner's devices and a reader's; the push senders are stood in for, so
 * nothing leaves.
 */

const OWNER = "11111111-1111-4111-8111-111111111111";
const READER = "22222222-2222-4222-8222-222222222222";

type TokenRow = { token: string; user_id: string; platform: "ios" | "android"; created_at: string; last_sent_at: string | null; timezone: string };
type SubRow = { endpoint: string; user_id: string; p256dh: string; auth: string; created_at: string; last_sent_at: string | null };

const state = vi.hoisted(() => ({
  admin: null as null | { id: string },
  limited: false,
  tokens: [] as TokenRow[],
  subs: [] as SubRow[],
  asked: [] as [string, string, unknown][],
  native: [] as { token: string; platform: string }[],
  web: [] as string[],
  nativeAnswer: {} as Record<string, { ok: boolean; gone: boolean; skipped: boolean; reason?: string }>,
  webAnswer: {} as Record<string, { ok: boolean; gone: boolean; reason?: string }>,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => state.limited }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (name: string) => ({
      select: () => {
        const filters: [string, unknown][] = [];
        const chain = {
          eq(k: string, v: unknown) {
            filters.push([k, v]);
            state.asked.push([name, k, v]);
            return chain;
          },
          order() {
            return chain;
          },
          then(resolve: (v: unknown) => unknown) {
            const rows = (name === "device_push_tokens" ? state.tokens : state.subs) as Record<string, unknown>[];
            const data = rows.filter((r) => filters.every(([k, v]) => r[k] === v));
            return Promise.resolve({ data, error: null }).then(resolve);
          },
        };
        return chain;
      },
    }),
  }),
}));
vi.mock("@/lib/push/send", () => ({
  sendNativeOne: async (_db: unknown, t: { token: string; platform: string }) => {
    state.native.push(t);
    return state.nativeAnswer[t.token] ?? { ok: true, gone: false, skipped: false };
  },
  sendWebPushOne: async (_db: unknown, s: { endpoint: string }) => {
    state.web.push(s.endpoint);
    return state.webAnswer[s.endpoint] ?? { ok: true, gone: false };
  },
}));

import { GET, POST } from "@/app/api/admin/push/test/route";
import { checkNotificationCopy } from "@/lib/push/doctrine";
import { SELF_TEST_PUSH, browserOf } from "@/lib/push/selfTest";

const OWNER_ANDROID = "fcm-token-of-the-owners-android-phone";
const OWNER_IPAD = "apns-token-of-the-owners-ipad";
const OWNER_CHROME = "https://fcm.googleapis.com/fcm/send/owners-chrome";
const READER_PHONE = "fcm-token-of-a-readers-phone";
const READER_FIREFOX = "https://updates.push.services.mozilla.com/wpush/v2/readers-firefox";

const post = (body: unknown) =>
  POST(new Request("https://purifyapp.net/api/admin/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => {
  state.admin = { id: OWNER };
  state.limited = false;
  state.asked = [];
  state.native = [];
  state.web = [];
  state.nativeAnswer = {};
  state.webAnswer = {};
  state.tokens = [
    { token: OWNER_ANDROID, user_id: OWNER, platform: "android", created_at: "2026-11-01T10:00:00Z", last_sent_at: null, timezone: "America/Chicago" },
    { token: OWNER_IPAD, user_id: OWNER, platform: "ios", created_at: "2026-10-01T10:00:00Z", last_sent_at: "2026-11-09T12:00:00Z", timezone: "America/Chicago" },
    { token: READER_PHONE, user_id: READER, platform: "android", created_at: "2026-11-02T10:00:00Z", last_sent_at: null, timezone: "Europe/Athens" },
  ];
  state.subs = [
    { endpoint: OWNER_CHROME, user_id: OWNER, p256dh: "owner-key", auth: "owner-auth", created_at: "2026-10-20T10:00:00Z", last_sent_at: null },
    { endpoint: READER_FIREFOX, user_id: READER, p256dh: "reader-key", auth: "reader-auth", created_at: "2026-10-21T10:00:00Z", last_sent_at: null },
  ];
});

describe("the test reaches the admin's own devices and nobody else's", () => {
  it("lists only the admin's devices, asked by the admin's own id", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const { devices } = (await res.json()) as { devices: { kind: string }[] };
    expect(devices.map((d) => d.kind).sort()).toEqual(["android", "ios", "web"]);
    expect(state.asked).toEqual([
      ["device_push_tokens", "user_id", OWNER],
      ["push_subscriptions", "user_id", OWNER],
    ]);
  });

  it("sends to the admin's three devices alone", async () => {
    const res = await post({ confirm: true });
    expect(res.status).toBe(200);
    expect(state.native.map((t) => t.token).sort()).toEqual([OWNER_ANDROID, OWNER_IPAD].sort());
    expect(state.web).toEqual([OWNER_CHROME]);
  });

  it("cannot be pointed at another reader from the request", async () => {
    await post({ confirm: true, userId: READER, user_id: READER, token: READER_PHONE, audience: "all" });
    expect(state.native.map((t) => t.token)).not.toContain(READER_PHONE);
    expect(state.web).not.toContain(READER_FIREFOX);
    expect(state.asked.every(([, , v]) => v === OWNER)).toBe(true);
  });

  it("sends nothing without the confirm, to someone not an admin, or past the limit", async () => {
    expect((await post({})).status).toBe(400);
    state.admin = null;
    expect((await post({ confirm: true })).status).toBe(403);
    expect((await GET()).status).toBe(403);
    state.admin = { id: OWNER };
    state.limited = true;
    expect((await post({ confirm: true })).status).toBe(429);
    expect(state.native).toEqual([]);
    expect(state.web).toEqual([]);
  });
});

describe("what the admin is shown", () => {
  it("never a token, a push address or a browser's keys", async () => {
    const listed = JSON.stringify(await (await GET()).json());
    const sent = JSON.stringify(await (await post({ confirm: true })).json());
    for (const secret of [OWNER_ANDROID, OWNER_IPAD, OWNER_CHROME, "owner-key", "owner-auth", "owners-chrome"]) {
      expect(listed).not.toContain(secret);
      expect(sent).not.toContain(secret);
    }
    expect(listed).not.toMatch(/"(token|endpoint|p256dh|auth)"/);
    expect(sent).not.toMatch(/"(token|endpoint|p256dh|auth)"/);
  });

  it("what each push service answered, in plain words", async () => {
    state.nativeAnswer[OWNER_IPAD] = { ok: false, gone: false, skipped: false, reason: "TopicDisallowed" };
    state.nativeAnswer[OWNER_ANDROID] = { ok: false, gone: true, skipped: false, reason: "messaging/registration-token-not-registered" };
    state.webAnswer[OWNER_CHROME] = { ok: true, gone: false };
    const { devices } = (await (await post({ confirm: true })).json()) as {
      devices: { kind: string; result: string; reason: string | null; browser: string | null; zone: string | null }[];
    };
    const by = Object.fromEntries(devices.map((d) => [d.kind, d]));
    expect(by.android).toMatchObject({ result: "gone", zone: "America/Chicago" });
    expect(by.android.reason).toMatch(/removed the app or turned notifications off/);
    expect(by.ios).toMatchObject({ result: "refused" });
    expect(by.ios.reason).toMatch(/APNS_BUNDLE_ID/);
    expect(by.web).toMatchObject({ result: "accepted", reason: null, browser: "Chrome, Edge or another Chromium browser" });
  });

  it("says when the server has no key, rather than calling it a failure", async () => {
    state.nativeAnswer[OWNER_ANDROID] = { ok: false, gone: false, skipped: true };
    state.webAnswer[OWNER_CHROME] = { ok: false, gone: false, reason: "not-configured" };
    const { devices } = (await (await post({ confirm: true })).json()) as { devices: { kind: string; result: string; reason: string | null }[] };
    const by = Object.fromEntries(devices.map((d) => [d.kind, d]));
    expect(by.android).toMatchObject({ result: "not-set-up", reason: "The server has no Firebase key." });
    expect(by.web).toMatchObject({ result: "not-set-up" });
  });
});

describe("the test's own words and names", () => {
  it("clears the notification bar every other push is held to", () => {
    expect(checkNotificationCopy(SELF_TEST_PUSH)).toEqual([]);
    expect(SELF_TEST_PUSH.url).toBe("/");
    expect(`${SELF_TEST_PUSH.title} ${SELF_TEST_PUSH.body}`).not.toMatch(/[–—]/);
  });

  it("names a browser from its push service, never echoing the address", () => {
    expect(browserOf("https://fcm.googleapis.com/fcm/send/abc")).toBe("Chrome, Edge or another Chromium browser");
    expect(browserOf("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe("Firefox");
    expect(browserOf("https://web.push.apple.com/abc")).toBe("Safari");
    expect(browserOf("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe("Edge (Windows)");
    expect(browserOf("not a url")).toBe("A browser");
    expect(browserOf("https://push.example.org/abc")).toBe("A browser");
  });
});
