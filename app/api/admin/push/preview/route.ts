import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience, type Audience } from "@/lib/push/audience";
import { webPushConfigured, apnsConfigured, fcmConfigured } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live recipient count for a proposed broadcast audience, plus which
 * transports are configured (so the compose UI can warn that a send would
 * dry-run). No message is sent here.
 */
const schema = z.object({
  audience: z.enum(["all", "plus", "pro", "web", "native"]),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const resolved = await resolveAudience(admin, parsed.data.audience as Audience);

  return NextResponse.json({
    web: resolved.webCount,
    native: resolved.nativeCount,
    total: resolved.total,
    configured: {
      web: webPushConfigured(),
      ios: apnsConfigured(),
      fcm: fcmConfigured(),
    },
  });
}
