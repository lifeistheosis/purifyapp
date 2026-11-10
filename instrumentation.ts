import type { Instrumentation } from "next";

/**
 * The test web refuses to start when it is not safely the test web: pointed
 * at the main web's database, calling itself purifyapp.net, or holding a live
 * payment key (lib/testWeb/rules.ts). Render then keeps the last good deploy
 * running and shows the reason in the deploy's log. On the main web, and in
 * the apps, this does nothing.
 */
export async function register() {
  const { testWebStartProblems } = await import("./lib/testWeb");
  const problems = testWebStartProblems();
  if (problems.length) {
    throw new Error(`The test web will not start:\n- ${problems.join("\n- ")}`);
  }
}

/**
 * The website's own server errors, kept for the admin's list of errors
 * readers hit (admin item A10, lib/errors/store.ts).
 *
 * Next calls onRequestError when a page, a route handler or a server action
 * throws on the server. Until now nothing recorded those anywhere the owner
 * could see: this repository has twice shipped a fault only production
 * showed. Each one is kept as the page's path, what failed (scrubbed of
 * anything that could name a person), the route's file and a 500; never the
 * request's headers, cookies, query string or the reader.
 *
 * Two things are not errors here: Next's own control flow (notFound and
 * redirect throw, with a digest that starts "NEXT_"), and the error-report
 * route itself, so a fault in reporting cannot feed itself.
 *
 * Node only: the store needs the service role, which the edge runtime does not
 * carry. The native export has no server and does not carry this file
 * (scripts/native-build.mjs stashes it).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const e = err as { message?: string; digest?: string };
    if (typeof e?.digest === "string" && e.digest.startsWith("NEXT_")) return;
    if (request.path.startsWith("/api/errors")) return;
    const { recordError } = await import("./lib/errors/store");
    await recordError({
      source: "server",
      page: request.path,
      message: e?.message ?? "Unknown error",
      route: context.routePath,
      status: 500,
      platform: "web",
    });
  } catch {
    // Reporting must never be the second failure.
  }
};
