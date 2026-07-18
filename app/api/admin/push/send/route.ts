import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience, type Audience } from "@/lib/push/audience";
import { broadcast, broadcastStatus } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send an admin broadcast to a resolved audience and log it to
 * push_broadcasts. The `confirm: true` literal is the server-side guard
 * that pairs with the UI confirm step. Status is honest: `sent` when at
 * least one real delivery succeeded, `failed` when every real attempt
 * failed, and `enqueued` when every transport dry-ran (no secrets set, so
 * nothing actually left) — the log never claims a delivery that did not
 * happen.
 */
const sendSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(300),
  url: z
    .string()
    .max(300)
    .startsWith("/", "Deep link must be a site path")
    .optional()
    .default("/"),
  audience: z.enum(["all", "plus", "pro", "web", "native"]),
  confirm: z.literal(true),
});

/** Recent broadcasts for the history table. */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("push_broadcasts")
    .select("id, title, body, url, audience, recipients_count, created_by_email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return NextResponse.json(
    { broadcasts: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { title, body: text, url, audience, confirm } = parsed.data;
  if (!confirm) {
    return NextResponse.json({ error: "Not confirmed." }, { status: 400 });
  }

  const admin = createAdminClient();
  const resolved = await resolveAudience(admin, audience as Audience);
  const result = await broadcast(
    admin,
    { title, body: text, url },
    { webSubs: resolved.webSubs, tokens: resolved.tokens },
  );

  const status = broadcastStatus(result);

  await admin.from("push_broadcasts").insert({
    title,
    body: text,
    url,
    audience,
    recipients_count: resolved.total,
    created_by_email: adminUser.email ?? null,
    status,
  });

  return NextResponse.json({
    ok: true,
    status,
    recipients: resolved.total,
    result,
  });
}
