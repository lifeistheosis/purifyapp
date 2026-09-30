import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { RESTOCK_LEAD_DAYS, SALES_WINDOW_DAYS } from "@/lib/shop/lowStock";
import { readStockLines } from "@/lib/shop/lowStockServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * EIKON's counted, ready-to-ship pieces against their restock lines
 * (lib/shop/lowStock.ts), for the Fulfillment tab. Admin only, never cached.
 */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await readStockLines(createAdminClient());
  return NextResponse.json({
    rows,
    leadDays: RESTOCK_LEAD_DAYS,
    windowDays: SALES_WINDOW_DAYS,
    at: new Date().toISOString(),
  });
}
