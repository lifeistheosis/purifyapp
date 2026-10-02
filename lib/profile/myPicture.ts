"use client";

import { useSyncExternalStore } from "react";

import { avatarSrc } from "@/lib/community/avatarSrc";
import { createClient } from "@/lib/supabase/client";

/**
 * The signed-in reader as the app's chrome draws them: the top-right avatar
 * on the desktop nav, the phone header's avatar, the account page's hero.
 * One store, so all three show the same picture and change together.
 *
 * ── Which picture ──────────────────────────────────────────────────────
 *
 * The reader's own upload when they have one (profiles.avatar_url,
 * 20261003_profile_pictures.sql), else the picture their sign-in provides
 * (user_metadata.avatar_url), else their initials. The upload has to come
 * from the profile row: Supabase rewrites user_metadata.avatar_url from
 * Google at every Google sign-in, which is how uploaded pictures kept
 * turning back into Google photos. Last session's answer is kept on the
 * device so the picture paints at once instead of flashing the initials.
 *
 * ── NEVER CALL AN AUTH METHOD FROM THE CALLBACK ──────────────────────────
 *
 * (Moved here with the code from AppNav, where it was learned.) supabase-js
 * awaits whatever an onAuthStateChange callback returns, from inside the
 * auth lock it already holds, so an auth call made from the callback, or a
 * database read, which asks for the session first, waits on a lock that is
 * waiting on it. Nothing times out; both promises simply never settle, and
 * every auth write on the page hangs: that is what once stranded the profile
 * name editor on "Saving...". The callback here only reads the session the
 * event hands it, and the profile read is put on a timer so the lock is
 * released first.
 */

export type MyPicture =
  | { state: "unknown" }
  | { state: "out" }
  | { state: "in"; name: string; picture: string | null };

/** Fired with `{ url }` after a new picture is saved, so every avatar follows at once. */
export const PICTURE_EVENT = "purify:picture";

const UNKNOWN: MyPicture = { state: "unknown" };
const OUT: MyPicture = { state: "out" };
const CACHE_KEY = "purify.myPicture";
/** How long a profile read stands before a new session event may repeat it. */
const REREAD_MS = 60_000;

type Cached = { uid: string; name: string; picture: string | null };

let current: MyPicture = UNKNOWN;
let uid: string | null = null;
let started = false;
let lastRead: { uid: string; at: number } | null = null;
const listeners = new Set<() => void>();

function emit(next: MyPicture) {
  current = next;
  for (const listener of listeners) listener();
}

function readCache(): Cached | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Cached>;
    return typeof c.uid === "string" && typeof c.name === "string"
      ? { uid: c.uid, name: c.name, picture: typeof c.picture === "string" ? c.picture : null }
      : null;
  } catch {
    return null;
  }
}

function writeCache(c: Cached | null) {
  try {
    if (c) window.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // A private window: the picture still shows, it just is not remembered.
  }
}

/** The name a reader goes by when the chrome has nothing better. */
export function readerName(user: { email?: string | null; user_metadata?: unknown }): string {
  const meta = (user.user_metadata ?? {}) as { display_name?: string; full_name?: string };
  return (meta.display_name ?? "").trim() || (meta.full_name ?? "").trim() || user.email?.split("@")[0] || "Reader";
}

async function readOwnPicture(supabase: ReturnType<typeof createClient>, id: string, signInPicture: string | null) {
  if (lastRead && lastRead.uid === id && Date.now() - lastRead.at < REREAD_MS) return;
  lastRead = { uid: id, at: Date.now() };
  let picture = signInPicture;
  try {
    const { data, error } = await supabase.from("profiles").select("avatar_url").eq("id", id).maybeSingle();
    // Before 20261003 the column is absent and the sign-in's picture stands.
    const own = error ? null : ((data as { avatar_url?: string | null } | null)?.avatar_url ?? null);
    if (own) picture = avatarSrc(own);
  } catch {
    // Offline or a broken lock: the sign-in's picture stands.
  }
  if (uid !== id || current.state !== "in") return;
  emit({ state: "in", name: current.name, picture });
  writeCache({ uid: id, name: current.name, picture });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  const cached = readCache();
  if (cached) {
    uid = cached.uid;
    current = { state: "in", name: cached.name, picture: cached.picture };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    current = OUT;
    return;
  }

  const supabase = createClient();
  const apply = (user: { id: string; email?: string | null; user_metadata?: unknown } | null) => {
    if (!user) {
      uid = null;
      lastRead = null;
      writeCache(null);
      emit(OUT);
      return;
    }
    const name = readerName(user);
    const meta = (user.user_metadata ?? {}) as { avatar_url?: string };
    const signInPicture = avatarSrc(meta.avatar_url ?? null);
    const same = uid === user.id && current.state === "in";
    uid = user.id;
    // The same reader keeps the picture already drawn until the profile row
    // has been read again. A reader not seen before shows their initials
    // until then, rather than the Google photo their upload is about to
    // replace.
    emit({ state: "in", name, picture: same && current.state === "in" ? current.picture : null });
    window.setTimeout(() => void readOwnPicture(supabase, user.id, signInPicture), 0);
  };

  // The one read that may take the lock: nobody is holding it on mount.
  void supabase.auth
    .getUser()
    .then(({ data }) => apply(data.user))
    .catch(() => {
      // A lock taken by another tab or call: the session event below still arrives.
    });
  supabase.auth.onAuthStateChange((_event, session) => {
    apply(session?.user ?? null);
  });

  window.addEventListener(PICTURE_EVENT, (e) => {
    const url = (e as CustomEvent<{ url?: string | null }>).detail?.url ?? null;
    if (current.state !== "in" || !url || !uid) return;
    const picture = avatarSrc(url);
    emit({ state: "in", name: current.name, picture });
    writeCache({ uid, name: current.name, picture });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

/** The signed-in reader's name and picture; "unknown" until the session is read. */
export function useMyPicture(): MyPicture {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => UNKNOWN,
  );
}

/** Tell every avatar on the page that the reader has a new picture. */
export function announcePicture(url: string) {
  try {
    window.dispatchEvent(new CustomEvent(PICTURE_EVENT, { detail: { url } }));
  } catch {
    // No window (a test, a server render): nothing is drawn to update.
  }
}
