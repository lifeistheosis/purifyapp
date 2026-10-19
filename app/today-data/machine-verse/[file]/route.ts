import { machineVerseFile, machineVerseFileParams } from "@/lib/today/machineVerse.server";

/**
 * TEMPORARY (lib/today/machineVerse.ts): the Verse of the Day's machine
 * translation for one language, as a file: /today-data/machine-verse/tr.json.
 *
 * `force-static` and generateStaticParams make it a file written at build
 * time and shipped inside the apps, so the card reads it with a relative
 * address and no network, as app/search-corpus.json is read. Only a reader in
 * that language ever fetches it (lib/today/useMachineVerse.ts), so nobody
 * else carries it in a page. Not under app/api, which the native build sets
 * aside.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return machineVerseFileParams();
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const language = /^([a-z]{2,3})\.json$/.exec(file)?.[1];
  const data = language ? machineVerseFile(language) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
