// The pictures Purify keeps in the app and never puts in an ad: works held in
// Greece and Italy, whose heritage laws can ask a fee to reproduce pictures of
// monuments held there, however old the work (every enforcement found was an
// ad, a cover or merchandise). The owner's word of 2026-11-11 on
// docs/1.9-build/notes/pictures-heritage-law.md: "let's use all the photos",
// taken as "Keep them, never in ads". Until he lifts it, none of these goes
// into a card, a video, a post, a store picture or merchandise, and neither
// does a screen of the app that shows one.
//
// One row for each picture the note names, in the note's own words (`named`,
// held to the note by lib/marketing/__tests__/heritagePictures.test.ts), with
// every file under public/ the app shows that work in: the saint's icon, and
// where the same work is also a book's cover, a read-aloud cover or History's
// picture, those files too. The note's count is 31; it also names the
// reading room's Joshua cover and History's picture for St Justin's Apologies
// beside them, and both are here. Two more the note does not name were added
// at the arbiter's word of 2026-11-11 ("the careful way costs nothing"), and
// each of those rows says why it is there.

export type HeritagePicture = {
  /** The picture as the note names it, word for word; for one the note does not name, what it is. */
  named: string;
  /** Where the work is held. */
  place: string;
  /** Every file under public/ that shows it. */
  files: readonly string[];
  /** For a picture the note does not name: why it is on the list. */
  why?: string;
};

const DIONYSIOU = "Dionysiou Monastery, Mount Athos";
const STAVRONIKITA = "Stavronikita Monastery, Mount Athos";
const PROTATON = "The Protaton, Karyes, Mount Athos";
const HOSIOS_LOUKAS = "Hosios Loukas, Boeotia";
const NEA_MONI = "Nea Moni, Chios";

export const HERITAGE_PICTURES: readonly HeritagePicture[] = [
  // Greece: wall paintings and mosaics still in their buildings.
  { named: "St Moses the Ethiopian", place: DIONYSIOU, files: ["saints/icons/moses-the-black.v2.jpg"] },
  { named: "St Nilus", place: DIONYSIOU, files: ["saints/icons/nilus-of-sinai.jpg"] },
  { named: "St Memnon of Ephesus", place: DIONYSIOU, files: ["saints/icons/memnon-of-ephesus.v3.jpg"] },
  { named: "St Menas (Menas, Hermogenes and Eugraphus)", place: DIONYSIOU, files: ["saints/icons/menas-hermogenes-and-eugraphus.jpg"] },
  { named: "St Eleutherius", place: DIONYSIOU, files: ["saints/icons/eleutherius-of-illyria.jpg"] },
  { named: "St Theodore the Branded", place: DIONYSIOU, files: ["saints/icons/theodore-the-branded.jpg"] },
  { named: "St Ambrose", place: DIONYSIOU, files: ["saints/icons/ambrose-of-milan.jpg"] },
  { named: "the Holy Innocents (a detail)", place: DIONYSIOU, files: ["saints/icons/holy-innocents.v2.jpg"] },
  { named: "Sts Eustratius and companions (a detail)", place: DIONYSIOU, files: ["saints/icons/eustratius-and-companions.v2.jpg"] },
  { named: "St Peter of Alexandria", place: "A fresco of 1547 (the row names no monastery)", files: ["saints/icons/peter-of-alexandria.jpg"] },
  { named: "the Apostle Bartholomew", place: STAVRONIKITA, files: ["saints/icons/apostle-bartholomew.v2.jpg", "covers/authors/apostle-bartholomew.v1.jpg"] },
  { named: "St Ignatius of Antioch", place: STAVRONIKITA, files: ["saints/icons/ignatius-of-antioch.v2.jpg", "covers/authors/ignatius-of-antioch.v1.jpg"] },
  {
    named: "St Justin Martyr (also History's picture for his Apologies)",
    place: STAVRONIKITA,
    files: ["saints/icons/justin-martyr.v2.jpg", "covers/authors/justin-martyr.v1.jpg", "history/media/apologies-of-justin-martyr.v1.jpg"],
  },
  { named: "St Mercurius", place: PROTATON, files: ["saints/icons/mercurius-of-caesarea.jpg"] },
  { named: "St John of Damascus", place: PROTATON, files: ["saints/icons/john-of-damascus.v2.jpg", "covers/authors/john-of-damascus.v1.jpg"] },
  { named: "St Paul of Thebes", place: "A fresco of Mount Athos", files: ["saints/icons/paul-of-thebes.jpg", "covers/authors/paul-of-thebes.v1.jpg"] },
  { named: "St John the Hut-Dweller", place: "A fresco of Mount Athos", files: ["saints/icons/john-the-hut-dweller.jpg"] },
  { named: "St John Chrysostom", place: HOSIOS_LOUKAS, files: ["saints/icons/john-chrysostom.v2.jpg"] },
  { named: "St Stephen the New", place: HOSIOS_LOUKAS, files: ["saints/icons/stephen-the-new.jpg"] },
  { named: "St Nikon the Metanoeite", place: HOSIOS_LOUKAS, files: ["saints/icons/nikon-metanoeite.v2.jpg"] },
  { named: "the reading room's cover for Joshua (a fresco there)", place: HOSIOS_LOUKAS, files: ["covers/joshua.v1.jpg"] },
  { named: "St Theodore the Studite", place: NEA_MONI, files: ["saints/icons/theodore-the-studite.v2.jpg"] },
  { named: "St Maximus the Confessor", place: NEA_MONI, files: ["saints/icons/maximus-the-confessor.v2.jpg", "covers/authors/maximus-the-confessor.v1.jpg"] },
  { named: "St Ephraim the Syrian", place: NEA_MONI, files: ["saints/icons/ephraim-the-syrian.v2.jpg", "covers/authors/ephraim-the-syrian.v1.jpg"] },
  { named: "St Patapius", place: "A cave church at Loutraki", files: ["saints/icons/patapius-of-egypt.jpg"] },
  { named: "St Leo the Great", place: "Greece, the place not recorded", files: ["saints/icons/leo-the-great.v2.jpg"] },
  // Greece: icons in museums and collections.
  { named: "St Catherine", place: "Byzantine Museum of Veria", files: ["saints/icons/catherine-of-alexandria.jpg"] },
  {
    named: "St Constantine",
    place: "The Loverdos collection, Athens",
    files: ["saints/icons/constantine-the-great.v2.jpg", "covers/authors/constantine-the-great.v1.jpg"],
  },
  {
    named: "St Gregory the Dialogist",
    place: "The collection of St Catherine, Heraklion",
    files: ["saints/icons/gregory-the-dialogist.v2.jpg", "covers/authors/gregory-the-dialogist.v1.jpg"],
  },
  // Italy.
  { named: "the Emperor Justinian", place: "San Vitale, Ravenna", files: ["saints/icons/justinian-the-great.v2.jpg"] },
  { named: "History's picture for the martyrdom of St Polycarp", place: "Sant'Apollinare Nuovo, Ravenna", files: ["history/media/martyrdom-of-polycarp.v1.jpg"] },
  { named: "St Augustine", place: "The Sancta Sanctorum, the Lateran, Rome", files: ["saints/icons/augustine-of-hippo.v2.jpg"] },
  // Beyond the note.
  {
    named: "St Antony the Great, a Cretan icon of the 16th century",
    place: DIONYSIOU,
    files: ["covers/feelings/despondency.v1.jpg"],
    why: "Not in the note's first pass, which it calls a floor and not a full count; added at the arbiter's word of 2026-11-11 because the reading room's cover for Despondency is this icon, held at Dionysiou on Mount Athos (lib/reading/authorCovers.ts).",
  },
  {
    named: "The First Ecumenical Council, by Michael Damaskinos, 1591",
    place: "The collection of St Catherine, Heraklion (from the Vrontisi monastery)",
    files: ["covers/councils/first-nicaea.v1.jpg", "history/media/first-council-of-nicaea.v1.jpg"],
    why: "Not in the note's first pass; added at the arbiter's word of 2026-11-11 because the First Council's cover and History's picture of the council are this icon, held in the Heraklion collection where the note puts St Gregory the Dialogist's (lib/reading/authorCovers.ts, lib/history/events.ts).",
  },
];

const stemOf = (file: string) => file.slice(file.lastIndexOf("/") + 1).replace(/\.(?:jpe?g|png|webp|avif)$/, "");

/** Every listed file's name without its folder or its kind of picture: `john-chrysostom.v2`. */
export const HERITAGE_STEMS: readonly string[] = [...new Set(HERITAGE_PICTURES.flatMap((p) => p.files.map(stemOf)))];

/**
 * The listed files a text names, by file name and in any picture format
 * (the app's own `.jpg`, an `.avif` beside it, a copy in another folder),
 * with how many times. A route to a page that shows one is not a file name
 * and is not seen here: such a screen is looked at by eye.
 */
export function heritageNamedIn(text: string): Record<string, number> {
  const named: Record<string, number> = {};
  for (const stem of HERITAGE_STEMS) {
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = text.match(new RegExp(`(?<![\\w-])${escaped}\\.(?:jpe?g|png|webp|avif)\\b`, "g"))?.length ?? 0;
    if (count) named[stem] = count;
  }
  return named;
}
