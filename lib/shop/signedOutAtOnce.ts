"use client";

import { useSyncExternalStore } from "react";

import { readLocalSessionUser } from "@/lib/supabase/localSession";

const noSubscribe = () => () => {};

/**
 * The shop's own signed pages (Orders, Requests, Messages) know a signed-out
 * reader from their first frame on the device.
 *
 * Each asked for the session after it had drawn, so a signed-out reader saw
 * its loading bones for a frame or two and then its Sign in (Gate 3c, group
 * 9: with motion reduced, Orders and Requests from the cart flashed a box
 * there for 1 or 2 frames, 4 of 4). A reader with no session kept on the
 * device is signed out, and the page now says so in its first frame, as the
 * gift's ticket does (components/gifts/OrderGiftClient.tsx).
 *
 * The answer is a peek for useAsyncData (lib/shop/useAsyncData.ts): the
 * page's own signed-out answer on the device with no session on it, and null
 * anywhere else (on the server, while the page wakes from the export's HTML,
 * so the first render matches it, and with a session to read, where the page
 * asks as before). The ask still runs behind it, and its answer stands once it
 * comes; a check that cannot finish leaves Sign in standing, which is the
 * truth for a device with no session on it (F-13 is a signed-in reader shown
 * Sign in, and a signed-in reader always has one).
 */
export function useSignedOutPeek<T>(signedOut: T): () => T | null {
  const onDevice = useSyncExternalStore(noSubscribe, () => true, () => false);
  return () => (onDevice && !readLocalSessionUser() ? signedOut : null);
}
