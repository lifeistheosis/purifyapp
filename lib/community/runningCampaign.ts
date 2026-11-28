// The prayer campaign Pray together opens with (1.8): the owner's pick of
// r3-02 takes A's head into B, "the campaign you pray sits under it, gone
// when none runs" (Homebase/boards/purify-master/variants/
// r3-02-community.html). Its card is components/community/CampaignCard.tsx.
//
// The card is drawn from a campaign that is really running, with its own
// picture, its kind and its name; the prayer itself stands on the campaign's
// own page (his word, 2026-11-28: "the overview should be brief"). Never a sample: the sheet's "Memory eternal: forty days for
// Nicholas" was one, and it stays on the sheet.

/** A campaign running now, as its card under Pray together's head draws it. */
export type RunningCampaign = {
  id: string;
  /** "Memory eternal: forty days for Nicholas". */
  title: string;
  /** The kind of campaign and its days, written for the reader: "The departed · Forty days, to 7 December". */
  eyebrow: string | null;
  /** The campaign's own picture. */
  picture: { src: string; alt: string };
  /** Where the card opens: the campaign's own page. */
  href: string;
};

/**
 * The campaign running now, or null when none runs.
 *
 * None runs in 1.8, and this says so rather than asking. Prayer campaigns
 * were taken out of the app on 2026-08-26 for a rework (lib/campaigns/
 * flags.ts), and the rework (Homebase/boards/purify-master/r19/
 * PRAYER-CAMPAIGNS.md, "What the rework has to fix", 1) is what gives a
 * campaign the Church's prayer from a public-domain printing: six of the nine
 * prayers a campaign row can name today are lines Purify wrote, and none
 * carries a source. A campaign without the Church's words and their source
 * cannot be drawn, whatever the flag says, so Pray together's head is the
 * icon and the title until the rework answers here (the Church's campaign of
 * the season, or the one the reader prays).
 */
export function runningCampaign(): RunningCampaign | null {
  return null;
}
