import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Community notifications on a reader's devices (lib/community/push.ts):
 * nobody named, in the reader's own language, and a reader who switched them
 * off left alone even on a database that does not know languages yet.
 */

const state = vi.hoisted(() => ({
  sent: [] as { title: string; body: string; url: string }[],
  languageColumn: true,
  profiles: [] as { id: string; push_community?: boolean | null; preferred_language?: string | null }[],
}));

vi.mock("@/lib/push/send", () => ({
  broadcast: vi.fn(async (_admin: unknown, payload: { title: string; body: string; url: string }) => {
    state.sent.push(payload);
    return { web: {}, native: {} };
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false }));

import { sendCommunityPushes } from "../push";

const admin = {
  from(table: string) {
    let columns = "";
    const q = {
      select(cols: string) {
        columns = cols;
        return q;
      },
      in() {
        return q;
      },
      limit() {
        return q;
      },
      then(resolve: (v: unknown) => void) {
        if (table === "profiles") {
          if (columns.includes("preferred_language") && !state.languageColumn) {
            return resolve({ data: null, error: { code: "42703", message: "column profiles.preferred_language does not exist" } });
          }
          return resolve({ data: state.profiles, error: null });
        }
        if (table === "device_push_tokens") {
          return resolve({ data: state.profiles.map((p) => ({ user_id: p.id, token: `t-${p.id}`, platform: "android" })), error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return q;
  },
} as never;

beforeEach(() => {
  state.sent = [];
  state.languageColumn = true;
  state.profiles = [];
});

describe("sendCommunityPushes", () => {
  it("names nobody, and speaks the reader's language", async () => {
    state.profiles = [{ id: "u1", push_community: true, preferred_language: "el" }];
    await sendCommunityPushes(admin, [{ user_id: "u1", kind: "reply", post_id: "p1", actor_handle: "maria.p" }]);
    expect(state.sent).toEqual([
      { title: "Κάποιος απάντησε στην ανάρτησή σας", body: "Θα το βρείτε στην Κοινότητα.", url: "/community#post-p1" },
    ]);
  });

  it("speaks English to a reader whose language is not known", async () => {
    state.profiles = [{ id: "u1", push_community: null, preferred_language: null }];
    await sendCommunityPushes(admin, [{ user_id: "u1", kind: "follow", actor_handle: "maria.p" }]);
    expect(state.sent[0]).toMatchObject({ title: "Someone followed you", url: "/community#@maria.p" });
  });

  it("leaves alone a reader who switched them off, even where languages are not kept yet", async () => {
    // Asked for together on a database without the language column, the read
    // fails, and a failed read counts everyone as on.
    state.languageColumn = false;
    state.profiles = [
      { id: "off", push_community: false },
      { id: "on", push_community: true },
    ];
    await sendCommunityPushes(admin, [
      { user_id: "off", kind: "mention", post_id: "p1" },
      { user_id: "on", kind: "mention", post_id: "p1" },
    ]);
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].title).toBe("Someone mentioned you");
  });
});
