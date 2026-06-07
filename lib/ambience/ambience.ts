// Background ambience — soft looping soundscapes the reader can play behind
// prayer and study. Planned as a paid feature at public launch; for the
// pre-release it ships ungated. Flip AMBIENCE_GATED to true (and wire
// hasAmbienceAccess to the real entitlement) to put it behind the paywall.

export type AmbienceTrack = {
  id: string;
  label: string;
  /** One-line description shown under the label. */
  subtitle: string;
  /** Path under /public. Served as-is; the SW leaves /audio/ to the browser. */
  src: string;
};

export const AMBIENCE_TRACKS: AmbienceTrack[] = [
  // "valley" is held back pre-launch: the source file is 64MB, over
  // GitHub's recommended max, and is excluded from the repo via
  // .gitignore. Re-add the entry once the asset is hosted externally
  // (CDN / Supabase Storage) and the src points at a remote URL.
  {
    id: "campfire",
    label: "Campfire",
    subtitle: "A fire crackling in the woods",
    src: "/audio/ambience/campfire.mp3",
  },
  {
    id: "shadows-of-evil",
    label: "Shadows of Evil",
    subtitle: "A low, brooding atmosphere",
    src: "/audio/ambience/shadows-of-evil.mp3",
  },
  {
    id: "bo2",
    label: "BO2",
    subtitle: "An ambient score",
    src: "/audio/ambience/bo2.mp3",
  },
];

export function getAmbienceTrack(id: string | null): AmbienceTrack | undefined {
  if (!id) return undefined;
  return AMBIENCE_TRACKS.find((t) => t.id === id);
}

// ── Access / paywall ─────────────────────────────────────────────────────────
// Pre-release: ungated. At public launch set AMBIENCE_GATED = true and make
// hasAmbienceAccess read the subscription entitlement (e.g. profiles.is_subscriber).
export const AMBIENCE_GATED = false;

export function hasAmbienceAccess(isSubscriber: boolean): boolean {
  if (!AMBIENCE_GATED) return true;
  return isSubscriber;
}

// localStorage keys for the persistent controller.
export const AMBIENCE_KEYS = {
  track: "purify.ambience.track",
  volume: "purify.ambience.volume",
} as const;
