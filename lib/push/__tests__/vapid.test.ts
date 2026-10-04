import { createECDH } from "node:crypto";

import { describe, expect, it } from "vitest";

import { vapidConfig, webPushConfigured, webPushProblem } from "../providers/webpush";
import { cleanEnvValue, readVapidPrivateKey, readVapidPublicKey, readVapidSubject } from "../vapid";

function pair() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { pub: ecdh.getPublicKey().toString("base64url"), priv: ecdh.getPrivateKey().toString("base64url") };
}

const A = pair();
const B = pair();

describe("cleanEnvValue", () => {
  it("leaves a plain value alone", () => {
    expect(cleanEnvValue(A.pub)).toBe(A.pub);
  });

  it("takes off the variable's own name when the whole .env line was pasted", () => {
    // What production held on 2026-10-04, and why no browser could subscribe.
    expect(cleanEnvValue(`NEXT_PUBLIC_VAPID_KEY=${A.pub}`)).toBe(A.pub);
    expect(cleanEnvValue(`export VAPID_PUBLIC_KEY = "${A.pub}"`)).toBe(A.pub);
  });

  it("takes off quotes and stray whitespace", () => {
    expect(cleanEnvValue(`  "${A.pub}"\n`)).toBe(A.pub);
    expect(cleanEnvValue(`'${A.priv}'`)).toBe(A.priv);
  });

  it("is empty for nothing", () => {
    expect(cleanEnvValue(undefined)).toBe("");
    expect(cleanEnvValue("   ")).toBe("");
  });
});

describe("readVapidPublicKey", () => {
  it("reads a key, with or without its name in front", () => {
    expect(readVapidPublicKey(A.pub, "K")).toEqual({ ok: true, value: A.pub });
    expect(readVapidPublicKey(`NEXT_PUBLIC_VAPID_KEY=${A.pub}`, "K")).toEqual({ ok: true, value: A.pub });
  });

  it("reads standard base64 with padding as the same key", () => {
    const standard = Buffer.from(A.pub, "base64url").toString("base64");
    expect(readVapidPublicKey(standard, "K")).toEqual({ ok: true, value: A.pub });
  });

  it("says when it is unset", () => {
    expect(readVapidPublicKey(undefined, "NEXT_PUBLIC_VAPID_KEY")).toEqual({ ok: false, reason: "NEXT_PUBLIC_VAPID_KEY is not set." });
  });

  it("says when the private key was pasted in its place", () => {
    const r = readVapidPublicKey(A.priv, "VAPID_PUBLIC_KEY");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("holds a private key");
  });

  it("describes anything else by shape, never by content", () => {
    const r = readVapidPublicKey("not a key at all!", "VAPID_PUBLIC_KEY");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("17 characters");
      expect(r.reason).not.toContain("not a key");
    }
  });
});

describe("readVapidPrivateKey", () => {
  it("reads a private key", () => {
    expect(readVapidPrivateKey(`VAPID_PRIVATE_KEY=${A.priv}`, "K")).toEqual({ ok: true, value: A.priv });
  });

  it("says when the public key was pasted in its place", () => {
    const r = readVapidPrivateKey(A.pub, "VAPID_PRIVATE_KEY");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("holds the public key");
  });

  it("never repeats the value in its reason", () => {
    const r = readVapidPrivateKey(A.priv.slice(0, 20), "VAPID_PRIVATE_KEY");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).not.toContain(A.priv.slice(0, 20));
  });
});

describe("readVapidSubject", () => {
  it("takes a mailto: or an https: address", () => {
    expect(readVapidSubject("mailto:team@example.com", "S")).toEqual({ ok: true, value: "mailto:team@example.com" });
    expect(readVapidSubject("https://purifyapp.net", "S")).toEqual({ ok: true, value: "https://purifyapp.net" });
  });

  it("puts mailto: on a bare address", () => {
    expect(readVapidSubject("VAPID_SUBJECT=team@example.com", "S")).toEqual({ ok: true, value: "mailto:team@example.com" });
  });

  it("refuses anything else", () => {
    expect(readVapidSubject("Purify", "VAPID_SUBJECT").ok).toBe(false);
    expect(readVapidSubject("", "VAPID_SUBJECT")).toEqual({ ok: false, reason: "VAPID_SUBJECT is not set." });
  });
});

describe("the server's web push configuration", () => {
  const good = { VAPID_PUBLIC_KEY: A.pub, VAPID_PRIVATE_KEY: A.priv, VAPID_SUBJECT: "mailto:team@example.com", NEXT_PUBLIC_VAPID_KEY: A.pub };

  it("is ready with a pair, a subject and the same key in the browser", () => {
    expect(vapidConfig(good).ok).toBe(true);
    expect(webPushConfigured(good)).toBe(true);
    expect(webPushProblem(good)).toBeNull();
  });

  it("reads past names pasted into every value", () => {
    const pasted = {
      VAPID_PUBLIC_KEY: `VAPID_PUBLIC_KEY=${A.pub}`,
      VAPID_PRIVATE_KEY: `VAPID_PRIVATE_KEY=${A.priv}`,
      VAPID_SUBJECT: `VAPID_SUBJECT=mailto:team@example.com`,
      NEXT_PUBLIC_VAPID_KEY: `NEXT_PUBLIC_VAPID_KEY=${A.pub}`,
    };
    expect(webPushConfigured(pasted)).toBe(true);
    expect(webPushProblem(pasted)).toBeNull();
  });

  it("refuses a public and private key that are not a pair", () => {
    const r = vapidConfig({ ...good, VAPID_PRIVATE_KEY: B.priv });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not a pair");
    expect(webPushConfigured({ ...good, VAPID_PRIVATE_KEY: B.priv })).toBe(false);
  });

  it("names the browser's key when it is missing or unreadable", () => {
    expect(webPushProblem({ ...good, NEXT_PUBLIC_VAPID_KEY: undefined })).toContain("NEXT_PUBLIC_VAPID_KEY is not set.");
    expect(webPushProblem({ ...good, NEXT_PUBLIC_VAPID_KEY: "garbage!" })).toContain("NEXT_PUBLIC_VAPID_KEY cannot be read");
    // The server can still send to browsers that subscribed before.
    expect(webPushConfigured({ ...good, NEXT_PUBLIC_VAPID_KEY: undefined })).toBe(true);
  });

  it("says when browsers subscribe with a different key than the server signs with", () => {
    expect(webPushProblem({ ...good, NEXT_PUBLIC_VAPID_KEY: B.pub })).toContain("different keys");
  });

  it("names what is unset, and no value", () => {
    const problem = webPushProblem({ VAPID_PUBLIC_KEY: A.pub, VAPID_SUBJECT: "mailto:team@example.com" });
    expect(problem).toBe("VAPID_PRIVATE_KEY is not set.");
    expect(webPushConfigured({})).toBe(false);
  });
});
