import { NextResponse } from "next/server";

import { getOwnerUser } from "@/lib/owner/access";
import { getInvestorLive } from "@/lib/invest/live";
import { buildPayload } from "@/lib/invest/payload";

export const dynamic = "force-dynamic";

/**
 * The owner dashboard's Investors tab: the same payload purifyapp.net/invest
 * is built from, read fresh rather than from the page's hourly cache, so the
 * owner can see a change the moment it lands and knows what the page will say
 * within the hour.
 *
 * Owner-gated like /api/owner/actuals. The numbers themselves are public on
 * /invest; the gate is here because this surface also carries the pace the
 * owner is held to, which the page does not print.
 */
export async function GET() {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const live = await getInvestorLive();
    return NextResponse.json(buildPayload(live), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[owner/investor] live numbers unavailable:", err);
    return NextResponse.json(buildPayload(null), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
