import { servedTiming, timingFiles } from "@/lib/chants/timing.server";

/**
 * A chant version's timing file, as a file: /chant-timing/psalm-135/en.json
 * (1.8, build 86 note 78). Written at build time from
 * data/chants/timing/<slug>/<id>.json and shipped inside the apps, as
 * app/bible-data is, so a chant's words are timed in the app with no signal
 * and whatever the website runs. Not under app/api, which the native build
 * sets aside. A line its version hides (build 93) is not in it.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return timingFiles();
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await params;
  const timing = servedTiming(slug, file);
  if (!timing) return new Response("Not found", { status: 404 });
  return Response.json(timing, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
