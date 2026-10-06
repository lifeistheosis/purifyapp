import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { checkDrop, tally } from "@/lib/drop/check";
import { wholeNote } from "@/lib/drop/compose";
import { CURRENT_DROP } from "@/lib/drop/current";
import { CHANNELS, MOMENTS, MOMENT_LABEL, type Drop } from "@/lib/drop/kit";
import { dropKey, liveDrop, readPlan, STORE_NAME, type DropRow, type Plan } from "@/lib/drop/live";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENTRIES } from "@/lib/whatsNew/entries";
import { getPatchNotes } from "@/lib/whatsNew/notes";
import { RELEASE_EMAIL } from "@/lib/whatsNew/releaseEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Drop tab's live half.
 *
 * The tab already has the drop's words: lib/drop/current.ts carries
 * drop.json into the bundle. What it cannot know by itself is what is true
 * this minute, and that is what this route answers and changes.
 *
 * GET   what the owner has planned and marked, which notes What's New is
 *       really showing, and what the drop's own rules say about the drop as
 *       it stands now (lib/drop/check.ts, on the file with the plan laid
 *       over it).
 * POST  one change: a day for a moment, a piece marked as sent, a store
 *       marked as serving the build, an update still to come.
 *
 * It sends nothing. The release email goes through the campaign route and a
 * notification through the push route, each with its own confirm. Marking a
 * piece here only writes down that the owner sent it.
 *
 * The plan lives in admin_tasks, the Calendar's own table (lib/drop/live.ts
 * says why), so a planned moment is on the Calendar the moment it is saved.
 *
 * A MARK IS CHECKED BEFORE IT IS KEPT. The same rule that refuses a record in
 * `node scripts/drop.mjs sent` runs here: a piece is not written down as sent
 * before the release's note is showing, or before a store has the build it
 * describes. Refused, it answers 409 with the rule's own sentence.
 */

const TABLE = "admin_tasks";
const COLUMNS = "id, title, notes, due_on, status, rule_key, done_at";
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const VERSION = /^\d+\.\d+(\.\d+)?$/;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * This drop's rows, and the updates still to come. Two plain reads rather
 * than one `or`: a release is written with a dot, and a dot is what that
 * filter's own grammar splits on.
 */
async function rowsFor(admin: ReturnType<typeof createAdminClient>, drop: Drop) {
  const [mine, coming] = await Promise.all([
    admin.from(TABLE).select(COLUMNS).like("rule_key", `drop:${drop.release}:%`).limit(400),
    admin.from(TABLE).select(COLUMNS).like("rule_key", "release:%").limit(100),
  ]);
  const error = mine.error ?? coming.error;
  return { data: [...(mine.data ?? []), ...(coming.data ?? [])] as DropRow[], error };
}

/** The versions What's New is really showing, or null when the table could not say. */
async function publishedVersions() {
  const notes = await getPatchNotes();
  return { live: notes.fromFallback ? null : notes.entries.map((e) => e.version), entries: notes.entries, fromFallback: notes.fromFallback };
}

/** The notes the rules read: the published row where there is one, the committed note where there is not. */
function notesFor(drop: Drop, published: Awaited<ReturnType<typeof publishedVersions>>) {
  if (published.fromFallback) return ENTRIES;
  const live = new Map(published.entries.map((e) => [e.version, e]));
  return ENTRIES.map((e) => (drop.covers.includes(e.version) ? (live.get(e.version) ?? e) : e));
}

function answer(drop: Drop, plan: Plan, published: Awaited<ReturnType<typeof publishedVersions>>, ready: boolean, error?: string) {
  const now = liveDrop(drop, plan, published.live);
  const entries = notesFor(drop, published);
  return {
    release: drop.release,
    ready,
    ...(error ? { error } : {}),
    plan,
    notes: drop.covers.map((version) => ({ version, published: published.live ? published.live.includes(version) : null })),
    /** The newest note the site is showing: what a link to /whats-new leads to today. */
    showing: published.live?.[0] ?? null,
    findings: checkDrop(now, { entries, email: RELEASE_EMAIL }),
    counts: tally(now),
    whole: wholeNote(drop, entries),
    today: today(),
  };
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const drop = CURRENT_DROP;
  if (!drop) return NextResponse.json({ release: null });

  const admin = createAdminClient();
  const [stored, published] = await Promise.all([rowsFor(admin, drop), publishedVersions()]);
  return NextResponse.json(
    answer(drop, readPlan(drop, stored.data), published, !stored.error, stored.error?.message),
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Change = z.discriminatedUnion("action", [
  /** The day a moment is planned for. No day clears it. */
  z.object({ action: z.literal("plan"), moment: z.enum(MOMENTS), dueOn: z.string().regex(DAY).nullable() }),
  /** A piece that went out, or a step that is done. `done: false` takes the mark back. */
  z.object({ action: z.literal("mark"), piece: z.string().min(1).max(80), done: z.boolean(), notes: z.string().trim().max(500).optional() }),
  /** A store that is serving the build. */
  z.object({ action: z.literal("served"), store: z.enum(["android", "ios"]), done: z.boolean() }),
  /** An update still to come. No day removes it. */
  z.object({
    action: z.literal("update"),
    version: z.string().regex(VERSION),
    title: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(1000).optional(),
    dueOn: z.string().regex(DAY).nullable(),
    done: z.boolean().optional(),
  }),
]);

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const drop = CURRENT_DROP;
  if (!drop) return NextResponse.json({ error: "This release has no drop yet." }, { status: 409 });
  const parsed = Change.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That change could not be read." }, { status: 400 });
  const change = parsed.data;

  const admin = createAdminClient();
  const [stored, published] = await Promise.all([rowsFor(admin, drop), publishedVersions()]);
  if (stored.error) {
    return NextResponse.json(
      { error: `${stored.error.message}. Is supabase/migrations/20260919000000_ops_board.sql applied?` },
      { status: 503 },
    );
  }
  const plan = readPlan(drop, stored.data);
  const stamp = new Date().toISOString();
  const base = { auto: false, created_by_email: adminUser.email ?? null, updated_at: stamp };
  const save = (row: Record<string, unknown>) => admin.from(TABLE).upsert({ ...base, ...row }, { onConflict: "rule_key" });
  const remove = (ruleKey: string) => admin.from(TABLE).delete().eq("rule_key", ruleKey);

  let result: { error: { message: string } | null };
  let entity = "";

  if (change.action === "plan") {
    entity = dropKey.moment(drop.release, change.moment);
    result = change.dueOn
      ? await save({ rule_key: entity, title: `${drop.release} drop: ${MOMENT_LABEL[change.moment].name.toLowerCase()}`, category: "update", due_on: change.dueOn, status: "open", done_at: null })
      : await remove(entity);
  } else if (change.action === "mark") {
    const piece = drop.pieces.find((p) => p.id === change.piece);
    if (!piece) return NextResponse.json({ error: "The drop has no such piece." }, { status: 404 });
    if (piece.channel === "note") return NextResponse.json({ error: "A note is accepted in Patch notes, and shows here by itself once it is." }, { status: 409 });
    entity = dropKey.piece(drop.release, piece.id);
    if (change.done) {
      // Try the mark on the drop as it stands, and keep it only if the rules still hold.
      const tried = liveDrop(drop, { ...plan, done: { ...plan.done, [piece.id]: { on: today(), notes: null } } }, published.live);
      const refused = checkDrop(tried, { entries: notesFor(drop, published), email: RELEASE_EMAIL }).filter(
        (f) => f.level === "error" && f.where === piece.id && f.rule.startsWith("D3"),
      );
      if (refused.length) return NextResponse.json({ error: `Not marked: it ${refused[0].says}.`, rule: refused[0].rule }, { status: 409 });
      result = await save({
        rule_key: entity,
        title: `${drop.release} drop: ${piece.title}`.slice(0, 160),
        category: piece.channel === "email" ? "email" : piece.channel === "board" ? "board" : "update",
        due_on: plan.moments[piece.moment] ?? today(),
        status: "done",
        done_at: stamp,
        notes: change.notes ?? `${CHANNELS[piece.channel].name}. Marked in the Drop tab.`,
      });
    } else {
      result = await remove(entity);
    }
  } else if (change.action === "served") {
    entity = dropKey.store(drop.release, change.store);
    result = change.done
      ? await save({
          rule_key: entity,
          title: `${drop.release} drop: ${STORE_NAME[change.store]} is serving build ${drop.builds[change.store].build}`,
          category: "update",
          due_on: today(),
          status: "done",
          done_at: stamp,
        })
      : await remove(entity);
  } else {
    entity = dropKey.update(change.version);
    result = change.dueOn
      ? await save({
          rule_key: entity,
          title: (change.title || `Purify ${change.version}`).slice(0, 160),
          notes: change.notes ?? null,
          category: "update",
          due_on: change.dueOn,
          status: change.done ? "done" : "open",
          done_at: change.done ? stamp : null,
        })
      : await remove(entity);
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 503 });

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: `drop.${change.action}`,
    entityType: "drop",
    entityId: entity,
    detail: { ...change },
  });

  const after = await rowsFor(admin, drop);
  return NextResponse.json({ ok: true, ...answer(drop, readPlan(drop, after.data), published, !after.error) });
}
