// Prayer rule registry — the catalog of every prayer surface in the app.
//
// Pure data + pure helpers, no fs and no "use client", so it is safe to import
// from both server pages (the hub, the [planId] route) and client components
// (Continue Praying, Suggested for Today). The actual prayer JSON is read at
// request time in the route via getLocalizedPrayerJson(meta.file).
//
// `planned: true` marks a category we have NOT yet seeded with verbatim
// public-domain text. It is surfaced honestly as "planned" — never filled with
// invented prayers — per the project's content-integrity rule.

export type RuleCategory = "daily" | "daily-life" | "church-year" | "devotional";

export type TimeOfDay =
 | "waking"
 | "morning"
 | "midday"
 | "evening"
 | "night"
 | "any";

export type Season = "lent" | "pascha" | "nativity" | "fasting" | "any";

export type RuleMeta = {
 id: string;
 title: string;
 titleDe?: string;
 description?: string;
 descriptionDe?: string;
 category: RuleCategory;
 /** Route to read this rule. */
 href: string;
 /**
  * Data file relative to data/prayers, loaded via getLocalizedPrayerJson and
  * rendered through the [planId] route. Absent for surfaces with their own
  * dedicated route/UI (rope, learning, akathists, hours, personal) or for
  * planned entries.
  */
 file?: string;
 estimatedMinutes?: number;
 timeOfDay?: TimeOfDay;
 season?: Season;
 /** Relevant on a fast day (surfaces in Suggested for Today). */
 fastRelated?: boolean;
 /** Surfaces in the curated "Popular prayer rules" rail. */
 popular?: boolean;
 /** Not yet seeded with verbatim text — shown honestly as "planned". */
 planned?: boolean;
};

export const RULE_CATEGORY_ORDER: RuleCategory[] = [
 "daily",
 "daily-life",
 "church-year",
 "devotional",
];

export const RULE_CATEGORY_LABEL: Record<RuleCategory, { en: string; de: string }> = {
 daily: { en: "The daily rule", de: "Die tägliche Regel" },
 "daily-life": { en: "Before & after daily life", de: "Vor & nach dem Alltag" },
 "church-year": { en: "The Church year", de: "Das Kirchenjahr" },
 devotional: { en: "Devotional", de: "Andacht" },
};

export const RULES: RuleMeta[] = [
 // ── Daily rule ────────────────────────────────────────────────────────────
 {
 id: "morning",
 title: "Morning prayers",
 titleDe: "Morgengebete",
 description: "Begin the day with God, the Sign of the Cross through dismissal.",
 descriptionDe: "Den Tag mit Gott beginnen, Kreuzzeichen bis Entlassung.",
 category: "daily",
 href: "/prayers/morning",
 file: "rules/morning.json",
 estimatedMinutes: 8,
 timeOfDay: "morning",
 popular: true,
 },
 {
 id: "midday",
 title: "Midday prayers",
 titleDe: "Mittagsgebete",
 description: "A short rule for noon, the Sixth Hour troparion and the Jesus Prayer.",
 descriptionDe: "Eine kurze Regel zur Mittagszeit, Troparion der sechsten Stunde und Jesusgebet.",
 category: "daily",
 href: "/prayers/midday",
 file: "rules/midday.json",
 estimatedMinutes: 5,
 timeOfDay: "midday",
 },
 {
 id: "evening",
 title: "Evening prayers",
 titleDe: "Abendgebete",
 description: "Lay the day down, examination of the day and Into Thy hands.",
 descriptionDe: "Den Tag niederlegen, Tageserforschung und In deine Hände.",
 category: "daily",
 href: "/prayers/evening",
 file: "rules/evening.json",
 estimatedMinutes: 8,
 timeOfDay: "evening",
 popular: true,
 },
 {
 id: "creed",
 title: "The Nicene Creed",
 titleDe: "Das Glaubensbekenntnis von Nizäa",
 description: "The Symbol of Faith, prayed at every Liturgy and in the daily rule.",
 descriptionDe: "Das Glaubensbekenntnis, gebetet in jeder Liturgie und in der täglichen Regel.",
 category: "daily",
 href: "/prayers/creed",
 file: "rules/creed.json",
 estimatedMinutes: 2,
 timeOfDay: "any",
 popular: true,
 },
 {
 id: "first-hour",
 title: "The First Hour",
 titleDe: "Die Erste Stunde",
 description: "Prime, at sunrise; Psalms 5, 89, and 100 with the troparion of the hour.",
 descriptionDe: "Prim, bei Sonnenaufgang; Psalmen 5, 89 und 100 mit dem Troparion der Stunde.",
 category: "daily",
 href: "/prayers/hours/first-hour",
 estimatedMinutes: 6,
 timeOfDay: "morning",
 },
 {
 id: "third-hour",
 title: "The Third Hour",
 titleDe: "Die Dritte Stunde",
 description: "Terce, the hour of Pentecost; Psalms 16, 24, and 50.",
 descriptionDe: "Terz, die Stunde von Pfingsten; Psalmen 16, 24 und 50.",
 category: "daily",
 href: "/prayers/hours/third-hour",
 estimatedMinutes: 5,
 timeOfDay: "morning",
 },
 {
 id: "sixth-hour",
 title: "The Sixth Hour",
 titleDe: "Die Sechste Stunde",
 description: "Sext, the hour of the Crucifixion; Psalms 53, 54, and 90.",
 descriptionDe: "Sext, die Stunde der Kreuzigung; Psalmen 53, 54 und 90.",
 category: "daily",
 href: "/prayers/hours/sixth-hour",
 estimatedMinutes: 5,
 timeOfDay: "midday",
 },
 {
 id: "ninth-hour",
 title: "The Ninth Hour",
 titleDe: "Die Neunte Stunde",
 description: "None, the hour of the death of Christ; Psalms 83, 84, and 85.",
 descriptionDe: "Non, die Todesstunde Christi; Psalmen 83, 84 und 85.",
 category: "daily",
 href: "/prayers/hours/ninth-hour",
 estimatedMinutes: 5,
 timeOfDay: "any",
 },
 {
 id: "compline",
 title: "Small Compline",
 titleDe: "Kleines Apodeipnon",
 description: "The Church's prayers before sleep, among the Hours.",
 descriptionDe: "Die Gebete der Kirche vor dem Schlaf, unter den Horen.",
 category: "daily",
 href: "/prayers/hours/compline",
 timeOfDay: "night",
 },

 // ── Before & after daily life ──────────────────────────────────────────────
 {
 id: "upon-waking",
 title: "Upon waking",
 titleDe: "Beim Erwachen",
 description: "The first words of the day, before rising.",
 descriptionDe: "Die ersten Worte des Tages, vor dem Aufstehen.",
 category: "daily-life",
 href: "/prayers/upon-waking",
 file: "rules/upon-waking.json",
 estimatedMinutes: 2,
 timeOfDay: "waking",
 },
 {
 id: "before-meals",
 title: "Before meals",
 titleDe: "Vor dem Essen",
 description: "The blessing of the table.",
 descriptionDe: "Der Segen über den Tisch.",
 category: "daily-life",
 href: "/prayers/before-meals",
 file: "rules/before-meals.json",
 estimatedMinutes: 2,
 popular: true,
 },
 {
 id: "after-meals",
 title: "After meals",
 titleDe: "Nach dem Essen",
 description: "Thanksgiving when the meal is ended.",
 descriptionDe: "Danksagung nach dem Mahl.",
 category: "daily-life",
 href: "/prayers/after-meals",
 file: "rules/after-meals.json",
 estimatedMinutes: 2,
 },
 {
 id: "before-sleep",
 title: "Before sleep",
 titleDe: "Vor dem Schlaf",
 description: "Into Thy hands, a short surrender of the night.",
 descriptionDe: "In deine Hände, eine kurze Übergabe der Nacht.",
 category: "daily-life",
 href: "/prayers/before-sleep",
 file: "rules/before-sleep.json",
 estimatedMinutes: 2,
 timeOfDay: "night",
 },
 {
 id: "before-work",
 title: "Before work or study",
 titleDe: "Vor Arbeit oder Studium",
 description: "A blessing asked before the day's work begins.",
 descriptionDe: "Ein Segen, erbeten vor Beginn des Tagewerks.",
 category: "daily-life",
 href: "/prayers/before-work",
 planned: true,
 },
 {
 id: "after-work",
 title: "After work",
 titleDe: "Nach der Arbeit",
 description: "Thanks at the end of the day's work.",
 descriptionDe: "Dank am Ende des Tagewerks.",
 category: "daily-life",
 href: "/prayers/after-work",
 planned: true,
 },
 {
 id: "before-travel",
 title: "Before travel",
 titleDe: "Vor einer Reise",
 description: "For the road, and for a safe return.",
 descriptionDe: "Für den Weg und eine sichere Heimkehr.",
 category: "daily-life",
 href: "/prayers/before-travel",
 planned: true,
 },

 // ── The Church year ────────────────────────────────────────────────────────
 {
 id: "lent-ephrem",
 title: "The Prayer of St. Ephrem",
 titleDe: "Das Gebet des hl. Ephräm",
 description: "The prayer of Great Lent, with prostrations.",
 descriptionDe: "Das Gebet der Großen Fastenzeit, mit Verbeugungen.",
 category: "church-year",
 href: "/prayers/lent-ephrem",
 file: "rules/lent-ephrem.json",
 estimatedMinutes: 3,
 season: "lent",
 fastRelated: true,
 popular: true,
 },
 {
 id: "pascha",
 title: "Paschal prayers",
 titleDe: "Pascha-Gebete",
 description: "Christ is risen, the troparion and verses of Pascha.",
 descriptionDe: "Christus ist auferstanden, Troparion und Verse von Pascha.",
 category: "church-year",
 href: "/prayers/pascha",
 file: "rules/pascha.json",
 estimatedMinutes: 3,
 season: "pascha",
 },
 {
 id: "nativity",
 title: "Nativity season prayers",
 titleDe: "Gebete der Weihnachtszeit",
 description: "What the Church prays through the Nativity fast and the feast.",
 descriptionDe: "Was die Kirche durch die Weihnachtsfastenzeit und das Fest betet.",
 category: "church-year",
 href: "/prayers/nativity",
 season: "nativity",
 planned: true,
 },
 {
 id: "fasting",
 title: "Fasting season prayers",
 titleDe: "Gebete der Fastenzeit",
 description: "What the Church prays through the fasts of the year.",
 descriptionDe: "Was die Kirche durch die Fastenzeiten des Jahres betet.",
 category: "church-year",
 href: "/prayers/fasting",
 season: "fasting",
 fastRelated: true,
 planned: true,
 },

 // ── Devotional ─────────────────────────────────────────────────────────────
 {
 id: "jesus-prayer",
 title: "The Jesus Prayer",
 titleDe: "Das Jesusgebet",
 description: "Lord Jesus Christ, Son of God, have mercy on me; learn to pray it.",
 descriptionDe: "Herr Jesus Christus, Sohn Gottes, erbarme Dich meiner; lerne, es zu beten.",
 category: "devotional",
 href: "/prayers/learning/jesus-prayer",
 popular: true,
 },
 {
 id: "rope",
 title: "Prayer rope guidance",
 titleDe: "Gebetsschnur",
 description: "Count the Jesus Prayer on a digital komvoschini.",
 descriptionDe: "Zähle das Jesusgebet auf einer digitalen Komvoschini.",
 category: "devotional",
 href: "/prayers/rope",
 },
 {
 id: "repentance",
 title: "Psalm 50: Repentance",
 titleDe: "Psalm 50: Reue",
 description: "Have mercy on me, O God, the psalm of repentance.",
 descriptionDe: "Erbarme Dich meiner, o Gott, der Bußpsalm.",
 category: "devotional",
 href: "/prayers/repentance",
 file: "rules/repentance.json",
 estimatedMinutes: 4,
 },
 {
 id: "protection",
 title: "Prayers of protection",
 titleDe: "Schutzgebete",
 description: "Psalm 90, Psalm 26, Let God arise, and the guard of the angel.",
 descriptionDe: "Psalm 90, Psalm 26, Es stehe Gott auf und der Schutz des Engels.",
 category: "devotional",
 href: "/prayers/protection",
 file: "rules/protection.json",
 estimatedMinutes: 7,
 timeOfDay: "any",
 popular: true,
 },
 {
 id: "psalms-needs",
 title: "Psalms for common needs",
 titleDe: "Psalmen für häufige Anliegen",
 description: "Psalms to say in sickness, in fear, and in sorrow.",
 descriptionDe: "Psalmen für Krankheit, Furcht und Trauer.",
 category: "devotional",
 href: "/prayers/psalms-needs",
 planned: true,
 },
 {
 id: "intercessory",
 title: "Intercessory prayers",
 titleDe: "Fürbittgebete",
 description: "The names you carry, the living and the reposed.",
 descriptionDe: "Die Namen, die du trägst, die Lebenden und die Entschlafenen.",
 category: "devotional",
 href: "/prayers/personal",
 },
 {
 // Reasoned Belief, in the app's own Community tab: "something that is
 // desperately needed is [...] prayers of preparation before receiving the
 // Eucharist AND Thanksgiving prayers after receiving the Eucharist".
 // This is the first half. The book prints six under one heading and calls
 // it "a selection"; the subtitle keeps that word rather than implying the
 // set is exhaustive.
 id: "pre-communion",
 title: "Prayers before Communion",
 titleDe: "Gebete vor der Kommunion",
 description: "The six the Service Book appoints for those preparing to receive.",
 descriptionDe: "Die sechs Gebete des Dienstbuches zur Vorbereitung auf den Empfang.",
 category: "devotional",
 href: "/prayers/pre-communion",
 file: "rules/pre-communion.json",
 estimatedMinutes: 15,
 timeOfDay: "morning",
 },
 {
 id: "thanksgiving",
 title: "Thanksgiving prayers",
 titleDe: "Dankgebete",
 description: "Thanks given for mercy received.",
 descriptionDe: "Dank für empfangene Barmherzigkeit.",
 category: "devotional",
 href: "/prayers/thanksgiving",
 planned: true,
 },
];

const BY_ID = new Map(RULES.map((r) => [r.id, r]));

export function getRuleMeta(id: string): RuleMeta | undefined {
 return BY_ID.get(id);
}

export function rulesByCategory(category: RuleCategory): RuleMeta[] {
 return RULES.filter((r) => r.category === category);
}

/** Rules rendered through the generic [planId] reader (have a file, not planned). */
export function readerRules(): RuleMeta[] {
 return RULES.filter((r) => r.file && !r.planned);
}

/** Ids the [planId] route should pre-render. Excludes ids with dedicated pages. */
const DEDICATED_ROUTE_IDS = new Set(["morning", "evening"]);

export function planIdParams(): { planId: string }[] {
 return readerRules()
 .filter((r) => !DEDICATED_ROUTE_IDS.has(r.id))
 .map((r) => ({ planId: r.id }));
}

/** Curated "commonly prayed" rail. */
export function popularRules(): RuleMeta[] {
 return RULES.filter((r) => r.popular);
}

/**
 * Ids already shown above the index, so the index can leave them out.
 *
 * Both Prayers surfaces print the popular rail and then every category in
 * full, with no exclusion between them, so seven rules appeared twice on
 * one screen: 34 rows for 27 prayers. `rope` and `intercessory` are here
 * too because the Practices tiles are exact-href doors to them.
 *
 * The tiles stay: a tile is a door to a surface with its own UI, which is
 * a different offer from a line in an index. The index is what should not
 * repeat itself.
 */
const ABOVE_THE_INDEX = new Set(["rope", "intercessory"]);

export function indexedRuleIds(): ReadonlySet<string> {
 const out = new Set(ABOVE_THE_INDEX);
 for (const r of popularRules()) out.add(r.id);
 return out;
}

/** Rules for a category, minus anything the page already showed above it. */
export function indexRules(
 category: RuleCategory,
 exclude: ReadonlySet<string> = indexedRuleIds(),
): RuleMeta[] {
 return rulesByCategory(category).filter((r) => !exclude.has(r.id));
}
