/**
 * Which artifact is being built.
 *
 * `BUILD_TARGET` is set by scripts/native-build.mjs and is unset for the
 * website. Both native targets produce a fully static export (`output: "export"`
 * in next.config.ts) that Capacitor bundles into the app, so the app renders
 * with no network. Android runs that bundle at `https://localhost`, iOS at
 * `capacitor://localhost`; neither has a server, a request, cookies, or headers.
 *
 * That absence, not the platform, is what nearly every call site actually cares
 * about, which is why `IS_STATIC_EXPORT` is the export to reach for. Reading
 * `cookies()`, `headers()`, or `searchParams` opts a route into dynamic
 * rendering, and the export runs with `dynamic = "error"`, so a stray read does
 * not degrade: it fails the build.
 *
 * Before this existed the check was the bare string `process.env.BUILD_TARGET
 * === "android"` copied across ten files, which is why adding a second platform
 * meant touching all ten. Add a third and this is the only line that moves.
 *
 * SERVER ONLY. `BUILD_TARGET` has no `NEXT_PUBLIC_` prefix, so Next does not
 * inline it into client bundles; imported from a `"use client"` module every
 * value here reads as if this were the website. Client code wanting to know
 * whether it is inside the app wants `isNativeClient()` from ./native, which
 * asks the runtime rather than the build.
 */

export type BuildTarget = "android" | "ios" | "web";

const RAW = process.env.BUILD_TARGET;

export const BUILD_TARGET: BuildTarget =
  RAW === "android" || RAW === "ios" ? RAW : "web";

/**
 * True while exporting either native bundle. The guard for anything that needs
 * a request: cookies, headers, searchParams, dynamic rendering.
 */
export const IS_STATIC_EXPORT: boolean = BUILD_TARGET !== "web";
