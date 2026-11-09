// The admin's second sign-in step (A4): the rule, and the small helpers the
// screens use. What matters most is that an admin who has added the code app
// can never reach the panel without typing a code, and that turning the
// requirement on can never lock out an admin who has not added one yet
// without first offering the setup.

import { describe, expect, it } from "vitest";

import { aalOf, adminGate, cleanCode, groupKey, qrImageSrc, secondStepRequired, verifiedFactorCount } from "../secondStep";

const jwt = (payload: Record<string, unknown>) =>
  ["e30", Buffer.from(JSON.stringify(payload)).toString("base64url"), "sig"].join(".");

describe("aalOf", () => {
  it("reads the level a token was issued at", () => {
    expect(aalOf(jwt({ aal: "aal2", sub: "x" }))).toBe("aal2");
    expect(aalOf(jwt({ aal: "aal1" }))).toBe("aal1");
  });

  it("is null for a token without one, or for anything that is not a token", () => {
    expect(aalOf(jwt({ sub: "x" }))).toBeNull();
    expect(aalOf("not-a-jwt")).toBeNull();
    expect(aalOf("a.%%%.c")).toBeNull();
    expect(aalOf(null)).toBeNull();
  });
});

describe("adminGate", () => {
  it("asks for the code whenever the admin has a factor and the session is not at aal2", () => {
    expect(adminGate({ aal: "aal1", verifiedFactors: 1, required: false })).toBe("verify");
    expect(adminGate({ aal: null, verifiedFactors: 1, required: false })).toBe("verify");
    expect(adminGate({ aal: "aal1", verifiedFactors: 2, required: true })).toBe("verify");
  });

  it("opens once the code has been typed", () => {
    expect(adminGate({ aal: "aal2", verifiedFactors: 1, required: false })).toBe("ok");
    expect(adminGate({ aal: "aal2", verifiedFactors: 1, required: true })).toBe("ok");
  });

  it("keeps today's access before setup, unless the server requires it, and then offers setup first", () => {
    expect(adminGate({ aal: "aal1", verifiedFactors: 0, required: false })).toBe("ok");
    expect(adminGate({ aal: "aal1", verifiedFactors: 0, required: true })).toBe("enroll");
  });
});

describe("the helpers", () => {
  it("is required only on the server's word", () => {
    expect(secondStepRequired({ ADMIN_MFA: "required" })).toBe(true);
    expect(secondStepRequired({ ADMIN_MFA: " Required " })).toBe(true);
    expect(secondStepRequired({ ADMIN_MFA: "yes" })).toBe(false);
    expect(secondStepRequired({})).toBe(false);
  });

  it("counts only verified factors, never one left half set up", () => {
    expect(verifiedFactorCount([{ status: "verified" }, { status: "unverified" }])).toBe(1);
    expect(verifiedFactorCount(undefined)).toBe(0);
  });

  it("takes six digits however they were typed or pasted", () => {
    expect(cleanCode("123456")).toBe("123456");
    expect(cleanCode(" 123 456 ")).toBe("123456");
    expect(cleanCode("12345")).toBeNull();
    expect(cleanCode("1234567")).toBeNull();
  });

  it("makes the QR code's address safe for a colour's #, however Supabase sent it", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#fff"/></svg>';
    const fromSupabase = qrImageSrc(`data:image/svg+xml;utf-8,${svg}`);
    expect(fromSupabase.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(fromSupabase).not.toContain("#");
    expect(decodeURIComponent(fromSupabase.split(",").slice(1).join(","))).toBe(svg);
    expect(qrImageSrc(svg)).toBe(fromSupabase);
    // Anything else is left as it came.
    expect(qrImageSrc("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("groups a setup key by four", () => {
    expect(groupKey("ABCDEFGHIJKL")).toBe("ABCD EFGH IJKL");
    expect(groupKey("ABCDE")).toBe("ABCD E");
  });
});
