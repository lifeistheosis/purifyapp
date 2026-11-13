import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { weekAhead } from "@/lib/email/weekly";
import { BoardInput, boardEmDashField, isoWeekOf } from "@/lib/whatsNew/boardShape";

import { logActivity } from "./activityLog";
import { isTableAbsent } from "./tableAbsent";

/**
 * The board message's draft, built from the week (docs/plans/owner-desk.md
 * section 2: "A draft built from the week (the feast, what is new) waits in
 * the brief for his one tap. Nothing written by a model about the faith ships
 * without a person").
 *
 * Built from the app's own data and nothing else: the week's feasts and
 * saints from the calendar (the Sunday email's own lines, lib/email/weekly.ts)
 * and the newest release note published in the last fortnight. No sentence
 * here says anything about the faith; it names what is on the calendar.
 *
 * It never publishes. On the board message's day the brief saves it as that
 * week's DRAFT row, only when the week has no row at all, so his own draft is
 * never touched; in Patch notes it waits with its Publish button, his one tap.
 */

export type BoardDraft = {
  /** The draft as one paragraph of text, for the brief and the panel; null when there is nothing to say. */
  text: string | null;
  /** The ISO week it is for, "2026-W46". */
  week: string | null;
  /** What it was built from, for the record: "calendar", "release note". */
  sources: string[];
  /** The row it would be saved as. */
  input?: BoardInput;
  /** What became of it when the brief was made: saved as the week's draft, or why not; "preview" when nothing was saved. */
  saved?: SaveDraftResult | "preview";
};

const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

/** The newest release note published in the last fourteen days: its version and title. */
async function recentNote(admin: SupabaseClient, now: Date): Promise<{ version: string; title: string } | null> {
  const since = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("patch_notes")
    .select("version, title, published_at")
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as { version: string; title: string | null };
  return row.title ? { version: row.version, title: row.title } : null;
}

export async function boardDraft(admin: SupabaseClient, now: Date): Promise<BoardDraft> {
  const day = now.toISOString().slice(0, 10);
  const week = isoWeekOf(day);
  const ahead = weekAhead(now);
  const feasts = ahead.lines.filter((l) => l.kind === "feast");
  const named = (feasts.length ? feasts : ahead.lines).slice(0, 3);
  const note = await recentNote(admin, now).catch(() => null);

  const paragraphs: string[] = [];
  const sources: string[] = [];
  if (named.length) {
    paragraphs.push(`This week: ${named.map((l) => `${l.name} on ${weekday(l.date)}`).join("; ")}.`);
    sources.push("calendar");
  }
  if (note) {
    paragraphs.push(`New in Purify ${note.version}: ${note.title.replace(/\.$/, "")}.`);
    sources.push("release note");
  }
  if (paragraphs.length === 0) return { text: null, week, sources };

  const headline = feasts[0] ? `The week of ${feasts[0].name}` : "This week at Purify";
  const parsed = BoardInput.safeParse({ week, date: day, headline, body: paragraphs });
  if (!parsed.success || boardEmDashField(parsed.data)) return { text: paragraphs.join(" "), week, sources };
  return { text: `${headline}. ${paragraphs.join(" ")}`, week, sources, input: parsed.data };
}

export type SaveDraftResult = "saved" | "week has a row" | "nothing to save" | "not there" | "failed";

/**
 * Saves the draft as this week's draft row, if the week has none. Never
 * publishes and never overwrites: a row of his for the week, draft or
 * published, means there is nothing to do.
 */
export async function saveBoardDraft(admin: SupabaseClient, draft: BoardDraft): Promise<SaveDraftResult> {
  if (!draft.input) return "nothing to save";
  try {
    const { data: existing, error: readError } = await admin
      .from("board_messages")
      .select("id")
      .eq("week", draft.input.week)
      .limit(1);
    if (readError) return isTableAbsent(readError) ? "not there" : "failed";
    if (existing && existing.length > 0) return "week has a row";
    const { data, error } = await admin
      .from("board_messages")
      .insert({
        week: draft.input.week,
        date: draft.input.date,
        eyebrow: draft.input.eyebrow,
        headline: draft.input.headline,
        body: draft.input.body,
        status: "draft",
        updated_at: new Date().toISOString(),
        updated_by_email: null,
      })
      .select("id")
      .maybeSingle();
    if (error) return error.code === "23505" ? "week has a row" : isTableAbsent(error) ? "not there" : "failed";
    void logActivity({
      actorEmail: null,
      action: "board_message.create",
      entityType: "board_message",
      entityId: (data?.id as string | undefined) ?? null,
      detail: { week: draft.input.week, by: "the owner's brief, as a draft", sources: draft.sources },
    });
    return "saved";
  } catch {
    return "failed";
  }
}
