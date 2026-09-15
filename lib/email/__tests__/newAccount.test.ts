import { describe, expect, it } from "vitest";

import { isNewAccount, WELCOME_WINDOW_MS } from "../newAccount";

const NOW = new Date("2026-09-14T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("isNewAccount", () => {
  it("welcomes an account made minutes ago", () => {
    expect(isNewAccount(ago(5 * 60_000), NOW)).toBe(true);
  });

  it("still welcomes someone who clicked their confirmation link two days later", () => {
    expect(isNewAccount(ago(2 * 86_400_000), NOW)).toBe(true);
  });

  it("does not welcome a reader who has been here for months and just signed in again", () => {
    expect(isNewAccount("2026-05-20T09:00:00Z", NOW)).toBe(false);
    expect(isNewAccount(ago(WELCOME_WINDOW_MS + 1), NOW)).toBe(false);
  });

  it("tolerates a little clock skew and refuses nonsense", () => {
    expect(isNewAccount(new Date(NOW.getTime() + 30_000).toISOString(), NOW)).toBe(true);
    expect(isNewAccount(new Date(NOW.getTime() + 3_600_000).toISOString(), NOW)).toBe(false);
    expect(isNewAccount(null, NOW)).toBe(false);
    expect(isNewAccount("yesterday", NOW)).toBe(false);
  });
});
