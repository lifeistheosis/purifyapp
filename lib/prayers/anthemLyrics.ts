import type { LyricLine } from "@/components/prayers/AudioPlayer";

/**
 * Lyrics for "The English Prayer Rope Anthem".
 *
 * The widely-circulated English setting of the Orthodox prayer-rope anthem, a
 * contemporary devotional chant (sung in Serbian, Greek, Russian, and English)
 * with no single recorded author. The text moves through the short prayers of
 * the rope, each verse closing on the same refrain.
 *
 * Synced mode: every line carries a `time` (seconds), derived from a
 * timestamped transcription of the recording, so the player highlights and
 * auto-scrolls the line being sung and a tap on any line seeks to it.
 */
export const ANTHEM_LYRICS: LyricLine[] = [
  { time: 3.2, text: "I will hold my prayer rope till I rise up to the sky," },
  { time: 8.35, text: "the prayer is so short, but strong and can defy." },
  { time: 12.77, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 17.97, text: "The prayer I say at first you will hear in every place:" },
  { time: 22.61, text: "Most Holy Trinity, save us all by Thy grace." },
  { time: 27.09, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 31.63, text: "I will say out loud again the second prayer that will be:" },
  { time: 36.99, text: "Lord Jesus Christ, have mercy on me." },
  { time: 41.21, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 46.45, text: "Third prayer I say out loud is to the Mother of our God:" },
  { time: 51.53, text: "Most Holy Theotokos, save us all." },
  { time: 55.65, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 61.25, text: "Fourth to thee, Saint John, I pray, to wash all my sins away:" },
  { time: 66.87, text: "Baptizer of Christ, intercede for us all." },
  { time: 71.21, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 76.51, text: "Fifth I pray to all the saints, who struggled hard with no complaints:" },
  { time: 81.55, text: "All Saints of God, intercede for us all." },
  { time: 85.31, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 91.05, text: "At the end I pray to thee, O holy angels I don't see:" },
  { time: 96.27, text: "Archangels of God, intercede for us all." },
  { time: 100.47, text: "As I say the prayer more, my enemy will lose the war." },

  { time: 106.05, text: "I will hold my prayer rope till I rise up to the sky," },
  { time: 110.95, text: "the prayer is so short, but strong and can defy." },
  { time: 116.21, text: "As I say the prayer more, my enemy will lose the war." },
];
