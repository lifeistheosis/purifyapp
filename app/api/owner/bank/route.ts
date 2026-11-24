import { NextResponse } from "next/server";

import { getOwnerUser } from "@/lib/owner/access";
import { mercuryConfigured, readBank } from "@/lib/owner/mercury.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The bank for the admin's Money tab: balances, money in and out by month and
 * by kind, and the newest lines. Owner only (OWNER_EMAILS), never every
 * admin: bank lines name who was paid. 503 while MERCURY_API_TOKEN is unset,
 * 502 when Mercury cannot be read, so the panel names the cause and never
 * shows $0 for a bank it did not read. lib/owner/mercury.server.ts.
 */
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  if (!mercuryConfigured()) {
    return NextResponse.json({ error: "The bank is not connected on this server." }, { status: 503, headers: noStore });
  }
  try {
    return NextResponse.json(await readBank(), { headers: noStore });
  } catch (e) {
    console.error("[owner-bank]", (e as Error).message);
    return NextResponse.json({ error: "Mercury could not be read." }, { status: 502, headers: noStore });
  }
}
