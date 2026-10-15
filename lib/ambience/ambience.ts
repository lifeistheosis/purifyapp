// Ambience (1.7, Purify Plus): a quiet sound under the reading, chosen in the
// reader's settings and played on a gapless loop (lib/ambience/player.ts).
// The owner's "Do all of these" of 2026-10-15; his call of the same day keeps
// it a Plus feature.
//
// Every file here is recorded in docs/licensing/audio-provenance.md with its
// source and licence, as that document requires before a track ships. Each
// is a 50 to 60 second loop, its end crossfaded into its start, soft (about
// -27 dBFS), made by Homebase/tools/tts-bakeoff/ambience.py.

export type AmbienceId = "rain" | "birds" | "bell";

export type AmbienceTrack = {
  id: AmbienceId;
  /** The catalog key of its name. */
  labelKey: string;
  /** Path under /public. */
  src: string;
};

export const AMBIENCE_TRACKS: readonly AmbienceTrack[] = [
  // "Rain against the window", cori, public domain (Wikimedia Commons).
  { id: "rain", labelKey: "ambience.rain", src: "/audio/ambience/rain.mp3" },
  // "Reggelirigók", morning thrushes, Ödönke, public domain (Wikimedia Commons).
  { id: "birds", labelKey: "ambience.birds", src: "/audio/ambience/birds.mp3" },
  // Made by us: a quiet room and a distant bell, struck twice a minute.
  { id: "bell", labelKey: "ambience.bell", src: "/audio/ambience/bell.mp3" },
];

export function getAmbienceTrack(id: string | null): AmbienceTrack | undefined {
  if (!id) return undefined;
  return AMBIENCE_TRACKS.find((t) => t.id === id);
}
