// The walkthroughs were built on main behind this switch, dark on the live
// site and in the apps until the whole of Job was written. All forty-two
// chapters are in (2026-09-29), so it is on: live on the website now, and in
// the apps with the v1.5 builds (the owner, 2026-09-29: the whole enhancement
// patch is 1.5). Turning it off again hides every way in and renders the
// coming-soon shell on the routes. Always on in development.

export const WALKTHROUGHS_LIVE = true;

export function walkthroughsEnabled(): boolean {
  return WALKTHROUGHS_LIVE || process.env.NODE_ENV === "development";
}
