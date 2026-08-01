import { describe, it, expect } from "vitest";
import {
  ANSWER_ENGINES,
  USER_TRIGGERED,
  TRAINING_BOTS,
  NEVER_CRAWLABLE,
  SCRIPTURE_PREFIX,
  TRAINABLE_PREFIX,
  allNamedAiAgents,
  isAllowed,
} from "@/lib/seo/aiCrawlers";

// The rules as app/robots.ts assembles them. Kept in the test rather than
// exported from the lib so that a change to robots.ts which forgets to change
// the policy (or vice versa) shows up as a failure here.
const SEARCH_RULE = {
  allow: ["/"],
  disallow: [...NEVER_CRAWLABLE, SCRIPTURE_PREFIX],
};
const TRAINING_RULE = {
  allow: [TRAINABLE_PREFIX, `${TRAINABLE_PREFIX}/`],
  disallow: ["/"],
};

describe("AI crawler tiers", () => {
  it("puts every named agent in exactly one tier", () => {
    const all = allNamedAiAgents();
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps training crawlers out of the search tiers", () => {
    const searchTier = new Set<string>([...ANSWER_ENGINES, ...USER_TRIGGERED]);
    for (const bot of TRAINING_BOTS) {
      expect(searchTier.has(bot)).toBe(false);
    }
  });

  // The whole point of the change: the site is reachable by AI again.
  it("still names the agents that drive traction", () => {
    expect(ANSWER_ENGINES).toContain("OAI-SearchBot");
    expect(ANSWER_ENGINES).toContain("PerplexityBot");
    expect(USER_TRIGGERED).toContain("ChatGPT-User");
    expect(USER_TRIGGERED).toContain("Claude-User");
  });
});

describe("Scripture stays closed to every AI agent", () => {
  // This is a licence obligation under the ABS / Biblica agreements, not a
  // preference. If this test ever fails, do not relax it.
  const scripturePaths = [
    "/bible",
    "/bible/",
    "/bible/john/1",
    "/bible/genesis/1",
  ];

  it("blocks Scripture for the search and user-triggered tiers", () => {
    for (const path of scripturePaths) {
      expect(isAllowed(path, SEARCH_RULE)).toBe(false);
    }
  });

  it("blocks Scripture for the training tier", () => {
    for (const path of scripturePaths) {
      expect(isAllowed(path, TRAINING_RULE)).toBe(false);
    }
  });
});

describe("training crawlers reach the saints and nothing else", () => {
  it("allows the saints tree, with or without a trailing slash", () => {
    expect(isAllowed("/saints", TRAINING_RULE)).toBe(true);
    expect(isAllowed("/saints/", TRAINING_RULE)).toBe(true);
    expect(isAllowed("/saints/john-chrysostom", TRAINING_RULE)).toBe(true);
    expect(
      isAllowed("/saints/john-chrysostom/on-the-priesthood", TRAINING_RULE),
    ).toBe(true);
  });

  it("blocks everything outside the saints tree", () => {
    for (const path of ["/", "/prayers", "/councils", "/history", "/premium"]) {
      expect(isAllowed(path, TRAINING_RULE)).toBe(false);
    }
  });
});

describe("the open library", () => {
  it("lets search and user-triggered agents read the non-Scripture library", () => {
    for (const path of [
      "/",
      "/saints/john-chrysostom",
      "/councils/first-nicaea",
      "/history/great-schism",
      "/prayers/today",
      "/about",
    ]) {
      expect(isAllowed(path, SEARCH_RULE)).toBe(true);
    }
  });

  it("never exposes the API or the admin tree to any tier", () => {
    for (const path of ["/api/shop/catalog", "/admin", "/admin/shop"]) {
      expect(isAllowed(path, SEARCH_RULE)).toBe(false);
      expect(isAllowed(path, TRAINING_RULE)).toBe(false);
    }
  });
});
