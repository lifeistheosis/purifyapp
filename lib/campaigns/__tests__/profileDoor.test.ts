import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { CAMPAIGNS_DOOR, profileDoors } from "@/lib/profile/doors";

/**
 * The Campaigns door on a profile (1.9, phase 4; the notes, 2.10 and section
 * 35). What a profile may show of its owner's campaigns is the server's
 * rule, held through the route in routes.test.ts ("a reader's profile: the
 * Campaigns door"). This file holds the screens to it.
 *
 *   only with something behind it   the door is drawn on a profile that has
 *                                   a campaign to show, and on no other;
 *   never asked for nothing         no request while campaigns are closed,
 *                                   while the card is shut, before the
 *                                   profile has come, or for a private one;
 *   never one profile's under       a list is shown only for the handle it
 *   another's name                  was asked for;
 *   rows, and a way out             each campaign is a row that opens its
 *                                   page, and the card steps aside;
 *   not on the page a search        the shareable profile page, which a
 *   engine can read                 search engine may read, shows none.
 *
 * What would go wrong if this broke: a door that opens on an empty box; one
 * reader's campaigns drawn under another reader's name for a moment; or a
 * sick person's first name on a page a search engine keeps.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("the door", () => {
  const profile = { private: false, postsHidden: false, badges: [], bio: "A reader.", patronSaint: null, favoriteVerse: null, joinedAt: null, parish: null, nowReading: null };

  it("is drawn only when the viewer says there is a campaign behind it", () => {
    expect(profileDoors(profile)).not.toContain("campaigns");
    expect(profileDoors(profile, { campaigns: false })).not.toContain("campaigns");
    expect(profileDoors(profile, { campaigns: true }).at(-1)).toBe("campaigns");
    // On by what a profile has, not for everyone: the constant stays off.
    expect(CAMPAIGNS_DOOR).toBe(false);
  });

  it("has a name in the catalog already", () => {
    expect((en as Record<string, string>)["profile.tabCampaigns"]).toBe("Campaigns");
  });
});

describe("the viewer", () => {
  const viewer = read("components/community/profile/ProfileViewer.tsx");

  it("asks only once the profile itself has come, with the card open, and never for a private profile", () => {
    expect(viewer).toContain('const campaigns = useProfileCampaigns(open && loaded.state === "ok" && !loaded.profile.private ? loaded.profile.handle : null);');
  });

  it("asks before any return, as a hook must", () => {
    const hook = viewer.indexOf("const campaigns = useProfileCampaigns(");
    const firstReturn = viewer.indexOf('if (!mounted || typeof document === "undefined") return null;');
    expect(hook).toBeGreaterThan(0);
    expect(firstReturn).toBeGreaterThan(hook);
  });

  it("draws the door only where a campaign stands behind it, and its panel never as an empty box", () => {
    expect(viewer).toContain("profileDoors(profile, { inCommon: mutuals.length, campaigns: campaigns.length > 0 })");
    expect(viewer).toContain("campaigns: campaigns.length > 0 ? <ProfileCampaigns campaigns={campaigns} onOpen={onClose} /> : undefined,");
  });
});

describe("the hook", () => {
  const hook = read("lib/campaigns/useProfileCampaigns.ts");

  it("asks nobody while campaigns are not open for this reader, or with no handle", () => {
    expect(hook).toContain("const open = useCampaignsOpen();");
    expect(hook).toContain("if (!open || !handle) return;");
  });

  it("never shows one profile's list under another's name", () => {
    expect(hook).toContain("if (live) setFound({ handle, list });");
    expect(hook).toContain("return open && handle && found && found.handle === handle ? found.list : NONE;");
  });

  it("is empty for anything that is not a list: closed, not there, or unread", () => {
    const client = read("lib/campaigns/client.ts");
    const fn = /export async function fetchByCreator\([\s\S]*?\n\}/.exec(client)?.[0] ?? "";
    expect(fn).toContain("if (!campaignsInBuild() || !handle) return [];");
    expect(fn).toContain("if (!res.ok) return [];");
    expect(fn).toMatch(/\} catch \{\s*return \[\];/);
  });
});

describe("the panel", () => {
  const panel = read("components/campaigns/ProfileCampaigns.tsx");
  const row = read("components/campaigns/CampaignRow.tsx");

  it("is the board's own rows in one lit panel, and nothing when there is none", () => {
    expect(panel).toContain("if (campaigns.length === 0) return null;");
    expect(panel).toMatch(/className="set-panel">\s*\{campaigns\.map\(\(c\) => \(\s*<BoardRow key=\{c\.id\} campaign=\{c\} onOpen=\{onOpen\} \/>/);
  });

  it("is rows that open a page, never pills, and has no bar down its side", () => {
    expect(panel).not.toMatch(/rounded-pill|rounded-full/);
    expect(panel).not.toMatch(/border-[lrse]-|border-inline/);
    // The row is a link to the campaign's own page, and tells what it stands on to step aside.
    expect(row).toContain('<Link href={campaignHref(id)} onClick={onOpen} data-campaign-row=""');
  });
});

describe("the shareable profile page", () => {
  it("shows no campaigns: it is a page a search engine may read, and campaigns are not for search", () => {
    const shared = read("components/community/profile/SharedProfile.tsx");
    expect(shared).not.toMatch(/useProfileCampaigns|ProfileCampaigns|campaigns:/);
    expect(shared).toContain("doors={profileDoors(profile, { posts: false })}");
  });
});
