import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { requestStanding } from "@/lib/community/adminStanding";
import { communityEnabled } from "@/lib/community/flags";
import { callerIsGroupMember } from "@/lib/community/groupAccess";
import { editOwnReply, removeOwnReply, type OwnResult } from "@/lib/community/ownWords";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityReplyEditSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Your OWN reply in Community: delete it, or edit its words (1.9, build 95
 * note 10, a reader's ask: "We should have the ability to remove or edit our
 * comments under replies and posts"). Until 1.9 a reply, once sent, could be
 * neither.
 *
 * Deleting: when nobody else has answered after it, it goes. When someone
 * has, it stays as a line that says it was removed by its author, carrying
 * nothing of it, so the thread still reads (lib/community/withdrawn.ts).
 *
 * A comment under a prayer campaign is not found here: it is taken off from
 * the campaign, in the campaign's own way (lib/campaigns/thread.ts).
 *
 * Both writes are limited per address and per account, prove the writer
 * from their own sign-in, and write with the service role naming the
 * writer's id (lib/community/ownWords.ts).
 */

const SLOW = "You're making changes quickly. Please slow down a little.";

function answer(res: OwnResult): NextResponse {
  if (res.ok) return NextResponse.json({ ok: true, ...(res.outcome ? { outcome: res.outcome } : {}), ...(res.reply ? { reply: res.reply } : {}) });
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
    return NextResponse.json({ error: "Invalid reply." }, { status: 400 });
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

  return answer(await removeOwnReply(createAdminClient(), user.id, id));
}

async function handlePATCH(req: Request, id: string) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-edit:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: SLOW, code: "slow_down" }, { status: 429 });
  }
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid reply." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = communityReplyEditSchema.safeParse(body);
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
    await editOwnReply(admin, { ...user, standing: await requestStanding(req, user) }, id, parsed.data, (groupId) =>
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
