import { buildSearchCorpus } from "@/lib/search/buildCorpus";

/**
 * The command palette's corpus, as one file.
 *
 * It used to be handed to the palette as a server prop, which meant Next
 * serialised the whole list into EVERY page it rendered. Measured on the
 * Android export: 66,778 bytes of HTML plus 59,596 bytes of RSC payload on
 * 1,811 of 1,820 pages, or 218 MB raw and 44.5 MB on the wire, to power a
 * dialog that renders nothing until someone presses Cmd+K. The palette now
 * fetches this on first open instead.
 *
 * `force-static` is what makes it a FILE rather than a handler: under
 * `output: "export"` a static GET route handler is written to disk, so this
 * lands at out/search-corpus.json and ships inside the APK. The palette
 * fetches it with a relative URL, which resolves against https://localhost
 * in the native shell and therefore works with no network, the same way
 * lib/content/bootstrap.ts already loads the bundled content package.
 *
 * Deliberately NOT under app/api: scripts/android-build.mjs stashes that
 * whole tree out of the export, and a search corpus that vanished from the
 * app but worked on the web is exactly the class of bug this codebase keeps
 * being bitten by.
 */
export const dynamic = "force-static";

export async function GET() {
  const items = await buildSearchCorpus();
  return Response.json(items, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
