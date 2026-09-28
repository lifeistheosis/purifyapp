import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { KITCHEN_BUCKET, KITCHEN_MAX_BYTES, KITCHEN_TYPES, kitchenObjectPath } from "@/lib/trapeza/photos";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * A Kitchen recipe's own photo, set from the admin Community tab.
 *
 * Multipart: `recipeId`, and any of `file` (a new photo), `credit` (the line
 * shown under it, for a photo that is not our own) and `clear=1` (take the
 * photo off). The photo lands in the kitchen bucket under h/<recipe id>/, and
 * the one it replaces is deleted, so a recipe never leaves an old photo
 * reachable at its public URL.
 *
 * Before 20260928_kitchen.sql the photo columns are not there and this says
 * so, rather than uploading a file nothing can point at.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  const recipeId = String(form.get("recipeId") ?? "");
  if (!UUID_RE.test(recipeId)) {
    return NextResponse.json({ error: "Missing recipe." }, { status: 400 });
  }
  const clear = form.get("clear") === "1";
  const creditRaw = form.get("credit");
  const credit = typeof creditRaw === "string" ? creditRaw.trim().slice(0, 200) || null : undefined;
  const file = form.get("file");

  const admin = createAdminClient();
  const { data: current, error: readError } = await admin
    .from("trapeza_recipes")
    .select("id, photo_url")
    .eq("id", recipeId)
    .maybeSingle<{ id: string; photo_url: string | null }>();
  if (readError) {
    if (isColumnAbsent(readError)) {
      return NextResponse.json(
        { error: "Recipe photos switch on once 20260928_kitchen.sql is applied." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const dropOld = async () => {
    const path = current.photo_url ? kitchenObjectPath(current.photo_url, base) : null;
    if (!path) return;
    const { error } = await admin.storage.from(KITCHEN_BUCKET).remove([path]);
    if (error) console.warn("[admin/kitchen] old photo not deleted", path, error.message);
  };

  if (clear) {
    const { error } = await admin
      .from("trapeza_recipes")
      .update({ photo_url: null, photo_credit: null, updated_at: new Date().toISOString() })
      .eq("id", recipeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await dropOld();
    return NextResponse.json({ ok: true, url: null });
  }

  let url: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = KITCHEN_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
    }
    if (file.size > KITCHEN_MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 4 MB or less." }, { status: 400 });
    }
    const { error: bucketError } = await admin.storage.createBucket(KITCHEN_BUCKET, {
      public: true,
      fileSizeLimit: KITCHEN_MAX_BYTES,
      allowedMimeTypes: Object.keys(KITCHEN_TYPES),
    });
    if (bucketError && !/already exists/i.test(bucketError.message)) {
      return NextResponse.json({ error: bucketError.message }, { status: 500 });
    }
    const path = `h/${recipeId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from(KITCHEN_BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    url = admin.storage.from(KITCHEN_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  if (!url && credit === undefined) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (url) patch.photo_url = url;
  if (credit !== undefined) patch.photo_credit = credit;
  const { error } = await admin.from("trapeza_recipes").update(patch).eq("id", recipeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (url) await dropOld();
  return NextResponse.json({ ok: true, url: url ?? current.photo_url });
}
