import { NextResponse } from "next/server";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";

// 5-minute ISR so calls to BMC are debounced across all readers.
export const revalidate = 300;

/**
 * Public read-only proxy of Buy Me a Coffee's monthly total. The /support
 * page calls fetchBmcTotal directly server-side; this route is here for
 * client-side polling / curl debugging.
 */
export async function GET() {
  const total = await fetchBmcTotal();
  if (!total) {
    return NextResponse.json(
      { error: "BMC unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(total, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
}
