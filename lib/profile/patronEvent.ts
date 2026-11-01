/**
 * The reader's patron saint was saved on this device: chosen, changed or
 * cleared in You (components/profile/PatronSaintPicker.tsx) or on the
 * Community profile (components/community/profile/ProfileEditor.tsx). Both
 * write the one column, profiles.patron_saint.
 *
 * The home screen widgets' sync (components/native/WidgetBridgeSync.tsx)
 * listens, so the My saint widget shows the saint as soon as it is saved.
 * Without it the widget heard of a new patron only when the app next came
 * back to the front a minute or more after it last asked the server, so a
 * reader who chose a saint and went to the home screen still read "Choose
 * your saint in Purify" (the owner's note 85, build 86).
 *
 * A file of its own because the sync is mounted in the root frame, around
 * every page, and must not load the profile screens' code to hear this.
 */

export const PATRON_EVENT = "purify:patron";

/** What the server saved: the saint's slug, or null when the reader cleared it. */
export type PatronChange = { slug: string | null };

/** Tell the app that the patron saved is now this one. */
export function announcePatron(slug: string | null): void {
  try {
    window.dispatchEvent(new CustomEvent<PatronChange>(PATRON_EVENT, { detail: { slug } }));
  } catch {
    // No window (a test, a server render): there is no widget to tell.
  }
}
