"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Best-effort sync of verse and saint-paragraph annotations between
 * localStorage and the public.annotations table.
 *
 * Local keys:
 *   purify:bible:{book}:{chapter}:{verse}
 *   purify:saint:{saintSlug}:{workSlug}:{sectionN}:{paragraphIdx}
 *
 * Same shape on the server (locator jsonb captures the variant fields).
 */

type AnnRow = {
  user_id: string;
  kind: "bible-verse" | "saint-paragraph";
  locator: Record<string, unknown>;
  highlighted: boolean;
  highlighted_words: number[] | null;
  note: string | null;
  updated_at: string;
};

function parseLocalKey(k: string): {
  kind: "bible-verse" | "saint-paragraph";
  locator: Record<string, unknown>;
} | null {
  if (k.startsWith("purify:bible:")) {
    const [, , book, chapter, verse] = k.split(":");
    if (!book || !chapter || !verse) return null;
    return {
      kind: "bible-verse",
      locator: { book, chapter: Number(chapter), verse: Number(verse) },
    };
  }
  if (k.startsWith("purify:saint:")) {
    const [, , saintSlug, workSlug, sectionN, paragraphIdx] = k.split(":");
    if (!saintSlug || !workSlug || !sectionN || paragraphIdx === undefined)
      return null;
    return {
      kind: "saint-paragraph",
      locator: {
        saintSlug,
        workSlug,
        sectionN: Number(sectionN),
        paragraphIdx: Number(paragraphIdx),
      },
    };
  }
  return null;
}

function keyForRow(row: { kind: string; locator: Record<string, unknown> }) {
  if (row.kind === "bible-verse") {
    return `purify:bible:${row.locator.book}:${row.locator.chapter}:${row.locator.verse}`;
  }
  return `purify:saint:${row.locator.saintSlug}:${row.locator.workSlug}:${row.locator.sectionN}:${row.locator.paragraphIdx}`;
}

function snapshotLocal(): AnnRow[] {
  const rows: AnnRow[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    const parsed = parseLocalKey(k);
    if (!parsed) continue;
    let v: { highlighted?: boolean; highlightedWords?: number[]; note?: string };
    try {
      v = JSON.parse(window.localStorage.getItem(k) ?? "{}");
    } catch {
      continue;
    }
    rows.push({
      user_id: "", // filled in by caller
      kind: parsed.kind,
      locator: parsed.locator,
      highlighted: !!v.highlighted,
      highlighted_words:
        Array.isArray(v.highlightedWords) && v.highlightedWords.length > 0
          ? v.highlightedWords
          : null,
      note: typeof v.note === "string" && v.note.trim().length > 0 ? v.note : null,
      updated_at: new Date().toISOString(),
    });
  }
  return rows;
}

export async function pushAllLocalAnnotations() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const rows = snapshotLocal().map((r) => ({ ...r, user_id: user.id }));
    if (rows.length === 0) return;
    // Chunk into batches of 100 so a large local store doesn't bust a single
    // upsert payload. ignoreDuplicates: true uses ON CONFLICT DO NOTHING
    // against any constraint, so the unique-per-locator index dedupes; for
    // updates (changing a note, toggling highlighted) we rely on the
    // single-row push path that the annotation hook will trigger after
    // sign-in propagates through `purify:annotation`.
    for (let i = 0; i < rows.length; i += 100) {
      await supabase
        .from("annotations")
        .upsert(rows.slice(i, i + 100), { ignoreDuplicates: true });
    }
  } catch {
    /* swallow */
  }
}

export async function pullServerAnnotations() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("annotations")
      .select("kind, locator, highlighted, highlighted_words, note, updated_at");
    if (error || !data) return;
    for (const row of data) {
      const k = keyForRow(row);
      const value: {
        highlighted?: boolean;
        highlightedWords?: number[];
        note?: string;
      } = {};
      if (row.highlighted) value.highlighted = true;
      if (Array.isArray(row.highlighted_words) && row.highlighted_words.length)
        value.highlightedWords = row.highlighted_words as number[];
      if (typeof row.note === "string" && row.note.trim().length)
        value.note = row.note;
      if (Object.keys(value).length === 0) continue;
      try {
        window.localStorage.setItem(k, JSON.stringify(value));
        // Nudge any mounted hook for this key.
        const parts = k.split(":");
        if (parts[1] === "bible") {
          window.dispatchEvent(
            new CustomEvent("purify:annotation", {
              detail: {
                book: parts[2],
                chapter: Number(parts[3]),
                verse: Number(parts[4]),
                data: value,
              },
            }),
          );
        } else if (parts[1] === "saint") {
          window.dispatchEvent(
            new CustomEvent("purify:annotation", {
              detail: {
                kind: "saint-paragraph",
                saintSlug: parts[2],
                workSlug: parts[3],
                sectionN: Number(parts[4]),
                paragraphIdx: Number(parts[5]),
                data: value,
              },
            }),
          );
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* swallow */
  }
}

export async function syncAnnotations() {
  await pushAllLocalAnnotations();
  await pullServerAnnotations();
}
