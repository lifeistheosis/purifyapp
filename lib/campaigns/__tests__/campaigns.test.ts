import { describe, expect, it } from "vitest";

import {
  INTENTIONS,
  PRAY_COOLDOWN_MS,
  canPrayAgain,
  daysLeft,
  defaultPrayerKey,
  intentionLabel,
  isFinished,
  isIntention,
  isPrayerKey,
  prayerText,
  presetsFor,
  statusLabel,
  suggestedPrayer,
} from "@/lib/campaigns/campaigns";

describe("prayer campaign helpers", () => {
  it("keeps the six intentions with the departed defaulting to departed", () => {
    expect(INTENTIONS).toHaveLength(6);
    const slugs = INTENTIONS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(6);
    expect(INTENTIONS.find((i) => i.slug === "departed")?.defaultFor).toBe(
      "departed",
    );
    expect(INTENTIONS.find((i) => i.slug === "healing")?.defaultFor).toBe(
      "living",
    );
  });

  it("validates intention slugs", () => {
    expect(isIntention("healing")).toBe(true);
    expect(isIntention("departed")).toBe(true);
    expect(isIntention("nonsense")).toBe(false);
    expect(isIntention(null)).toBe(false);
    expect(isIntention(3)).toBe(false);
  });

  it("labels intentions and closed statuses", () => {
    expect(intentionLabel("healing")).toBe("Healing");
    expect(intentionLabel("departed")).toBe("The departed");
    expect(statusLabel("answered")).toMatch(/glory to god/i);
    expect(statusLabel("memory_eternal")).toBe("Memory eternal");
    expect(statusLabel("active")).toBeNull();
    expect(statusLabel("removed")).toBeNull();
  });

  it("gates prayer to once a day off the cooldown", () => {
    const now = Date.now();
    expect(canPrayAgain(null, now)).toBe(true);
    expect(canPrayAgain(undefined, now)).toBe(true);
    expect(canPrayAgain(new Date(now).toISOString(), now)).toBe(false);
    // 19h ago is still "today"; 21h ago clears the ~20h gate.
    expect(
      canPrayAgain(new Date(now - 19 * 3600_000).toISOString(), now),
    ).toBe(false);
    expect(
      canPrayAgain(new Date(now - 21 * 3600_000).toISOString(), now),
    ).toBe(true);
    // Exactly at the cooldown boundary is allowed.
    expect(canPrayAgain(new Date(now - PRAY_COOLDOWN_MS).toISOString(), now)).toBe(
      true,
    );
    // A garbage timestamp fails open to allowing prayer, never a hard error.
    expect(canPrayAgain("not-a-date", now)).toBe(true);
  });

  it("suggests a departed prayer whenever the campaign is for the reposed", () => {
    expect(suggestedPrayer("departed", "departed")).toMatch(/memory/i);
    // for_whom departed wins even with a living-shaped intention.
    expect(suggestedPrayer("healing", "departed")).toMatch(/fallen asleep/i);
    expect(suggestedPrayer("healing", "living")).toMatch(/healing/i);
    expect(suggestedPrayer("thanksgiving", "living")).toMatch(/thank/i);
    expect(suggestedPrayer("persecuted", "living")).toMatch(/deliver/i);
  });
});

describe("preset prayers", () => {
  it("defaults every intention to a real preset", () => {
    for (const i of INTENTIONS) expect(isPrayerKey(defaultPrayerKey(i.slug))).toBe(true);
    expect(defaultPrayerKey("departed")).toBe("memory-eternal");
  });

  it("presetsFor filters by context but keeps the shared prayers", () => {
    const living = presetsFor("living").map((p) => p.key);
    const departed = presetsFor("departed").map((p) => p.key);
    expect(living).toContain("for-the-sick");
    expect(living).not.toContain("memory-eternal");
    expect(departed).toContain("memory-eternal");
    expect(departed).not.toContain("for-the-sick");
    expect(living).toContain("jesus-prayer");
    expect(departed).toContain("jesus-prayer");
  });

  it("prayerText uses the chosen preset, else the intention default", () => {
    expect(
      prayerText({ prayer_key: "trisagion", intention: "healing", for_whom: "living" }),
    ).toMatch(/holy god/i);
    expect(
      prayerText({ prayer_key: null, intention: "healing", for_whom: "living" }),
    ).toMatch(/healing/i);
    expect(
      prayerText({ prayer_key: "no-such-key", intention: "departed", for_whom: "departed" }),
    ).toMatch(/memory/i);
  });
});

describe("campaign duration", () => {
  const NOW = new Date("2026-07-13T12:00:00Z").getTime();
  const inDays = (n: number) => new Date(NOW + n * 24 * 3600_000).toISOString();

  it("daysLeft is null when ongoing and whole days otherwise", () => {
    expect(daysLeft(null, NOW)).toBeNull();
    expect(daysLeft(inDays(3), NOW)).toBe(3);
    expect(daysLeft(inDays(-1), NOW)).toBe(0);
  });

  it("isFinished when closed, removed, or past the end", () => {
    expect(isFinished({ status: "active", ends_at: null }, NOW)).toBe(false);
    expect(isFinished({ status: "answered", ends_at: null }, NOW)).toBe(true);
    expect(isFinished({ status: "active", ends_at: inDays(1) }, NOW)).toBe(false);
    expect(isFinished({ status: "active", ends_at: inDays(-1) }, NOW)).toBe(true);
  });
});
