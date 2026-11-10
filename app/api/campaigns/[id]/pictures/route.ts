import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { PICTURE_MAX_BYTES } from "@/lib/campaigns/model";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { campaignPart } from "@/lib/campaigns/parts";
import { addPicture, readPictures, removeOwnPicture } from "@/lib/campaigns/pictures";
import { hiddenLists, mayRead, readCampaignRow } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });
const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A campaign's pictures (his item 121; lib/campaigns/pictures.ts has every
 * rule): three, or twenty with Purify Plus, each made again by the server,
 * checked, and looked at by a moderator before anyone but its creator is
 * handed it.
 *
 * SWITCHED OFF ON THE SERVER (lib/campaigns/parts.ts) since it was built:
 * while it is off every method here answers 404 and reads nothing, whoever
 * asks and whatever campaigns' own switch says.
 *
 * GET is for whoever may open the campaign, by the same door as its page.
 */
async function handleGET(req: Request, id: string) {
  if (!campaignPart("pictures")) return NOT_FOUND();
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The pictures could not be read." }, { status: 500 });
  const row = found.value;
  const userId = who.user?.id ?? null;
  if (!row || !mayRead(row, userId)) return NOT_FOUND();
  if (userId && row.creator_id !== userId) {
    const hidden = await hiddenLists(admin, userId);
    if (hidden.blocked.includes(row.creator_id) || hidden.muted.includes(row.creator_id)) return NOT_FOUND();
  }
  const pictures = await readPictures(admin, row, who.user);
  if (!pictures.ok) return pictures.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "The pictures could not be read." }, { status: 500 });
  return NextResponse.json(pictures.value, { headers: PRIVATE });
}

/** What a form may weigh beyond its picture: its few short fields and the multipart's own lines. */
const FORM_OVERHEAD = 64 * 1024;

/**
 * A request's form, read only as far as `max` bytes. "too_large" as soon as
 * more than that has arrived, by its declared length when it gives one and
 * by counting when it does not; null when it is not a form at all.
 */
async function formWithin(req: Request, max: number): Promise<FormData | "too_large" | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > max) return "too_large";
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let read = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.byteLength;
      if (read > max) {
        await reader.cancel();
        return "too_large";
      }
      chunks.push(value);
    }
    return await new Response(Buffer.concat(chunks), { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return null;
  }
}

/**
 * Its creator adds one picture: multipart, with the file and two lines said
 * yes to, each sent as the word "yes":
 *
 *   adult     "I am 18 or older." (his yes to item 121)
 *   consent   "This picture is mine to share, and anyone in it has given me
 *             their blessing to post it." Kept on the picture as the moment
 *             it was said.
 *
 * and, when they wrote some, `alt`: what it shows, for a reader who cannot
 * see it.
 */
async function handlePOST(req: Request, id: string) {
  if (!campaignPart("pictures")) return NOT_FOUND();
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-picture:${ipKey(req.headers)}`, 3600, 40)) {
    return NextResponse.json({ error: "Too many uploads just now. Try again later." }, { status: 429 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  // Per account as well, so that one reader cannot fill the moderators' queue from many addresses.
  if (await rateLimited(`campaign-picture:${who.user.id}`, 86_400, 60)) {
    return NextResponse.json({ error: "Too many uploads today. Try again tomorrow." }, { status: 429 });
  }
  // Read with a hard limit, whatever the request says of its own length: a
  // body that is too large is dropped while it arrives, never held whole.
  const form = await formWithin(req, PICTURE_MAX_BYTES + FORM_OVERHEAD);
  if (form === "too_large") return NextResponse.json({ error: "A picture can be up to 4 MB.", code: "picture_size" }, { status: 413 });
  if (!form) return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  if (form.get("adult") !== "yes" || form.get("consent") !== "yes") {
    return NextResponse.json({ error: "Both lines need a yes before a picture is added.", code: "affirm" }, { status: 400 });
  }
  const alt = form.get("alt");

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't add the picture. Please try again." }, { status: 500 });
  const row = found.value;
  // Someone else's campaign is the same "not found" as one that is not there.
  if (!row || row.creator_id !== who.user.id) return NOT_FOUND();

  const added = await addPicture(
    admin,
    who.user,
    row,
    { bytes: await file.arrayBuffer(), type: file.type, size: file.size },
    { alt: typeof alt === "string" ? alt : null },
  );
  if (!added.ok) {
    return NextResponse.json({ error: added.error, code: added.code, limit: added.limit, plus: added.plus }, { status: added.status });
  }
  return NextResponse.json({ ok: true, id: added.id });
}

/** Its creator removes one of their pictures, named in the address: ?picture=<id>. The file is deleted at once. */
async function handleDELETE(req: Request, id: string) {
  if (!campaignPart("pictures")) return NOT_FOUND();
  const who = await campaignsCaller(req);
  if (!who.open) return NOT_FOUND();
  if (await rateLimited(`campaign-picture-remove:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!who.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const pictureId = new URL(req.url).searchParams.get("picture") ?? "";
  if (!UUID.test(pictureId)) return NOT_FOUND();

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_FOUND() : NextResponse.json({ error: "Couldn't remove the picture." }, { status: 500 });
  const row = found.value;
  if (!row || row.creator_id !== who.user.id) return NOT_FOUND();

  const removed = await removeOwnPicture(admin, who.user, row, pictureId);
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
