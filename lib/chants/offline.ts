"use client";

/**
 * A chant kept on the phone (1.9, item 8; s3-02 in docs/1.9-build/ideas.json):
 * one recording saved in the app's own files, so it plays in church, on a
 * flight, with no signal, as a book's readings do (lib/readAloud/offline.ts).
 * Only in the apps: a browser keeps what it keeps.
 *
 * KEPT ONLY WHILE THE LIST NAMES IT. The recordings are the owner's, and he
 * takes one down from the admin (lib/chants/pulls.ts): the live list
 * (/audio/chants/live.json) stops naming it, and every app stops playing it.
 * A copy on a phone must not outlive that, so the decision recorded on s3-02
 * holds here: a saved recording plays with no signal, and the first list the
 * app reads that does not name it as live takes it off the phone
 * (keepOnlyListed, called by lib/chants/live.ts whenever a list is read, and
 * at each launch while anything is saved, components/native/SavingBridge.tsx).
 * If it is playing then, the player is put away first. A phone that never
 * comes online again keeps it; any connection ends it.
 *
 * WHO MAY SAVE: CHANT_SAVING, one line in ./saving.ts. "plus" matches
 * saving a book's readings (components/player/SaveOffline.tsx asks Plus
 * first); "free" lets every reader save. The Plus screen's Listen offline
 * line names chants only while it is "plus" (lib/premium/plusRows.ts).
 *
 * The recording is the only file: its timing rides in the app already
 * (CHANT_TIMING, lib/chants/media.ts). It is kept at
 * audio/chants/<slug>/<id>.mp3 in the folder the book's readings use
 * (LibraryNoCloud: kept out of an iPhone's iCloud backup, as Apple asks of
 * what can be downloaded again), so the address it plays from ends as the
 * recording's own does, and the player knows it for that recording
 * (sameRecording, lib/chants/media.ts). What is saved is listed on the device
 * (purify:chants.saved).
 *
 * Nothing here decides who may save: the screens ask, with CHANT_SAVING.
 */

import { useSyncExternalStore } from "react";

import { getAudioSnapshot, unload } from "@/lib/prayers/persistentAudioStore";

import { chantMediaUrl, isStreamed, variantRef } from "./media";

/** Who may save: the one switch, in its own file (./saving.ts). */
export { CHANT_SAVING } from "./saving";

const KEY = "purify:chants.saved";
const EVENT = "purify:chants.saved";

/** Chant recordings are 128 kbps: 16,000 bytes a second (measured on the bucket, 2026-11-10). */
export const CHANT_BYTES_PER_SECOND = 16_000;

/**
 * A saved recording: the file's address on the phone, its size, and the
 * address it was saved from (a version whose recording moves is not this copy).
 */
export type SavedChant = { file: string; bytes: number; src: string };

type Plugin = typeof import("@capacitor/filesystem");

type VariantLike = { id: string; audio: { src: string } };

function read(): Record<string, SavedChant> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    return o && typeof o === "object" ? (o as Record<string, SavedChant>) : {};
  } catch {
    return {};
  }
}

function write(all: Record<string, SavedChant>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* a full or private store: the chant streams as before */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Every saved recording, by "<slug>/<variant id>". */
export function savedChants(): Record<string, SavedChant> {
  return typeof window === "undefined" ? {} : read();
}

/** Listen for the list changing (a chant saved or taken off). */
export function onSavedChantsChange(changed: () => void): () => void {
  window.addEventListener(EVENT, changed);
  return () => window.removeEventListener(EVENT, changed);
}

const NONE: ReadonlySet<string> = new Set();
let refsKey: string | null = null;
let refsSet: ReadonlySet<string> = NONE;

/** The saved recordings' refs, one set while the list is the same. */
export function savedChantRefs(): ReadonlySet<string> {
  if (typeof window === "undefined") return NONE;
  const keys = Object.keys(read()).sort().join(",");
  if (keys !== refsKey) {
    refsKey = keys;
    refsSet = new Set(keys ? keys.split(",") : []);
  }
  return refsSet;
}

/** The saved recordings, kept in step with the phone: none on the website. */
export function useSavedChants(): ReadonlySet<string> {
  return useSyncExternalStore(onSavedChantsChange, savedChantRefs, () => NONE);
}

/** The address the WebView plays a saved file from (Capacitor's own file bridge). */
function playable(uri: string): string {
  const cap = (window as unknown as { Capacitor?: { convertFileSrc?: (u: string) => string } }).Capacitor;
  return cap?.convertFileSrc ? cap.convertFileSrc(uri) : uri;
}

/** This version's saved copy, if it is saved from the recording it has now. */
function entryFor(slug: string, variant: VariantLike): SavedChant | null {
  if (typeof window === "undefined") return null;
  const s = read()[variantRef(slug, variant.id)];
  return s && s.src === variant.audio.src ? s : null;
}

/** Whether this version is saved on the phone. */
export function isChantSaved(slug: string, variant: VariantLike): boolean {
  return entryFor(slug, variant) !== null;
}

/** The saved copy's address for the player; null when not saved. */
export function savedChantSrc(slug: string, variant: VariantLike): string | null {
  const s = entryFor(slug, variant);
  return s ? playable(s.file) : null;
}

/** What the player loads for this version: the copy on the phone, else the recording where it streams from. */
export function chantSrc(slug: string, variant: VariantLike): string {
  return savedChantSrc(slug, variant) ?? chantMediaUrl(variant.audio.src);
}

/** Roughly what saving this version takes, in bytes, from its length. */
export function chantBytes(durationSec: number): number {
  return Math.round(Math.max(0, durationSec) * CHANT_BYTES_PER_SECOND);
}

/** Where a version's copy is kept, in the app's folder. */
export function savedPath(slug: string, variantId: string): string {
  return `audio/chants/${slug}/${variantId}.mp3`;
}

// ---- saving: one recording at a time, its progress shown by the player

export type ChantSaving = { ref: string; share: number };
type SavingState = { job: ChantSaving | null; failed: string | null };

let saving: SavingState = { job: null, failed: null };
const savingListeners = new Set<() => void>();

function setSaving(next: SavingState): void {
  saving = next;
  for (const l of savingListeners) l();
}

/** The saving under way, if any, and the last recording that could not be saved. */
export function useChantSaving(): SavingState {
  return useSyncExternalStore(
    (l) => {
      savingListeners.add(l);
      return () => {
        savingListeners.delete(l);
      };
    },
    () => saving,
    () => saving,
  );
}

/** A piece of a recording as base64, which is how the plugin takes a file's bytes; small enough not to overflow the call stack. */
function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

/** Written in pieces of this many bytes, so a long chant never crosses to the phone as one string. */
const PIECE = 3 * 1024 * 1024;

/**
 * Save one version of a chant on the phone: its recording read from where it
 * streams (in the apps, the website's or the bucket's address) and written in
 * pieces, the share read so far shown as it goes. False, and the version
 * left to stream, when it cannot be had or written. A bundled recording is
 * already on the phone and is not saved again.
 */
export async function saveChant(slug: string, variant: VariantLike, plugin?: Plugin): Promise<boolean> {
  if (!isStreamed(variant.audio.src)) return false;
  const ref = variantRef(slug, variant.id);
  if (saving.job) return false;
  setSaving({ job: { ref, share: 0 }, failed: null });
  const path = savedPath(slug, variant.id);
  try {
    const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
    const res = await fetch(chantMediaUrl(variant.audio.src, true), { credentials: "omit" });
    if (!res.ok) throw new Error("not to be had");
    const total = Number(res.headers.get("content-length")) || 0;
    const chunks: Uint8Array[] = [];
    let got = 0;
    if (res.body) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total > 0) setSaving({ job: { ref, share: Math.min(0.95, (got / total) * 0.95) }, failed: null });
      }
    } else {
      const all = new Uint8Array(await res.arrayBuffer());
      chunks.push(all);
      got = all.length;
    }
    if (got === 0 || (total > 0 && got !== total)) throw new Error("cut short");
    const bytes = new Uint8Array(got);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.length;
    }
    let uri = "";
    for (let i = 0; i < bytes.length; i += PIECE) {
      const data = toBase64(bytes.subarray(i, i + PIECE));
      if (i === 0) {
        uri = (await Filesystem.writeFile({ path, data, directory: Directory.LibraryNoCloud, recursive: true })).uri;
      } else {
        await Filesystem.appendFile({ path, data, directory: Directory.LibraryNoCloud });
      }
    }
    write({ ...read(), [ref]: { file: uri, bytes: got, src: variant.audio.src } });
    setSaving({ job: null, failed: null });
    return true;
  } catch {
    // Nothing half written is kept, and nothing is listed.
    try {
      const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
      await Filesystem.deleteFile({ path, directory: Directory.LibraryNoCloud });
    } catch {
      /* never written */
    }
    setSaving({ job: null, failed: ref });
    return false;
  }
}

/**
 * Take a saved recording off the phone. `stopIfPlaying` (a takedown): if the
 * player has the copy loaded, it is put away first, so a recording taken down
 * stops. The reader's own Remove leaves a copy that is playing to finish.
 */
export async function removeChant(ref: string, plugin?: Plugin, stopIfPlaying = false): Promise<void> {
  const all = read();
  const entry = all[ref];
  if (!entry) return;
  if (stopIfPlaying) {
    const playing = getAudioSnapshot().src;
    if (playing && playing === playable(entry.file)) unload();
  }
  const [slug, id] = ref.split("/");
  try {
    const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
    await Filesystem.deleteFile({ path: savedPath(slug, id), directory: Directory.LibraryNoCloud });
  } catch {
    /* already gone */
  }
  const now = read();
  delete now[ref];
  write(now);
}

/**
 * The takedown, on the phone: every saved recording the list just read does
 * not name as live is taken off it, and stopped if it is playing. A list
 * read, never a failure to read one, can take a copy away. Never throws.
 */
export async function keepOnlyListed(list: { live: readonly string[]; pulled: readonly string[] }, plugin?: Plugin): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const live = new Set(list.live);
  const pulled = new Set(list.pulled);
  const gone = Object.keys(read()).filter((ref) => pulled.has(ref) || !live.has(ref));
  for (const ref of gone) {
    try {
      await removeChant(ref, plugin, true);
    } catch {
      /* tried again with the next list */
    }
  }
  return gone;
}

let checking: Promise<number> | null = null;

/**
 * At each launch (components/native/SavingBridge.tsx): every saved recording
 * whose file is no longer on the phone taken off the list, and every other's
 * address made again from where its file is now, since an update moves an
 * iPhone app's folder. Answers how many are saved. One check at a time; never
 * throws.
 */
export function checkSavedChants(plugin?: Plugin): Promise<number> {
  if (!checking) {
    checking = checkOnce(plugin)
      .catch(() => Object.keys(savedChants()).length)
      .finally(() => {
        checking = null;
      });
  }
  return checking;
}

async function checkOnce(plugin?: Plugin): Promise<number> {
  if (typeof window === "undefined") return 0;
  const keys = Object.keys(read());
  if (!keys.length) return 0;
  const { Filesystem, Directory } = plugin ?? (await import("@capacitor/filesystem"));
  for (const ref of keys) {
    const [slug, id] = ref.split("/");
    const path = savedPath(slug, id);
    try {
      await Filesystem.stat({ path, directory: Directory.LibraryNoCloud });
    } catch {
      const now = read();
      delete now[ref];
      write(now);
      continue;
    }
    try {
      const { uri } = await Filesystem.getUri({ path, directory: Directory.LibraryNoCloud });
      const now = read();
      if (now[ref] && now[ref].file !== uri) {
        now[ref] = { ...now[ref], file: uri };
        write(now);
      }
    } catch {
      /* its address next time */
    }
  }
  return Object.keys(read()).length;
}
