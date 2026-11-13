// The on-phone voice (1.9): which voices there are, which are free, and the
// rule the server answers a Plus voice by.
//
// The owner's word. 2026-11-11, about 02:07 (docs/1.9-build/BRAINSTORM.md):
// the recorded Heart voice free where it is recorded, "and a downloadable
// on-phone voice for the Fathers' works and the Plus voices"; "only a reader
// who chooses it downloads it, about 90 MB once". About 13:24: "phone voice in
// v1.9". About 13:32, to the arbiter's question: "yes engine, yes free Heart":
// the download is free to every reader with the Heart voice, so anyone can
// listen to the Fathers free, and every other on-phone voice is Plus.
//
// What a voice is here. The engine (Kokoro 82M, Apache-2.0) is one download,
// the same for every voice. A voice is a small file of its own, about half a
// megabyte, that the engine speaks with. So:
//
//   - the engine and the Heart voice are public files in Purify's own storage
//     (PHONE_VOICE_STORE): every reader may fetch them, signed in or not;
//   - a Plus voice's file is never in the public storage. The app asks the
//     website for it (GET /api/listen/phone-voice?voice=...), and the website
//     reads the reader's entitlement itself before it answers. What is Plus
//     is decided on the server, never by a flag the phone sends (F-27).
//
// Pure, with no fs and no "use client", so the route, the picker and the
// tests all read the one list.

import { deriveEntitlements, type EntitlementRow, type Entitlements } from "@/lib/entitlements/entitlements";

/** Purify's own storage for the engine and the free voice. No third party is asked for anything. */
export const PHONE_VOICE_STORE = "https://audio.purifyapp.net/phone-voice";

/** The website's route for a Plus voice's file. */
export const PHONE_VOICE_ROUTE = "/api/listen/phone-voice";

export type PhoneVoice = {
  /** The engine's own name for the voice, which is also its file's name. */
  id: string;
  /** Free to every reader, or Plus. */
  plus: boolean;
  /**
   * Whether the picker shows it. A candidate waits here, not offered, until
   * the owner has heard it and kept it (OWNER-STEPS V7); the route refuses a
   * voice that is not offered, so nothing unchosen can be fetched.
   */
  offered: boolean;
};

/**
 * Heart is the voice of every recording (lib/readAloud/chapters.ts). The six
 * after it are the candidates of OWNER-STEPS V7, in his order; he keeps two
 * to four by ear and names them for readers, and only then is one offered.
 */
export const PHONE_VOICES: readonly PhoneVoice[] = [
  { id: "af_heart", plus: false, offered: true },
  { id: "am_michael", plus: true, offered: false },
  { id: "am_fenrir", plus: true, offered: false },
  { id: "af_bella", plus: true, offered: false },
  { id: "bm_george", plus: true, offered: false },
  { id: "bm_fable", plus: true, offered: false },
  { id: "bf_emma", plus: true, offered: false },
];

/** The free voice: the one a reader hears before choosing another. */
export const FREE_PHONE_VOICE = "af_heart";

export function phoneVoice(id: unknown, voices: readonly PhoneVoice[] = PHONE_VOICES): PhoneVoice | null {
  return typeof id === "string" ? (voices.find((v) => v.id === id) ?? null) : null;
}

/** The voices the picker shows, in order. */
export function offeredPhoneVoices(): PhoneVoice[] {
  return PHONE_VOICES.filter((v) => v.offered);
}

/** Where the app fetches a voice's file: the public storage for a free voice, the website's route for a Plus one. */
export function phoneVoiceFile(voice: PhoneVoice): { url: string; needsAccount: boolean } {
  return voice.plus
    ? { url: `${PHONE_VOICE_ROUTE}?voice=${voice.id}`, needsAccount: true }
    : { url: `${PHONE_VOICE_STORE}/voices/${voice.id}.bin`, needsAccount: false };
}

export type PhoneVoiceDecision =
  | { ok: true; status: 200; voice: string }
  | { ok: false; status: 400 | 403 | 404; error: "unknown_voice" | "not_offered" | "free_voice" | "plus_required" };

/**
 * The rule behind GET /api/listen/phone-voice, as lib/reader/themeWrite.ts is
 * the rule behind the palettes: the same entitlement model as every other
 * Plus surface, deriveEntitlements under the surface's own switch.
 */
export function decidePhoneVoice(
  raw: unknown,
  row: EntitlementRow | null | undefined,
  opts: {
    /** plusEnforcedFor(surface) for the request's surface. */
    enforced: boolean;
    now?: Date;
    /** A resolved model to use instead of the row (the developer override). */
    override?: Entitlements;
    /** The list to answer from: the real one, unless a test hands its own. */
    voices?: readonly PhoneVoice[];
  },
): PhoneVoiceDecision {
  const voice = phoneVoice(raw, opts.voices);
  if (!voice) return { ok: false, status: 400, error: "unknown_voice" };
  if (!voice.offered) return { ok: false, status: 404, error: "not_offered" };
  // The free voice is a public file: the route is not where it is kept.
  if (!voice.plus) return { ok: false, status: 400, error: "free_voice" };
  const e = opts.override ?? deriveEntitlements(row, { enforced: opts.enforced, now: opts.now });
  if (!e.plusFeatures) return { ok: false, status: 403, error: "plus_required" };
  return { ok: true, status: 200, voice: voice.id };
}
