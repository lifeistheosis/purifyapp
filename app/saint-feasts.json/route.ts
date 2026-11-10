import { NextResponse } from "next/server";

import { saintFeasts } from "@/lib/saints/feastIndex";

// The saints' fixed feasts, for choosing a nameday by its saint
// (lib/saints/feastIndex.ts). Static: written once, carried by the apps.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(saintFeasts());
}
