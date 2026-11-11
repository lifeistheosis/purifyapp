import "server-only";

import type { CampaignPart } from "./model";

// The parts of prayer campaigns that have a switch of their own on the
// server.
//
// His word, 2026-11-10 in the morning, as docs/1.9-build/BRAINSTORM.md
// records it: pictures and "Prayed by many" were "built and shipped switched
// off by a server-side switch", to be "turned on with no store build". His
// later words the same day ("I want everything in version 1.9", and "rec yes
// to all") turn each on as what it waited for is done:
//
//   many       "Prayed by many" (his item 118): a second list on the board,
//              the campaigns most readers have added to their prayers. It
//              shows an order and never a figure. ON since 2026-11-10: it
//              waited for his own rule to allow it, and CONTRIBUTING.md
//              ("On prayer, no figures at all") now carries the one
//              exception, in his words, with the date.
//   pictures   Pictures on a campaign (his item 121), each checked before
//              it is shown. OFF FOR THE WHOLE OF 1.9, by his word of
//              2026-11-11: "We're gonna fully launch campaign in version
//              1.9. In version 1.9.1, we'll include those extra legal
//              additions." Campaigns open to every reader in 1.9 with no
//              picture anywhere; pictures come in 1.9.1, with what they
//              wait for: the account for the automatic check, the
//              registration with NCMEC, PhotoDNA when Microsoft approves,
//              and the first real picture as the check's proof
//              (docs/1.9-build/OWNER-STEPS.md, P1, P2, P4, P5; P2 is
//              asked of him sooner, since readers already add other
//              pictures). Until that word it was "off until his three
//              steps are done".
//              lib/campaigns/__tests__/noPicturesIn19.test.ts holds it off
//              while the app's version is 1.9.
//
// A CONSTANT IN VERSION CONTROL, as the campaigns' own switch is and for its
// reasons (./flags.ts): it carries a date and a reason, and no dashboard can
// flip it.
//
// THE SERVER'S ALONE. This file can only be loaded on the server, so no app
// ever reads a part from its own bundle. An app is told, by the same answer
// that tells it campaigns are open (app/api/campaigns/open), so the website's
// value is every app's value: turning a part on is one line on main, and no
// store build.
//
// OFF IS OFF ON THE SERVER TOO. The routes of a part that is off answer 404
// and read nothing, so a request written by hand reaches nothing the screens
// do not offer.

/** The switches. Both were off when they were built, 2026-11-10; "Prayed by many" is on since that evening, by his word; pictures stay off through 1.9, by his word of 2026-11-11. */
export const CAMPAIGN_PARTS: Readonly<Record<CampaignPart, boolean>> = { many: true, pictures: false };

let parts: Record<CampaignPart, boolean> = { ...CAMPAIGN_PARTS };

/** Whether a part is on. */
export function campaignPart(part: CampaignPart): boolean {
  return parts[part] === true;
}

/** Every part, as the app is told them. */
export function campaignParts(): Record<CampaignPart, boolean> {
  return { ...parts };
}

/** Test seam: a part as a case needs it. Never called by the app. */
export function __setCampaignPart(part: CampaignPart, on: boolean): void {
  parts = { ...parts, [part]: on };
}

/** Test seam: back to what is committed. */
export function __resetCampaignParts(): void {
  parts = { ...CAMPAIGN_PARTS };
}
