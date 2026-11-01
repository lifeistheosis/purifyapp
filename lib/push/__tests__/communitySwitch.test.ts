import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/api/client", () => ({ apiFetch: async () => ({ ok: false, status: 0 }) }));

import { communityPushOn } from "@/lib/profile/client";

/**
 * Community notifications' switch, beside the reminders in Settings,
 * Notifications (components/profile/CommunityPushSwitch.tsx, 1.8). It was in
 * Edit profile alone. Every switch shows one value, profiles.push_community,
 * and the server reads that same value before it sends (lib/community/push.ts).
 *
 * Asked for, never on by default (CONTRIBUTING's reminders bar, clause 1):
 * every profile used to start with them on, so turning prayer reminders on
 * was all it took to receive them. Five places read "not set" as on: the
 * column's default, the server's send, the server's read of a profile, the
 * app's read, and Edit profile's draft. Each now reads it as off, a new
 * profile starts off (20261101043955), and the welcome questions offer the
 * choice beside the reminders.
 */

const REPO = join(__dirname, "..", "..", "..");
const source = (...parts: string[]) => readFileSync(join(REPO, ...parts), "utf8");

describe("the one value every switch shows", () => {
  it("is off unless the reader turned it on, as the server reads it", () => {
    expect(communityPushOn(null)).toBe(false);
    expect(communityPushOn({ settings: undefined } as never)).toBe(false);
    expect(communityPushOn({ settings: { pushCommunity: true } } as never)).toBe(true);
    expect(communityPushOn({ settings: { pushCommunity: false } } as never)).toBe(false);
    expect(source("lib", "community", "push.ts")).toContain("p.push_community === true");
    expect(source("lib", "profile", "server.ts")).toContain("pushCommunity: row.push_community === true");
    expect(source("components", "community", "profile", "ProfileEditor.tsx")).toContain("pushCommunity: p.settings?.pushCommunity ?? false");
  });

  it("starts off for a new profile, and changes nobody's current setting", () => {
    const migration = source("supabase", "migrations", "20261101043955_push_community_asked_for.sql");
    expect(migration).toMatch(/alter table public\.profiles\s+alter column push_community set default false;/);
    // Only the default: no row is written, so a reader who has them on keeps them.
    expect(migration).not.toMatch(/^\s*update\b/im);
    expect(migration).not.toMatch(/^\s*insert\b/im);
  });

  it("is offered beside the reminders as they turn on, off until turned on", () => {
    const remindersOn = source("components", "onboarding", "RemindersOn.tsx");
    expect(remindersOn).toMatch(/<CommunityPushSwitch variant="row"[^>]*\/>\s*<PrimaryButton onClick=\{onContinue\}>/);
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
