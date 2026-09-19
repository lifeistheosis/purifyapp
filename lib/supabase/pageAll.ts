// Every row a query matches, fetched 1,000 at a time.
//
// The API caps a response at 1,000 rows no matter what .limit() asks for, and
// it does so silently: .limit(50_000) returns 1,000 rows and no error. Any
// count or tally built on one request therefore stops at 1,000. Page instead.

const PAGE = 1000;

type Page<T> = { data: T[] | null; error: { message: string } | null };

export async function pageAll<T>(
  fetch: (from: number, to: number) => PromiseLike<Page<T>>,
  cap = 250_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += PAGE) {
    const { data, error } = await fetch(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}
