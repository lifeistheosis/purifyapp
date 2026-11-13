import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { requestStanding } from "@/lib/community/adminStanding";
import { communityEnabled } from "@/lib/community/flags";
import { callerIsGroupMember } from "@/lib/community/groupAccess";
import { editOwnPost, removeOwnPost, type OwnResult } from "@/lib/community/ownWords";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityPostEditSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Your OWN post: delete it, or edit its words (1.9, build 95 note 10, a
 * reader's ask). Moderation removals happen with the service role directly
 * and set status='removed' instead (lib/community/moderation.ts).
 *
 * Deleting: when nobody else has replied it goes, as it always did. When
 * others have, their replies stay, under a post that says it was removed by
 * its author and carries nothing of it (lib/community/withdrawn.ts). Before
 * 1.9 a post took every reply with it, other readers' words included.
 *
 * Never a prayer campaign's thread. A thread is a post of the campaign's
 * creator, with a state of its own (lib/campaigns/thread.ts), and deleting
 * it here would take every reader's comment with it. A creator closes
 * comments or takes one off (the owner's yes to item 126); the thread goes
 * only with its campaign. It answers as a post that is not there, which is
 * what every other read of Community says of a thread. Found by Admin's
 * review of the campaigns SQL, 2026-11-10.
 *
 * Both writes are limited per address and per account, prove the writer
 * from their own sign-in, and write with the service role naming the
 * writer's id (lib/community/ownWords.ts).
 */

const SLOW = "You're making changes quickly. Please slow down a little.";

function answer(res: OwnResult): NextResponse {
  if (res.ok) return NextResponse.json({ ok: true, ...(res.outcome ? { outcome: res.outcome } : {}), ...(res.post ? { post: res.post } : {}) });
  return NextResponse.json(
    { error: res.error, ...(res.code ? { code: res.code } : {}), ...(res.preview ? { preview: res.preview } : {}), ...(res.limit ? { limit: res.limit } : {}) },
    { status: res.status },
  );
}

async function handleDELETE(req: Request, id: string) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-remove:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: SLOW, code: "slow_down" }, { status: 429 });
  }
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (await rateLimited(`community-remove-user:${user.id}`, 3600, 60)) {
    return NextResponse.json({ error: SLOW, code: "slow_down" }, { status: 429 });
  }

  return answer(await removeOwnPost(createAdminClient(), user.id, id));
}

async function handlePATCH(req: Request, id: string) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-edit:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: SLOW, code: "slow_down" }, { status: 429 });
  }
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = communityPostEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (await rateLimited(`community-edit-user:${user.id}`, 3600, 30)) {
    return NextResponse.json({ error: SLOW, code: "slow_down" }, { status: 429 });
  }

  const admin = createAdminClient();
  return answer(
    await editOwnPost(admin, { ...user, standing: await requestStanding(req, user) }, id, parsed.data, (groupId) =>
      callerIsGroupMember(req, admin, groupId),
    ),
  );
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCors(await handlePATCH(req, id), req);
}

export const OPTIONS = corsPreflight;
