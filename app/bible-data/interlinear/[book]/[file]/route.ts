import { chapterInterlinear, chapterOfFile, interlinearFiles } from "@/lib/bible/chapterExtras";

/**
 * The Greek beside one chapter, as a file: /bible-data/interlinear/john/1.json.
 *
 * `force-static` and generateStaticParams make each one a FILE, written at
 * build time, so it ships inside the apps and is read with no network, the
 * way app/search-corpus.json is. The reader fetches it only when the Greek is
 * switched on (lib/bible/chapterData.ts). Why it is not a prop of the chapter
 * page any more is in lib/bible/chapterExtras.ts.
 *
 * Deliberately NOT under app/api: scripts/native-build.mjs stashes that whole
 * tree out of the export.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return interlinearFiles();
}

export async function GET(_req: Request, { params }: { params: Promise<{ book: string; file: string }> }) {
  const { book, file } = await params;
  const chapter = chapterOfFile(file);
  const data = chapter === null ? null : await chapterInterlinear(book, chapter);
  if (!data) return new Response("Not found", { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
