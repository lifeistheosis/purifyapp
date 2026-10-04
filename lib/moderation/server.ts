import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { pageAllSettled } from "@/lib/supabase/pageAll";

import { censorText, compileFilter, handleBlocked, type CompiledFilter, type TermEntry } from "./filter";
import { ALLOWED_WORDS, BUILT_IN_TERMS } from "./terms";

/**
 * The word filter as the routes use it: the built-in list (terms.ts) plus the
 * words the team added in the admin panel (community_filter_terms,
 * 20261004000000_community_filter.sql), re-read at most once a minute per server.
 * Before that migration the table is absent and the built-in list is all
 * there is.
 */

export type CustomTerm = { term: string; scope: "text" | "handle" | "link"; whole_word: boolean };

const BUILT_IN = compileFilter(BUILT_IN_TERMS, ALLOWED_WORDS);
const TTL_MS = 60_000;
let cache: { at: number; filter: CompiledFilter; hosts: string[] } | null = null;

/** A custom term as a list entry: writing terms are masked and refused in handles; handle terms only refused. */
export function customEntry(t: CustomTerm): TermEntry {
  return t.scope === "text" ? [t.term, `t${t.whole_word ? "w" : "p"}a`] : [t.term, `h-${t.whole_word ? "k" : "a"}`];
}

/** The team's list, read at most once a minute: words for the filter, web addresses for the spam check. */
async function load(admin: SupabaseClient): Promise<{ filter: CompiledFilter; hosts: string[] }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  let filter = BUILT_IN;
  let hosts: string[] = [];
  try {
    // In pages. One request stops at 1,000 rows whatever .limit() asks for,
    // and a word past the thousandth would simply not have been filtered.
    const { data, error } = await pageAllSettled<CustomTerm>((from, to) =>
      admin.from("community_filter_terms").select("term, scope, whole_word").order("term").range(from, to),
    );
    if (!error && Array.isArray(data) && data.length > 0) {
      const rows = data;
      // A blocked web address (20261005) is not a word: it never masks text
      // and never refuses a handle. The spam check reads it instead.
      const words = rows.filter((r) => r.scope === "text" || r.scope === "handle");
      hosts = rows.filter((r) => r.scope === "link").map((r) => r.term);
      if (words.length > 0) filter = compileFilter([...BUILT_IN_TERMS, ...words.map(customEntry)], ALLOWED_WORDS);
    }
  } catch {
    // The built-in list still stands.
  }
  cache = { at: Date.now(), filter, hosts };
  return cache;
}

export async function getFilter(admin: SupabaseClient): Promise<CompiledFilter> {
  return (await load(admin)).filter;
}

/** Web addresses the team blocks (community_filter_terms, scope 'link'). */
export async function getBlockedHosts(admin: SupabaseClient): Promise<string[]> {
  return (await load(admin)).hosts;
}

/** Forget the cached list: the admin just changed it. */
export function forgetFilter(): void {
  cache = null;
}

export type CensoredPost = { title: string | null; body: string | null; hits: number };

/** A post's or reply's words, with listed ones masked. */
export async function censorPost(
  admin: SupabaseClient,
  input: { title?: string | null; body?: string | null },
): Promise<CensoredPost> {
  const f = await getFilter(admin);
  const t = input.title ? censorText(input.title, f) : null;
  const b = input.body ? censorText(input.body, f) : null;
  return { title: t ? t.text : (input.title ?? null), body: b ? b.text : (input.body ?? null), hits: (t?.hits ?? 0) + (b?.hits ?? 0) };
}

/** A display name as others see it: listed words masked. */
export async function censorName(admin: SupabaseClient, name: string): Promise<string> {
  return censorText(name, await getFilter(admin)).text;
}

/** Whether profile text (bio, status, parish) carries a listed word. */
export async function textHasListedWord(admin: SupabaseClient, ...texts: (string | null | undefined)[]): Promise<boolean> {
  const f = await getFilter(admin);
  return texts.some((t) => Boolean(t) && censorText(t as string, f).hits > 0);
}

/** Whether a handle carries a listed word. */
export async function handleIsBlocked(admin: SupabaseClient, handle: string): Promise<boolean> {
  return handleBlocked(handle, await getFilter(admin));
}

/** The built-in filter, for code that has no database at hand. */
export function builtInFilter(): CompiledFilter {
  return BUILT_IN;
}
