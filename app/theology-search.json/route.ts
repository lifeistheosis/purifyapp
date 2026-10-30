import { buildTheologySearch } from "@/lib/theology/searchIndex";

/**
 * The theology library's search, as one file (1.8, round 3 r3-04): the
 * doctrines, questions, heresies and apologetics, the Seven Councils and the
 * Fathers the doctrines quote. The search pill on every Theology screen
 * (components/theology/TheologySearch.tsx) reads it when it is first opened,
 * so no page carries the list in itself.
 *
 * `force-static` makes it a file in the apps' export, fetched with a relative
 * address and so with no signal needed, as app/search-corpus.json is. Not
 * under app/api, which the native build sets aside.
 */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await buildTheologySearch(), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
