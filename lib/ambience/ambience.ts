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
  // EMPTY FOR THE v9.9 SUBMISSION BUILD. None of the previously bundled
  // tracks (campfire, shadows-of-evil, bo2) carried documented
  // distribution rights, and the latter two appear to originate from a
  // commercial game soundtrack, so all three were removed from the
  // bundle. See docs/licensing/audio-provenance.md for the audit trail
  // and the restoration checklist. The AmbienceController hides itself
  // while this catalogue is empty.
  //
  // "valley" remains held back as before: the source file is 64MB, over
  // GitHub's recommended max, and is excluded from the repo via
  // .gitignore. Re-add the entry once the asset is hosted externally
  // (CDN / Supabase Storage) and the src points at a remote URL.
];

export function getAmbienceTrack(id: string | null): AmbienceTrack | undefined {
  if (!id) return undefined;
  return AMBIENCE_TRACKS.find((t) => t.id === id);
}

// ── Access / paywall ─────────────────────────────────────────────────────────
// Ambience is part of the Purify Plus feature layer (NOT the supporter
// lifetime-sync promise — that covers sync only). Access is governed by
// the entitlement model in lib/entitlements: pass the derived
// `plusFeatures` flag. While ENTITLEMENTS_ENFORCED is false, that flag is
// always true, so ambience is open in the pre-launch builds exactly as
// before. No separate AMBIENCE_GATED switch is needed — the single
// launch switch lives in lib/entitlements/entitlements.ts.
export function hasAmbienceAccess(plusFeatures: boolean): boolean {
  return plusFeatures;
}

// localStorage keys for the persistent controller.
export const AMBIENCE_KEYS = {
  track: "purify.ambience.track",
  volume: "purify.ambience.volume",
} as const;
