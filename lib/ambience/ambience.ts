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

export type AmbienceId = "rain" | "birds" | "bell" | "peal" | "sea" | "wind";

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
   * connection. All six sounds below are in the bundle (on the website every
   * sound is the website's, so there too no signal means a connection is
   * needed). A "web" one must sit under a streamed root, or the apps would
   * ask their own bundle for it: lib/ambience/__tests__/provenance.test.ts.
   */
  where: "bundle" | "web";
  /** Its drawing where a picture is too small to read: the mini player, the Plus preview (components/ui/icons). */
  icon: "rain" | "bird" | "bell" | "bells" | "sea" | "wind";
  /** Its photograph on the sheet's tile (build 95, note 22). */
  photo: AmbiencePhoto;
};

/**
 * A sound's photograph (build 95, note 22, his "each button a photo of the
 * corresponding aesthetic of the sound ... ensure the photos are fitting"):
 * a real photograph, of the Church's setting where one fits, bundled beside
 * the sound so it shows with no signal. Public domain or CC0 first; a CC
 * licence only with the credit its page asks for, which the credits page
 * shows (lib/credits/photos.ts). Never made by AI. Every one is recorded in
 * docs/licensing/AMBIENCE_PICTURES.md, and lib/ambience/__tests__/photos.test.ts
 * holds each to its file, size and record.
 */
export type AmbiencePhoto = {
  /** Bundled path under /public, beside the sound: a JPEG at AMBIENCE_PHOTO_SIZE. */
  src: string;
  /** Its own colour, the mean of the file: under it until it paints. */
  ground: string;
  /** What it shows. */
  work: string;
  artist: string;
  /** Its page on Wikimedia Commons. */
  source: string;
  license: string;
  /** For CC BY and CC BY-SA, the credit as the page asks; none for public domain and CC0. */
  credit?: string;
  /** Where the licence was read. */
  evidenceUrl: string;
};

/** The size each photograph is made at: twice the tile's picture at its widest (the sheet stops at 440px). */
export const AMBIENCE_PHOTO_SIZE = { width: 288, height: 216 } as const;

export const AMBIENCE_TRACKS: readonly AmbienceTrack[] = [
  // "Rain against the window", cori, public domain (Wikimedia Commons).
  {
    id: "rain",
    labelKey: "ambience.rain",
    src: "/audio/ambience/rain.mp3",
    where: "bundle",
    icon: "rain",
    photo: {
      src: "/audio/ambience/rain.jpg",
      ground: "#4e4e4e",
      work: "Raindrops on a window at night, Brastad, Sweden, 2019",
      artist: "W.carter",
      source: "File:Raindrops on a window in Brastad 3.jpg",
      license: "CC0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Raindrops_on_a_window_in_Brastad_3.jpg",
    },
  },
  // "Reggelirigók", morning thrushes, Ödönke, public domain (Wikimedia Commons).
  {
    id: "birds",
    labelKey: "ambience.birds",
    src: "/audio/ambience/birds.mp3",
    where: "bundle",
    icon: "bird",
    photo: {
      src: "/audio/ambience/birds.jpg",
      ground: "#7e8aa4",
      work: "A song thrush singing at the tip of a spruce, Oulu, Finland, May 2021",
      artist: "Matti Virtala",
      source: "File:Turdus philomelos Oulu Finland 2021-05-12.jpg",
      license: "CC0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Turdus_philomelos_Oulu_Finland_2021-05-12.jpg",
    },
  },
  // Made by us: a quiet room and a distant bell, struck twice a minute.
  {
    id: "bell",
    labelKey: "ambience.bell",
    src: "/audio/ambience/bell.mp3",
    where: "bundle",
    icon: "bell",
    photo: {
      src: "/audio/ambience/bell.jpg",
      ground: "#848894",
      work: "The bell in the bell gable of a chapel at Trachili, Euboea, Greece, 2016",
      artist: "Jebulon",
      source: "File:Bell gable Trachili Euboea Greece.jpg",
      license: "CC0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Bell_gable_Trachili_Euboea_Greece.jpg",
    },
  },
  // 1.8 (the owner's list: "a Russian bell peal", "the sea", "wind"). Each a
  // loop made by Homebase/tools/tts-bakeoff/ambience18.py; rights in
  // docs/licensing/audio-provenance.md.
  // "St. Nicholas Cossack Cathedral church bells chiming", Omsk, Zabuhailo, CC0.
  {
    id: "peal",
    labelKey: "ambience.peal",
    src: "/audio/ambience/peal.mp3",
    where: "bundle",
    icon: "bells",
    photo: {
      src: "/audio/ambience/peal.jpg",
      ground: "#6c6962",
      work: "A great bell, with the bells beyond it, in the belfry of the Rostov Kremlin, 2025",
      artist: "Aleksandr Sigachyov",
      source: "File:Rostov Kremlin - Bell Tower - 2025-08 - p11.jpg",
      license: "CC0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Rostov_Kremlin_-_Bell_Tower_-_2025-08_-_p11.jpg",
    },
  },
  // "On a pebble beach", earthcalling, public domain (PDSounds).
  {
    id: "sea",
    labelKey: "ambience.sea",
    src: "/audio/ambience/sea.mp3",
    where: "bundle",
    icon: "sea",
    // Simonopetra above the sea at his word (2026-11-13 about 14:29 UTC): the
    // photographer's own Public Domain Mark, read on Flickr and on Commons.
    photo: {
      src: "/audio/ambience/sea.jpg",
      ground: "#858281",
      work: "The Monastery of Simonos Petra on its rock above the sea, Mount Athos, July 2024",
      artist: "Angelos @ Ottawa",
      source: "File:Simonopetra Monastery, Mount Athos.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Simonopetra_Monastery,_Mount_Athos.jpg",
    },
  },
  // "Killiney Hill Storm Floris", Karlunun, CC0.
  {
    id: "wind",
    labelKey: "ambience.wind",
    src: "/audio/ambience/wind.mp3",
    where: "bundle",
    icon: "wind",
    photo: {
      src: "/audio/ambience/wind.jpg",
      ground: "#939697",
      work: "Gergeti Trinity Church alone on its ridge below Mount Kazbek, Georgia, 2014",
      artist: "Avisadehh",
      source: "File:GERGETI TRINITI FROM A DISTANCE.כנסיית גרגטי טריניטי מלמטה.jpg",
      license: "CC0",
      evidenceUrl:
        "https://commons.wikimedia.org/wiki/File:GERGETI_TRINITI_FROM_A_DISTANCE.%D7%9B%D7%A0%D7%A1%D7%99%D7%99%D7%AA_%D7%92%D7%A8%D7%92%D7%98%D7%99_%D7%98%D7%A8%D7%99%D7%A0%D7%99%D7%98%D7%99_%D7%9E%D7%9C%D7%9E%D7%98%D7%94.jpg",
    },
  },
];

export function getAmbienceTrack(id: string | null): AmbienceTrack | undefined {
  if (!id) return undefined;
  return AMBIENCE_TRACKS.find((t) => t.id === id);
}
