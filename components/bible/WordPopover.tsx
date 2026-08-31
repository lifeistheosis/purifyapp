"use client";

import { Close } from "@/components/ui/icons/Close";

import { useEffect, useRef } from "react";
import type { Token } from "@/lib/bible/load";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { StrongsEntry } from "@/lib/bible/strongs";

// Friendly long-form labels for Robinson-Pierpont parse codes.
// Only the most common bits, enough so a casual reader can guess what
// the part of speech means.
const POS_KEYS: Record<string, string> = {
 N: "bible.parse.noun",
 V: "bible.parse.verb",
 A: "bible.parse.adjective",
 T: "bible.parse.article",
 D: "bible.parse.demonstrative",
 P: "bible.parse.pronoun",
 R: "bible.parse.relative",
 K: "bible.parse.correlative",
 I: "bible.parse.interrogative",
 X: "bible.parse.indefinite",
 F: "bible.parse.reflexive",
 S: "bible.parse.possessive",
 Q: "bible.parse.indefinite",
 C: "bible.parse.reciprocal",
 ADV: "bible.parse.adverb",
 CONJ: "bible.parse.conjunction",
 COND: "bible.parse.conditional",
 PRT: "bible.parse.particle",
 PREP: "bible.parse.preposition",
 INJ: "bible.parse.interjection",
 ARAM: "bible.parse.aramaic",
 HEB: "bible.parse.hebrew",
};

const TENSE_KEYS: Record<string, string> = {
 P: "bible.parse.present",
 I: "bible.parse.imperfect",
 F: "bible.parse.future",
 A: "bible.parse.aorist",
 R: "bible.parse.perfect",
 L: "bible.parse.pluperfect",
 X: "bible.parse.futurePerfect",
 "2A": "bible.parse.secondAorist",
 "2P": "bible.parse.secondPerfect",
 "2R": "bible.parse.secondPerfect",
 "2X": "bible.parse.secondFuturePerfect",
};
const VOICE_KEYS: Record<string, string> = {
 A: "bible.parse.active",
 M: "bible.parse.middle",
 P: "bible.parse.passive",
 D: "bible.parse.deponent",
 N: "bible.parse.middlePassive",
 X: "bible.parse.middleDeponent",
 O: "bible.parse.passiveDeponent",
};
const MOOD_KEYS: Record<string, string> = {
 I: "bible.parse.indicative",
 S: "bible.parse.subjunctive",
 O: "bible.parse.optative",
 M: "bible.parse.imperative",
 N: "bible.parse.infinitive",
 P: "bible.parse.participle",
};
// Person and number ship as one key per pair, so a language that inflects
// them together is not forced to glue two fragments in English order.
const PERSON_NUMBER_KEYS: Record<string, string> = {
 "1S": "bible.parse.person1Sing",
 "1P": "bible.parse.person1Pl",
 "2S": "bible.parse.person2Sing",
 "2P": "bible.parse.person2Pl",
 "3S": "bible.parse.person3Sing",
 "3P": "bible.parse.person3Pl",
};
const NUMBER_KEYS: Record<string, string> = {
 S: "bible.parse.numberSing",
 P: "bible.parse.numberPl",
};

/**
 * Render a friendly parse string from a Robinson-Pierpont code.
 * N-NSM -> "noun · nominative · singular · masculine"
 * V-AAI-3S -> "verb · aorist · active · indicative · 3rd person singular"
 * PREP -> "preposition"
 * ADV -> "adverb"
 */
function friendlyParse(code: string, t: (key: string) => string): string {
 if (!code) return "";
 // Top-level pos abbreviations.
 if (POS_KEYS[code]) return t(POS_KEYS[code]);
 const parts = code.split("-");
 const head = parts[0];
 const headLabel = POS_KEYS[head] ? t(POS_KEYS[head]) : head.toLowerCase();
 const pieces: string[] = [headLabel];

 if (head === "V" && parts[1]) {
 // Verb: tense + voice + mood (TVM) like AAI / RPP
 const tvm = parts[1];
 // tense may be two chars (2A)
 let tense = TENSE_KEYS[tvm[0]];
 let i = 1;
 if (tvm[0] === "2" && TENSE_KEYS["2" + tvm[1]]) {
 tense = TENSE_KEYS["2" + tvm[1]];
 i = 2;
 }
 const voice = VOICE_KEYS[tvm[i]];
 const mood = MOOD_KEYS[tvm[i + 1]];
 if (tense) pieces.push(t(tense));
 if (voice) pieces.push(t(voice));
 if (mood) pieces.push(t(mood));
 // Person + number (3S, 1P, etc.)
 if (parts[2]) {
 const pn = parts[2];
 const personNumber = PERSON_NUMBER_KEYS[pn.slice(0, 2)] ?? null;
 const number = NUMBER_KEYS[pn[1]] ?? null;
 if (personNumber) pieces.push(t(personNumber));
 else if (number) pieces.push(t(number));
 }
 } else if (parts[1]) {
 // Nominal: case + number + gender
 const caseGenderNumber = parts[1];
 const cases: Record<string, string> = {
 N: "bible.parse.nominative",
 G: "bible.parse.genitive",
 D: "bible.parse.dative",
 A: "bible.parse.accusative",
 V: "bible.parse.vocative",
 };
 const numbers: Record<string, string> = NUMBER_KEYS;
 const genders: Record<string, string> = {
 M: "bible.parse.masculine",
 F: "bible.parse.feminine",
 N: "bible.parse.neuter",
 };
 if (cases[caseGenderNumber[0]]) pieces.push(t(cases[caseGenderNumber[0]]));
 if (numbers[caseGenderNumber[1]]) pieces.push(t(numbers[caseGenderNumber[1]]));
 if (genders[caseGenderNumber[2]]) pieces.push(t(genders[caseGenderNumber[2]]));
 }
 return pieces.join(" · ");
}

export function WordPopover({
 token,
 entry,
 anchorRect,
 onClose,
}: {
 token: Token;
 entry: StrongsEntry | null;
 anchorRect: DOMRect;
 onClose: () => void;
}) {
  const { t } = useTranslate();
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 function onKey(e: KeyboardEvent) {
 if (e.key === "Escape") onClose();
 }
 function onDocClick(e: MouseEvent) {
 if (!ref.current?.contains(e.target as Node)) onClose();
 }
 // Close on scroll, the anchor point would otherwise be wrong.
 function onScroll() {
 onClose();
 }
 document.addEventListener("keydown", onKey);
 // Defer so the click that opened it doesn't immediately close it.
 const t = setTimeout(
 () => document.addEventListener("mousedown", onDocClick),
 50,
 );
 window.addEventListener("scroll", onScroll, { passive: true, capture: true });
 return () => {
 clearTimeout(t);
 document.removeEventListener("keydown", onKey);
 document.removeEventListener("mousedown", onDocClick);
 window.removeEventListener("scroll", onScroll, { capture: true });
 };
 }, [onClose]);

 // position: fixed → viewport-relative coordinates straight from
 // getBoundingClientRect (no scroll offsets needed). This sidesteps the
 // bug where `position: absolute` was being computed against the nearest
 // positioned ancestor (the VerseRow div) instead of the page.
 const PAD = 8;
 // Responsive width: prefer 300px, shrink to fit ultra-narrow viewports.
 const POPOVER_W = Math.min(
 300,
 Math.max(240, window.innerWidth - PAD * 2 - 16),
 );
 let left =
 anchorRect.left + anchorRect.width / 2 - POPOVER_W / 2;
 left = Math.max(PAD, Math.min(left, window.innerWidth - POPOVER_W - PAD));
 const ESTIMATED_H = 160;
 const aboveTop = anchorRect.top - ESTIMATED_H - 8;
 const belowTop = anchorRect.bottom + 8;
 const flipAbove =
 anchorRect.bottom + ESTIMATED_H + 16 > window.innerHeight &&
 aboveTop > PAD;
 const top = flipAbove ? aboveTop : belowTop;

 return (
 <div
 ref={ref}
 role="dialog"
 aria-label={t("bible.wordDetails", { word: token.w })}
 className="fixed z-50 rounded-lg border border-paper/20 bg-night-soft shadow-pop p-4"
 style={{ width: POPOVER_W, left, top }}
 >
 <button
 type="button"
 onClick={onClose}
 aria-label={t("common.close")}
 className="hit-44 absolute top-2 right-2 h-7 w-7 rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper flex items-center justify-center text-ui"
 >
 <Close size={13} />
 </button>

 {/* The word itself */}
 <p
 lang="grc"
 style={{ fontFamily: "var(--font-greek), serif" }}
 className="text-title-sm text-paper font-semibold leading-tight pr-7"
 >
 {token.w}
 </p>

 {/* Lemma (dictionary form) + transliteration */}
 {entry && (
 <p className="mt-2 font-sans text-ui text-paper/80">
 <span
 lang="grc"
 style={{ fontFamily: "var(--font-greek), serif" }}
 className="text-body text-paper"
 >
 {entry.l}
 </span>
 <span className="text-paper/55"> · </span>
 <em className="not-italic text-paper/70">{entry.t}</em>
 </p>
 )}

 {/* Short gloss */}
 {entry?.d && (
 <p className="mt-3 font-sans text-ui text-paper/85 leading-[1.5]">
 {entry.d.trim()}
 </p>
 )}

 {/* Parse (small, scholar-friendly) + Strong's badge */}
 <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-paper/10">
 <p className="font-sans text-caption text-paper/55 leading-tight">
 {token.p ? friendlyParse(token.p, t) : " "}
 </p>
 {token.s && (
 <span className="shrink-0 font-sans text-eyebrow font-semibold uppercase tracking-[1px] rounded-pill bg-paper/10 text-paper/80 px-2 py-0.5">
 {t("bible.strongsBadge", { n: token.s })}
 </span>
 )}
 </div>

 {!entry && (
 <p className="mt-3 font-sans text-detail text-paper/55 italic">
 {t("bible.noLexiconEntry")}
 </p>
 )}
 </div>
 );
}
