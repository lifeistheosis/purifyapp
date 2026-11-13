// The verse the Compare preview shows (1.9, rec 85: Compare on the Plus
// screen, its row ending in Try it as every row does). Psalm 50, "Have mercy
// upon me, O God": the app's Septuagint numbering calls it 50:1, the Synodal
// and the Greek Church's text count the psalm's title as its first two verses
// (50:3), and the Bibles made from the Hebrew number it Psalm 51. So one
// verse shows what Compare is for: each Bible at the place its own numbering
// puts it.
//
// Nothing here is ours. Each line is the Bible's own words at the place
// data/bibles/maps/<id>.json gives, copied from public/bibles/<id>/psalms.json,
// and the English is data/bible/psalms/50.json's;
// lib/premium/__tests__/tryCompare.test.ts holds every line to its file, so
// a rebuilt Bible or map that moves a word fails it. Kept here, not read from
// the files, because a preview opens with no signal and the apps carry none
// of the downloadable Bibles.

import type { BibleId } from "@/lib/bible/downloads/catalog";

/** The verse, in the app's numbering. */
export const TRY_COMPARE = { book: "psalms", chapter: 50, verse: 1 } as const;

/** The verse in the app's English (Brenton's Septuagint). */
export const TRY_COMPARE_ENGLISH = "Have mercy upon me, O God, according to thy great mercy; and according to the multitude of thy compassions blot out my transgression.";

/** Each downloadable Bible's words for it, in the catalog's order, with the place it numbers them. */
export const TRY_COMPARE_BIBLES: readonly { bible: BibleId; at: string; words: string }[] = [
  { bible: "ru-synodal", at: "50:3", words: "Помилуй меня, Боже, по великой милости Твоей, и по множеству щедрот Твоих изгладь беззакония мои." },
  { bible: "grc-lxx-patriarchal", at: "50:3", words: "Ἐλέησον με ὁ Θεὸς κατὰ τὸ μέγα ἔλεός σου, καὶ κατὰ τὸ πλῆθος τῶν οἰκτιρμῶν σου ἐξάλειψον τὸ ἀνόμημά μου." },
  { bible: "sr-danicic-karadzic", at: "51:1", words: "Смилуј се на ме, Боже, по милости својој, и по великој доброти својој очисти безакоње моје." },
  { bible: "ar-van-dyck", at: "51:1", words: "اِرْحَمْنِي يَا ٱللهُ حَسَبَ رَحْمَتِكَ. حَسَبَ كَثْرَةِ رَأْفَتِكَ ٱمْحُ مَعَاصِيَّ." },
  { bible: "es-reina-valera-1909", at: "51:1", words: "TEN piedad de mí, oh Dios, conforme á tu misericordia: conforme á la multitud de tus piedades borra mis rebeliones." },
  { bible: "pt-almeida-1911", at: "51:1", words: "Tem misericordia de mim, ó Deus, segundo a tua benignidade; apaga as minhas transgressões, segundo a multidão das tuas misericordias." },
  { bible: "en-web", at: "51:1", words: "Have mercy on me, God, according to your loving kindness. According to the multitude of your tender mercies, blot out my transgressions." },
];
