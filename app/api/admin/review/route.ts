import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { readReviewQueue, type ReviewQueue } from "@/lib/admin/reviewQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ReviewPayload = ReviewQueue;

// The clergy review list (lib/admin/reviewQueue.ts): read-only, from the data
// files in the deployment. A reviewer's yes is recorded in git, in the file.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const queue = await readReviewQueue(process.cwd());
  return NextResponse.json(queue satisfies ReviewPayload, { headers: { "Cache-Control": "no-store" } });
}
