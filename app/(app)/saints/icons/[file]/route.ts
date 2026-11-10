// An icon file that is not there answers a true 404 on the website (1.9).
//
// The icons are files in public/saints/icons, served before any route. A
// file that is not there (one of the twelve removed on d973feaf0, or a
// mistyped name) fell through to /saints/[slug]/[work], as a saint "icons"
// with a work of that name, whose page streamed before it could say there
// was none and answered 200 with the not-found inside it. This route stands
// in that place, for missing files alone: a file that is there is served
// before it is reached.
//
// The website's alone: the apps carry the icons and have no server, and the
// native build leaves this route out (scripts/native-build.mjs).

export function GET() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
