import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { ChantWordsAction } from "@/lib/chants/clearedInput";
import { allChants } from "@/lib/chants/registry.server";
import type { ChantLine, ChantTiming } from "@/lib/chants/types";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chant words as sung, cleared by their rights holder (build 86 note 78),
 * for the admin's Content, Chant words view. The owner: "then make the
 * system and add a button to the back end so I can switch it on when I
 * receive clearance".
 *
 * GET: every chant version the app carries, with what it shows now (its
 * public-domain wording, or its cleared words while they are on) and its
 * row in chant_cleared_words, clearance record included. POST: save a
 * version's cleared words, their timing and the clearance; switch them on or
 * off; or delete a row that is off. Admin gate, one zod union, a rate limit,
 * and the service role: nothing else can write the table
 * (supabase/migrations/20261101000000_chant_cleared_words.sql).
 */

export type ChantWordsRow = {
  chant_slug: string;
  variant_id: string;
  lines: ChantLine[];
  timing: ChantTiming | null;
  words_source: string | null;
  cleared_by: string | null;
  cleared_on: string | null;
  clearance_reply: string | null;
  enabled: boolean;
  enabled_at: string | null;
  updated_at: string;
  updated_by_email: string | null;
};

export type ChantWordsVersion = {
  slug: string;
  title: string;
  variant: string;
  label: string;
  language: string;
  performer: string | null;
  /** The words it carries: how many lines, how many marked as the nearest public-domain wording, and their source line. */
  lines: number;
  nearest: number;
  wordsSource: string;
  /** The words it carries, a line to a line: the shape the cleared words follow. */
  carried: string[];
  row: ChantWordsRow | null;
};

export type ChantWordsPayload = {
  versions: ChantWordsVersion[];
  /** The table is not there yet: the migration waits on the owner. */
  tableAbsent: boolean;
};

const COLUMNS =
  "chant_slug, variant_id, lines, timing, words_source, cleared_by, cleared_on, clearance_reply, enabled, enabled_at, updated_at, updated_by_email";

function versions() {
  return allChants().flatMap((c) =>
    c.variants.map((v) => ({
      slug: c.slug,
      title: c.title,
      variant: v.id,
      label: v.label,
      language: v.language,
      performer: v.performer,
      lines: v.lines.length,
      nearest: v.lines.filter((l) => l.nearest).length,
      wordsSource: v.wordsSource,
      carried: v.lines.map((l) => l.text),
    })),
  );
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`admin-chant-words:${admin.id}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }
  const { data, error } = await createAdminClient().from("chant_cleared_words").select(COLUMNS);
  const tableAbsent = isTableAbsent(error);
  const rows = !error && Array.isArray(data) ? (data as unknown as ChantWordsRow[]) : [];
  const payload: ChantWordsPayload = {
    versions: versions().map((v) => ({ ...v, row: rows.find((r) => r.chant_slug === v.slug && r.variant_id === v.variant) ?? null })),
    tableAbsent,
  };
  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`admin-chant-words-write:${admin.id}`, 60, 20)) {
    return NextResponse.json({ error: "Too many changes in a minute. Wait a moment." }, { status: 429 });
  }

  let body;
  try {
    body = ChantWordsAction.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid body", detail: String(err) }, { status: 400 });
  }
  if (!versions().some((v) => v.slug === body.slug && v.variant === body.variant)) {
    return NextResponse.json({ error: `The app has no version ${body.slug}/${body.variant}.` }, { status: 404 });
  }

  const supa = createAdminClient();
  const email = admin.email ?? null;
  const now = new Date().toISOString();
  const key = { chant_slug: body.slug, variant_id: body.variant };
  const { data: prior, error: readError } = await supa
    .from("chant_cleared_words")
    .select(COLUMNS)
    .eq("chant_slug", body.slug)
    .eq("variant_id", body.variant)
    .maybeSingle();
  if (isTableAbsent(readError)) {
    return NextResponse.json(
      { error: "chant_cleared_words is not there yet. Merge supabase/migrations/20261101000000_chant_cleared_words.sql first." },
      { status: 409 },
    );
  }
  if (readError) return NextResponse.json({ error: "Could not read the row", detail: readError.message }, { status: 500 });
  const was = (prior as unknown as ChantWordsRow | null) ?? null;

  switch (body.action) {
    case "save": {
      const row = {
        ...key,
        lines: body.lines,
        timing: body.timing,
        words_source: body.wordsSource,
        cleared_by: body.clearedBy,
        cleared_on: body.clearedOn,
        clearance_reply: body.reply,
        updated_at: now,
        updated_by_email: email,
      };
      const { error } = await supa.from("chant_cleared_words").upsert(row, { onConflict: "chant_slug,variant_id" });
      if (error) return NextResponse.json({ error: "Not saved", detail: error.message }, { status: 500 });
      void logActivity({
        actorEmail: email,
        action: was ? "chant_words.update" : "chant_words.create",
        entityType: "chant_cleared_words",
        entityId: `${body.slug}/${body.variant}`,
        detail: { previous: was, lines: body.lines.length },
      });
      return NextResponse.json({ ok: true });
    }
    case "switch": {
      if (!was) return NextResponse.json({ error: "Save the cleared words and their clearance first." }, { status: 409 });
      if (body.on && !(was.cleared_by && was.cleared_on && was.clearance_reply && was.words_source && was.lines?.length && was.timing)) {
        return NextResponse.json(
          { error: "Not switched on: who said yes, when, their reply, where the words come from, the words and their timing are all needed." },
          { status: 409 },
        );
      }
      const { error } = await supa
        .from("chant_cleared_words")
        .update({ enabled: body.on, enabled_at: body.on ? now : null, updated_at: now, updated_by_email: email })
        .eq("chant_slug", body.slug)
        .eq("variant_id", body.variant);
      if (error) return NextResponse.json({ error: "Not switched", detail: error.message }, { status: 500 });
      void logActivity({
        actorEmail: email,
        action: body.on ? "chant_words.on" : "chant_words.off",
        entityType: "chant_cleared_words",
        entityId: `${body.slug}/${body.variant}`,
      });
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      if (!was) return NextResponse.json({ ok: true });
      if (was.enabled) return NextResponse.json({ error: "Switch the cleared words off before deleting them." }, { status: 409 });
      const { error } = await supa.from("chant_cleared_words").delete().eq("chant_slug", body.slug).eq("variant_id", body.variant);
      if (error) return NextResponse.json({ error: "Not deleted", detail: error.message }, { status: 500 });
      void logActivity({
        actorEmail: email,
        action: "chant_words.delete",
        entityType: "chant_cleared_words",
        entityId: `${body.slug}/${body.variant}`,
        detail: { previous: was },
      });
      return NextResponse.json({ ok: true });
    }
  }
}
