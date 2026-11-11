/**
 * An auth error in the reader's words where the browser's would show (1.9,
 * found on the walk of the sign-in screens with no signal: "Failed to
 * fetch", the browser's own words, under Sign in). A request that never
 * reached the server says so plainly; anything else keeps the words the form
 * gave it.
 */

/** A browser's own words for a request that never reached the server: Chrome's, Safari's, Firefox's and Node's. */
const NO_CONNECTION = /failed to fetch|load failed|networkerror when attempting to fetch|network request failed|fetch failed/i;

export function connectionAware(message: string, t: (key: string) => string): string {
  return NO_CONNECTION.test(message) ? t("auth.noSignal") : message;
}
