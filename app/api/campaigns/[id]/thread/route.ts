import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { hiddenLists, mayOpen, readCampaignRow } from "@/lib/campaigns/server";
import { readThread, removeNote, writeNote } from "@/lib/campaigns/thread";
import { requestStanding } from "@/lib/community/adminStanding";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignNoteSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });
const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A campaign's updates and comments (lib/campaigns/thread.ts), for whoever
 * may open the campaign: the same door as its page (mayRead, and not for a
 * reader who has blocked its creator). The words of someone the reader has
 * blocked are left out and a muted writer's are folded. Nothing in the
 * answer counts anything or names an account.
 */
async function handleGET(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The campaign could not be read." }, { status: 500 });
  const row = found.value;
  const userId = who.user?.id ?? null;
  if (!row || !(await mayOpen(admin, row, userId))) return NOT_FOUND();
  const hidden = await hiddenLists(admin, userId);
  if (userId && row.creator_id !== userId && (hidden.blocked.includes(row.creator_id) || hidden.muted.includes(row.creator_id))) return NOT_FOUND();
  const thread = await readThread(admin, row, who.user, hidden);
  if (!thread.ok) return thread.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The comments could not be read." }, { status: 500 });
  return NextResponse.json(thread.value, { headers: PRIVATE });
}

/**
 * Write an update (the campaign's creator) or a comment (a signed-in reader).
 * Every rule is lib/campaigns/thread.ts, writeNote: no link, the word filter
 * asked first, the spam guard, three updates a day, comments closed, a block.
 */
async function handlePOST(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-note:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "You're writing quickly. Please slow down a little." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't send that. Please try again." }, { status: 500 });
  const row = found.value;
  if (!row || !(await mayOpen(admin, row, who.user.id))) return NOT_FOUND();

  const wrote = await writeNote(admin, { ...who.user, standing: await requestStanding(req, who.user) }, row, parsed.data);
  if (!wrote.ok) {
    return NextResponse.json({ error: wrote.error, code: wrote.code, preview: wrote.preview, limit: wrote.limit }, { status: wrote.status });
  }
  return NextResponse.json({ ok: true, id: wrote.id, held: wrote.held });
}

/**
 * Take one note off: its own writer, or the campaign's creator for a comment
 * on their campaign (lib/campaigns/thread.ts, removeNote). The note is named
 * in the address, ?note=<id>.
 */
async function handleDELETE(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-note:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const noteId = new URL(req.url).searchParams.get("note") ?? "";
  if (!UUID.test(noteId)) return NOT_FOUND();

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't take that off." }, { status: 500 });
  const row = found.value;
  // Its creator may still tend a campaign that waits or has ended; anyone
  // else needs to be able to open it.
  if (!row || row.status === "removed" || (row.creator_id !== who.user.id && !(await mayOpen(admin, row, who.user.id)))) return NOT_FOUND();

  const meta = (who.user.user_metadata ?? {}) as { display_name?: string };
  const name = (meta.display_name ?? "").trim() || (typeof row.creator_name === "string" ? row.creator_name : "") || "Reader";
  const removed = await removeNote(admin, { id: who.user.id, email: who.user.email ?? null, name }, row, noteId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handleGET(req, id), req);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export const OPTIONS = corsPreflight;
