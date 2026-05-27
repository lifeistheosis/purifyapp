import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { geolocate, geoHeaderSnapshot } from "@/lib/analytics/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only diagnostic for the geo capture path. When the live view
 * shows "Unknown" for everyone, hit this endpoint from a signed-in
 * admin browser; the response shows the raw proxy headers Render is
 * passing through, the IP the parser selected, and the live geo
 * lookup against that IP. Useful for narrowing down whether the
 * problem is header shape, provider rate-limit, or something else.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = geoHeaderSnapshot(req.headers);
  const startedAt = Date.now();
  const geo = snapshot.privateOrEmpty
    ? null
    : await geolocate(snapshot.selectedIp);
  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      ok: true,
      headers: snapshot,
      geo,
      lookupElapsedMs: elapsedMs,
      notes:
        snapshot.privateOrEmpty
          ? "Selected IP is private or empty, Render's proxy is not forwarding the client IP via the headers we read. Check the deployment's proxy configuration."
          : geo
            ? "Geo lookup succeeded for the selected IP."
            : "Both providers (ipwho.is, ip-api.com) returned null or timed out. Check outbound network from Render or provider rate-limits.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
