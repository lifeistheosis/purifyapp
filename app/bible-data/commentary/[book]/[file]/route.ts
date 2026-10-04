import { chapterCommentaryFile, chapterOfFile, commentaryFiles } from "@/lib/bible/chapterExtras";

/**
 * The Fathers on one chapter, as a file: /bible-data/commentary/john/1.json.
 * Written at build time and shipped inside the apps, where the reader fetches
 * it when a verse's commentary is opened or the study rail is on screen. The
 * website still writes the commentary into the chapter page itself, so a
 * search engine reads it there. See lib/bible/chapterExtras.ts.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return commentaryFiles();
}

export async function GET(_req: Request, { params }: { params: Promise<{ book: string; file: string }> }) {
  const { book, file } = await params;
  const chapter = chapterOfFile(file);
  const data = chapter === null ? null : await chapterCommentaryFile(book, chapter);
  if (!data) return new Response("Not found", { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
