import { beforeEach, describe, expect, it, vi } from "vitest";

// A reminder on a phone: how long Apple and Google may hold it, and what it
// replaces (lib/push/lifetime.ts). Nothing here reaches a push service: the
// message builders are pure, and the senders are stood in for.

const sent = vi.hoisted(() => ({ apns: [] as unknown[][], fcm: [] as unknown[][] }));

vi.mock("../providers/apns", async (importOriginal) => {
  const real = await importOriginal<typeof import("../providers/apns")>();
  return {
    ...real,
    apnsConfigured: () => true,
    sendApns: vi.fn(async (...args: unknown[]) => {
      sent.apns.push(args);
      return { ok: true };
    }),
  };
});
vi.mock("../providers/fcm", async (importOriginal) => {
  const real = await importOriginal<typeof import("../providers/fcm")>();
  return {
    ...real,
    fcmConfigured: () => true,
    sendFcm: vi.fn(async (...args: unknown[]) => {
      sent.fcm.push(args);
      return { ok: true };
    }),
  };
});

import { nativeDelivery, REMINDER_TTL_SECONDS } from "../lifetime";
import { apnsOptions } from "../providers/apns";
import { ANDROID_CHANNEL_ID, fcmMessage } from "../providers/fcm";
import { sendNativeOne } from "../send";
import { communityPushCopy, reminderCopy } from "../copy";

const supa = {
  from: () => ({ update: () => ({ eq: async () => ({}) }), delete: () => ({ eq: async () => ({}) }) }),
} as never;

beforeEach(() => {
  sent.apns = [];
  sent.fcm = [];
});

describe("nativeDelivery", () => {
  it("gives each reminder six hours and a tag of its own kind", () => {
    for (const kind of ["morning", "evening", "campaign"]) {
      expect(nativeDelivery(kind)).toEqual({ ttlSeconds: REMINDER_TTL_SECONDS, tag: kind });
    }
    expect(REMINDER_TTL_SECONDS).toBe(6 * 60 * 60);
  });

  it("leaves everything that is not a reminder to the services' defaults", () => {
    // A reply that arrives late is still a reply, and two replies are two
    // things. An alert to the owner is not a reader's reminder either.
    for (const kind of [undefined, "communityReply", "owner-sale", "billing-issue", "hourly-hit", ""]) {
      expect(nativeDelivery(kind)).toEqual({});
    }
  });
});

describe("fcmMessage: what Firebase is handed", () => {
  const morning = reminderCopy("morning");

  it("lets a reminder live six hours and replace the last one of its kind", () => {
    const m = fcmMessage("tok", morning, nativeDelivery("morning"));
    // Milliseconds here: firebase-admin turns them into the "21600s" FCM wants.
    expect(m.android.ttl).toBe(6 * 60 * 60 * 1000);
    expect(m.android.notification.tag).toBe("morning");
    expect(m.android.notification.channelId).toBe(ANDROID_CHANNEL_ID);
    expect(m.data).toEqual({ url: "/prayers/morning" });
  });

  it("sends a community push as it always went: no lifetime, no tag", () => {
    const reply = communityPushCopy("reply", "Maria", "post-1");
    const m = fcmMessage("tok", reply);
    expect(m.android).not.toHaveProperty("ttl");
    expect(m.android.notification).not.toHaveProperty("tag");
    expect(m.android.priority).toBe("high");
    expect(m.notification).toEqual({ title: reply.title, body: reply.body });
  });
});

describe("apnsOptions: what Apple is handed", () => {
  const evening = reminderCopy("evening");
  const now = Date.UTC(2026, 9, 31, 21, 0, 5);

  it("gives a reminder an expiration six hours on, and a collapse id", () => {
    const o = apnsOptions(evening, nativeDelivery("evening"), now);
    expect(o.expiration).toBe(Math.floor(now / 1000) + 6 * 60 * 60);
    expect(o.collapseId).toBe("evening");
    expect(o.data).toEqual({ url: "/prayers/evening" });
  });

  it("leaves any other push to Apple's own keeping", () => {
    const o = apnsOptions(communityPushCopy("follow", "Maria", "maria.p"), {}, now);
    expect(o).not.toHaveProperty("expiration");
    expect(o).not.toHaveProperty("collapseId");
  });
});

describe("sendNativeOne", () => {
  it("hands each phone's service the reminder's lifetime and tag", async () => {
    await sendNativeOne(supa, { token: "a", platform: "android" }, { kind: "morning", ...reminderCopy("morning") });
    await sendNativeOne(supa, { token: "i", platform: "ios" }, { kind: "evening", ...reminderCopy("evening") });
    expect(sent.fcm[0][2]).toEqual({ ttlSeconds: REMINDER_TTL_SECONDS, tag: "morning" });
    expect(sent.apns[0][2]).toEqual({ ttlSeconds: REMINDER_TTL_SECONDS, tag: "evening" });
    // The words go as they are, and the kind is not one of them.
    expect(sent.fcm[0][1]).toEqual(reminderCopy("morning"));
  });

  it("hands nothing extra for a push with no kind", async () => {
    await sendNativeOne(supa, { token: "a", platform: "android" }, communityPushCopy("gift", "Maria", null));
    expect(sent.fcm[0][2]).toEqual({});
  });
});
