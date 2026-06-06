import type { LyricLine } from "@/components/prayers/AudioPlayer";

/**
 * Lyrics for "The English Prayer Rope Anthem".
 *
 * This is the widely-circulated English setting of the Orthodox prayer-rope
 * anthem — a contemporary devotional chant (sung in Serbian, Greek, Russian,
 * and English) with no single recorded author. The text moves through the
 * short prayers of the rope, each verse closing on the same refrain.
 *
 * Plain mode for now (no per-line `time`): the panel renders a clean lyric
 * sheet. To switch to the Apple-Music-style synced highlight later, add a
 * `time` (seconds) to every line.
 *
 * Empty `text` lines act as stanza breaks.
 */
export const ANTHEM_LYRICS: LyricLine[] = [
  { text: "I will hold my prayer rope till I rise up to the sky," },
  { text: "the prayer is so short, but strong and can defy." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "The prayer I say at first you will hear in every place:" },
  { text: "Most Holy Trinity, save us all by Thy grace." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "I will say out loud again the second prayer that will be:" },
  { text: "Lord Jesus Christ, have mercy on me." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "Third prayer I say out loud is to the Mother of our God:" },
  { text: "Most Holy Theotokos, save us all." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "Fourth to thee, Saint John, I pray, to wash all my sins away:" },
  { text: "Baptizer of Christ, intercede for us all." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "Fifth I pray to all the saints, who struggled hard with no complaints:" },
  { text: "All Saints of God, intercede for us all." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "At the end I pray to thee, O holy angels I don't see:" },
  { text: "Archangels of God, intercede for us all." },
  { text: "As I say the prayer more, my enemy will lose the war." },
  { text: "" },
  { text: "I will hold my prayer rope till I rise up to the sky," },
  { text: "the prayer is so short, but strong and can defy." },
  { text: "As I say the prayer more, my enemy will lose the war." },
];
