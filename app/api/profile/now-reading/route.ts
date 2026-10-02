import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { getBook } from "@/lib/bible/books";
import { signedInUser } from "@/lib/community/social";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Now reading": the chapter a reader has open, for the line on their
 * profile, sent by the Bible reader as a chapter opens.
 *
 * Opt-in, and the switch is checked here as well as on the device: the
 * write only lands while profiles.show_now_reading is on, so a stale app
 * cannot publish what its reader has turned off. Book and chapter only,
 * never a verse, a note or a highlight. The line lapses on its own a few
 * hours after the last chapter (lib/profile/server.ts NOW_READING_MS).
 */
const schema = z.object({ ref: z.string().regex(/^[a-z0-9-]{1,40}\/\d{1,3}$/) });

async function handlePOST(req: Request) {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  // One chapter a minute is a fast reader; this is generous and still a
  // ceiling on what a loop could write.
  if (await rateLimited(`now-reading:${user.id}`, 3600, 120)) return NextResponse.json({ ok: false });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const [slug, ch] = parsed.data.ref.split("/");
  const book = getBook(slug);
  const chapter = Number(ch);
  if (!book || chapter < 1 || chapter > book.chapters) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ now_reading: `${book.slug}/${chapter}`, now_reading_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("show_now_reading", true);
  // Before the migration the columns are absent: nothing to do, not a failure.
  return NextResponse.json({ ok: !error });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
