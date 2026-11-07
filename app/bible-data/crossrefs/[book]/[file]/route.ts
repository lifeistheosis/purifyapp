import { chapterCrossRefFile, chapterOfFile, crossRefFiles } from "@/lib/bible/chapterExtras";
import { packCrossRefs } from "@/lib/bible/crossRefPack";

/**
 * One chapter's cross-references, as a file: /bible-data/crossrefs/john/1.json.
 * Written at build time and shipped inside the apps; the reader fetches it
 * when a Plus reader opens a verse's references. See the interlinear route
 * beside this one, and lib/bible/chapterExtras.ts. From 1.9 the references
 * only, packed: the words of the verses they point to are in one file for
 * each book (app/bible-data/crossref-words/, lib/bible/crossRefPack.ts).
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return crossRefFiles();
}

export async function GET(_req: Request, { params }: { params: Promise<{ book: string; file: string }> }) {
  const { book, file } = await params;
  const chapter = chapterOfFile(file);
  const data = chapter === null ? null : await chapterCrossRefFile(book, chapter);
  if (!data) return new Response("Not found", { status: 404 });
  return Response.json(packCrossRefs(data), { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
