import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience, type Audience } from "@/lib/push/audience";
import { broadcast, broadcastStatus } from "@/lib/push/send";
import { checkNotificationCopy, explainViolations } from "@/lib/push/doctrine";
import { broadcastTemplates } from "@/lib/push/copy";

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
//
// THE COPY BAR APPLIES HERE TOO, and this was the one sender it did not reach.
// Length was the only thing validated, which meant the single place in the
// product where a person can type anything at all was the single place nothing
// checked. It runs the same predicate as the scheduled payloads, so there is
// one definition of what Purify may say rather than two that drift.
//
// Server-side on purpose. The admin UI can offer templates and warn early, but
// a check that lives only in a component is a check that a curl request skips.
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

  // Named clauses, not a generic refusal. An operator who is told only
  // "Invalid request." retries with a worse string; one who is told "no
  // digits: contains the digit 3" fixes it in one pass. This is also the
  // only place the rule is ever explained to the person writing the words.
  const violations = checkNotificationCopy({ title, body: text });
  if (violations.length > 0) {
    return NextResponse.json(
      {
        error: `This message does not clear the notification bar. ${explainViolations(violations)}`,
        violations,
        templates: broadcastTemplates(),
      },
      { status: 400 },
    );
  }
  if (!confirm) {
    return NextResponse.json({ error: "Not confirmed." }, { status: 400 });
  }

  const admin = createAdminClient();
  const resolved = await resolveAudience(admin, audience as Audience);

  // Fail loudly on a precondition failure instead of "sending" to nobody.
  // When the push migrations are missing, the audience query errors, every
  // list comes back empty, every transport dry-runs, and the broadcast log
  // records a healthy-looking `enqueued` for 0 recipients. Refuse instead,
  // and do not write a log row for a send that was never attempted.
  if (resolved.errors.length > 0) {
    console.error("[admin/push/send] audience unresolved", resolved.errors);
    return NextResponse.json(
      {
        error:
          "Audience could not be resolved, so nothing was sent. Check that the push migrations are applied.",
        details: resolved.errors,
      },
      { status: 503 },
    );
  }

  // Sending to nobody is never intentional. Three real broadcasts were
  // logged `enqueued` with recipients_count 0 (2026-07-18, 2026-07-19)
  // because no device has ever registered: the tables exist but are empty,
  // so there is no query error to catch. Refuse, and say why.
  if (resolved.total === 0) {
    return NextResponse.json(
      {
        error:
          "No registered devices for this audience, so nothing was sent. Web push needs the VAPID keys set; Android needs google-services.json in the build and FCM_SERVICE_ACCOUNT_JSON on the server.",
        recipients: 0,
        audience,
      },
      { status: 409 },
    );
  }

  const result = await broadcast(
    admin,
    { title, body: text, url },
    { webSubs: resolved.webSubs, tokens: resolved.tokens },
  );

  const status = broadcastStatus(result);
  // `enqueued` means every transport dry-ran: the payload never left the
  // server. Say so in the response so the admin UI cannot read it as success.
  const warning =
    status === "enqueued"
      ? "Nothing was actually delivered: no push credentials are configured, so every transport dry-ran."
      : undefined;

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
    ...(warning ? { warning } : {}),
    result,
  });
}
