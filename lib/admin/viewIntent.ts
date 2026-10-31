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
 * So the shell leaves the intent here as it opens the view, and the view
 * takes it once, as it mounts. Taking it clears it, so coming back to the
 * view later opens it plainly. Module state on purpose: one admin, one
 * browser tab, and nothing to share between them.
 */

let pending: { tab: string; intent: string } | null = null;

/** Called by the shell as it opens `tab` for a link that carried an intent. */
export function setViewIntent(tab: string, intent: string | undefined): void {
  pending = intent ? { tab, intent } : null;
}

/** Called once by the view as it mounts. Null when nothing was asked for. */
export function takeViewIntent(tab: string): string | null {
  if (!pending || pending.tab !== tab) return null;
  const { intent } = pending;
  pending = null;
  return intent;
}
