// A shared journal page as the website reads it, for /p/<id> and its preview
// (1.9, step 3). Server-only: the service role reads the table (it has no
// public read policy), and only a share that is neither withdrawn nor hidden.
// The page is made safe again on the way out (lib/journal/share.ts,
// publicPage), whatever the row holds. A verse card's words come from the
// app's own Bible on the server, as the reader's device shows them.

import "server-only";

import { loadVerseRange } from "@/lib/bible/load";
import type { Page } from "@/lib/journal/page";
import { publicPage } from "@/lib/journal/share";
import { createAdminClient } from "@/lib/supabase/admin";

export type SharedPage = {
  id: string;
  page: Page;
  createdAt: string;
  /** Reviewed pages may be found by search engines; the rest are kept out. */
  reviewed: boolean;
  /** Each verse card's words, by "book/chapter/verse". */
  verses: Record<string, string>;
};

export async function getSharedPage(id: string): Promise<SharedPage | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  type Row = { id: string; body: string; created_at: string; withdrawn_at: string | null; hidden_at: string | null; reviewed_at: string | null };
  let row: Row | null;
  try {
    const { data, error } = await createAdminClient()
      .from("shared_pages")
      .select("id, body, created_at, withdrawn_at, hidden_at, reviewed_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    row = (data as Row | null) ?? null;
  } catch {
    return null;
  }
  if (!row || row.withdrawn_at || row.hidden_at) return null;
  const page = publicPage(row.body);
  if (!page) return null;
  const verses: Record<string, string> = {};
  for (const b of page.blocks) {
    if (b.type !== "verse") continue;
    const found = await loadVerseRange(b.book, b.chapter, b.from, b.to).catch(() => null);
    for (const v of found?.verses ?? []) verses[`${b.book}/${b.chapter}/${v.n}`] = v.text;
  }
  return { id: row.id, page, createdAt: row.created_at, reviewed: Boolean(row.reviewed_at), verses };
}
