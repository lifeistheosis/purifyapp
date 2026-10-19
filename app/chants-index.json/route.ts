import { chantIndex } from "@/lib/chants/registry.server";

/**
 * The chants library's index, as one file (1.7): every live chant with its
 * versions, and no words. Pray with chant reads it when its picker first
 * opens, so a prayer screen does not carry the library in its page.
 *
 * `force-static` makes it a file in the apps' export, fetched with a relative
 * address and so with no signal needed, as app/search-corpus.json is. Not
 * under app/api, which the native build sets aside.
 */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(chantIndex(), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
