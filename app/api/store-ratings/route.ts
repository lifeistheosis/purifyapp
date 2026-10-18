import { NextResponse } from "next/server";

import { getStoreRatings } from "@/lib/marketing/storeRatingsLive";

/**
 * Both stores' ratings as the front page shows them: Apple's read live, the
 * Admin's Google Play number, the committed defaults where neither has
 * answered (lib/marketing/storeRatingsLive.ts).
 *
 * For the app pop-up on the mobile website (components/marketing/AppNudge.tsx),
 * which shows the visitor's store and its rating on any page, not only the
 * front page that is handed the numbers by its server. Same-origin only: the
 * apps never show that pop-up. Never fails: the answer is always a pair of
 * numbers, at worst the defaults, so it is kept ten minutes by the browser.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const ratings = await getStoreRatings();
  return NextResponse.json({ ratings }, { headers: { "Cache-Control": "public, max-age=600" } });
}
