import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { CURRENT_RELEASE, servedRelease } from "@/lib/appUpdate/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Releases > Update prompts (1.9, admin item A3): the build each store's
 * installed apps are told is out, as this server answers them now
 * (lib/appUpdate/release.ts servedRelease), and whether that number came from
 * Render's setting or from the code. lib/admin/updatePrompts.ts compares it
 * with the drop. Read fresh: /api/app/release itself is kept an hour at the
 * edge, so the apps hear a change within the hour.
 *
 * Admin only: 403 to anyone else.
 */

export type AppReleasePayload = {
  versionName: string;
  android: { told: number; from: "render" | "code" };
  ios: { told: number; from: "render" | "code" };
};

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const served = servedRelease();
  const payload: AppReleasePayload = {
    versionName: served.versionName,
    android: {
      told: served.androidVersionCode,
      from: served.androidVersionCode === CURRENT_RELEASE.androidVersionCode ? "code" : "render",
    },
    ios: {
      told: served.iosBuildNumber,
      from: served.iosBuildNumber === CURRENT_RELEASE.iosBuildNumber ? "code" : "render",
    },
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
