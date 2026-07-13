import { describe, expect, it } from "vitest";

import {
  INTENTIONS,
  PRAY_COOLDOWN_MS,
  canPrayAgain,
  intentionLabel,
  isIntention,
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
