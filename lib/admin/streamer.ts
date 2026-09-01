"use client";

import { useSyncExternalStore } from "react";

// Streamer mode. The panel stays fully usable and stops showing anything that
// would be somebody's business but not the audience's.
//
// WHAT IT COVERS. Money and addresses, which are the two things on this
// dashboard that cannot be unshared once a frame has gone out: every revenue,
// profit, payout and MRR figure, and every email. A single frame of a
// subscriber's address is a real person's data leaked to strangers, and it does
// not come back when the stream ends.
//
// BLUR, NOT REDACTION, and the difference matters. Replacing the values would
// mean the operator cannot read their own dashboard while streaming, which
// makes the mode useless exactly when it is on. A blur hides the figure from a
// viewer at video bitrate while leaving it one hover away for the person at the
// keyboard. It is also reversible in CSS, so nothing can be written back in a
// masked state, which is the failure larp mode needed installLarpWriteGuard to
// prevent.
//
// IT IS NOT SECURITY. A blur is a picture, and anyone with the panel open in
// their own browser has the real numbers. It defends against a camera and a
// screen capture, which is what it is for, and it should never be described as
// anything more.

const KEY = "purify:admin:streamer";
const EVENT = "purify:admin:streamer-change";

export const STREAMER_KEY = KEY;
export const STREAMER_EVENT = EVENT;

/** Off by default, so the panel never hides a number nobody asked it to. */
export function streamerOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setStreamer(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to persist to; the event below still flips this session */
  }
  applyStreamerAttribute(on);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

/**
 * The whole mechanism, in one attribute on <html>.
 *
 * A data attribute rather than React state because the elements that need
 * hiding are scattered across sixteen tabs and three shells, and threading a
 * prop to each one is sixteen chances to miss a card. One attribute plus one
 * CSS rule in admin-theme.css reaches everything marked .adm-sensitive, and a
 * new surface opts in by adding that class rather than by remembering to read
 * a context.
 */
export function applyStreamerAttribute(on: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (on) root.setAttribute("data-adm-streamer", "1");
  else root.removeAttribute("data-adm-streamer");
}

export function onStreamerChange(fn: (on: boolean) => void): () => void {
  const h = () => fn(streamerOn());
  window.addEventListener(EVENT, h);
  // A second admin window follows along, so a stream cannot be showing the
  // real figures in a tab the operator forgot about.
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

/** Marks an element as something the audience must not read. */
export const SENSITIVE = "adm-sensitive";

/**
 * Whether streamer mode is on, for the rare case that CSS cannot cover.
 *
 * The class is the mechanism and should stay the mechanism: it reaches
 * anything on screen without a prop. What it cannot reach is a value that is
 * not rendered as text, and the one that matters is a `title` attribute. A
 * blurred address with title={address} hands the whole thing back in a
 * tooltip, which is a leak that looks like a feature and was live in the rail.
 */
export function useStreamerOn(): boolean {
  return useSyncExternalStore(subscribeStreamer, streamerOn, () => false);
}

function subscribeStreamer(onChange: () => void): () => void {
  return onStreamerChange(onChange);
}
