import { strongsFile } from "@/lib/bible/chapterExtras";

/**
 * Strong's Greek lexicon, whole, as one file: /bible-data/strongs.json.
 *
 * Every chapter page used to carry its own cut of this, the entries its words
 * use, which came to 16.6 MB of repeats across the Bible for a lexicon that
 * is 0.6 MB once. The reader fetches this the first time the Greek is switched
 * on and keeps it for every chapter after (lib/bible/chapterData.ts).
 */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(strongsFile(), {
    headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
