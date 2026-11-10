// The switch for Prayer Campaigns.
//
// WITHDRAWN FROM THE WEB 2026-08-26, PENDING A REWORK, and reworked from
// 2026-11-10 (docs/1.9-build/notes/campaigns-fable.md). The withdrawal's own
// reasoning still holds and is kept here:
//
//   - The switch is a constant in version control, not a value in an env
//     panel. It carries a date and a reason, and it cannot be switched back on
//     by accident from a dashboard. NEXT_PUBLIC_CAMPAIGNS_ENABLED, which July's
//     build read, is no longer read at all: a value set on Render and unset in
//     one of the app builds would have had the website and an app disagree.
//   - NOTHING WAS DELETED when it was withdrawn. July's tables stay, and the
//     rework builds on them.
//
// THREE POSITIONS (the owner's yes to item 116, 2026-11-10: "Campaigns are
// built now behind a switch, you test them first, and they lead a small 1.9.1
// right after"):
//
//   closed    As from 2026-08-26. Every campaign page is a 404 in the build,
//             every campaign route answers 404, and no screen draws or asks
//             anything of campaigns. An app built closed has no campaign
//             pages in it at all.
//   testers   The routes answer only for the accounts the server names as
//             admins, the same answer Testers mode asks for from a phone
//             (app/api/admin/whoami), and 404 for everyone else. Seeing
//             campaigns early gives no powers: moderating still asks for the
//             sign-in code (lib/community/adminStanding.ts).
//   open      Every reader.
//
// WHY THE MIDDLE ONE. A test build talks to the live website and database
// until release day, and this constant is cut into a build when the build is
// made. With two positions the owner could not walk campaigns on his phone
// before they were either open to everyone or missing from the build.
//
// HOW IT IS OBEYED. The website obeys the constant on a push. An app carries
// the campaign pages unless its build says closed, and shows the doors to
// them only when the server answers (lib/campaigns/useCampaignsOpen.ts), so
// an app follows the website with no new store build.
//
// A BUILD SENT TO A STORE'S REVIEW IS CUT CLOSED OR OPEN, NEVER TESTERS: a
// feature asleep in a reviewed build is what Apple's guidelines 2.3.1 and
// 2.5.19 warn of.
//
// BEFORE IT LEAVES CLOSED: the SQL of the rework (docs/1.9-build/notes/
// campaigns-fable.md, 5.2) must have run on production, which is the owner's
// to sign and to run. Until it has, the new columns are absent and the routes
// answer 404 whatever this says (lib/campaigns/opening.ts).

export type CampaignsOpening = "closed" | "testers" | "open";

/** The switch. Closed since 2026-08-26; the rework is built behind it. */
export const CAMPAIGNS_OPENING: CampaignsOpening = "closed" as CampaignsOpening;

let opening: CampaignsOpening = CAMPAIGNS_OPENING;

/** Where the switch stands. */
export function campaignsOpening(): CampaignsOpening {
  return opening;
}

/** Test seam: the switch as a case needs it. Never called by the app. */
export function __setCampaignsOpening(next: CampaignsOpening): void {
  opening = next;
}

/**
 * The campaign pages are in this build, and its screens may ask the server
 * whether campaigns are open for this reader. False in a closed build, which
 * then draws nothing of campaigns and sends nothing about them.
 */
export function campaignsInBuild(): boolean {
  return opening !== "closed";
}

/**
 * Campaigns are open to every reader. What tells readers about campaigns
 * (the pricing copy, lib/premium/plans.ts) follows this, so nothing is
 * advertised while only testers can reach it.
 */
export function campaignsEnabled(): boolean {
  return opening === "open";
}

/**
 * July's routes the rework retires, whatever the switch says: "prayed today"
 * with its counters (app/api/campaigns/[id]/pray), the daily reminder
 * ([id]/remind), the picture stored as uploaded (image) and the groups inside
 * a campaign ([id]/groups, groups). Counting went on 2026-08-22
 * (CONTRIBUTING.md, "On prayer, no figures at all"), the reminder and the
 * picture come back in their own phases in a new form, and the groups are
 * Read together's circles now. They are kept, not deleted, and they answer
 * 404.
 */
export function julyCampaignRoutes(): boolean {
  return false;
}
