import "server-only";

import type { CampaignPart } from "./model";

// The parts of prayer campaigns that ship in 1.9 built, and switched off.
//
// His word, 2026-11-10, as docs/1.9-build/BRAINSTORM.md records it: pictures
// and "Prayed by many" are "built and shipped switched off by a server-side
// switch until the image check service and the lawyer, then turned on with no
// store build".
//
//   many       "Prayed by many" (his item 118): a second list on the board,
//              the campaigns most readers have added to their prayers. It
//              shows an order and never a figure. Turning it on also needs
//              his own line in CONTRIBUTING.md, which today allows no list
//              ordered by how many pray ("On prayer, no figures at all").
//   pictures   Pictures on a campaign (his item 121): three, or twenty with
//              Plus, each checked before it is shown. Off until the image
//              checking service is chosen and a lawyer has answered.
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

/** The switches. Both off since they were built, 2026-11-10. */
export const CAMPAIGN_PARTS: Readonly<Record<CampaignPart, boolean>> = { many: false, pictures: false };

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
