import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { censorText, compileFilter, handleBlocked, type CompiledFilter, type TermEntry } from "./filter";
import { ALLOWED_WORDS, BUILT_IN_TERMS } from "./terms";

/**
 * The word filter as the routes use it: the built-in list (terms.ts) plus the
 * words the team added in the admin panel (community_filter_terms,
 * 20261004_community_filter.sql), re-read at most once a minute per server.
 * Before that migration the table is absent and the built-in list is all
 * there is.
 */

export type CustomTerm = { term: string; scope: "text" | "handle"; whole_word: boolean };

const BUILT_IN = compileFilter(BUILT_IN_TERMS, ALLOWED_WORDS);
const TTL_MS = 60_000;
let cache: { at: number; filter: CompiledFilter } | null = null;

/** A custom term as a list entry: writing terms are masked and refused in handles; handle terms only refused. */
export function customEntry(t: CustomTerm): TermEntry {
  return t.scope === "text" ? [t.term, `t${t.whole_word ? "w" : "p"}a`] : [t.term, `h-${t.whole_word ? "k" : "a"}`];
}

export async function getFilter(admin: SupabaseClient): Promise<CompiledFilter> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.filter;
  let filter = BUILT_IN;
  try {
    const { data, error } = await admin.from("community_filter_terms").select("term, scope, whole_word").limit(2000);
    if (!error && Array.isArray(data) && data.length > 0) {
      filter = compileFilter([...BUILT_IN_TERMS, ...(data as CustomTerm[]).map(customEntry)], ALLOWED_WORDS);
    }
  } catch {
    // The built-in list still stands.
  }
  cache = { at: Date.now(), filter };
  return filter;
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
