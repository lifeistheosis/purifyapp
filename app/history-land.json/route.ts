import outline from "@/data/maps/church-history.json";

/**
 * The history map's land, as one file, for the Thread's small map on an
 * event's page (1.9, components/history/EventThread.tsx).
 *
 * Handed over as a prop, the outline (64 KB) would be written into every
 * event page twice, the HTML and the payload, in an app 0.8 MB under its
 * ceiling (docs/1.9-build/PLAN.md, item 46). As a file it is in the app once,
 * and only a reader with Plus, whose Thread draws the map, asks for it.
 * `force-static` makes it a file under `output: "export"`, fetched with a
 * relative address, so the apps read it with no signal (app/search-corpus.json
 * says why, and why it is not under app/api).
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    { view: outline.view, land: outline.land },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
