// Your first Liturgy (1.7): the guide, as data. Read top to bottom, this file
// is the guide in the order a reader meets it.
//
// The owner's note 27 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md, with "Added to 27" and his answers on it): a guided way to a
// first Divine Liturgy for an inquirer. It asks what kind of church they are
// going to (a simple pick, never a search for a parish by name), then walks
// them through it a card at a time: before you go, when you get there, during
// the Liturgy, after, and the customs of that kind of parish, worded "you may
// see". If they can, they contact the priest beforehand and give him time to
// answer. The tone: it nearly always goes well.
//
// HOW IT IS WRITTEN. As canonically as it can be, and nothing invented. A line
// that rests on a council, a Father or the Scriptures names it, and its "why"
// quotes it verbatim from the public-domain English the app already carries,
// so lib/start/__tests__/firstLiturgy.test.ts can hold every quotation to the
// file it comes from. Customs are customs: they differ from parish to parish
// more than any list can say, so each is worded "you may see", and where usage
// is split the line says so. No priest reviews Purify yet (the owner's
// standing note of 2026-10-16): nothing here waits on one, and the whole guide
// is marked below for a future clergy review (docs/editorial-standards.md,
// clergy queue item 9).
//
// HOW IT IS SHOWN. Every line is a catalog key with the English beside it,
// the pattern of lib/i18n/__tests__/smallLabels.test.ts: the screens ask the
// catalog for the key, so the guide is in the reader's language, and the test
// holds en.json to the English here, letter for letter. A quotation stays in
// the public-domain English it was published in, as the app's Scripture and
// Fathers do, and a reader in another language is told so once.
//
// Only the guide's own screens import this file. Today's reminder and the
// Start here card read the reader's plan through ./liturgyPlan.ts, and never
// carry these words in their script.

import { CHECK_IDS, KIND_IDS, type CheckId, type KindId } from "./liturgyPlan";

/** The mark a future clergy review looks for. */
export const LITURGY_GUIDE_REVIEW = {
  status: "awaiting-clergy-review",
  since: "2026-10-16",
} as const;

/** One line of the guide: its catalog key, and the English it says. */
export type Line = { key: string; en: string };

const line = (key: string, en: string): Line => ({ key, en });

// ---- Sources ------------------------------------------------------------

export type SourceId = "nicaea2" | "nicaea1" | "basil" | "justin" | "psalm140" | "corinthians" | "assembly";

export type Source = {
  id: SourceId;
  /** What it is, in the reader's language. */
  label: Line;
  /** The edition, in English as it is printed. */
  edition: string;
  /** Where Purify carries it, when it does. */
  href?: string;
  /**
   * The file in this repository that holds the text quoted from it, which the
   * test reads to hold each quotation to its source.
   */
  file?: string;
};

export const SOURCES: Record<SourceId, Source> = {
  nicaea2: {
    id: "nicaea2",
    label: line("start.liturgy.source.nicaea2", "The Seventh Ecumenical Council (Nicaea, 787), its Decree on the Holy Icons"),
    edition: "Schaff and Wace, Nicene and Post-Nicene Fathers, Series II, Vol. 14: The Seven Ecumenical Councils (1900)",
    href: "/councils/second-nicaea/the-decree-on-the-holy-icons",
    file: "data/councils/second-nicaea/the-decree-on-the-holy-icons.json",
  },
  nicaea1: {
    id: "nicaea1",
    label: line("start.liturgy.source.nicaea1", "The First Ecumenical Council (Nicaea, 325), its twenty canons"),
    edition: "Schaff and Wace, Nicene and Post-Nicene Fathers, Series II, Vol. 14: The Seven Ecumenical Councils (1900)",
    href: "/councils/first-nicaea/the-twenty-canons",
    file: "data/councils/first-nicaea/the-twenty-canons.json",
  },
  basil: {
    id: "basil",
    label: line("start.liturgy.source.basil", "St Basil the Great, On the Holy Spirit"),
    edition: "Translated by Blomfield Jackson, Nicene and Post-Nicene Fathers, Series II, Vol. 8, edited by Philip Schaff and Henry Wace",
    href: "/saints/basil-the-great/on-the-holy-spirit#s27",
    file: "data/saints/basil-the-great/on-the-holy-spirit.json",
  },
  justin: {
    id: "justin",
    label: line("start.liturgy.source.justin", "St Justin Martyr, the First Apology"),
    edition: "Ante-Nicene Fathers, Vol. 1 (1885), edited by Alexander Roberts and James Donaldson",
    href: "/saints/justin-martyr/first-apology#s66",
    file: "data/saints/justin-martyr/first-apology.json",
  },
  psalm140: {
    id: "psalm140",
    label: line("start.liturgy.source.psalm140", "Psalm 140 (141 in most Bibles)"),
    edition: "The Septuagint in the English of Sir Lancelot C. L. Brenton (1851)",
    href: "/bible/psalms/140#v2",
    file: "data/bible/psalms/140.json",
  },
  corinthians: {
    id: "corinthians",
    label: line("start.liturgy.source.corinthians", "St Paul, the First Epistle to the Corinthians"),
    edition: "The King James Version",
    href: "/bible/1-corinthians/11#v5",
  },
  assembly: {
    id: "assembly",
    label: line("start.liturgy.source.assembly", "The Assembly of Canonical Orthodox Bishops of the United States of America, its list of jurisdictions"),
    edition: "assemblyofbishops.org/directories/jurisdictions, read on 2026-10-16",
  },
};

/** A quotation, verbatim from its source, kept in the English it was published in. */
export type Quote = {
  text: string;
  source: SourceId;
  /** Where in the source, in English as the edition numbers it. */
  at: string;
};

/** What a line rests on: why it is so, in the reader's language, and the source's own words. */
export type Why = { line: Line; quotes: Quote[] };

// ---- The kinds of church ------------------------------------------------

export type Kind = {
  id: KindId;
  name: Line;
  /** A second line under the name, where the name alone could leave a reader unsure. */
  note?: Line;
  /** The heading of the guide's last part: "In a Greek parish you may see". */
  see: Line;
  /** The languages its services are usually in. "Not sure" has none. */
  language?: Line;
  /** The customs a reader may see there, in the order they are shown. */
  customs: CustomId[];
};

// ---- Customs, worded "you may see" -------------------------------------

export type CustomId =
  | "pews"
  | "standing"
  | "seatsVary"
  | "coverMany"
  | "coverVaries"
  | "coverSome"
  | "vigil"
  | "vespers"
  | "vespersOrVigil"
  | "chantByzantine"
  | "chantChoir"
  | "chantCantor"
  | "chantGeorgian"
  | "chantPlain"
  | "confession"
  | "departed"
  | "prostrations";

export type Custom = {
  id: CustomId;
  line: Line;
  why?: Why;
  /** Sources the line names without quoting them. */
  cites?: SourceId[];
};

export const CUSTOMS: Record<CustomId, Custom> = {
  pews: {
    id: "pews",
    line: line(
      "start.liturgy.custom.pews",
      "Pews, with people standing at the high points, such as the Gospel and the Great Entrance, and sitting at other times.",
    ),
  },
  standing: {
    id: "standing",
    line: line(
      "start.liturgy.custom.standing",
      "Most people standing through the service, with chairs or benches along the walls for anyone who needs to sit.",
    ),
  },
  seatsVary: {
    id: "seatsVary",
    line: line("start.liturgy.custom.seatsVary", "Pews in some parishes; in others people stand, with chairs along the walls."),
  },
  coverMany: {
    id: "coverMany",
    line: line(
      "start.liturgy.custom.coverMany",
      "Many women covering their hair with a scarf, a custom that goes back to St Paul (1 Corinthians 11:5). A visitor is welcome either way.",
    ),
    cites: ["corinthians"],
  },
  coverVaries: {
    id: "coverVaries",
    line: line(
      "start.liturgy.custom.coverVaries",
      "Women with their hair covered in some parishes and uncovered in others. A visitor is welcome either way.",
    ),
  },
  coverSome: {
    id: "coverSome",
    line: line("start.liturgy.custom.coverSome", "Some women covering their hair, though most do not. A visitor is welcome either way."),
  },
  vigil: {
    id: "vigil",
    line: line(
      "start.liturgy.custom.vigil",
      "On Saturday evening, the Vigil: Vespers and Matins served together, often for about two hours, to prepare for Sunday.",
    ),
  },
  vespers: {
    id: "vespers",
    line: line(
      "start.liturgy.custom.vespers",
      "On Saturday evening, Great Vespers; on Sunday morning, Matins (Orthros) just before the Liturgy, so the service may already have begun when you arrive.",
    ),
  },
  vespersOrVigil: {
    id: "vespersOrVigil",
    line: line("start.liturgy.custom.vespersOrVigil", "On Saturday evening, Vespers or the Vigil, to prepare for Sunday."),
  },
  chantByzantine: {
    id: "chantByzantine",
    line: line(
      "start.liturgy.custom.chantByzantine",
      "Byzantine chant, sung by chanters at a stand near the front, and in some parishes a choir.",
    ),
  },
  chantChoir: {
    id: "chantChoir",
    line: line("start.liturgy.custom.chantChoir", "A choir singing in parts, often from a loft or one side of the church."),
  },
  chantCantor: {
    id: "chantCantor",
    line: line("start.liturgy.custom.chantCantor", "Singing led by a cantor at a stand near the front, or by a choir."),
  },
  chantGeorgian: {
    id: "chantGeorgian",
    line: line("start.liturgy.custom.chantGeorgian", "Georgian chant, sung in three voices."),
  },
  chantPlain: {
    id: "chantPlain",
    line: line("start.liturgy.custom.chantPlain", "Plain chant (prostopinije), sung by the whole congregation together."),
  },
  confession: {
    id: "confession",
    line: line(
      "start.liturgy.custom.confession",
      "Confession heard at one side of the church before or during the Liturgy, at a stand with a Gospel book and a cross.",
    ),
  },
  departed: {
    id: "departed",
    line: line("start.liturgy.custom.departed", "A separate table with a small crucifix, where candles are lit for the departed."),
  },
  prostrations: {
    id: "prostrations",
    line: line(
      "start.liturgy.custom.prostrations",
      "Full prostrations, kneeling with the forehead to the floor, at some prayers, above all in Lent. The canons set them aside on Sundays and from Pascha to Pentecost, though in some parishes people kneel at the most solemn moment of the Liturgy even then.",
    ),
    why: {
      line: line(
        "start.liturgy.why.prostrations",
        "The First Ecumenical Council asked the whole Church to pray standing on Sundays and in the fifty days from Pascha to Pentecost, the days of the Resurrection.",
      ),
      quotes: [
        {
          text: "Forasmuch as there are certain persons who kneel on the Lord's Day and in the days of Pentecost, therefore, to the intent that all things may be uniformly observed everywhere (in every parish), it seems good to the holy Synod that prayer be made to God standing.",
          source: "nicaea1",
          at: "Canon 20",
        },
      ],
    },
  },
};

export const KINDS: Record<KindId, Kind> = {
  greek: {
    id: "greek",
    name: line("start.liturgy.kind.greek.name", "Greek Orthodox"),
    see: line("start.liturgy.kind.greek.see", "In a Greek parish you may see"),
    language: line("start.liturgy.kind.greek.language", "Services in Greek, and outside Greece and Cyprus often in the local language too."),
    customs: ["pews", "chantByzantine", "coverSome", "vespers", "prostrations"],
  },
  antiochian: {
    id: "antiochian",
    name: line("start.liturgy.kind.antiochian.name", "Antiochian Orthodox"),
    see: line("start.liturgy.kind.antiochian.see", "In an Antiochian parish you may see"),
    language: line(
      "start.liturgy.kind.antiochian.language",
      "Services in Arabic, Greek or the local language; in North America, mostly in English.",
    ),
    customs: ["pews", "chantByzantine", "coverSome", "vespers", "prostrations"],
  },
  oca: {
    id: "oca",
    name: line("start.liturgy.kind.oca.name", "Orthodox Church in America (OCA)"),
    see: line("start.liturgy.kind.oca.see", "In an OCA parish you may see"),
    language: line(
      "start.liturgy.kind.oca.language",
      "Services mostly in English, and in some parishes in Church Slavonic or another language as well.",
    ),
    customs: ["seatsVary", "chantChoir", "coverVaries", "vespersOrVigil", "prostrations"],
  },
  russian: {
    id: "russian",
    name: line("start.liturgy.kind.russian.name", "Russian Orthodox"),
    note: line("start.liturgy.kind.russian.note", "The Church Outside of Russia (ROCOR), or a parish of the Moscow Patriarchate"),
    see: line("start.liturgy.kind.russian.see", "In a Russian parish you may see"),
    language: line("start.liturgy.kind.russian.language", "Services in Church Slavonic, and outside Russia often in the local language too."),
    customs: ["standing", "chantChoir", "coverMany", "vigil", "confession", "departed", "prostrations"],
  },
  serbian: {
    id: "serbian",
    name: line("start.liturgy.kind.serbian.name", "Serbian Orthodox"),
    see: line("start.liturgy.kind.serbian.see", "In a Serbian parish you may see"),
    language: line(
      "start.liturgy.kind.serbian.language",
      "Services in Church Slavonic and Serbian, and outside Serbia often in the local language too.",
    ),
    customs: ["seatsVary", "chantCantor", "coverVaries", "vespersOrVigil", "prostrations"],
  },
  romanian: {
    id: "romanian",
    name: line("start.liturgy.kind.romanian.name", "Romanian Orthodox"),
    see: line("start.liturgy.kind.romanian.see", "In a Romanian parish you may see"),
    language: line("start.liturgy.kind.romanian.language", "Services in Romanian, and outside Romania often in the local language too."),
    customs: ["seatsVary", "chantCantor", "coverVaries", "vespersOrVigil", "prostrations"],
  },
  bulgarian: {
    id: "bulgarian",
    name: line("start.liturgy.kind.bulgarian.name", "Bulgarian Orthodox"),
    see: line("start.liturgy.kind.bulgarian.see", "In a Bulgarian parish you may see"),
    language: line(
      "start.liturgy.kind.bulgarian.language",
      "Services in Bulgarian and Church Slavonic, and outside Bulgaria often in the local language too.",
    ),
    customs: ["seatsVary", "chantCantor", "coverVaries", "vespersOrVigil", "prostrations"],
  },
  georgian: {
    id: "georgian",
    name: line("start.liturgy.kind.georgian.name", "Georgian Orthodox"),
    see: line("start.liturgy.kind.georgian.see", "In a Georgian parish you may see"),
    language: line("start.liturgy.kind.georgian.language", "Services in Georgian, and outside Georgia sometimes in the local language too."),
    customs: ["standing", "chantGeorgian", "coverMany", "vespersOrVigil", "prostrations"],
  },
  ukrainian: {
    id: "ukrainian",
    name: line("start.liturgy.kind.ukrainian.name", "Ukrainian Orthodox"),
    see: line("start.liturgy.kind.ukrainian.see", "In a Ukrainian parish you may see"),
    language: line(
      "start.liturgy.kind.ukrainian.language",
      "Services in Ukrainian and Church Slavonic, and outside Ukraine often in the local language too.",
    ),
    customs: ["seatsVary", "chantChoir", "coverVaries", "vespersOrVigil", "prostrations"],
  },
  carpatho: {
    id: "carpatho",
    name: line("start.liturgy.kind.carpatho.name", "Carpatho-Russian Orthodox"),
    see: line("start.liturgy.kind.carpatho.see", "In a Carpatho-Russian parish you may see"),
    language: line("start.liturgy.kind.carpatho.language", "Services in English and Church Slavonic."),
    customs: ["pews", "chantPlain", "coverVaries", "vespersOrVigil", "prostrations"],
  },
  albanian: {
    id: "albanian",
    name: line("start.liturgy.kind.albanian.name", "Albanian Orthodox"),
    see: line("start.liturgy.kind.albanian.see", "In an Albanian parish you may see"),
    language: line("start.liturgy.kind.albanian.language", "Services in Albanian, and outside Albania often in the local language too."),
    customs: ["pews", "chantByzantine", "coverSome", "vespers", "prostrations"],
  },
  unsure: {
    id: "unsure",
    name: line("start.liturgy.kind.unsure.name", "Not sure"),
    see: line("start.liturgy.kind.unsure.see", "In any Orthodox parish you may see"),
    customs: ["seatsVary", "coverVaries", "vespersOrVigil", "prostrations"],
  },
};

/** The kinds, in the order the guide lists them. */
export const KIND_LIST: Kind[] = KIND_IDS.map((id) => KINDS[id]);

/**
 * The gentle note for "Not sure": how to find out, without a verdict on any
 * parish. The Assyrian Church of the East and the Oriental Orthodox Churches
 * are named here and nowhere on the list (the owner's answer of 2026-10-16).
 */
export const NOT_SURE: Line[] = [
  line(
    "start.liturgy.unsure.ask",
    "Ask the parish which bishop it is under, and compare the answer with this list. A call, an email or its website is enough.",
  ),
  line(
    "start.liturgy.unsure.other",
    "A parish may also belong to another of the Orthodox Church's local Churches, such as Jerusalem, Alexandria, Cyprus or Poland. All of this guide but its last part holds there too.",
  ),
  line(
    "start.liturgy.unsure.family",
    "Some Churches with “Orthodox” in their name, among them the Coptic, Armenian, Ethiopian, Eritrean, Syriac and Malankara Churches, belong to another family, the Oriental Orthodox Churches, which is not in communion with the Orthodox Church; the Assyrian Church of the East is separate from both. Their services differ from the ones this guide describes.",
  ),
];

// ---- The four parts -----------------------------------------------------

export type PartId = "before" | "arrive" | "during" | "after";

export type Item = {
  id: string;
  title: Line;
  body: Line;
  why?: Why;
  /** A door to where Purify has more. */
  link?: { label: Line | string; href: string };
};

export type Part = { id: PartId; title: Line; lead: Line; items: Item[] };

const item = (part: PartId, id: string, title: string, body: string, extra: Partial<Pick<Item, "why" | "link">> = {}): Item => ({
  id,
  title: line(`start.liturgy.${part}.${id}.title`, title),
  body: line(`start.liturgy.${part}.${id}.body`, body),
  ...extra,
});

export const PARTS: Record<PartId, Part> = {
  before: {
    id: "before",
    title: line("start.liturgy.part.before.title", "Before you go"),
    lead: line("start.liturgy.part.before.lead", "A little preparation makes the morning easier."),
    items: [
      item(
        "before",
        "priest",
        "Contact the priest, if you can",
        "A call or an email a few days ahead is welcome. Say it will be your first visit, ask anything you like, and give him time to answer. It makes everything easier.",
      ),
      item(
        "before",
        "time",
        "Find the time",
        "The parish's website or notice board gives the time of the Divine Liturgy. Many parishes serve Matins (Orthros) or the Hours just before it, so people may already be praying when you arrive.",
      ),
      item(
        "before",
        "wear",
        "What to wear",
        "Modest, neat clothes, as you would wear to meet someone you respect. Men usually wear long trousers; many women wear a skirt or dress below the knee, with shoulders covered. Nobody will turn you away for what you wear.",
      ),
      item(
        "before",
        "arrive",
        "When to arrive",
        "Ten or fifteen minutes early gives you time to find a place and look around. If you are late, come in quietly: you will not be the only one.",
      ),
      item(
        "before",
        "length",
        "How long it lasts",
        "Usually about an hour and a half, sometimes closer to two hours, and longer on great feasts or when a bishop serves. On most Sundays it is the Divine Liturgy of St John Chrysostom; on the Sundays of Great Lent, the longer Liturgy of St Basil the Great.",
      ),
      item(
        "before",
        "children",
        "Bringing children",
        "Children are welcome. Orthodox children are in church from infancy, and a little noise is part of every parish's Sunday.",
      ),
    ],
  },
  arrive: {
    id: "arrive",
    title: line("start.liturgy.part.arrive.title", "When you get there"),
    lead: line("start.liturgy.part.arrive.lead", "What a visitor sees first, and what it means."),
    items: [
      item(
        "arrive",
        "narthex",
        "The entrance",
        "You come in through the narthex, the entrance hall. There is usually a stand of candles there, and often an icon on a stand that people venerate as they come in.",
      ),
      item(
        "arrive",
        "candles",
        "The candles",
        "People light a thin candle and set it before an icon, with a short prayer for someone living or departed. It is a small offering of prayer. A box nearby takes a gift for the candles if you wish, and lighting one is never required.",
        {
          why: {
            line: line(
              "start.liturgy.why.candles",
              "Lights and incense before the icons are an ancient custom of the Church, which the Seventh Ecumenical Council named in its decree on the holy icons.",
            ),
            quotes: [{ text: "incense and lights may be offered according to ancient pious custom", source: "nicaea2", at: "The Decree" }],
          },
        },
      ),
      item(
        "arrive",
        "icons",
        "Venerating an icon",
        "Orthodox Christians cross themselves and bow, kiss the icon, then cross themselves and bow again. They kiss the hand or the feet of Christ or the saint, or the Gospel book or scroll they hold, not the face.",
      ),
      item(
        "arrive",
        "honour",
        "Why people kiss icons",
        "It is honour, not worship. Worship is given to God alone; the honour shown to an icon passes to the person it shows. The Seventh Ecumenical Council set this out at Nicaea in 787.",
        {
          why: {
            line: line(
              "start.liturgy.why.honour",
              "The Council defined that icons are given honour and veneration, never the worship that belongs to God alone, because the honour given to an image passes to the one it shows. Its decree is in Purify, in full.",
            ),
            quotes: [
              {
                text: "to these should be given due salutation and honourable reverence (ἀσπασμὸν καὶ τιμητικὴν προσκύνησιν), not indeed that true worship of faith (λατρείαν) which pertains alone to the divine nature",
                source: "nicaea2",
                at: "The Decree",
              },
              {
                text: "For the honour which is paid to the image passes on to that which the image represents, and he who reveres the image reveres in it the subject represented.",
                source: "nicaea2",
                at: "The Decree",
              },
            ],
          },
        },
      ),
      item(
        "arrive",
        "watch",
        "If you would rather watch",
        "A visitor may simply bow before an icon, or just look. No one minds, and no one is checking.",
      ),
      item(
        "arrive",
        "place",
        "Finding a place",
        "Stand or sit toward the middle or the back, where you can see what others do. In some parishes men stand on the right and women on the left; if you see that, follow it.",
      ),
    ],
  },
  during: {
    id: "during",
    title: line("start.liturgy.part.during.title", "During the Liturgy"),
    lead: line("start.liturgy.part.during.lead", "What is going on, from beginning to end. You do not need to follow every word."),
    items: [
      item(
        "during",
        "screen",
        "The icon screen and the altar",
        "At the front stands the icon screen, the iconostasis, with Christ to the right of its central doors and the Mother of God to the left. Behind it is the altar, where the Eucharist is offered.",
      ),
      item(
        "during",
        "clergy",
        "Who does what",
        "The priest leads the prayers and offers the Eucharist. A deacon, where there is one, leads the petitions, and the people answer with the chanters or the choir: “Lord, have mercy”.",
      ),
      item(
        "during",
        "incense",
        "Incense",
        "The priest or deacon censes the altar, the icons and the people. The rising smoke is an image of prayer rising to God, in the words of a psalm sung at every Vespers.",
        {
          why: {
            line: line(
              "start.liturgy.why.incense",
              "At every Vespers the Church sings the psalm that likens prayer to incense rising before God.",
            ),
            quotes: [
              {
                text: "Let my prayer be set forth before thee as incense; the lifting up of my hands as an evening sacrifice.",
                source: "psalm140",
                at: "Psalm 140:2 (141:2 in most Bibles)",
              },
            ],
          },
        },
      ),
      item(
        "during",
        "cross",
        "The sign of the cross",
        "People cross themselves often: at the name of the Holy Trinity, at the start and end of prayers, and before an icon. Orthodox Christians join the thumb and first two fingers and cross from the forehead to the chest, then from the right shoulder to the left. Join in if you wish, or stand quietly.",
        {
          why: {
            line: line(
              "start.liturgy.why.cross",
              "The sign of the cross is among the oldest Christian practices. St Basil the Great counts it among the Church's unwritten traditions, received from the apostles.",
            ),
            quotes: [
              {
                text: "to sign with the sign of the cross those who have trusted in the name of our Lord Jesus Christ",
                source: "basil",
                at: "Chapter 27, section 66",
              },
            ],
          },
          link: { label: "start.step.cross.title", href: "/prayers/learning/sign-of-the-cross" },
        },
      ),
      item(
        "during",
        "standing",
        "Standing and sitting",
        "Orthodox Christians have prayed standing since the early Church, above all on Sunday, the day of the Resurrection. Where there are pews, people sit for parts of the service. Follow what those around you do, and sit whenever you need to.",
        {
          why: {
            line: line(
              "start.liturgy.why.standing",
              "St Basil the Great explains why the Church prays standing on Sunday, and the First Ecumenical Council made it the rule for Sundays and for the fifty days from Pascha to Pentecost.",
            ),
            quotes: [
              {
                text: "We pray standing, on the first day of the week, but we do not all know the reason.",
                source: "basil",
                at: "Chapter 27, section 66",
              },
              {
                text: "it seems good to the holy Synod that prayer be made to God standing.",
                source: "nicaea1",
                at: "Canon 20",
              },
            ],
          },
        },
      ),
      item(
        "during",
        "little",
        "The Little Entrance",
        "Early in the Liturgy the Gospel book is carried out in procession and back in through the central doors. The readings follow soon after.",
      ),
      item(
        "during",
        "readings",
        "The readings",
        "A reader chants a passage from the Epistles, then the priest or deacon reads the Gospel while everyone stands. A sermon may follow, or come at the end.",
      ),
      item(
        "during",
        "great",
        "The Great Entrance",
        "During the Cherubic Hymn the bread and wine are carried out in procession and in through the central doors to the altar. Many bow their heads as the gifts pass.",
      ),
      item(
        "during",
        "creed",
        "The Creed",
        "Everyone says or sings the Creed together, the Symbol of Faith of the First and Second Ecumenical Councils, Nicaea in 325 and Constantinople in 381.",
        { link: { label: line("start.liturgy.link.creed", "Read the Creed"), href: "/prayers/creed" } },
      ),
      item(
        "during",
        "communion",
        "Holy Communion",
        "Communion is for Orthodox Christians who have prepared to receive it, usually with prayer, fasting and confession. If you are not Orthodox, please stay in your place while others receive. It is not a judgement on you: the Church has kept Communion this way since the first centuries.",
        {
          why: {
            line: line(
              "start.liturgy.why.communion",
              "In the second century St Justin Martyr wrote that the Eucharist is received only by those who share the Church's faith, have been baptized, and live as Christ taught.",
            ),
            quotes: [
              {
                text: "And this food is called among us Εὐχαριστία [the Eucharist], of which no one is allowed to partake but the man who believes that the things which we teach are true, and who has been washed with the washing that is for the remission of sins, and unto regeneration, and who is so living as Christ has enjoined.",
                source: "justin",
                at: "Chapter 66",
              },
            ],
          },
        },
      ),
      item(
        "during",
        "bread",
        "The cross and the blessed bread",
        "At the end, people come forward to kiss the cross the priest holds, and many kiss his hand. They take a piece of blessed bread, the antidoron. In many parishes a visitor may take a piece too: it is blessed bread, not Communion. If you are unsure, watch others, or ask.",
      ),
    ],
  },
  after: {
    id: "after",
    title: line("start.liturgy.part.after.title", "After the Liturgy"),
    lead: line("start.liturgy.part.after.lead", "The service ends, and the parish's welcome begins."),
    items: [
      item(
        "after",
        "coffee",
        "Coffee hour",
        "Many parishes share coffee or a meal after the Liturgy. Stay if you can: it is the easiest place to meet people and to ask about what you saw.",
      ),
      item(
        "after",
        "priest",
        "Meeting the priest",
        "Say hello to the priest and tell him it was your first visit. Call him “Father”. Orthodox Christians often greet a priest by asking for his blessing; a visitor may simply shake his hand.",
      ),
      item(
        "after",
        "again",
        "Coming back",
        "One Liturgy is a beginning. Come again, and ask the priest about the service on Saturday evening, Vespers or the Vigil, which prepares for Sunday.",
      ),
    ],
  },
};

export const PART_IDS: readonly PartId[] = ["before", "arrive", "during", "after"];

// ---- The checklist ------------------------------------------------------

export const CHECKS: Record<CheckId, Line> = {
  time: line("start.liturgy.check.time", "Find the time of the Liturgy"),
  priest: line("start.liturgy.check.priest", "Contact the priest a few days ahead"),
  clothes: line("start.liturgy.check.clothes", "Choose modest, neat clothes"),
  early: line("start.liturgy.check.early", "Plan to arrive ten minutes early"),
  read: line("start.liturgy.check.read", "Read what happens during the Liturgy"),
  stay: line("start.liturgy.check.stay", "Stay for coffee hour and say hello"),
};

export const CHECK_LIST: { id: CheckId; line: Line }[] = CHECK_IDS.map((id) => ({ id, line: CHECKS[id] }));

// ---- The guide's own words around the parts ------------------------------

/** Everything else the guide says, by where it says it. */
export const WORDS = {
  title: line("start.liturgy.title", "Your first Liturgy"),
  intro: {
    title: line("start.liturgy.intro.title", "Going to your first Liturgy?"),
    lead: line(
      "start.liturgy.intro.lead",
      "This guide takes you through it one card at a time: what to know before you go, what you will see, and the customs of the parish you are visiting.",
    ),
    calm: line(
      "start.liturgy.intro.calm",
      "It nearly always goes well. Orthodox parishes are used to visitors, and nobody expects you to know what to do.",
    ),
    yes: line("start.liturgy.intro.yes", "Yes, I am going"),
    notYet: line("start.liturgy.intro.notYet", "Not yet, just reading"),
  },
  kind: {
    title: line("start.liturgy.kind.title", "Which kind of church is it?"),
    lead: line(
      "start.liturgy.kind.lead",
      "The parish's name or its website usually says, such as Greek Orthodox or Serbian Orthodox. Your answer shapes the last part of this guide.",
    ),
    unsureTitle: line("start.liturgy.unsure.title", "Not sure? That is common."),
  },
  when: {
    title: line("start.liturgy.when.title", "When are you going?"),
    lead: line(
      "start.liturgy.when.lead",
      "Choose the day, and a reminder will wait on Today that week. It is kept on this device only.",
    ),
    thisSunday: line("start.liturgy.when.thisSunday", "This Sunday"),
    nextSunday: line("start.liturgy.when.nextSunday", "Next Sunday"),
    other: line("start.liturgy.when.other", "Another day"),
    otherLabel: line("start.liturgy.when.otherLabel", "Choose a day"),
    notSure: line("start.liturgy.when.notSure", "Not sure yet"),
  },
  customs: {
    lead: line(
      "start.liturgy.customs.lead",
      "Customs differ from parish to parish, even within one Church. These are things you may see, not rules you must keep.",
    ),
  },
  /** The cards' short names, for where the reader is and what comes next. */
  step: {
    kind: line("start.liturgy.step.kind", "Your church"),
    when: line("start.liturgy.step.when", "The day"),
    customs: line("start.liturgy.step.customs", "Your parish's customs"),
  },
  ready: {
    title: line("start.liturgy.ready.title", "You are ready"),
    lead: line(
      "start.liturgy.ready.lead",
      "It nearly always goes well. Go with an open heart, watch, and pray as you can. Nobody expects you to know everything.",
    ),
    plan: line("start.liturgy.ready.plan", "Your plan"),
    church: line("start.liturgy.ready.church", "Church"),
    day: line("start.liturgy.ready.day", "Day"),
    change: line("start.liturgy.ready.change", "Change"),
    noDay: line("start.liturgy.ready.noDay", "Not chosen yet"),
    chooseDay: line("start.liturgy.ready.chooseDay", "Choose a day"),
    reminderFrom: line("start.liturgy.ready.reminderFrom", "A reminder will wait on Today from {date}."),
    reminderNow: line("start.liturgy.ready.reminderNow", "Your reminder is on Today."),
    checklist: line("start.liturgy.ready.checklist", "Your checklist"),
    count: line("start.liturgy.ready.count", "{n} of {total} ready"),
    next: line("start.liturgy.ready.next", "What next"),
    again: line("start.liturgy.ready.again", "Read the guide again"),
    toStart: line("start.liturgy.link.start", "Back to Start here"),
  },
  ui: {
    progress: line("start.liturgy.ui.progress", "{n} of {total}"),
    nextTo: line("start.liturgy.ui.nextTo", "Next: {part}"),
    parts: line("start.liturgy.ui.parts", "All parts"),
    why: line("start.liturgy.ui.why", "Why?"),
    sources: line("start.liturgy.ui.sources", "Sources"),
    read: line("start.liturgy.ui.read", "Read it in Purify"),
    english: line("start.liturgy.ui.english", "Quoted in English, from the public-domain translation."),
  },
  today: {
    tomorrow: line("start.liturgy.today.tomorrow", "Tomorrow"),
    calm: line("start.liturgy.today.calm", "It nearly always goes well."),
    open: line("start.liturgy.today.open", "Open your guide"),
    hide: line("start.liturgy.today.hide", "Hide this reminder"),
  },
  card: {
    lead: line(
      "start.liturgy.card.lead",
      "Going to a service soon? What to know before you go, what you will see, and the customs of the parish you are visiting, one card at a time.",
    ),
    open: line("start.liturgy.card.open", "Open the guide"),
  },
} as const;

/** Every line the guide owns, for the tests and for a reviewer reading it whole. */
export function allLines(): Line[] {
  const out: Line[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if ("key" in v && "en" in v && typeof (v as Line).key === "string" && typeof (v as Line).en === "string") {
      out.push(v as Line);
      return;
    }
    for (const value of Object.values(v)) walk(value);
  };
  walk(WORDS);
  walk(KINDS);
  walk(CUSTOMS);
  walk(NOT_SURE);
  walk(PARTS);
  walk(CHECKS);
  walk(SOURCES);
  const seen = new Set<string>();
  return out.filter((l) => (seen.has(l.key) ? false : (seen.add(l.key), true)));
}

/** Every quotation the guide shows, with where it is shown. */
export function allQuotes(): { where: string; quote: Quote }[] {
  const out: { where: string; quote: Quote }[] = [];
  for (const part of Object.values(PARTS)) {
    for (const it of part.items) for (const q of it.why?.quotes ?? []) out.push({ where: `${part.id}.${it.id}`, quote: q });
  }
  for (const custom of Object.values(CUSTOMS)) for (const q of custom.why?.quotes ?? []) out.push({ where: `custom.${custom.id}`, quote: q });
  return out;
}

/** The sources a reader can meet in the guide, in the order the sources sheet lists them. */
export const SOURCE_LIST: Source[] = (["nicaea1", "nicaea2", "justin", "basil", "psalm140", "corinthians", "assembly"] as SourceId[]).map(
  (id) => SOURCES[id],
);
