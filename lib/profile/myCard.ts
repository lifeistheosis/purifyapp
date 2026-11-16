"use client";

import { useEffect, useSyncExternalStore } from "react";

import { readLocalSessionUser } from "@/lib/supabase/localSession";

import { fetchMyProfile } from "./client";
import { PATRON_EVENT, type PatronChange } from "./patronEvent";
import { patronFor } from "./patrons";
import type { MyProfile, PublicProfile } from "./publicProfile";

/**
 * The signed-in reader's own card, kept on the device (1.9, build 98 note 11:
 * You and Profile as one design).
 *
 * Who the reader is stands at the top of You and of Profile: their picture,
 * their name, their patron saint and their badges, and on Profile their
 * Community card as others see it. The patron and the card are the profile
 * row's (app/api/profile/me). Asked for on every visit they would arrive a
 * round trip after the name, and the name would move for them; with no
 * signal they would not arrive at all. So what the website last said is kept
 * with whose it is, as the badges are (./myBadges.ts) and the picture
 * (./myPicture.ts), and drawn from the first paint. It is asked for again at
 * most every ten minutes, or at once where a screen says `fresh` (Profile,
 * which a reader comes back to from the card's editor).
 *
 * Only what the two screens draw is kept: nothing of the account (no
 * address, no dates of the subscription), and it goes when another reader
 * signs in on the device.
 */

export type MyCard = Pick<PublicProfile, "handle" | "name" | "avatar" | "status" | "cosmetics" | "badges" | "patronSaint" | "tier"> &
  Partial<Pick<PublicProfile, "clergy">>;

const CACHE_KEY = "purify.myCard";
const REREAD_MS = 10 * 60_000;

type Kept = { uid: string; card: MyCard; at: number };

let kept: Kept | null | undefined;
let asking: Promise<void> | null = null;
let heard = false;
const listeners = new Set<() => void>();

function emit(next: Kept | null) {
  kept = next;
  for (const listener of listeners) listener();
}

/** What a profile comes to on the device: the card's own fields and no more. */
export function cardOf(profile: MyProfile | MyCard): MyCard {
  return {
    handle: profile.handle,
    name: profile.name,
    avatar: profile.avatar,
    status: profile.status,
    cosmetics: profile.cosmetics,
    badges: profile.badges,
    patronSaint: profile.patronSaint,
    tier: profile.tier,
    clergy: profile.clergy ?? null,
  };
}

function readKept(): Kept | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const k = JSON.parse(raw) as Partial<Kept>;
    if (typeof k.uid !== "string" || typeof k.at !== "number" || !k.card || typeof k.card !== "object") return null;
    const card = k.card as Partial<MyCard>;
    if (typeof card.name !== "string" || !card.cosmetics || !Array.isArray(card.badges)) return null;
    return { uid: k.uid, at: k.at, card: cardOf(card as MyCard) };
  } catch {
    return null;
  }
}

function writeKept(next: Kept) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // A private window: the card still shows, it is just not remembered.
  }
}

function ask(uid: string) {
  asking ??= fetchMyProfile()
    .then((res) => {
      // Offline, or before profiles are open: what is kept stands.
      if (!res.ok) return;
      const next = { uid, card: cardOf(res.profile), at: Date.now() };
      writeKept(next);
      emit(next);
    })
    .finally(() => {
      asking = null;
    });
}

/** A patron saved on this device is on the card at once (./patronEvent.ts). */
function hearPatron() {
  if (heard) return;
  heard = true;
  window.addEventListener(PATRON_EVENT, (e) => {
    if (!kept) return;
    const slug = (e as CustomEvent<PatronChange>).detail?.slug ?? null;
    const saint = slug ? patronFor(slug) : null;
    const next = { ...kept, card: { ...kept.card, patronSaint: saint ? { slug: saint.slug, name: saint.name } : null } };
    writeKept(next);
    emit(next);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What is kept for the reader signed in on this device, read once, before the first paint. */
function snapshot(): Kept | null {
  if (kept === undefined) {
    const uid = readLocalSessionUser()?.id ?? null;
    const read = uid ? readKept() : null;
    kept = read && read.uid === uid ? read : null;
  }
  return kept;
}

/**
 * The reader's own card, or null: nobody signed in, or nothing known of them
 * yet. `fresh` asks the website again on this visit, whatever is kept.
 */
export function useMyCard({ fresh = false }: { fresh?: boolean } = {}): MyCard | null {
  const now = useSyncExternalStore(subscribe, snapshot, () => null);

  useEffect(() => {
    const uid = readLocalSessionUser()?.id ?? null;
    if (!uid) {
      if (kept) emit(null);
      return;
    }
    hearPatron();
    // Another reader has signed in since the card was read.
    if (kept && kept.uid !== uid) emit(null);
    if (!kept) {
      const read = readKept();
      if (read && read.uid === uid) emit(read);
    }
    if (fresh || !kept || Date.now() - kept.at >= REREAD_MS) ask(uid);
  }, [fresh]);

  return now?.card ?? null;
}
