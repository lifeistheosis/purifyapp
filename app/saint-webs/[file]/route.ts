import { saintWeb, webSlugs } from "@/lib/saints/web";
import { slugOfWebFile, webFileName } from "@/lib/saints/webGlide";

/**
 * A saint's web as a file: /saint-webs/basil-the-great.json (1.8, the build 80
 * note 55). "Center the web here" glides to the other saint's web in the same
 * room, with no page swap (components/saints/web/SaintWebScreen.tsx), so the
 * new web's data has to be on the device: the apps' export has no server.
 *
 * Written at build time, so it ships inside the apps and opens with no
 * network, the way app/saints-data does; read by lib/saints/webFiles.ts. It
 * is exactly what the web's page hands its screen (lib/saints/web.ts,
 * saintWeb), one file for each saint who has a web: 91 files and about 336 KB
 * on disk (about 95 KB packed) on the 2026-10-31 registry, measured by
 * JSON.stringify of every web. The page keeps its own web as a prop, so it
 * still draws at once on arrival; the file is read only to glide to another.
 *
 * Deliberately NOT under app/api: scripts/native-build.mjs stashes that whole
 * tree out of the export.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return webSlugs().map((slug) => ({ file: webFileName(slug) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const slug = slugOfWebFile(file);
  const web = slug ? saintWeb(slug) : null;
  if (!web) return new Response("Not found", { status: 404 });
  return Response.json(web, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
