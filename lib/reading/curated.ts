// Curated editorial reading data for the Reading Hub.
//
// Everything here references content that already ships in the corpus. The
// unit test in test/reading-curated.test.ts asserts every href resolves to a
// real saint+work / topic / council, so a fabricated or dead link fails CI.
//
// Two surfaces:
//  - POPULAR: an editor's shelf of works people return to.
//  - PATHS + DEFAULT_NEXT: "Your Next Read", guided continuations. A path
//    matches a reader's recent history (by saint, topic, or exact route) and
//    points onward; DEFAULT_NEXT is the curated trio shown before any history
//    exists.

import type { ReadKind } from "@/lib/reading/history";

export type PopularRead = {
 href: string;
 title: string;
 /** Attribution line, e.g. "St. Athanasius the Great". */
 byline: string;
 kind: ReadKind;
};

export type NextSuggestion = {
 href: string;
 title: string;
 /** Guiding line, e.g. "Continue into St. Cyril of Alexandria." */
 byline: string;
};

export type ReadingPath = {
 /** Matches a history entry by saint slug (works + saint profiles). */
 saintSlug?: string;
 /** Matches a history entry whose topics include this (case-insensitive). */
 topic?: string;
 /** Matches a history entry by exact route. */
 href?: string;
 /** Lead-in shown above the suggestion, e.g. "Finished St. Athanasius?". */
 lead: string;
 to: NextSuggestion;
};

/** Popular reads, an editor's shelf. All routes verified real. */
export const POPULAR: PopularRead[] = [
 {
 href: "/saints/athanasius-the-great/on-the-incarnation",
 title: "On the Incarnation",
 byline: "St. Athanasius the Great",
 kind: "work",
 },
 {
 href: "/saints/john-chrysostom/homilies-on-john",
 title: "Homilies on the Gospel of John",
 byline: "St. John Chrysostom",
 kind: "work",
 },
 {
 href: "/saints/justin-martyr/dialogue-with-trypho",
 title: "Dialogue with Trypho",
 byline: "St. Justin Martyr",
 kind: "work",
 },
 {
 href: "/saints/anthony-the-great/life-of-antony",
 title: "The Life of Antony",
 byline: "St. Athanasius the Great",
 kind: "work",
 },
 {
 href: "/saints/augustine-of-hippo/confessions",
 title: "Confessions",
 byline: "St. Augustine of Hippo",
 kind: "work",
 },
 {
 href: "/saints/gregory-palamas/essence-and-energies",
 title: "The Essence and Energies of God",
 byline: "A florilegium of the Fathers",
 kind: "work",
 },
];

/**
 * Guided continuations. Checked most-recent-history-first; the first matching
 * path that points somewhere the reader has not just been is shown.
 */
export const PATHS: ReadingPath[] = [
 {
 saintSlug: "athanasius-the-great",
 lead: "Finished St. Athanasius?",
 to: {
 href: "/saints/cyril-of-alexandria/scholia-on-the-incarnation",
 title: "Scholia on the Incarnation",
 byline: "Continue into St. Cyril of Alexandria.",
 },
 },
 {
 topic: "Theosis",
 lead: "Reading on theosis?",
 to: {
 href: "/saints/gregory-palamas/essence-and-energies",
 title: "The Essence and Energies of God",
 byline: "Continue into the florilegium on the divine energies.",
 },
 },
 {
 topic: "Incarnation",
 lead: "Reading the Christology?",
 to: {
 href: "/councils/chalcedon",
 title: "The Council of Chalcedon",
 byline: "Continue into the council that confessed the two natures.",
 },
 },
 {
 saintSlug: "cyril-of-alexandria",
 lead: "Reading St. Cyril?",
 to: {
 href: "/councils/chalcedon",
 title: "The Council of Chalcedon",
 byline: "Continue into the council his theology shaped.",
 },
 },
];

/** The curated trio shown to readers with no history yet. */
export const DEFAULT_NEXT: NextSuggestion[] = [
 {
 href: "/saints/athanasius-the-great/on-the-incarnation",
 title: "On the Incarnation",
 byline: "Begin with St. Athanasius on why God became man.",
 },
 {
 href: "/saints/john-chrysostom/homilies-on-john",
 title: "Homilies on the Gospel of John",
 byline: "Read the Golden-Mouth on the fourth Gospel.",
 },
 {
 href: "/saints/anthony-the-great/life-of-antony",
 title: "The Life of Antony",
 byline: "Enter the desert with the father of monastics.",
 },
];

/** All curated routes, for the build-time link assertion. */
export function allCuratedHrefs(): string[] {
 return [
 ...POPULAR.map((p) => p.href),
 ...PATHS.map((p) => p.to.href),
 ...DEFAULT_NEXT.map((s) => s.href),
 ];
}
