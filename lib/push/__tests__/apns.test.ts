import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for Apple: each server answers from a script, keyed by host.
const { answers, asked } = vi.hoisted(() => ({
  answers: {} as Record<string, (token: string) => string | Error | null>,
  asked: [] as string[],
}));

vi.mock("apns2", () => {
  class Notification {
    constructor(
      public deviceToken: string,
      public options: unknown,
    ) {}
  }
  class ApnsClient {
    host: string;
    constructor(o: { host: string }) {
      this.host = o.host;
    }
    async send(n: Notification) {
      asked.push(this.host);
      const answer = answers[this.host]?.(n.deviceToken) ?? null;
      if (typeof answer === "string") throw Object.assign(new Error("apns"), { reason: answer });
      if (answer) throw answer;
      return n;
    }
  }
  class SilentNotification extends Notification {}
  return {
    ApnsClient,
    Notification,
    SilentNotification,
    Host: { production: "api.push.apple.com", development: "api.sandbox.push.apple.com" },
  };
});

const KEY = "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg\n-----END PRIVATE KEY-----\n";
const MSG = { title: "t", body: "b", url: "/" };
const PROD = "api.push.apple.com";
const SANDBOX = "api.sandbox.push.apple.com";

async function fresh() {
  vi.resetModules();
  return import("@/lib/push/providers/apns");
}

beforeEach(() => {
  asked.length = 0;
  for (const k of Object.keys(answers)) delete answers[k];
  vi.stubEnv("APNS_KEY_P8", KEY);
  vi.stubEnv("APNS_KEY_ID", "HQ2AT24HHZ");
  vi.stubEnv("APNS_TEAM_ID", "ABCDE12345");
  vi.stubEnv("APNS_BUNDLE_ID", "net.purifyapp.purify");
  vi.stubEnv("APNS_PRODUCTION", "");
});

describe("sendApns", () => {
  it("asks production first, since every installable build registers there", async () => {
    const { sendApns } = await fresh();
    expect(await sendApns("a".repeat(64), MSG)).toEqual({ ok: true });
    expect(asked).toEqual([PROD]);
  });

  it("starts with the sandbox only when APNS_PRODUCTION is false", async () => {
    vi.stubEnv("APNS_PRODUCTION", "false");
    const { sendApns } = await fresh();
    await sendApns("a".repeat(64), MSG);
    expect(asked).toEqual([SANDBOX]);
  });

  it("delivers a sandbox token through the other server instead of judging it", async () => {
    answers[PROD] = () => "BadDeviceToken";
    const { sendApns } = await fresh();
    expect(await sendApns("a".repeat(64), MSG)).toEqual({ ok: true });
    expect(asked).toEqual([PROD, SANDBOX]);
  });

  it("does not ask the other server when the key itself is refused, and never prunes for it", async () => {
    answers[PROD] = () => "InvalidProviderToken";
    const { sendApns } = await fresh();
    expect(await sendApns("a".repeat(64), MSG)).toEqual({ ok: false, gone: false, reason: "InvalidProviderToken" });
    expect(asked).toEqual([PROD]);
  });

  it("deletes nothing until a delivery has proved the settings", async () => {
    // A wrong APNS_BUNDLE_ID: every phone answers DeviceTokenNotForTopic.
    answers[PROD] = () => "DeviceTokenNotForTopic";
    const { sendApns } = await fresh();
    for (let i = 0; i < 5; i++) {
      const r = await sendApns(String(i).repeat(64), MSG);
      expect(r).toEqual({ ok: false, gone: false, reason: "DeviceTokenNotForTopic" });
    }
  });

  it("prunes a token both servers refuse, once a delivery has succeeded", async () => {
    const dead = "d".repeat(64);
    function refuseDead(token: string): string | null {
      return token === dead ? "BadDeviceToken" : null;
    }
    answers[PROD] = refuseDead;
    answers[SANDBOX] = refuseDead;
    const { sendApns } = await fresh();
    expect((await sendApns(dead, MSG)).ok).toBe(false);
    expect(await sendApns(dead, MSG)).toEqual({ ok: false, gone: false, reason: "BadDeviceToken" });
    await sendApns("a".repeat(64), MSG);
    expect(await sendApns(dead, MSG)).toEqual({ ok: false, gone: true, reason: "BadDeviceToken" });
  });
});

describe("checkApns", () => {
  it("passes on BadDeviceToken: the key was accepted, the made-up token was not", async () => {
    answers[PROD] = () => "BadDeviceToken";
    const { checkApns } = await fresh();
    expect(await checkApns()).toEqual({ ok: true, reason: "BadDeviceToken" });
  });

  it("fails with Apple's reason when the key is refused, and asks at most once in ten minutes", async () => {
    answers[PROD] = () => "InvalidProviderToken";
    const { checkApns } = await fresh();
    expect(await checkApns()).toEqual({ ok: false, reason: "InvalidProviderToken" });
    await checkApns();
    expect(asked).toEqual([PROD]);
  });

  it("blames the key when it cannot sign, before anything reaches Apple", async () => {
    answers[PROD] = () => Object.assign(new Error("bad key"), { code: "FAST_JWT_INVALID_KEY" });
    const { checkApns } = await fresh();
    expect(await checkApns()).toEqual({ ok: false, reason: "InvalidSigningKey" });
  });

  it("says nothing about the key when Apple cannot be reached, and asks again next time", async () => {
    answers[PROD] = () => Object.assign(new Error("timeout"), { code: "UND_ERR_CONNECT_TIMEOUT" });
    const { checkApns } = await fresh();
    expect(await checkApns()).toBeNull();
    expect(await checkApns()).toBeNull();
    expect(asked).toEqual([PROD, PROD]);
  });

  it("does not ask Apple at all when the key cannot be read", async () => {
    vi.stubEnv("APNS_KEY_P8", "-----BEGIN PRIVATE KEY-----");
    const { checkApns } = await fresh();
    expect(await checkApns()).toBeNull();
    expect(asked).toEqual([]);
  });
});
