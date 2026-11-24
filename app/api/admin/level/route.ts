import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { readLevel } from "@/lib/admin/level.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Home's Level 1 panel (lib/admin/level.server.ts). Admins only. A failed read is a 500, never zeros. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await readLevel(createAdminClient()), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin-level]", (e as Error).message);
    return NextResponse.json({ error: "Level 1 could not be read just now." }, { status: 500 });
  }
}
