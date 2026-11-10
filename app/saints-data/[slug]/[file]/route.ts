import { writingFileNamed, writingFiles, writingPartFiles } from "@/lib/saints/writingFile";

/**
 * One work of the Fathers, whole, as a file:
 * /saints-data/athanasius-the-great/on-the-incarnation.json.
 *
 * A work the Bible's commentary quotes is an index at that address and parts
 * beside it (homilies-on-john.p0.json and on), so its words are in the apps
 * once: lib/saints/writingParts.ts. A reader asks through
 * lib/saints/writingClient.ts.
 *
 * Written at build time, so it ships inside the apps and opens with no
 * network, the way app/search-corpus.json does. The apps' reader fetches it
 * when the page opens (components/saints/LazyWritingReader.tsx); why the work
 * is not a prop of the page there is in lib/saints/writingFile.ts.
 *
 * Deliberately NOT under app/api: scripts/native-build.mjs stashes that whole
 * tree out of the export.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return [...writingFiles(), ...(await writingPartFiles())];
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await params;
  const data = await writingFileNamed(slug, file);
  if (!data) return new Response("Not found", { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
