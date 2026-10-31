/**
 * What a view should open with, when a link asked for more than the view.
 *
 * The shell writes `#tab=<id>` and nothing else (AdminShell's hash writer
 * replaces the whole fragment), so a view cannot be told "open with the
 * waiting filter on" through the address. An old link to Verification is the
 * case that needs it: Verification is a filter of the readers' directory now
 * (the owner's pick C on sheet r3-15), and the link should land on the
 * readers who are waiting on him, not on all of them.
 *
 * So the shell leaves the intent here every time it opens a view (no intent
 * at all for a plain open), and the view reads it as it mounts. Reading does
 * not clear it, so React's double render in development reads the same
 * thing twice; the next open of any view replaces it. Module state on
 * purpose: one admin, one browser tab, and nothing to share between them.
 */

let pending: { tab: string; intent: string } | null = null;

/** Called by the shell on every open of a view, with the intent the link carried or none. */
export function setViewIntent(tab: string, intent: string | undefined): void {
  pending = intent ? { tab, intent } : null;
}

/** Read by the view as it mounts. Null when the open that brought it here asked for nothing. */
export function readViewIntent(tab: string): string | null {
  return pending && pending.tab === tab ? pending.intent : null;
}
