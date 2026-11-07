import { chapterOfFile, crossRefWordsFile, crossRefWordsFiles } from "@/lib/bible/chapterExtras";

/**
 * The words of a book's verses that cross-references point to, as a file:
 * /bible-data/crossref-words/psalms.json, { "22:1": "The Lord tends me as a
 * shepherd..." }. Each verse once, however many chapters point to it (1.9,
 * lib/bible/crossRefPack.ts). Written at build time and shipped inside the
 * apps beside the chapters' references, as the files beside this one are.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return crossRefWordsFiles();
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const book = /^([a-z0-9-]+)\.json$/.exec(file)?.[1] ?? null;
  const data = book && chapterOfFile(file) === null ? await crossRefWordsFile(book) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
