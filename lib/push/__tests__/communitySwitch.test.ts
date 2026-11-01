import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/api/client", () => ({ apiFetch: async () => ({ ok: false, status: 0 }) }));

import { communityPushOn } from "@/lib/profile/client";

/**
 * Community notifications' switch, beside the reminders in Settings,
 * Notifications (components/profile/CommunityPushSwitch.tsx, 1.8). It was in
 * Edit profile alone. Both switches show one value, profiles.push_community,
 * and the server reads that same value before it sends (lib/community/push.ts).
 */

const REPO = join(__dirname, "..", "..", "..");
const source = (...parts: string[]) => readFileSync(join(REPO, ...parts), "utf8");

describe("the one value both switches show", () => {
  it("is on unless the reader turned it off, as the server reads it", () => {
    expect(communityPushOn(null)).toBe(true);
    expect(communityPushOn({ settings: undefined } as never)).toBe(true);
    expect(communityPushOn({ settings: { pushCommunity: true } } as never)).toBe(true);
    expect(communityPushOn({ settings: { pushCommunity: false } } as never)).toBe(false);
    expect(source("lib", "community", "push.ts")).toContain("p.push_community === false");
  });

  it("is written by the Settings switch through the same field as Edit profile", () => {
    const sw = source("components", "profile", "CommunityPushSwitch.tsx");
    expect(sw).toContain("saveMyProfile({ pushCommunity: next })");
    expect(sw).toContain("communityPushOn(r.profile)");
    expect(source("components", "community", "profile", "ProfileEditor.tsx")).toContain("patch.pushCommunity = draft.pushCommunity");
    expect(source("app", "api", "profile", "me", "route.ts")).toContain("patch.push_community = p.pushCommunity");
  });

  it("stands beside the reminders, on the phone's Notifications screen and the computer's Data tab", () => {
    const signed = join("app", "(app)", "account", "(signed)");
    expect(source(signed, "notifications", "page.tsx")).toMatch(/<PushOptIn \/>\s*<CommunityPushSwitch \/>/);
    expect(source(signed, "data", "page.tsx")).toMatch(/<PushOptIn \/>\s*<CommunityPushSwitch \/>/);
  });

  it("is drawn only where Community is open, and never at a guess", () => {
    const sw = source("components", "profile", "CommunityPushSwitch.tsx");
    expect(sw).toContain("if (!communityEnabled()) return;");
    expect(sw).toContain('if (state.kind !== "ready") return null;');
  });
});
