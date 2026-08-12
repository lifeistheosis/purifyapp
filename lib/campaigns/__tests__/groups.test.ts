import { describe, expect, it } from "vitest";

import {
  INVITE_CODE_LENGTH,
  isInviteCode,
  isValidGroupName,
  makeInviteCode,
  normalizeInviteCode,
  sortMembers,
  type GroupMember,
} from "@/lib/campaigns/groups";

describe("isInviteCode", () => {
  it("accepts six upper-case alphanumerics", () => {
    expect(isInviteCode("A3K9PQ")).toBe(true);
  });

  it("rejects the wrong length, lower case and punctuation", () => {
    expect(isInviteCode("A3K9P")).toBe(false);
    expect(isInviteCode("A3K9PQR")).toBe(false);
    expect(isInviteCode("a3k9pq")).toBe(false);
    expect(isInviteCode("A3K9-Q")).toBe(false);
    expect(isInviteCode("")).toBe(false);
  });
});

describe("normalizeInviteCode", () => {
  // Codes are read aloud after Liturgy and written on a pew sheet, so they
  // arrive lower case, spaced, or hyphenated. Making the reader retype is a
  // worse answer than accepting what they typed.
  it("upper-cases and strips spaces and dashes", () => {
    expect(normalizeInviteCode(" a3k 9pq ")).toBe("A3K9PQ");
    expect(normalizeInviteCode("a3k-9pq")).toBe("A3K9PQ");
    expect(normalizeInviteCode("A3K9PQ")).toBe("A3K9PQ");
  });

  it("produces something isInviteCode accepts", () => {
    expect(isInviteCode(normalizeInviteCode("a3k-9 pq"))).toBe(true);
  });
});

describe("makeInviteCode", () => {
  it("is the declared length and passes its own validator", () => {
    const code = makeInviteCode(() => 0);
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(isInviteCode(code)).toBe(true);
  });

  it("omits the characters people confuse by hand", () => {
    // Walk the whole alphabet by index so every reachable character is
    // checked, not just the ones one seed happens to hit.
    let i = 0;
    const code = makeInviteCode(() => i++);
    expect(code).not.toMatch(/[ILO01]/);
  });

  it("clamps an out-of-range index rather than producing undefined", () => {
    expect(isInviteCode(makeInviteCode(() => 9999))).toBe(true);
    expect(isInviteCode(makeInviteCode(() => -5))).toBe(true);
  });
});

describe("isValidGroupName", () => {
  it("accepts a real parish name", () => {
    expect(isValidGroupName("St Nicholas, Dallas")).toBe(true);
  });

  it("rejects too short and too long, counting after trim", () => {
    expect(isValidGroupName("a")).toBe(false);
    expect(isValidGroupName("  a  ")).toBe(false);
    expect(isValidGroupName("x".repeat(61))).toBe(false);
    expect(isValidGroupName("x".repeat(60))).toBe(true);
  });
});

describe("sortMembers", () => {
  const member = (name: string, joined: string): GroupMember => ({
    user_id: name,
    member_name: name,
    joined_at: joined,
  });

  it("orders by when people arrived, not by name", () => {
    const out = sortMembers([
      member("Zoe", "2026-08-01T00:00:00Z"),
      member("Anna", "2026-08-03T00:00:00Z"),
    ]);
    expect(out.map((m) => m.member_name)).toEqual(["Zoe", "Anna"]);
  });

  it("breaks ties on name so the order is stable across refetches", () => {
    const out = sortMembers([
      member("Zoe", "2026-08-01T00:00:00Z"),
      member("Anna", "2026-08-01T00:00:00Z"),
    ]);
    expect(out.map((m) => m.member_name)).toEqual(["Anna", "Zoe"]);
  });

  it("does not mutate its input", () => {
    const input = [
      member("Zoe", "2026-08-03T00:00:00Z"),
      member("Anna", "2026-08-01T00:00:00Z"),
    ];
    sortMembers(input);
    expect(input.map((m) => m.member_name)).toEqual(["Zoe", "Anna"]);
  });

  it("survives a malformed timestamp instead of throwing", () => {
    const out = sortMembers([member("Zoe", "nonsense"), member("Anna", "also")]);
    expect(out).toHaveLength(2);
  });
});
