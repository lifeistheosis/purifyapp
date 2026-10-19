// Ambience (1.7, Purify Plus): a quiet sound under the reading, chosen in the
// ambience sheet (components/player/AmbienceSheet.tsx, opened from the sound
// button by the reader's chapter pager) and played on a gapless loop
// (lib/ambience/player.ts). The owner's "Do all of these" of 2026-10-15; his
// call of the same day keeps it a Plus feature, and his note 25 of
// 2026-10-16 took it out of the reader's settings into a control of its own.
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
  /**
   * Where the file is. "bundle": inside the apps, so it plays with no
   * signal. "web": on the website alone, asked for through
   * lib/media/streamed.ts, so a reader with no signal is told it needs a
   * connection. The three sounds below are in the bundle.
   */
  where: "bundle" | "web";
  /** Its drawing on the sheet's tile (components/ui/icons). */
  icon: "rain" | "bird" | "bell";
};

export const AMBIENCE_TRACKS: readonly AmbienceTrack[] = [
  // "Rain against the window", cori, public domain (Wikimedia Commons).
  { id: "rain", labelKey: "ambience.rain", src: "/audio/ambience/rain.mp3", where: "bundle", icon: "rain" },
  // "Reggelirigók", morning thrushes, Ödönke, public domain (Wikimedia Commons).
  { id: "birds", labelKey: "ambience.birds", src: "/audio/ambience/birds.mp3", where: "bundle", icon: "bird" },
  // Made by us: a quiet room and a distant bell, struck twice a minute.
  { id: "bell", labelKey: "ambience.bell", src: "/audio/ambience/bell.mp3", where: "bundle", icon: "bell" },
];

export function getAmbienceTrack(id: string | null): AmbienceTrack | undefined {
  if (!id) return undefined;
  return AMBIENCE_TRACKS.find((t) => t.id === id);
}
