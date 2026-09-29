// The walkthroughs are built on main behind this switch: dark on the live
// site and in the apps until the whole of Job is written, then switched on
// as part of v1.5 (the owner, 2026-09-29: the whole enhancement patch is
// 1.5). On in development, so the work can be walked as it is built.

export const WALKTHROUGHS_LIVE = false;

export function walkthroughsEnabled(): boolean {
  return WALKTHROUGHS_LIVE || process.env.NODE_ENV === "development";
}
