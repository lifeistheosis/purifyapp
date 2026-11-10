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
// THREE POSITIONS. The owner's yes to item 116 (2026-11-10) was to build
// campaigns behind a switch, for him to test first, and to lead a small
// release after 1.9. His later word the same day moved them into 1.9 itself
// ("ok to all ensure its all in v1.9"), with his walk on release day: the
// website first, the store builds on internal testing, his walk, and only
// then the stores (docs/1.9-build/OWNER-STEPS.md, R2 to R5d). The switch is
// the same either way:
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
// ONE SERVER MAY STAND A STEP AHEAD: THE TEST WEB. Where this constant says
// "testers", the test web answers "open" to every account, so that a test
// build meets campaigns as readers will at release. That rule is the
// server's and is not here (lib/campaigns/opening.ts, serverOpening;
// lib/testWeb.ts): this file reads no setting, and the main web can be
// opened by this line alone.
//
// RELEASE DAY, IN ORDER. Step 1's position has been on the branch since
// 2026-11-10, done early at his word ("exactly I meant it should be in my
// build"): a test build then has the campaign pages, and the test web
// answers for the accounts it names as admins (CLAUDE.md, "The test web and
// the main web"). The main web is untouched by that. It runs main, where the
// switch says closed until the merge, and a build that talks to it is told
// no and shows nothing.
//
//   1. The merge to main carries it at testers: the website has the server
//      side, for his account alone, and the SQL he signed runs.
//   2. Both store builds are cut from that commit and go to internal testing.
//      He walks campaigns on his phones.
//   3. One line moves it to open on main: the website, for every reader.
//      That waits for his word, and for the words that are his, a lawyer's
//      and a priest's (items 113 and 129).
//   4. The stores go public with the builds he walked. Cut at testers, they
//      ask the website, which now says open, so they show campaigns to every
//      reader. Two quiet places read this constant itself and wait for the
//      next store build: the Discover menu's row on a wide screen, and the
//      free plan's line that names campaigns (lib/premium/plans.ts). Neither
//      promises anything that is not there.
//
// WHEN A BUILD GOES TO A STORE'S REVIEW, CAMPAIGNS ARE OPEN ON THE WEBSITE OR
// ARE NOT IN THE BUILD. A build cut at testers and reviewed while the website
// still says testers carries a feature asleep, which is what Apple's
// guidelines 2.3.1 and 2.5.19 warn of. So step 3 comes before step 4; and
// should step 3 have to wait, the build's notes for review say plainly what
// is in it and switched off.
//
// WHERE IT IS NOT CLOSED, THE REWORK'S SQL MUST HAVE RUN: the three files he
// signed (supabase/migrations, the three campaign files of 2026-11-10). On
// the test web's own database, before a test build is walked; on production,
// at the merge, which runs them. Until they have, the new columns are absent
// and the routes answer 404 whatever this says (lib/campaigns/opening.ts).

export type CampaignsOpening = "closed" | "testers" | "open";

/**
 * The switch. Closed from 2026-08-26 to 2026-11-10; at testers on the branch
 * since, which is what main takes at the merge. It never says open here
 * without his word (lib/campaigns/__tests__/closed.test.ts holds that).
 */
export const CAMPAIGNS_OPENING: CampaignsOpening = "testers" as CampaignsOpening;

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
 *
 * The reminder's sender follows them (lib/push/deliver.ts, deliverCampaigns):
 * a reminder nobody can turn off is not sent. It was missed when the routes
 * were retired, and went on sending July's (docs/audit/findings.yaml, F-50).
 */
export function julyCampaignRoutes(): boolean {
  return false;
}
