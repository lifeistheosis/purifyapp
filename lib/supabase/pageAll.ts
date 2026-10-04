// Every row a query matches, fetched 1,000 at a time.
//
// The API caps a response at 1,000 rows no matter what .limit() asks for, and
// it does so silently: .limit(50_000) returns 1,000 rows and no error. A read
// with no .limit() at all is capped the same way, and so is a function that
// returns rows. Any count or tally built on one request therefore stops at
// 1,000. Page instead.
//
// GIVE THE QUERY A TOTAL ORDER. Each page is its own request, and rows with
// no stated order, or tied on the column they are ordered by, may come back
// in a different order on the next one. A page boundary then repeats a row or
// skips one. Order by a unique column, or by a column and then a unique one:
// .order("created_at").order("id"). lib/supabase/__tests__/rowCap.test.ts
// refuses a .range() with no .order() at all.
//
// `cap` is a stop, not a promise: past it the walk ends and returns what it
// has. A caller that passes one compares the length to it and says so.

const PAGE = 1000;

type Page<T, E = { message: string }> = { data: T[] | null; error: E | null };

/**
 * pageAll for a caller that branches on the error, the way it would on one
 * request: { data, error }, with the error object as the API gave it, code and
 * all. A walk that fails on any page answers with no rows, never with the
 * pages it had read so far.
 */
export async function pageAllSettled<T, E extends { message: string } = { message: string }>(
  fetch: (from: number, to: number) => PromiseLike<Page<T, E>>,
  cap = 250_000,
): Promise<{ data: T[]; error: null } | { data: null; error: E }> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += PAGE) {
    const { data, error } = await fetch(from, from + PAGE - 1);
    if (error) return { data: null, error };
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return { data: out, error: null };
}

/** Throws on a failed page. The error the API gave is on the thrown one as `cause`. */
export async function pageAll<T>(
  fetch: (from: number, to: number) => PromiseLike<Page<T>>,
  cap = 250_000,
): Promise<T[]> {
  const { data, error } = await pageAllSettled(fetch, cap);
  if (error) throw new Error(error.message, { cause: error });
  return data;
}

/**
 * pageAll for an .in() filter over a list that may be long.
 *
 * The list travels in the address of the request, and an address has a length
 * limit of its own, so a long enough list is refused before the database sees
 * it. The list goes in pieces instead, each piece read in pages: 100 uuids
 * make about 4 KB of address. Ids are taken once each, so a row is never
 * returned for two pieces.
 */
export async function pageAllIn<T, K = string>(
  ids: Iterable<K>,
  fetch: (some: K[], from: number, to: number) => PromiseLike<Page<T>>,
  size = 100,
): Promise<T[]> {
  const unique = [...new Set(ids)];
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += size) {
    const some = unique.slice(i, i + size);
    out.push(...(await pageAll<T>((from, to) => fetch(some, from, to))));
  }
  return out;
}
