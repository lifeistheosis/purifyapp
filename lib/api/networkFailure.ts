/**
 * Whether an error's message is the browser's own way of saying the request
 * never reached anything: no signal, aeroplane mode, a dropped connection.
 *
 * Why it is needed. A screen that loads its data keeps the caught error's
 * message to show the reader, which is right when the message is ours ("That
 * order could not be found."). When the phone is offline the message is the
 * engine's: "Failed to fetch" in Chrome and the Android app, "Load failed" in
 * Safari and the iPhone app. A reader with no signal opened the shop and was
 * told "Failed to fetch". This lets a screen notice and say its own plain
 * line instead.
 *
 * It matches the engines' fixed strings and nothing looser, so a message a
 * route wrote on purpose is never taken for one of them.
 */
const NETWORK_FAILURE =
  /^(failed to fetch|load failed|fetch failed|network request failed|networkerror when attempting to fetch resource\.?|the internet connection appears to be offline\.?|the network connection was lost\.?)$/i;

export function isNetworkFailure(message: string | null | undefined): boolean {
  if (!message) return false;
  const text = message.trim();
  return NETWORK_FAILURE.test(text) || /\bnet::ERR_[A-Z_]+/.test(text);
}
