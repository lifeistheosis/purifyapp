import type { EraId, FormId, PartKind, SeasonId, ThemeId, TraditionId } from "./catalog";

/**
 * The reading room's word on every work of the Fathers (1.7, the owner's
 * note 18): whose it is, what it is, how much of it the library holds, and
 * the themes and traditions it is browsed by. One entry for every work in
 * the saints' registry (lib/saints/saints.ts), which itself stays free of
 * imports (scripts/emit-registries.mjs loads it with types stripped), so this
 * is a sibling registry, as lib/saints/iconRights.ts is.
 *
 * Adding a book is one entry here: its tags live in its own row.
 *
 * WHOSE IT IS. `by` is the author, a saint's slug, or null when the text is
 * Purify's own prose (a `retelling`), anonymous (the Way of a Pilgrim), or
 * another's we have no page for (the Church of Smyrna on Polycarp). `about`
 * is the saint a Life or a selection is about. The cover shows the icon of
 * `about`, else of `by` (lib/reading/coverArt.ts), and says "By" or "About"
 * (reading.work.by, reading.work.about). A work whose sections are mostly
 * marked `editorial` (lib/saints/load.ts) is never given a `by`: the test
 * holds that line.
 *
 * WHAT IT HOLDS. `scope: "selections"` marks an excerpt of a longer work (a
 * minute of the Hexaemeron is not the Hexaemeron): its cover and its page
 * say "Selections".
 *
 * THEMES. Each tag was given by reading the work's sections, and carries one
 * line of its basis (`basis`, for the review, never shown). `sections` limits
 * a tag to the part of the work that treats it, by `Section.n`, inclusive.
 * `best` marks the one reading a theme's row opens (the passions, the
 * virtues, daily life): always the Fathers' own words, never a retelling.
 * `part` names that part on the row ("Book 8").
 *
 * REVIEW. Every entry is `review: "pending-clergy"`: written as canonically
 * as we can, and waiting for a future clergy review (the owner, 2026-10-16:
 * there is no priest reviewing yet; nothing waits on one). The texts
 * themselves stay verbatim public domain; nothing here touches them.
 */

export type WorkKey = `${string}/${string}`;

export type ThemeTag = {
  theme: ThemeId;
  /** Section.n ranges, inclusive, when only part of the work treats it. */
  sections?: readonly (readonly [number, number])[];
  /** Why this tag: one internal line for the clergy review. Never shown. */
  basis: string;
  /** The reading its theme's row opens. One per theme, across the library. */
  best?: true;
  /** That part's name on the row: Book 8, Homilies 83 to 85. */
  part?: { kind: PartKind; from: number; to?: number };
};

export type ReadingEntry = {
  /** The author: a saint's slug, or null (Purify's prose, anonymous, or no page). */
  by: string | null;
  /** Whom it is about, when that is not the author: the subject of a Life. */
  about?: string;
  /** Registered twice: this one is shown as that one, once. */
  sameAs?: WorkKey;
  form: FormId;
  scope: "complete" | "selections";
  themes: readonly ThemeTag[];
  /** Overrides the traditions read from the author and the subject. */
  traditions?: readonly TraditionId[];
  /** Overrides the era read from the author or the subject. */
  era?: EraId;
  /** A first read: the row for someone new to Orthodoxy. */
  begin?: true;
  /** May stand at the top of the room (lib/reading/select.ts, featuredFor). */
  featured?: { seasons?: readonly SeasonId[] };
  review: "pending-clergy";
};

type MetaRow = { traditions: readonly TraditionId[]; era?: EraId };

/**
 * Each author's and subject's tradition and era, for the 75 saints whose
 * works the library holds. A work stands in the traditions of its author and
 * of its subject together (the Life of Antony: Alexandria, and the desert).
 * The apostles and the saints of the Scriptures stand before the traditions
 * and in none of them.
 */
export const AUTHOR_META: Readonly<Record<string, MetaRow>> = {
  theotokos: { traditions: [], era: "apostolic" },
  "john-the-baptist": { traditions: [], era: "apostolic" },
  "apostle-peter": { traditions: [], era: "apostolic" },
  "apostle-paul": { traditions: [], era: "apostolic" },
  "apostle-matthew": { traditions: [], era: "apostolic" },
  "apostle-john": { traditions: [], era: "apostolic" },
  "apostle-thomas": { traditions: [], era: "apostolic" },
  "apostle-andrew": { traditions: [], era: "apostolic" },
  "apostle-james-zebedee": { traditions: [], era: "apostolic" },
  "apostle-philip": { traditions: [], era: "apostolic" },
  "apostle-bartholomew": { traditions: [], era: "apostolic" },
  "apostle-james-alphaeus": { traditions: [], era: "apostolic" },
  "apostle-jude": { traditions: [], era: "apostolic" },
  "apostle-simon-zealot": { traditions: [], era: "apostolic" },
  "apostle-matthias": { traditions: [], era: "apostolic" },
  "mary-magdalene": { traditions: [], era: "apostolic" },
  "prochorus-the-deacon": { traditions: [], era: "apostolic" },
  "titus-of-crete": { traditions: [], era: "apostolic" },
  "hermione-of-ephesus": { traditions: [], era: "apostolic" },
  "archangel-michael": { traditions: ["greek"], era: "byzantine" },
  // Before the apostles: the Church keeps their day, and they have no era of hers.
  "maccabean-martyrs": { traditions: [] },
  "anianus-of-alexandria": { traditions: ["egypt"], era: "apostolic" },
  "thaddeus-of-edessa": { traditions: ["syriac"], era: "apostolic" },

  "ignatius-of-antioch": { traditions: ["antioch"], era: "early" },
  "polycarp-of-smyrna": { traditions: ["greek"], era: "early" },
  "papias-of-hierapolis": { traditions: ["greek"], era: "early" },
  "justin-martyr": { traditions: ["greek"], era: "early" },
  // A Greek of Smyrna and a bishop in Gaul, who wrote in Greek.
  "irenaeus-of-lyons": { traditions: ["greek", "latin"], era: "early" },
  "cyprian-of-carthage": { traditions: ["latin"], era: "early" },
  "lawrence-the-archdeacon": { traditions: ["latin"], era: "early" },
  "sixtus-of-rome": { traditions: ["latin"], era: "early" },
  "florian-of-lorch": { traditions: ["latin"], era: "early" },
  "euplus-of-catania": { traditions: ["latin"], era: "early" },
  "seven-sleepers-of-ephesus": { traditions: ["greek"], era: "early" },

  "anthony-the-great": { traditions: ["egypt", "desert"], era: "councils" },
  "athanasius-the-great": { traditions: ["egypt"], era: "councils" },
  "alexander-of-alexandria": { traditions: ["egypt"], era: "councils" },
  "cyril-of-alexandria": { traditions: ["egypt"], era: "councils" },
  "mary-of-egypt": { traditions: ["egypt", "desert"], era: "councils" },
  "isidora-of-tabenna": { traditions: ["egypt", "desert"], era: "councils" },
  "pimen-the-great": { traditions: ["egypt", "desert"], era: "councils" },
  // Of Antioch, and of Constantinople, whose archbishop he was.
  "john-chrysostom": { traditions: ["greek", "antioch"], era: "councils" },
  "meletius-of-antioch": { traditions: ["antioch"], era: "councils" },
  "eustathius-of-antioch": { traditions: ["antioch"], era: "councils" },
  "basil-the-great": { traditions: ["greek"], era: "councils" },
  "gregory-theologian": { traditions: ["greek"], era: "councils" },
  "gregory-of-nyssa": { traditions: ["greek"], era: "councils" },
  "nicholas-the-wonderworker": { traditions: ["greek"], era: "councils" },
  "olympias-the-deaconess": { traditions: ["greek"], era: "councils" },
  "constantine-the-great": { traditions: ["greek"], era: "councils" },
  "theodosius-the-great": { traditions: ["greek"], era: "councils" },
  "spyridon-of-trimythous": { traditions: ["greek"], era: "councils" },
  "cyril-of-jerusalem": { traditions: ["greek"], era: "councils" },
  "nectarius-of-constantinople": { traditions: ["greek"], era: "councils" },
  "epiphanius-of-salamis": { traditions: ["greek"], era: "councils" },
  "maximus-the-confessor": { traditions: ["greek"], era: "councils" },
  "john-of-damascus": { traditions: ["greek"], era: "councils" },
  "ephraim-the-syrian": { traditions: ["syriac"], era: "councils" },
  "isaac-the-syrian": { traditions: ["syriac"], era: "councils" },
  "augustine-of-hippo": { traditions: ["latin"], era: "councils" },
  "hosius-of-cordova": { traditions: ["latin"], era: "councils" },
  "leo-the-great": { traditions: ["latin"], era: "councils" },
  "agatho-of-rome": { traditions: ["latin"], era: "councils" },
  "celestine-of-rome": { traditions: ["latin"], era: "councils" },
  "irene-the-empress": { traditions: ["greek"], era: "councils" },
  "arsenius-the-great": { traditions: ["egypt", "desert"], era: "councils" },
  "justinian-the-great": { traditions: ["greek"], era: "councils" },
  "tarasius-of-constantinople": { traditions: ["greek"], era: "councils" },
  "gregory-the-dialogist": { traditions: ["latin"], era: "councils" },
  "jerome-of-stridon": { traditions: ["latin"], era: "councils" },
  // He carried the Egyptian desert to the monasteries of Gaul.
  "john-cassian": { traditions: ["latin", "desert"], era: "councils" },

  "symeon-the-new-theologian": { traditions: ["greek"], era: "byzantine" },
  "photius-the-great": { traditions: ["greek"], era: "byzantine" },
  "gregory-palamas": { traditions: ["greek"], era: "byzantine" },

  "seraphim-of-sarov": { traditions: ["russian"], era: "afterByzantium" },
  "theophan-the-recluse": { traditions: ["russian"], era: "afterByzantium" },
  "herman-of-alaska": { traditions: ["russian"], era: "afterByzantium" },
  "tikhon-of-zadonsk": { traditions: ["russian"], era: "afterByzantium" },

  "nektarios-of-aegina": { traditions: ["greek"], era: "modern" },
  "paisios-the-athonite": { traditions: ["greek"], era: "modern" },
};

/**
 * Saints a Life is about who have no page of their own yet: St Jerome's three
 * Lives. Their names are the covers' and the search's; their days are the
 * Menaion's.
 */
export const SUBJECTS: Readonly<Record<string, MetaRow & { name: string; feasts: readonly string[] }>> = {
  "paul-of-thebes": { name: "St. Paul of Thebes", traditions: ["egypt", "desert"], era: "councils", feasts: ["January 15"] },
  hilarion: { name: "St. Hilarion the Great", traditions: ["desert"], era: "councils", feasts: ["October 21"] },
  malchus: { name: "St. Malchus", traditions: ["desert"], era: "councils", feasts: ["March 26"] },
};

const R = "pending-clergy" as const;

/** A tag, with its basis. */
function t(theme: ThemeId, basis: string, more: Omit<ThemeTag, "theme" | "basis"> = {}): ThemeTag {
  return { theme, basis, ...more };
}

/** Cassian's eight thoughts, Conference 5: Abba Serapion names all eight. */
const SERAPION = "Conference 5: Abba Serapion on the eight principal faults, their origins and remedies";
const conf5 = (theme: ThemeId) => t(theme, SERAPION, { sections: [[93, 119]] });

export const ENTRIES: Readonly<Record<WorkKey, ReadingEntry>> = {
  "theotokos/the-magnificat": {
    by: "theotokos",
    form: "scripture",
    scope: "complete",
    themes: [
      t("humility", "Luke 1:48 and 52: he regarded the lowliness of his handmaiden; he exalted them of low degree"),
      t("dormition", "Her own song, for the fast and the feast of her falling asleep"),
    ],
    review: R,
  },

  // The Life of Antony is registered under both saints, from one NPNF text.
  // It is shown once, as St Athanasius's, with St Antony on the cover.
  "anthony-the-great/life-of-antony": {
    by: "athanasius-the-great",
    about: "anthony-the-great",
    sameAs: "athanasius-the-great/life-of-antony",
    form: "life",
    scope: "complete",
    themes: [],
    review: R,
  },
  "athanasius-the-great/life-of-antony": {
    by: "athanasius-the-great",
    about: "anthony-the-great",
    form: "life",
    scope: "complete",
    themes: [
      t("temptation", "Antony's long warfare with the demons in the tombs and the desert, and his teaching on their wiles", { best: true }),
      t("watchfulness", "Antony's discourse to the monks: daily attention, as though dying each day, against the thoughts"),
      t("prayer", "His life of prayer in the inner mountain"),
    ],
    begin: true,
    featured: {},
    review: R,
  },
  "athanasius-the-great/on-the-incarnation": {
    by: "athanasius-the-great",
    form: "treatise",
    scope: "complete",
    themes: [
      t("nativity", "Why the Word of God took a body and was made man, the doctrine the Nativity keeps"),
      t("nativityFast", "The book of the Incarnation, read toward the feast of the Lord's birth"),
      t("pascha", "The death of the Lord and his rising, by which death is undone (the treatise's middle chapters)"),
    ],
    begin: true,
    featured: { seasons: ["nativity", "nativityFast"] },
    review: R,
  },
  "athanasius-the-great/against-the-heathen": { by: "athanasius-the-great", form: "treatise", scope: "complete", themes: [], review: R },
  "athanasius-the-great/four-discourses-against-the-arians": { by: "athanasius-the-great", form: "treatise", scope: "complete", themes: [], review: R },
  "athanasius-the-great/on-the-nicene-definition": { by: "athanasius-the-great", form: "treatise", scope: "complete", themes: [], review: R },
  "athanasius-the-great/on-the-councils": { by: "athanasius-the-great", form: "treatise", scope: "complete", themes: [], review: R },

  "john-chrysostom/paschal-homily": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("pascha", "Read in every Orthodox church at the Paschal Matins"),
      t("death", "Let no one fear death, for the Saviour's death has set us free"),
    ],
    begin: true,
    featured: { seasons: ["pascha"] },
    review: R,
  },
  "john-chrysostom/on-the-priesthood": {
    by: "john-chrysostom",
    form: "treatise",
    scope: "complete",
    themes: [
      t("vainglory", "Books 3 and 5: the love of glory that besets the priest and the preacher", { sections: [[3, 3], [5, 5]] }),
    ],
    featured: {},
    review: R,
  },
  "john-chrysostom/homilies-on-matthew": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("almsgiving", "Homily 50: honour Christ's body by not neglecting him naked and hungry in the poor", {
        sections: [[50, 50]],
        best: true,
        part: { kind: "homily", from: 50 },
      }),
      t("fear", "Homily 22 on Matthew 6:28 to 34: consider the lilies; take no thought for the morrow", {
        sections: [[22, 22]],
        best: true,
        part: { kind: "homily", from: 22 },
      }),
      t("lent", "Homily 20 on Matthew 6:16: when ye fast", { sections: [[20, 20]], part: { kind: "homily", from: 20 } }),
      t("nativityFast", "Homilies 2 to 4 on Matthew 1:1 to 17: the genealogy, read on the Sunday before the Nativity", {
        sections: [[2, 4]],
        part: { kind: "homily", from: 2, to: 4 },
      }),
      t("nativity", "Homilies 5 to 8 on Matthew 1:22 to 2: the virgin birth and the Magi", { sections: [[5, 8]], part: { kind: "homily", from: 5, to: 8 } }),
      t("theophany", "Homily 12 on Matthew 3:13: the Baptism of the Lord", { sections: [[12, 12]], part: { kind: "homily", from: 12 } }),
      t("transfiguration", "Homily 56 on Matthew 16:28 to 17: the Transfiguration", { sections: [[56, 56]], part: { kind: "homily", from: 56 } }),
      t("holyWeek", "Homilies 80 to 88 on Matthew 26 and 27: the anointing, the Supper, the arrest and the Cross", {
        sections: [[80, 88]],
        part: { kind: "homily", from: 80, to: 88 },
      }),
      t("pascha", "Homilies 89 and 90 on Matthew 27:62 to 28: the tomb and the Resurrection", {
        sections: [[89, 90]],
        part: { kind: "homily", from: 89, to: 90 },
      }),
    ],
    review: R,
  },
  "john-chrysostom/homilies-on-john": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("holyWeek", "Homilies 83 to 85 on John 18 and 19: the arrest, Pilate and the Cross", {
        sections: [[83, 85]],
        part: { kind: "homily", from: 83, to: 85 },
      }),
      t("pascha", "Homilies 86 to 88 on John 20 and 21: the risen Lord, Thomas, and Peter restored", {
        sections: [[86, 88]],
        part: { kind: "homily", from: 86, to: 88 },
      }),
    ],
    featured: { seasons: ["holyWeek"] },
    review: R,
  },
  "john-chrysostom/homilies-on-romans": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },
  "john-chrysostom/homilies-on-hebrews": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },
  "john-chrysostom/homilies-on-1-corinthians": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("love", "Homilies 32 to 34 on 1 Corinthians 12:27 to 13: the hymn to love", {
        sections: [[32, 34]],
        best: true,
        part: { kind: "homily", from: 32, to: 34 },
      }),
      t("marriage", "Homily 19 on 1 Corinthians 7: marriage and continence", { sections: [[19, 19]] }),
      t("pascha", "Homilies 38 to 42 on 1 Corinthians 15: the resurrection of the dead", {
        sections: [[38, 42]],
        part: { kind: "homily", from: 38, to: 42 },
      }),
    ],
    review: R,
  },
  "john-chrysostom/homilies-on-2-corinthians": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("sorrow", "Homily 15 on 2 Corinthians 7:8 to 10: the sorrow that works repentance, and the sorrow of the world", { sections: [[15, 15]] }),
      t("suffering", "Homilies 1 and 2 on 2 Corinthians 1: comfort in every affliction", { sections: [[1, 2]] }),
    ],
    review: R,
  },
  "john-chrysostom/homilies-on-ephesians": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("marriage", "Homily 20 on Ephesians 5:22 to 33: husbands and wives as Christ and the Church", {
        sections: [[20, 20]],
        best: true,
        part: { kind: "homily", from: 20 },
      }),
    ],
    review: R,
  },
  "john-chrysostom/homilies-on-philippians": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [t("humility", "Homilies 6 and 7 on Philippians 2:5 to 11: he humbled himself", { sections: [[6, 7]] })],
    review: R,
  },
  "john-chrysostom/homilies-on-colossians": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },
  "john-chrysostom/homilies-on-1-thessalonians": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("grief", "Homily 7 on 1 Thessalonians 4:13: sorrow not, even as others which have no hope", {
        sections: [[7, 7]],
        best: true,
        part: { kind: "homily", from: 7 },
      }),
      t("death", "Homilies 7 and 8 on 1 Thessalonians 4: them which are asleep, and the Lord's coming", { sections: [[7, 8]] }),
    ],
    review: R,
  },
  "john-chrysostom/homilies-on-2-thessalonians": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [
      t("work", "Homily 5 on 2 Thessalonians 3: if any would not work, neither should he eat", {
        sections: [[5, 5]],
        best: true,
        part: { kind: "homily", from: 5 },
      }),
    ],
    review: R,
  },
  "john-chrysostom/homilies-on-1-timothy": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [t("avarice", "Homily 17 on 1 Timothy 6: the love of money is the root of all evil", { sections: [[17, 17]] })],
    review: R,
  },
  "john-chrysostom/homilies-on-2-timothy": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },
  "john-chrysostom/homilies-on-titus": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },
  "john-chrysostom/homilies-on-philemon": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },
  "john-chrysostom/homilies-on-acts": {
    by: "john-chrysostom",
    form: "homilies",
    scope: "complete",
    themes: [t("almsgiving", "Homily 11 on Acts 4:32: of one heart and one soul, and all things common", { sections: [[11, 11]] })],
    review: R,
  },
  "john-chrysostom/commentary-on-galatians": { by: "john-chrysostom", form: "homilies", scope: "complete", themes: [], review: R },

  "basil-the-great/on-the-holy-spirit": { by: "basil-the-great", form: "treatise", scope: "complete", themes: [], featured: {}, review: R },
  "basil-the-great/hexaemeron": {
    by: "basil-the-great",
    form: "homilies",
    scope: "selections",
    themes: [t("lent", "Preached to his people in Lent, morning and evening")],
    review: R,
  },
  "gregory-theologian/first-theological-oration": { by: "gregory-theologian", form: "homilies", scope: "selections", themes: [], review: R },
  "john-of-damascus/exact-exposition-of-the-orthodox-faith": {
    by: "john-of-damascus",
    form: "treatise",
    scope: "complete",
    themes: [],
    featured: {},
    review: R,
  },
  // Two of its three sections are marked editorial: his teaching, in our words.
  "seraphim-of-sarov/spiritual-instructions": {
    by: null,
    about: "seraphim-of-sarov",
    form: "retelling",
    scope: "selections",
    themes: [
      t("prayer", "On the Jesus Prayer, in every place and at every time"),
      t("acedia", "On joy: no need to give way to despondency"),
    ],
    review: R,
  },

  "ignatius-of-antioch/life-of-ignatius": { by: null, about: "ignatius-of-antioch", form: "retelling", scope: "complete", themes: [], review: R },
  "ignatius-of-antioch/epistle-to-the-ephesians": { by: "ignatius-of-antioch", form: "letters", scope: "complete", themes: [], review: R },
  "ignatius-of-antioch/epistle-to-the-magnesians": { by: "ignatius-of-antioch", form: "letters", scope: "complete", themes: [], review: R },
  "ignatius-of-antioch/epistle-to-the-trallians": { by: "ignatius-of-antioch", form: "letters", scope: "complete", themes: [], review: R },
  "ignatius-of-antioch/epistle-to-the-romans": {
    by: "ignatius-of-antioch",
    form: "letters",
    scope: "complete",
    themes: [t("death", "On the road to the beasts: it is better for me to die for Jesus Christ than to reign over the earth")],
    begin: true,
    featured: {},
    review: R,
  },
  "ignatius-of-antioch/epistle-to-the-philadelphians": { by: "ignatius-of-antioch", form: "letters", scope: "complete", themes: [], review: R },
  "ignatius-of-antioch/epistle-to-the-smyrnaeans": {
    by: "ignatius-of-antioch",
    form: "letters",
    scope: "complete",
    themes: [t("pascha", "The risen Lord's flesh: lay hold, handle me, and see that I am not a bodiless spirit")],
    review: R,
  },
  "ignatius-of-antioch/epistle-to-polycarp": {
    by: "ignatius-of-antioch",
    form: "letters",
    scope: "complete",
    themes: [
      t("patience", "Bear with all men, as the Lord bears with thee; stand firm as an anvil under the hammer"),
      t("marriage", "Those who marry, marry with the bishop's consent, so that the marriage is in the Lord"),
    ],
    review: R,
  },
  "symeon-the-new-theologian/discourse-on-faith": {
    by: "symeon-the-new-theologian",
    form: "homilies",
    scope: "selections",
    themes: [t("prayer", "The light he was given at prayer, offered to every Christian who seeks it")],
    review: R,
  },
  "augustine-of-hippo/confessions": {
    by: "augustine-of-hippo",
    form: "life",
    scope: "complete",
    themes: [t("repentance", "Book I: the sins of a childhood confessed before God", { sections: [[1, 1]] })],
    begin: true,
    featured: {},
    review: R,
  },
  "augustine-of-hippo/tractates-on-john": { by: null, about: "augustine-of-hippo", form: "retelling", scope: "selections", themes: [], review: R },
  "augustine-of-hippo/sermon-on-the-mount": {
    by: "augustine-of-hippo",
    form: "treatise",
    scope: "complete",
    themes: [t("prayer", "Book 2, chapters 4 to 11: the Lord's Prayer, petition by petition", { sections: [[27, 34]] })],
    review: R,
  },
  "augustine-of-hippo/sermons-on-selected-lessons": {
    by: "augustine-of-hippo",
    form: "homilies",
    scope: "complete",
    themes: [
      t("prayer", "Sermons 6 to 9: the Lord's Prayer, given to those about to be baptized", { sections: [[6, 9]] }),
      t("nativityFast", "Sermon 1: the genealogies of the Lord in Matthew and Luke, the Gospel of the Sunday before the Nativity", {
        sections: [[1, 1]],
        part: { kind: "sermon", from: 1 },
      }),
      t("theophany", "Sermon 2 on Matthew 3:13: Jesus comes to the Jordan to be baptized", { sections: [[2, 2]], part: { kind: "sermon", from: 2 } }),
    ],
    review: R,
  },
  "augustine-of-hippo/harmony-of-the-gospels": {
    by: "augustine-of-hippo",
    form: "treatise",
    scope: "complete",
    themes: [
      t("holyWeek", "Book 3: the four accounts of the Supper, the Passion and the Resurrection, set side by side", {
        sections: [[116, 140]],
        part: { kind: "book", from: 3 },
      }),
    ],
    review: R,
  },
  "cyril-of-alexandria/commentary-on-john": {
    by: "cyril-of-alexandria",
    form: "treatise",
    scope: "complete",
    themes: [
      t("holyWeek", "Book 12 on John 18:28 to 19: the trial before Pilate, the Cross and the burial", {
        sections: [[1017, 1052]],
        part: { kind: "book", from: 12 },
      }),
      t("pascha", "Book 12 on John 20: the empty tomb, Mary Magdalene, and Thomas", { sections: [[1053, 1099]], part: { kind: "book", from: 12 } }),
    ],
    review: R,
  },
  "cyril-of-alexandria/five-tomes-against-nestorius": { by: null, about: "cyril-of-alexandria", form: "retelling", scope: "selections", themes: [], review: R },
  "cyril-of-alexandria/three-epistles-to-nestorius": { by: null, about: "cyril-of-alexandria", form: "retelling", scope: "selections", themes: [], review: R },
  "cyril-of-alexandria/commentary-on-luke": {
    by: "cyril-of-alexandria",
    form: "homilies",
    scope: "complete",
    themes: [
      t("nativity", "Sermons 1 to 4 on Luke 2: the birth, the shepherds, the circumcision and the Meeting", {
        sections: [[1, 4]],
        part: { kind: "sermon", from: 1, to: 4 },
      }),
      t("nativityFast", "The fragments on Luke 1 and Sermons 1 to 4 on Luke 2, read toward the feast", { sections: [[0, 4]] }),
      t("theophany", "Sermon 11 on Luke 3:21 to 23: the Lord baptized", { sections: [[11, 11]], part: { kind: "sermon", from: 11 } }),
    ],
    review: R,
  },
  "cyril-of-alexandria/scholia-on-the-incarnation": { by: null, about: "cyril-of-alexandria", form: "retelling", scope: "selections", themes: [], review: R },
  "irenaeus-of-lyons/against-heresies-on-john": { by: null, about: "irenaeus-of-lyons", form: "retelling", scope: "selections", themes: [], review: R },
  "apostle-paul/letter-from-the-prison": {
    by: "apostle-paul",
    form: "scripture",
    scope: "selections",
    themes: [t("suffering", "Written in chains: content in every state, the good fight, the crown laid up")],
    review: R,
  },
  "mary-of-egypt/life-by-sophronius": {
    by: null,
    about: "mary-of-egypt",
    form: "retelling",
    scope: "selections",
    themes: [
      t("repentance", "Her turning at the doors of the Sepulchre, and forty-seven years of repentance in the desert"),
      t("lust", "The life she turned from"),
      t("lent", "Her Life is read in the fifth week of Great Lent, and the fifth Sunday is hers"),
    ],
    featured: { seasons: ["lent"] },
    review: R,
  },
  "nicholas-the-wonderworker/stories-and-prayers": {
    by: null,
    about: "nicholas-the-wonderworker",
    form: "retelling",
    scope: "selections",
    themes: [
      t("almsgiving", "The three bags of gold given in secret"),
      t("nativityFast", "His feast, December 6, falls in the Nativity Fast"),
    ],
    review: R,
  },
  "hermione-of-ephesus/life-of-hermione": { by: null, about: "hermione-of-ephesus", form: "retelling", scope: "complete", themes: [], review: R },
  "isidora-of-tabenna/life-of-isidora": {
    by: null,
    about: "isidora-of-tabenna",
    form: "retelling",
    scope: "complete",
    themes: [t("humility", "The sister who hid her holiness as a fool among the nuns of Tabenna")],
    review: R,
  },
  "olympias-the-deaconess/life-of-olympias": {
    by: null,
    about: "olympias-the-deaconess",
    form: "retelling",
    scope: "complete",
    themes: [t("almsgiving", "Her fortune given to the poor and the Church of Constantinople")],
    review: R,
  },
  "gregory-of-nyssa/the-great-catechism": { by: "gregory-of-nyssa", form: "treatise", scope: "complete", themes: [], featured: {}, review: R },
  "john-the-baptist/selected-passages": {
    by: null,
    about: "john-the-baptist",
    form: "scripture",
    scope: "selections",
    themes: [
      t("theophany", "The Baptism of the Lord at the Jordan"),
      t("repentance", "Repent ye: for the kingdom of heaven is at hand"),
    ],
    featured: { seasons: ["theophany"] },
    review: R,
  },
  "apostle-peter/the-two-epistles": {
    by: "apostle-peter",
    form: "scripture",
    scope: "selections",
    themes: [t("humility", "1 Peter 5:5 to 7: be clothed with humility; casting all your care upon him")],
    review: R,
  },
  "apostle-matthew/selected-passages": { by: "apostle-matthew", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-john/life-of-the-theologian": { by: null, about: "apostle-john", form: "retelling", scope: "complete", themes: [], review: R },
  "apostle-john/selected-passages": {
    by: "apostle-john",
    form: "scripture",
    scope: "selections",
    themes: [t("love", "The new commandment, and 1 John 4: God is love")],
    review: R,
  },
  "apostle-thomas/the-confession": {
    by: null,
    about: "apostle-thomas",
    form: "scripture",
    scope: "selections",
    themes: [t("pascha", "My Lord and my God: the eighth day after the Resurrection, Thomas Sunday")],
    review: R,
  },
  "mary-magdalene/the-myrrhbearer": {
    by: null,
    about: "mary-magdalene",
    form: "scripture",
    scope: "selections",
    themes: [t("pascha", "The myrrhbearer at the tomb, the first to see the risen Lord")],
    review: R,
  },
  "apostle-andrew/the-first-called": { by: null, about: "apostle-andrew", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-james-zebedee/first-of-the-martyrs": { by: null, about: "apostle-james-zebedee", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-philip/come-and-see": { by: null, about: "apostle-philip", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-bartholomew/nathanael-under-the-fig-tree": { by: null, about: "apostle-bartholomew", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-james-alphaeus/the-second-james": { by: null, about: "apostle-james-alphaeus", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-jude/the-brother-of-james": { by: "apostle-jude", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-simon-zealot/from-cana-to-the-nations": { by: null, about: "apostle-simon-zealot", form: "scripture", scope: "selections", themes: [], review: R },
  "apostle-matthias/numbered-with-the-eleven": { by: null, about: "apostle-matthias", form: "scripture", scope: "selections", themes: [], review: R },
  "anianus-of-alexandria/the-second-bishop": { by: null, about: "anianus-of-alexandria", form: "retelling", scope: "complete", themes: [], review: R },
  "polycarp-of-smyrna/epistle-to-the-philippians": {
    by: "polycarp-of-smyrna",
    form: "letters",
    scope: "complete",
    themes: [
      t("avarice", "Chapters 4 and 11: the love of money is the beginning of all troubles; the presbyter Valens", {
        sections: [[5, 5], [12, 12]],
      }),
      t("patience", "Chapters 8 and 9: persevere in hope; imitate the patience of Christ and the martyrs", { sections: [[9, 10]] }),
    ],
    review: R,
  },
  // Written by the Church at Smyrna, which has no page here: about him, by her.
  "polycarp-of-smyrna/the-martyrdom-of-polycarp": {
    by: null,
    about: "polycarp-of-smyrna",
    form: "life",
    scope: "complete",
    themes: [t("death", "Eighty and six years I have served him: a bishop's death, told by his church")],
    begin: true,
    featured: {},
    review: R,
  },
  "polycarp-of-smyrna/eighty-and-six-years": { by: null, about: "polycarp-of-smyrna", form: "retelling", scope: "selections", themes: [], review: R },
  "papias-of-hierapolis/the-living-voice": { by: "papias-of-hierapolis", form: "sayings", scope: "selections", themes: [], review: R },
  "prochorus-the-deacon/scribe-on-patmos": { by: null, about: "prochorus-the-deacon", form: "scripture", scope: "selections", themes: [], review: R },
  "archangel-michael/hymns-to-the-bodiless-hosts": { by: null, about: "archangel-michael", form: "hymns", scope: "complete", themes: [], review: R },
  "nektarios-of-aegina/apolytikion-and-the-rule-of-life": {
    by: null,
    about: "nektarios-of-aegina",
    form: "hymns",
    scope: "selections",
    themes: [t("prayer", "His short Rule of Life for the nuns of Aegina")],
    review: R,
  },
  "florian-of-lorch/the-passion-of-florian": { by: null, about: "florian-of-lorch", form: "retelling", scope: "complete", themes: [], review: R },
  "constantine-the-great/the-vision-and-the-council": { by: null, about: "constantine-the-great", form: "retelling", scope: "selections", themes: [], review: R },
  "alexander-of-alexandria/encyclical-against-arius": { by: "alexander-of-alexandria", form: "letters", scope: "selections", themes: [], review: R },
  "hosius-of-cordova/the-elder-of-the-west": { by: null, about: "hosius-of-cordova", form: "retelling", scope: "complete", themes: [], review: R },
  "eustathius-of-antioch/the-confessor-of-antioch": { by: null, about: "eustathius-of-antioch", form: "retelling", scope: "complete", themes: [], review: R },
  "spyridon-of-trimythous/the-brick-and-the-flood": { by: null, about: "spyridon-of-trimythous", form: "retelling", scope: "selections", themes: [], review: R },
  "theodosius-the-great/the-edict-and-the-penance": {
    by: null,
    about: "theodosius-the-great",
    form: "retelling",
    scope: "selections",
    themes: [t("repentance", "The emperor's public penance at Milan after Thessalonica")],
    review: R,
  },
  "meletius-of-antioch/the-confessor-and-the-funeral": { by: null, about: "meletius-of-antioch", form: "retelling", scope: "complete", themes: [], review: R },
  "cyril-of-jerusalem/the-catechist-of-jerusalem": {
    by: "cyril-of-jerusalem",
    form: "homilies",
    scope: "selections",
    themes: [t("lent", "Lectures given in Lent to those preparing for baptism at Pascha")],
    review: R,
  },
  "nectarius-of-constantinople/the-senator-bishop": { by: null, about: "nectarius-of-constantinople", form: "retelling", scope: "complete", themes: [], review: R },
  "epiphanius-of-salamis/the-anchored-one": { by: "epiphanius-of-salamis", form: "treatise", scope: "selections", themes: [], review: R },
  // His Tome, the Church's hymns, and a guided summary in our words.
  "gregory-palamas/the-holy-hesychast": {
    by: null,
    about: "gregory-palamas",
    form: "retelling",
    scope: "selections",
    themes: [
      t("prayer", "Hesychasm: the prayer of the heart the Tome defends"),
      t("lent", "The second Sunday of Great Lent is his"),
      t("transfiguration", "The uncreated light of Tabor"),
    ],
    review: R,
  },
  // A florilegium: the Fathers' words, gathered in 2026 by a reader and the editors.
  "gregory-palamas/essence-and-energies": {
    by: null,
    about: "gregory-palamas",
    form: "sayings",
    scope: "complete",
    themes: [t("transfiguration", "The Fathers on the uncreated light and the energies of God")],
    review: R,
  },
  "ephraim-the-syrian/on-the-transfiguration-of-the-lord": {
    by: "ephraim-the-syrian",
    form: "homilies",
    scope: "selections",
    themes: [t("transfiguration", "His homily on Tabor: the light from within the Lord's own divinity")],
    featured: { seasons: ["transfiguration"] },
    review: R,
  },
  "justin-martyr/first-apology": { by: "justin-martyr", form: "treatise", scope: "complete", themes: [], featured: {}, review: R },
  "justin-martyr/second-apology": { by: "justin-martyr", form: "treatise", scope: "complete", themes: [], review: R },
  "justin-martyr/dialogue-with-trypho": { by: "justin-martyr", form: "treatise", scope: "complete", themes: [], review: R },
  "isaac-the-syrian/mystic-treatises": {
    by: "isaac-the-syrian",
    form: "homilies",
    scope: "selections",
    themes: [t("watchfulness", "Homily I: the mind held to meditation on the things to come, away from the world's distractions")],
    featured: {},
    review: R,
  },
  "photius-the-great/the-bibliotheca": { by: "photius-the-great", form: "treatise", scope: "selections", themes: [], review: R },
  "leo-the-great/the-tome-of-leo": { by: "leo-the-great", form: "letters", scope: "complete", themes: [], featured: {}, review: R },
  "agatho-of-rome/the-letter-to-the-emperors": { by: "agatho-of-rome", form: "letters", scope: "complete", themes: [], review: R },
  "celestine-of-rome/letter-to-the-synod-of-ephesus": { by: "celestine-of-rome", form: "letters", scope: "complete", themes: [], review: R },
  "irene-the-empress/letters-for-the-seventh-council": { by: "irene-the-empress", form: "letters", scope: "complete", themes: [], review: R },
  "justinian-the-great/anathematisms-against-origen": { by: "justinian-the-great", form: "treatise", scope: "selections", themes: [], review: R },
  "tarasius-of-constantinople/words-at-the-seventh-council": { by: "tarasius-of-constantinople", form: "sayings", scope: "selections", themes: [], review: R },
  "arsenius-the-great/sayings-of-abba-arsenius": {
    by: "arsenius-the-great",
    form: "sayings",
    scope: "selections",
    themes: [
      t("watchfulness", "Vigil all night, one hour's sleep, Get thee gone, O wicked handmaiden", { sections: [[4, 4]] }),
      t("humility", "The figs, the villager's alphabet, the two old men and obedience", { sections: [[6, 6]] }),
      t("work", "Palm leaves twisted into ropes until the sixth hour", { sections: [[5, 5]] }),
      t("death", "Blessed art thou, for thou didst weep over thyself; no commemoration but the Offering", { sections: [[8, 8]] }),
    ],
    review: R,
  },

  // The Institutes, Books 5 to 12: the eight thoughts, one book each (the
  // English edition leaves out Book 6, on fornication).
  "john-cassian/institutes": {
    by: "john-cassian",
    form: "treatise",
    scope: "complete",
    themes: [
      t("prayer", "Books 2 and 3: the canonical prayers and psalms of the night and the day", { sections: [[12, 41]] }),
      t("humility", "Book 4: the renunciant's obedience and humility, and the ten signs of humility", {
        sections: [[42, 84]],
        best: true,
        part: { kind: "book", from: 4 },
      }),
      t("temptation", "Book 4, chapters 37 and 38: the devil lies in wait; the renunciant's preparation against temptation", {
        sections: [[78, 79]],
      }),
      t("gluttony", "Book 5: the spirit of gluttony", { sections: [[85, 125]], best: true, part: { kind: "book", from: 5 } }),
      t("avarice", "Book 7: the spirit of covetousness", { sections: [[126, 156]], best: true, part: { kind: "book", from: 7 } }),
      t("anger", "Book 8: the spirit of anger", { sections: [[157, 178]], best: true, part: { kind: "book", from: 8 } }),
      t("sorrow", "Book 9: the spirit of dejection", { sections: [[179, 191]], best: true, part: { kind: "book", from: 9 } }),
      t("acedia", "Book 10: the spirit of accidie", { sections: [[192, 216]], best: true, part: { kind: "book", from: 10 } }),
      t("work", "Book 10, chapters 7 to 24: the labour of the hands against idleness", { sections: [[198, 215]] }),
      t("vainglory", "Book 11: the spirit of vainglory", { sections: [[217, 235]], best: true, part: { kind: "book", from: 11 } }),
      t("pride", "Book 12: the spirit of pride", { sections: [[236, 268]], best: true, part: { kind: "book", from: 12 } }),
      t("lent", "Book 5: fasting and the measure of food", { sections: [[85, 125]], part: { kind: "book", from: 5 } }),
    ],
    featured: { seasons: ["lent"] },
    review: R,
  },
  "john-cassian/conferences": {
    by: "john-cassian",
    form: "treatise",
    scope: "complete",
    themes: [
      t("watchfulness", "Conferences 1 and 2: Abba Moses on the heart's aim, the discerning of thoughts, and discretion", {
        sections: [[1, 49]],
        best: true,
        part: { kind: "conference", from: 1, to: 2 },
      }),
      t("temptation", "Conference 4, Abba Daniel on the flesh and the spirit; Conference 7, Abba Serenus on the wandering mind and the spirits of wickedness", {
        sections: [[72, 92], [137, 170]],
      }),
      conf5("gluttony"),
      t("lust", "Conference 5, chapter 4: Abba Serapion on gluttony and fornication and their remedies", {
        sections: [[96, 96]],
        best: true,
        part: { kind: "conference", from: 5 },
      }),
      conf5("avarice"),
      conf5("anger"),
      conf5("sorrow"),
      conf5("acedia"),
      conf5("vainglory"),
      conf5("pride"),
      t("suffering", "Conference 6: Abba Theodore on the death of the saints, and why the righteous suffer", {
        sections: [[120, 136]],
        best: true,
        part: { kind: "conference", from: 6 },
      }),
      t("prayer", "Conferences 9 and 10: Abba Isaac on prayer, and on the prayer O God, make speed to save me", {
        sections: [[196, 245]],
        best: true,
        part: { kind: "conference", from: 9, to: 10 },
      }),
      t("love", "Conference 11, Abba Chaeremon on fear, hope and love; Conference 16, Abba Joseph on friendship", {
        sections: [[246, 260], [308, 335]],
      }),
      t("repentance", "Conference 20: Abba Pinufius on the end of penitence and the marks of satisfaction", {
        sections: [[398, 409]],
        best: true,
        part: { kind: "conference", from: 20 },
      }),
      t("pascha", "Conference 21, chapters 19 to 23: why the fast is not kept through the fifty days", {
        sections: [[428, 432]],
        part: { kind: "conference", from: 21 },
      }),
      t("lent", "Conference 21, chapters 24 to 30: Lent, a tithe of the year, and its beginning", {
        sections: [[433, 439]],
        part: { kind: "conference", from: 21 },
      }),
    ],
    featured: {},
    review: R,
  },
  "gregory-the-dialogist/morals-on-the-book-of-job": {
    by: "gregory-the-dialogist",
    form: "homilies",
    scope: "complete",
    themes: [
      t("patience", "Books 2 and 3, on Job 1 and 2: the two trials, and Job's patience under them", {
        sections: [[2, 3]],
        best: true,
        part: { kind: "book", from: 2, to: 3 },
      }),
      t("suffering", "The whole book: why the just man suffers, read three ways"),
    ],
    featured: {},
    review: R,
  },
  "jerome-of-stridon/life-of-paulus-the-first-hermit": {
    by: "jerome-of-stridon",
    about: "paul-of-thebes",
    form: "life",
    scope: "complete",
    themes: [],
    featured: {},
    review: R,
  },
  "jerome-of-stridon/life-of-saint-hilarion": { by: "jerome-of-stridon", about: "hilarion", form: "life", scope: "complete", themes: [], review: R },
  "jerome-of-stridon/life-of-malchus-the-captive-monk": {
    by: "jerome-of-stridon",
    about: "malchus",
    form: "life",
    scope: "complete",
    themes: [t("chastity", "Malchus keeps his continence through captivity and a forced marriage", { best: true })],
    featured: {},
    review: R,
  },
  "jerome-of-stridon/the-perpetual-virginity-of-blessed-mary": {
    by: "jerome-of-stridon",
    form: "treatise",
    scope: "complete",
    themes: [t("dormition", "On the Mother of God, ever-virgin, for her fast and feast")],
    featured: { seasons: ["dormition"] },
    review: R,
  },
  // Anonymous; carried on St Theophan's page for the recension he corrected.
  "theophan-the-recluse/way-of-a-pilgrim": {
    by: null,
    form: "life",
    scope: "complete",
    themes: [t("prayer", "A wanderer learns the Jesus Prayer from the Philokalia")],
    traditions: ["russian"],
    era: "afterByzantium",
    begin: true,
    review: R,
  },
  "cyprian-of-carthage/the-bishop-of-carthage": { by: null, about: "cyprian-of-carthage", form: "retelling", scope: "complete", themes: [], review: R },
  // By Pontius the Deacon, who has no page here.
  "cyprian-of-carthage/the-life-and-passion-of-cyprian": {
    by: null,
    about: "cyprian-of-carthage",
    form: "life",
    scope: "complete",
    themes: [t("death", "The bishop's last days and his death by the sword, by the deacon who was with him")],
    review: R,
  },
  "cyprian-of-carthage/on-the-unity-of-the-church": { by: "cyprian-of-carthage", form: "treatise", scope: "complete", themes: [], review: R },
  "cyprian-of-carthage/on-the-lords-prayer": {
    by: "cyprian-of-carthage",
    form: "treatise",
    scope: "complete",
    themes: [t("prayer", "The Our Father, a phrase at a time")],
    begin: true,
    featured: {},
    review: R,
  },
  "cyprian-of-carthage/on-the-mortality": {
    by: "cyprian-of-carthage",
    form: "treatise",
    scope: "complete",
    themes: [
      t("death", "Written in the plague at Carthage: why a Christian need not fear dying", { best: true }),
      t("fear", "For Christians afraid of death and ashamed of their fear"),
      t("grief", "Our brethren are not lost but sent before; we may not mourn as those who have no hope"),
    ],
    featured: {},
    review: R,
  },
  "lawrence-the-archdeacon/the-treasures-of-the-church": {
    by: null,
    about: "lawrence-the-archdeacon",
    form: "retelling",
    scope: "complete",
    themes: [t("almsgiving", "The poor, the treasures of the Church")],
    review: R,
  },
  "sixtus-of-rome/taken-in-the-cemetery": { by: null, about: "sixtus-of-rome", form: "retelling", scope: "complete", themes: [], review: R },
  "maccabean-martyrs/the-seven-and-their-mother": { by: null, about: "maccabean-martyrs", form: "retelling", scope: "complete", themes: [], review: R },
  "pimen-the-great/the-shepherd-of-scetis": {
    by: null,
    about: "pimen-the-great",
    form: "retelling",
    scope: "complete",
    themes: [t("humility", "Weep for your own sins and not your neighbour's")],
    review: R,
  },
  "herman-of-alaska/the-north-american-elder": { by: null, about: "herman-of-alaska", form: "retelling", scope: "complete", themes: [], review: R },
  "tikhon-of-zadonsk/the-bishop-who-resigned": {
    by: null,
    about: "tikhon-of-zadonsk",
    form: "retelling",
    scope: "complete",
    themes: [t("acedia", "A bishop who knew despondency and wrote against it")],
    review: R,
  },
  "thaddeus-of-edessa/the-mission-to-abgar": { by: null, about: "thaddeus-of-edessa", form: "retelling", scope: "complete", themes: [], review: R },
  // Eusebius, Church History I.13: the documents as he printed them.
  "thaddeus-of-edessa/the-abgar-documents": { by: null, about: "thaddeus-of-edessa", form: "letters", scope: "complete", themes: [], review: R },
  "titus-of-crete/left-behind-in-crete": { by: null, about: "titus-of-crete", form: "retelling", scope: "complete", themes: [], review: R },
  "euplus-of-catania/the-deacon-with-the-book": { by: null, about: "euplus-of-catania", form: "retelling", scope: "complete", themes: [], review: R },
  "seven-sleepers-of-ephesus/the-sleepers-of-ephesus": {
    by: null,
    about: "seven-sleepers-of-ephesus",
    form: "retelling",
    scope: "complete",
    themes: [],
    review: R,
  },
};

/**
 * New to Orthodoxy: the row's order. The editor's shelf that was called
 * "Popular" until 1.7, though nothing measured what readers returned to.
 * Every one is marked `begin` above; the test holds the two together.
 */
export const BEGIN_ORDER: readonly WorkKey[] = [
  "athanasius-the-great/on-the-incarnation",
  "athanasius-the-great/life-of-antony",
  "john-chrysostom/paschal-homily",
  "theophan-the-recluse/way-of-a-pilgrim",
  "ignatius-of-antioch/epistle-to-the-romans",
  "polycarp-of-smyrna/the-martyrdom-of-polycarp",
  "cyprian-of-carthage/on-the-lords-prayer",
  "augustine-of-hippo/confessions",
];

export function entryFor(key: string): ReadingEntry | null {
  return (ENTRIES as Record<string, ReadingEntry>)[key] ?? null;
}

/** Whose icon the cover shows: the subject of a Life, else the author. */
export function coverSubject(entry: ReadingEntry): string | null {
  return entry.about ?? entry.by;
}

/** The byline: by the author, about the subject, or anonymous. */
export function bylineOf(entry: ReadingEntry): { kind: "by" | "about" | "anonymous"; slug: string | null } {
  if (entry.form !== "retelling" && entry.by) return { kind: "by", slug: entry.by };
  if (entry.about) return { kind: "about", slug: entry.about };
  if (entry.by) return { kind: "about", slug: entry.by };
  return { kind: "anonymous", slug: null };
}
