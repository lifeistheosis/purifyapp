/**
 * The reading room's closed lists (1.7, the owner's note 18: "a Netflix for
 * books", browsed by theme and by tradition).
 *
 * Every list here is closed: a work's tags (lib/reading/entries.ts) may only
 * name an id from these, and lib/reading/__tests__/catalog.test.ts holds them
 * to it. Each item carries its English, which is en.json's word for word, and
 * the catalog key the screens look up; the keys are computed, so the labels
 * test (lib/reading/__tests__/labels.test.ts) holds every one of them to all
 * twenty-one catalogs, as lib/i18n/__tests__/smallLabels.test.ts does for the
 * saints' groups.
 *
 * THEMES. The owner's words: "sections by theme and emotion (love, lust,
 * hatred...)". The passions are the eight thoughts in the order St John
 * Cassian gives them (Institutes 5 to 12, and Conference 5), the order the
 * Church's ascetic writers keep; hatred is a child of anger there, so it is
 * read under anger. Acedia is named "Despondency", the word Orthodox English
 * uses for it. Then the virtues, the troubles of daily life, and the seasons
 * of the Church's year.
 *
 * TRADITIONS. The owner's answer of 2026-10-16: "jurisdiction" meant
 * tradition, as categories (Greek, Russian, and so on), not a parish's
 * bishop. A work can stand in more than one (St John Chrysostom is of Antioch
 * and of Constantinople; St John Cassian is of the Latin West and of the
 * desert). Serbian, Romanian and Georgian have no work in the library yet;
 * their rows stay hidden until one arrives, and their names are ready.
 *
 * ERAS run from the Church's own milestones: the apostles, Nicaea (325), the
 * Seventh Council (787), the fall of Constantinople (1453), 1900.
 *
 * Every tag is marked for a future clergy review (entries.ts).
 */

export const THEME_GROUPS = ["passions", "virtues", "life", "seasons"] as const;
export type ThemeGroup = (typeof THEME_GROUPS)[number];

export const THEMES = [
  // The eight passions, in Cassian's order.
  { id: "gluttony", group: "passions", label: "Gluttony" },
  { id: "lust", group: "passions", label: "Lust" },
  { id: "avarice", group: "passions", label: "Avarice" },
  { id: "anger", group: "passions", label: "Anger" },
  { id: "sorrow", group: "passions", label: "Sorrow" },
  { id: "acedia", group: "passions", label: "Despondency" },
  { id: "vainglory", group: "passions", label: "Vainglory" },
  { id: "pride", group: "passions", label: "Pride" },
  // The virtues.
  { id: "humility", group: "virtues", label: "Humility" },
  { id: "love", group: "virtues", label: "Love" },
  { id: "prayer", group: "virtues", label: "Prayer" },
  { id: "repentance", group: "virtues", label: "Repentance" },
  { id: "watchfulness", group: "virtues", label: "Watchfulness" },
  { id: "patience", group: "virtues", label: "Patience" },
  { id: "almsgiving", group: "virtues", label: "Almsgiving" },
  { id: "chastity", group: "virtues", label: "Chastity" },
  // Daily life.
  { id: "grief", group: "life", label: "Grief" },
  { id: "death", group: "life", label: "Death" },
  { id: "marriage", group: "life", label: "Marriage" },
  { id: "temptation", group: "life", label: "Temptation" },
  { id: "work", group: "life", label: "Work" },
  { id: "suffering", group: "life", label: "Suffering" },
  { id: "fear", group: "life", label: "Fear and worry" },
  // The seasons of the Church's year.
  { id: "lent", group: "seasons", label: "Great Lent" },
  { id: "holyWeek", group: "seasons", label: "Holy Week" },
  { id: "pascha", group: "seasons", label: "Pascha" },
  { id: "nativityFast", group: "seasons", label: "The Nativity Fast" },
  { id: "nativity", group: "seasons", label: "The Nativity" },
  { id: "theophany", group: "seasons", label: "Theophany" },
  { id: "transfiguration", group: "seasons", label: "The Transfiguration" },
  { id: "dormition", group: "seasons", label: "The Dormition" },
] as const satisfies readonly { id: string; group: ThemeGroup; label: string }[];
export type ThemeId = (typeof THEMES)[number]["id"];
export type SeasonId = Extract<(typeof THEMES)[number], { group: "seasons" }>["id"];

export const TRADITIONS = [
  { id: "greek", label: "Greek and Byzantine" },
  { id: "latin", label: "Latin West" },
  { id: "egypt", label: "Alexandria and Egypt" },
  { id: "antioch", label: "Antioch" },
  { id: "syriac", label: "Syriac" },
  { id: "russian", label: "Russian" },
  { id: "desert", label: "Desert Fathers" },
  { id: "serbian", label: "Serbian" },
  { id: "romanian", label: "Romanian" },
  { id: "georgian", label: "Georgian" },
] as const;
export type TraditionId = (typeof TRADITIONS)[number]["id"];

export const ERAS = [
  { id: "apostolic", label: "Apostolic age", span: "To about 100" },
  { id: "early", label: "Early Church", span: "About 100 to 325" },
  { id: "councils", label: "Age of the Councils", span: "325 to 787" },
  { id: "byzantine", label: "Byzantine", span: "787 to 1453" },
  { id: "afterByzantium", label: "After Byzantium", span: "1453 to 1900" },
  { id: "modern", label: "Modern", span: "Since 1900" },
] as const;
export type EraId = (typeof ERAS)[number]["id"];

/**
 * What kind of text a work is. `retelling` is Purify's own prose about a
 * saint (an editorial Life, a summary): its cover says "About", never "By",
 * and it never stands in a row of the passions, the virtues or daily life,
 * which are the Fathers' own words.
 */
export const FORMS = ["treatise", "homilies", "letters", "life", "sayings", "hymns", "scripture", "retelling"] as const;
export type FormId = (typeof FORMS)[number];

/** How long a read is, at the house's 180 words a minute (lib/bible/readability.ts). */
export const LENGTHS = [
  { id: "under20", label: "20 minutes or less", max: 20 },
  { id: "under60", label: "20 minutes to an hour", max: 60 },
  { id: "under3h", label: "1 to 3 hours", max: 180 },
  { id: "longer", label: "Over 3 hours", max: Infinity },
] as const;
export type LengthId = (typeof LENGTHS)[number]["id"];

/** A part of a work a theme row points at: "Book 8", "Homilies 83 to 85". */
export const PART_KINDS = ["book", "conference", "homily", "sermon", "chapter"] as const;
export type PartKind = (typeof PART_KINDS)[number];

export const themeKey = (id: ThemeId) => `reading.theme.${id}`;
export const traditionKey = (id: TraditionId) => `reading.tradition.${id}`;
export const eraKey = (id: EraId) => `reading.era.${id}`;
export const eraSpanKey = (id: EraId) => `reading.eraSpan.${id}`;
export const lengthKey = (id: LengthId) => `reading.length.${id}`;
const PART_RUN: Record<PartKind, string> = {
  book: "books",
  conference: "conferences",
  homily: "homilies",
  sermon: "sermons",
  chapter: "chapters",
};
/** One part ("Book {n}") or a run of them ("Books {from} to {to}"). */
export const partKey = (kind: PartKind, run: boolean) => `reading.part.${run ? PART_RUN[kind] : kind}`;

export const THEME_IDS: readonly ThemeId[] = THEMES.map((t) => t.id);
export const TRADITION_IDS: readonly TraditionId[] = TRADITIONS.map((t) => t.id);
export const ERA_IDS: readonly EraId[] = ERAS.map((e) => e.id);
export const LENGTH_IDS: readonly LengthId[] = LENGTHS.map((l) => l.id);

export function themeGroupOf(id: ThemeId): ThemeGroup {
  return THEMES.find((t) => t.id === id)!.group;
}

export function themesIn(group: ThemeGroup): ThemeId[] {
  return THEMES.filter((t) => t.group === group).map((t) => t.id);
}

/** The length a read falls in. */
export function lengthBucket(minutes: number): LengthId {
  return LENGTHS.find((l) => minutes <= l.max)!.id;
}
