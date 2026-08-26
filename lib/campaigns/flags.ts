// Master flag for the Prayer Campaigns feature, mirroring lib/shop/flags.ts.
// Unset = the /campaigns routes 404 and the API 404s. Set
// NEXT_PUBLIC_CAMPAIGNS_ENABLED=1 (or "true") once the
// 20260713_prayer_campaigns.sql migration is applied, so the feature never
// renders or writes before its tables exist.

/**
 * WITHDRAWN FROM THE WEB 2026-08-26, PENDING A REWORK.
 *
 * Prayer Campaigns was live and is being taken down while it is reworked. This
 * constant is the switch, and it deliberately sits ABOVE the environment
 * variable rather than beside it:
 *
 *   - NEXT_PUBLIC_CAMPAIGNS_ENABLED is set on Render today. Turning the
 *     feature off by unsetting it there would leave this repo believing the
 *     feature is on, and the next person to read the flag would be misled.
 *   - A NEXT_PUBLIC_* value is inlined at build time, so unsetting it needs a
 *     redeploy anyway. There is no speed to be gained by doing it in the
 *     dashboard instead of here.
 *   - Here it is in version control, with a date and a reason, and it cannot
 *     be switched back on by accident from an env panel.
 *
 * NOTHING WAS DELETED. Every route, component, API handler, table and test for
 * campaigns is untouched and still compiles; work continues against them. Only
 * the public surface is closed.
 *
 * TO RESTORE: set this to false. That is the whole revert. Then check that
 * NEXT_PUBLIC_CAMPAIGNS_ENABLED is still set wherever you are deploying.
 */
const WITHDRAWN_FOR_REWORK = true;

export function campaignsEnabled(): boolean {
  if (WITHDRAWN_FOR_REWORK) return false;
  const v = process.env.NEXT_PUBLIC_CAMPAIGNS_ENABLED;
  return v === "1" || v === "true";
}
