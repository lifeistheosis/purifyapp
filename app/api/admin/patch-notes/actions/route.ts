import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/activityLog";
import { ENTRIES } from "@/lib/whatsNew/entries";
import { displayDateToIso } from "@/lib/whatsNew/dates";
import { PATCH_NOTE_COLUMNS, type PatchNoteRow } from "@/lib/whatsNew/notes";
import { PatchNoteInput, emDashField } from "@/lib/whatsNew/patchNoteShape";
import { isTableAbsent } from "@/lib/admin/tableAbsent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every write to the patch notes and their review queue.
 *
 * Same template as app/api/admin/sustainability/actions/route.ts: admin gate,
 * one zod discriminated union, one switch, revalidate the public page. Every
 * case logs through lib/admin/activityLog.ts, and a destructive case carries
 * the prior row in `detail`, because the row itself no longer holds it.
 *
 * Publishing a note does NOT bump CURRENT_VERSION, patches.json, or any store
 * version. Those are the release ritual in AGENTS.md and they stay there. A
 * note can be corrected from here; a release cannot be declared from here.
 */

const Id = z.string().uuid();

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("note-upsert"), id: Id.optional() }).merge(PatchNoteInput),
  z.object({ action: z.literal("note-publish"), id: Id }),
  z.object({ action: z.literal("note-unpublish"), id: Id }),
  z.object({ action: z.literal("note-delete"), id: Id }),
  // Seed the table from data/changelog/entries.json. Idempotent on version:
  // a row that already exists is left exactly as it is, so pressing this
  // twice, or pressing it after one hand edit, never overwrites an edit.
  z.object({ action: z.literal("adopt-all") }),
  z.object({ action: z.literal("revision-accept"), id: Id }),
  z.object({ action: z.literal("revision-deny"), id: Id, note: z.string().max(4000).optional() }),
  // The owner's counter-edit. `after` replaces the proposal and the note
  // tells the agent what to do with it.
  z.object({ action: z.literal("revision-suggest"), id: Id, note: z.string().trim().min(1).max(4000) })
    .merge(z.object({ after: PatchNoteInput })),
  // An admin proposing a change through the same queue, so a human edit can
  // be reviewed by the owner too. Optional; the editor saves directly.
  z.object({ action: z.literal("revision-propose"), noteId: Id.nullable(), summary: z.string().trim().min(1).max(400) })
    .merge(z.object({ after: PatchNoteInput })),
]);

const absent = isTableAbsent;

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid body", detail: String(err) }, { status: 400 });
  }

  const supa = createAdminClient();
  const email = admin.email ?? "unknown";
  const now = new Date().toISOString();

  const notApplied = () =>
    NextResponse.json(
      { error: "patch_notes is not applied yet. Merge supabase/migrations/20260904_patch_notes.sql first." },
      { status: 409 },
    );

  const failed = (what: string, message: string) =>
    NextResponse.json({ error: what, detail: message }, { status: 500 });

  async function readNote(id: string) {
    const { data, error } = await supa
      .from("patch_notes")
      .select(PATCH_NOTE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    return { row: (data as PatchNoteRow | null) ?? null, error };
  }

  /** Write one note. Insert when `id` is absent, update otherwise. */
  async function writeNote(input: PatchNoteInput, id?: string) {
    const row = {
      version: input.version,
      kind: input.kind,
      date: input.date,
      title: input.title,
      blurb: input.blurb,
      items: input.items,
      updated_at: now,
      updated_by_email: email,
    };
    if (id) {
      const { data, error } = await supa
        .from("patch_notes")
        .update(row)
        .eq("id", id)
        .select(PATCH_NOTE_COLUMNS)
        .maybeSingle();
      return { row: data as PatchNoteRow | null, error };
    }
    const { data, error } = await supa
      .from("patch_notes")
      .insert({ ...row, status: "draft" })
      .select(PATCH_NOTE_COLUMNS)
      .maybeSingle();
    return { row: data as PatchNoteRow | null, error };
  }

  switch (parsed.action) {
    case "note-upsert": {
      const { action: _a, id, ...input } = parsed;
      void _a;
      const bad = emDashField(input);
      if (bad) {
        return NextResponse.json(
          { error: `The ${bad} carries an em dash. Release notes may not.` },
          { status: 400 },
        );
      }
      const prior = id ? (await readNote(id)).row : null;
      const { row, error } = await writeNote(input, id);
      if (absent(error)) return notApplied();
      if (error) return failed("Could not save that note.", error.message);
      void logActivity({
        actorEmail: admin.email ?? null,
        action: id ? "patch_note.update" : "patch_note.create",
        entityType: "patch_note",
        entityId: row?.id ?? null,
        detail: { version: input.version, previous: prior },
      });
      revalidatePath("/whats-new");
      return NextResponse.json({ ok: true, note: row });
    }

    case "note-publish":
    case "note-unpublish": {
      const publish = parsed.action === "note-publish";
      const { error } = await supa
        .from("patch_notes")
        .update({
          status: publish ? "published" : "draft",
          published_at: publish ? now : null,
          updated_at: now,
          updated_by_email: email,
        })
        .eq("id", parsed.id);
      if (absent(error)) return notApplied();
      if (error) return failed("Could not change that note's status.", error.message);
      void logActivity({
        actorEmail: admin.email ?? null,
        action: publish ? "patch_note.publish" : "patch_note.unpublish",
        entityType: "patch_note",
        entityId: parsed.id,
      });
      revalidatePath("/whats-new");
      return NextResponse.json({ ok: true });
    }

    case "note-delete": {
      const { row: prior, error: readErr } = await readNote(parsed.id);
      if (absent(readErr)) return notApplied();
      const { error } = await supa.from("patch_notes").delete().eq("id", parsed.id);
      if (error) return failed("Could not delete that note.", error.message);
      void logActivity({
        actorEmail: admin.email ?? null,
        action: "patch_note.delete",
        entityType: "patch_note",
        entityId: parsed.id,
        // The whole row, because nothing else holds it now.
        detail: { previous: prior },
      });
      revalidatePath("/whats-new");
      return NextResponse.json({ ok: true });
    }

    case "adopt-all": {
      // Sequential, one row per round trip, in file order. Nine hundred rows
      // would want a batch; ninety-one run once in the life of the table.
      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (const e of ENTRIES) {
        const iso = displayDateToIso(e.date);
        if (!iso) {
          errors.push(`${e.version}: date "${e.date}" is not Month D, YYYY`);
          continue;
        }
        const { data: existing, error: readErr } = await supa
          .from("patch_notes")
          .select("id")
          .eq("version", e.version)
          .maybeSingle();
        if (absent(readErr)) return notApplied();
        if (existing) {
          skipped++;
          continue;
        }
        const { error } = await supa.from("patch_notes").insert({
          version: e.version,
          kind: e.kind,
          date: iso,
          title: "",
          blurb: e.blurb,
          items: e.items,
          status: "published",
          published_at: now,
          updated_at: now,
          updated_by_email: email,
        });
        if (error) errors.push(`${e.version}: ${error.message}`);
        else inserted++;
      }
      void logActivity({
        actorEmail: admin.email ?? null,
        action: "patch_note.adopt_all",
        entityType: "patch_note",
        entityId: null,
        detail: { inserted, skipped, errors },
      });
      revalidatePath("/whats-new");
      if (errors.length > 0) {
        return NextResponse.json(
          { error: `${errors.length} of ${ENTRIES.length} entries did not adopt`, detail: errors, inserted, skipped },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, inserted, skipped });
    }

    case "revision-accept": {
      const { data: rev, error: readErr } = await supa
        .from("patch_note_revisions")
        .select("*")
        .eq("id", parsed.id)
        .maybeSingle();
      if (absent(readErr)) return notApplied();
      if (!rev) return NextResponse.json({ error: "No such revision." }, { status: 404 });
      if (rev.status === "accepted" || rev.status === "denied") {
        return NextResponse.json({ error: `That revision is already ${rev.status}.` }, { status: 409 });
      }
      const after = PatchNoteInput.safeParse(rev.after);
      if (!after.success) {
        return NextResponse.json(
          { error: "The proposed note is not a valid note.", detail: String(after.error) },
          { status: 400 },
        );
      }
      const bad = emDashField(after.data);
      if (bad) {
        return NextResponse.json(
          { error: `The proposed ${bad} carries an em dash. Deny it or suggest a fix.` },
          { status: 400 },
        );
      }

      // A proposal for an existing note that was made by version rather than
      // by id (the script does this) still lands on the right row.
      let targetId: string | null = rev.note_id as string | null;
      if (!targetId) {
        const { data: byVersion } = await supa
          .from("patch_notes")
          .select("id")
          .eq("version", after.data.version)
          .maybeSingle();
        targetId = (byVersion?.id as string | undefined) ?? null;
      }
      const prior = targetId ? (await readNote(targetId)).row : null;
      const { row, error } = await writeNote(after.data, targetId ?? undefined);
      if (error) return failed("Could not apply that revision.", error.message);

      const { error: markErr } = await supa
        .from("patch_note_revisions")
        .update({ status: "accepted", reviewed_by_email: email, reviewed_at: now })
        .eq("id", parsed.id);
      if (markErr) return failed("Applied, but could not mark the revision accepted.", markErr.message);

      void logActivity({
        actorEmail: admin.email ?? null,
        action: "patch_note_revision.accept",
        entityType: "patch_note_revision",
        entityId: parsed.id,
        detail: { author: rev.author, version: after.data.version, noteId: row?.id ?? null, previous: prior },
      });
      revalidatePath("/whats-new");
      return NextResponse.json({ ok: true, note: row });
    }

    case "revision-deny": {
      const { error } = await supa
        .from("patch_note_revisions")
        .update({
          status: "denied",
          review_note: parsed.note ?? null,
          reviewed_by_email: email,
          reviewed_at: now,
        })
        .eq("id", parsed.id)
        .in("status", ["pending", "suggested"]);
      if (absent(error)) return notApplied();
      if (error) return failed("Could not deny that revision.", error.message);
      void logActivity({
        actorEmail: admin.email ?? null,
        action: "patch_note_revision.deny",
        entityType: "patch_note_revision",
        entityId: parsed.id,
        detail: { note: parsed.note ?? null },
      });
      return NextResponse.json({ ok: true });
    }

    case "revision-suggest": {
      const bad = emDashField(parsed.after);
      if (bad) {
        return NextResponse.json(
          { error: `Your ${bad} carries an em dash. Release notes may not.` },
          { status: 400 },
        );
      }
      const { error } = await supa
        .from("patch_note_revisions")
        .update({
          status: "suggested",
          after: parsed.after,
          review_note: parsed.note,
          reviewed_by_email: email,
          reviewed_at: now,
        })
        .eq("id", parsed.id)
        .in("status", ["pending", "suggested"]);
      if (absent(error)) return notApplied();
      if (error) return failed("Could not send that suggestion back.", error.message);
      void logActivity({
        actorEmail: admin.email ?? null,
        action: "patch_note_revision.suggest",
        entityType: "patch_note_revision",
        entityId: parsed.id,
        detail: { note: parsed.note },
      });
      return NextResponse.json({ ok: true });
    }

    case "revision-propose": {
      const bad = emDashField(parsed.after);
      if (bad) {
        return NextResponse.json(
          { error: `The ${bad} carries an em dash. Release notes may not.` },
          { status: 400 },
        );
      }
      const prior = parsed.noteId ? (await readNote(parsed.noteId)).row : null;
      const { data, error } = await supa
        .from("patch_note_revisions")
        .insert({
          note_id: parsed.noteId,
          version: parsed.after.version,
          author: email,
          summary: parsed.summary,
          before: prior
            ? { version: prior.version, kind: prior.kind, date: prior.date, title: prior.title, blurb: prior.blurb, items: prior.items }
            : null,
          after: parsed.after,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (absent(error)) return notApplied();
      if (error) return failed("Could not file that proposal.", error.message);
      void logActivity({
        actorEmail: admin.email ?? null,
        action: "patch_note_revision.propose",
        entityType: "patch_note_revision",
        entityId: (data?.id as string | undefined) ?? null,
        detail: { version: parsed.after.version },
      });
      return NextResponse.json({ ok: true, id: data?.id ?? null });
    }
  }
}
