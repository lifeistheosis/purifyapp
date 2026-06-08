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

/**
 * French setting (BOX's recording + synchronized lyrics, shared on Discord).
 * Times from a timestamped transcription of the French recording.
 */
export const ANTHEM_LYRICS_FR: LyricLine[] = [
  { time: 0.39, text: "Je tiendrai mon chapelet jusqu'à ce que je monte au ciel." },
  { time: 6.57, text: "La prière est si courte, mais forte et peut défendre." },
  { time: 11.57, text: "Plus je récite la prière, plus l'ennemi perdra la guerre." },

  { time: 17.39, text: "La première prière que je récite, vous l'entendrez partout." },
  { time: 22.77, text: "Très sainte Trinité, sauve-nous par votre grâce." },
  { time: 27.61, text: "Plus je récite la prière, plus l'ennemi perdra la guerre." },

  { time: 33.47, text: "Je vais la réciter à nouveau à haute voix, la deuxième prière." },
  { time: 40.09, text: "Seigneur Jésus-Christ, aie pitié de nous." },
  { time: 45.49, text: "Plus je récite cette prière, plus l'ennemi perdra la guerre." },

  { time: 51.59, text: "Je proclame la troisième prière à la mère de notre Dieu." },
  { time: 56.71, text: "Très sainte Théotokos, sauve-nous." },
  { time: 62.65, text: "Plus je récite cette prière, plus l'ennemi perdra la guerre." },

  { time: 68.71, text: "Quatrième prière, je prie Saint Jean pour purifier ma décadence." },
  { time: 74.93, text: "Baptiseur du Christ, intercède pour nous tous." },
  { time: 79.95, text: "Plus je récite cette prière, plus l'ennemi perdra la guerre." },

  { time: 85.95, text: "Cinquième prière, je prie tous les saints qui ont lutté durement." },
  { time: 91.75, text: "Tous les saints de Dieu, intercédez pour nous tous." },
  { time: 97.19, text: "Plus je récite cette prière, plus l'ennemi perdra la guerre." },

  { time: 102.87, text: "À la fin, je prie pour vous, saints anges que je ne peux voir." },
  { time: 108.25, text: "Archanges de Dieu, intercédez pour nous tous." },
  { time: 113.01, text: "Plus je récite cette prière, plus l'ennemi perdra la guerre." },

  { time: 119.07, text: "Je tiendrai mon chapelet jusqu'à ce que je monte au ciel." },
  { time: 124.61, text: "La prière est si courte mais forte et peut défendre." },
  { time: 129.99, text: "Plus je récite cette prière, plus l'ennemi perdra la guerre." },
];

/**
 * Arabic setting (Silouan's link, shared on Discord). RTL. The text is from an
 * auto-generated transcription of the recording and is approximate; the times
 * track the audio for the synced highlight. Replace with a verified Arabic
 * text when one is provided.
 */
export const ANTHEM_LYRICS_AR: LyricLine[] = [
  { time: 1.33, text: "قد أمسكت المسبحة كي يرفع عني دعائي" },
  { time: 8.25, text: "بقوة الصلاة أرتقي بين السماء، بتكرارها الكثير" },
  { time: 15.97, text: "سوف أغلب الشرير. هذه أولى الصلاة تسمعونها في الحين" },
  { time: 23.63, text: "أيها الثالوث القدوس خلّصنا أجمعين، بتكرارها الكثير" },
  { time: 32.55, text: "سوف أغلب الشرير. الصلاة الثانية سأتلوها صادحًا: ربي يسوع" },
  { time: 41.97, text: "المسيح يا ابن الله ارحمني، بتكرارها الكثير" },
  { time: 48.51, text: "سوف أغلب الشرير. الصلاة الثالثة لوالدة الإله، أيتها الفائقة" },
  { time: 57.97, text: "القداسة خلّصينا، بتكرارها الكثير سوف أغلب الشرير" },
  { time: 66.91, text: "الصلاة الرابعة ليوحنا المعمدان، أيها صابغ المسيح" },
  { time: 76.19, text: "تشفّع لعبيدك، بتكرارها الكثير سوف أغلب الشرير. الصلاة الخامسة" },
  { time: 85.35, text: "لجميع القديسين، يا قديسي الله تشفّعوا بنا، بتكرارها الكثير" },
  { time: 95.17, text: "سوف أغلب الشرير. وختامًا صلاة للملائكة، يا" },
  { time: 104.01, text: "رؤساء الأجناد تشفّعوا بنا، بتكرارها الكثير سوف أغلب" },
  { time: 113.39, text: "الشرير." },
];

export type AnthemVersion = {
  code: string;
  /** Switcher label, in its own script. */
  label: string;
  /** Title shown on the player. */
  title: string;
  subtitle: string;
  src: string;
  lyrics: LyricLine[];
  rtl?: boolean;
};

export const ANTHEM_VERSIONS: AnthemVersion[] = [
  {
    code: "en",
    label: "English",
    title: "The English Prayer Rope Anthem",
    subtitle: "Loop to keep pace, follow the words below.",
    src: "/audio/prayer-rope-anthem.mp3",
    lyrics: ANTHEM_LYRICS,
  },
  {
    code: "fr",
    label: "Français",
    title: "Prayer Rope Anthem · Français",
    subtitle: "À mettre en boucle, suivez les paroles ci-dessous.",
    src: "/audio/prayer-rope-anthem-fr.mp3",
    lyrics: ANTHEM_LYRICS_FR,
  },
  {
    code: "ar",
    label: "العربية",
    title: "Prayer Rope Anthem · العربية",
    subtitle: "كرّرها بهدوء، وتابع الكلمات أدناه.",
    src: "/audio/prayer-rope-anthem-ar.mp3",
    lyrics: ANTHEM_LYRICS_AR,
    rtl: true,
  },
];
