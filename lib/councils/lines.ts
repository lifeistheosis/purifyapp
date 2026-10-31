import type { CouncilCite } from "@/lib/citations/cite";
import type { QuoteSubject } from "@/lib/share/verseCard";

import type { Council } from "./councils";
import { isCirca, placeOf, shortName } from "./page";

/**
 * A council in its own words, one line of each, shared as a picture from its
 * page (1.8, round 3 r3-11: until now "a council's words cannot be made a
 * picture at all"). Each line is the council's document word for word, as the
 * app carries it (data/councils, Schaff and Wace's NPNF II 14 and the other
 * public-domain editions named in each file), and where it stands: a whole
 * sentence, or its opening clause where the sentence runs on, never a word
 * changed, added or left out inside it. lib/councils/__tests__/lines.test.ts
 * holds every one to its section, letter for letter.
 *
 * Chosen by hand to carry what the council is remembered for, where its
 * documents say it plainly: the Creed's first words at Nicaea, the article
 * on the Holy Spirit at Constantinople, the Mother of God at Ephesus, perfect
 * God and perfect man at Chalcedon, the honour that passes to the prototype
 * at the second Nicaea. A local council's documents are mostly its canons;
 * its line is the one most worth reading on its own. The Council of Orange
 * has none: the Orthodox Church does not receive it, and its words are not
 * offered as a picture. None carries an em dash, which the edition sometimes
 * prints.
 *
 * `lit` is the one word lit on the picture where one plainly carries the line
 * (the honour, at the second Nicaea, as the owner's sheet lit it), and none
 * elsewhere.
 */
export type CouncilLine = { words: string; lit?: string; cite: CouncilCite };

const line = (council: string, document: string, section: number, words: string, lit?: string): CouncilLine => ({
  words,
  ...(lit ? { lit } : {}),
  cite: { kind: "council", council, document, section },
});

export const COUNCIL_LINES: Readonly<Record<string, CouncilLine>> = {
  "first-nicaea": line("first-nicaea", "the-symbol-of-the-faith", 2, "We believe in one God, the Father Almighty, maker of all things visible and invisible"),
  "first-constantinople": line(
    "first-constantinople",
    "the-niceno-constantinopolitan-creed",
    2,
    "And we believe in the Holy Ghost, the Lord and Giver-of-Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified, who spake by the prophets.",
  ),
  ephesus: line("ephesus", "the-second-letter-of-cyril", 1, "This was the sentiment of the holy Fathers; therefore they ventured to call the holy Virgin, the Mother of God"),
  chalcedon: line(
    "chalcedon",
    "the-definition-of-faith",
    1,
    "Following the holy Fathers we teach with one voice that the Son [of God] and our Lord Jesus Christ is to be confessed as one and the same [Person], that he is perfect in Godhead and perfect in manhood, very God and very man",
  ),
  "second-constantinople": line(
    "second-constantinople",
    "the-capitula",
    2,
    "For there is but one God even the Father of whom are all things, and one Lord Jesus Christ through whom are all things, and one Holy Spirit in whom are all things.",
  ),
  "third-constantinople": line(
    "third-constantinople",
    "the-definition-of-faith",
    2,
    "Wherefore we confess two wills and two operations, concurring most fitly in him for the salvation of the human race.",
  ),
  "second-nicaea": line(
    "second-nicaea",
    "the-decree-on-the-holy-icons",
    2,
    "For the honour which is paid to the image passes on to that which the image represents, and he who reveres the image reveres in it the subject represented.",
    "honour",
  ),
  "antioch-268": line("antioch-268", "the-synodal-letter", 1, "For, beloved, we know that the bishop and all the clergy ought to be an example in all good works to the people."),
  "carthage-256": line(
    "carthage-256",
    "the-sentences-of-the-bishops",
    1,
    "But let us all wait for the judgment of our Lord Jesus Christ, who is the only one that has the power both of preferring us in the government of His Church, and of judging us in our conduct there.",
  ),
  "ancyra-314": line(
    "ancyra-314",
    "the-twenty-five-canons",
    6,
    "But the bishops have the right, after considering the character of their conversion, either to deal with them more leniently, or to extend the time.",
  ),
  "neocaesarea-315": line("neocaesarea-315", "the-fifteen-canons", 12, "For our Lord Jesus Christ was baptized and began to teach in his thirtieth year."),
  gangra: line(
    "gangra",
    "the-synodical-letter-and-canons",
    22,
    "We do, assuredly, admire virginity accompanied by humility; and we have regard for continence, accompanied by godliness and gravity",
  ),
  "antioch-341": line(
    "antioch-341",
    "the-synodal-letter-and-canons",
    25,
    "It is right that what belongs to the Church be preserved with all care to the Church, with a good conscience and faith in God, the inspector and judge of all.",
  ),
  sardica: line(
    "sardica",
    "the-twenty-canons",
    15,
    "For as the bishop ought to manifest sincere love and regard to his subordinates, so those who are subject to him ought in like manner to perform the duties of their ministry in sincerity towards their bishops.",
  ),
  "carthage-419": line(
    "carthage-419",
    "the-african-code",
    39,
    "In the sacraments of the body and blood of the Lord nothing else shall be offered than that which the Lord himself ordained, that is to say, bread and wine mixed with water.",
  ),
  "constantinople-394": line(
    "constantinople-394",
    "the-acts",
    1,
    "But since it is impossible to go backward in judgment, let us, without condemning that which is past, establish things for the future.",
  ),
  laodicea: line(
    "laodicea",
    "the-sixty-canons",
    60,
    "No psalms composed by private individuals nor any uncanonical books may be read in the church, but only the Canonical Books of the Old and New Testaments.",
  ),
  "jerusalem-1672": line(
    "jerusalem-1672",
    "the-confession-of-dositheus",
    3,
    "For one and the same Holy Spirit being the author of both, it is quite the same to be taught by the Scriptures and by the Catholic Church.",
  ),
};

/**
 * Where each of the seven's pictures (History's own, lib/councils/page.ts,
 * councilPicture) is cut for the Portrait's column, and its seal's square:
 * the throne with the open Gospel where the picture has one, the emperor
 * enthroned or the Father who leads it elsewhere, and at the second Nicaea
 * the Cross over the throne, as the sheet cut it. Found by eye on 2026-10-30,
 * 0 to 1 across and down; the seal's side as a share of the picture's width.
 * A local council has no picture: its picture has the cross instead.
 */
export const COUNCIL_FACES: Readonly<Record<string, { point: readonly [number, number]; seal: readonly [number, number, number] }>> = {
  "first-nicaea": { point: [0.55, 0.36], seal: [0.5, 0.38, 0.2] },
  "first-constantinople": { point: [0.5, 0.3], seal: [0.47, 0.22, 0.24] },
  ephesus: { point: [0.46, 0.3], seal: [0.46, 0.29, 0.22] },
  chalcedon: { point: [0.5, 0.27], seal: [0.5, 0.27, 0.22] },
  "second-constantinople": { point: [0.51, 0.25], seal: [0.51, 0.24, 0.22] },
  "third-constantinople": { point: [0.53, 0.22], seal: [0.53, 0.2, 0.22] },
  "second-nicaea": { point: [0.5, 0.3], seal: [0.5, 0.2, 0.27] },
};

/** The council's line, or null for one that has none. */
export function lineOfCouncil(slug: string): CouncilLine | null {
  return COUNCIL_LINES[slug] ?? null;
}

/** The council's year as its byname gives it: "787", or "c. 340" for one met about then. */
export function councilYear(c: Pick<Council, "byname" | "year">): string {
  return isCirca(c) ? `c. ${c.year}` : String(c.year);
}

/**
 * The council's line as a picture's subject (lib/share/verseCard.ts): its
 * name; over the cross its place and year; its byname under the name; the
 * document; the Page's running head (`pageHead`, "The Ecumenical Councils"
 * or "Local Council" in the reader's language) with the place and year
 * beside it; round the seal its name and year. `picture` is the council's
 * own picture where it has one, asked of the website in the apps.
 */
export function councilQuote(
  c: Pick<Council, "slug" | "name" | "byname" | "year" | "location">,
  { line: l, documentTitle, pageHead, picture, lang }: { line: CouncilLine; documentTitle: string; pageHead: string; picture: string | null; lang?: string },
): QuoteSubject {
  const year = councilYear(c);
  const where = `${placeOf(c.location)} · ${year}`;
  const face = picture ? COUNCIL_FACES[c.slug] : undefined;
  return {
    name: c.name,
    head: where,
    byline: shortName(c.byname),
    source: documentTitle,
    pageHead,
    pageRight: where,
    pageSource: `${documentTitle}, ${shortName(c.byname)}`,
    ring: `${c.name} · ${year}`,
    ...(l.lit ? { lit: l.lit } : {}),
    face: picture && face ? { src: picture, point: face.point, looks: "ahead", seal: face.seal, fallback: null } : null,
    ...(lang ? { lang } : {}),
  };
}
