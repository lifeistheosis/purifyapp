"use client";

import { useEffect, useRef } from "react";
import type { Token } from "@/lib/bible/load";
import type { StrongsEntry } from "@/lib/bible/strongs";

// Friendly long-form labels for Robinson-Pierpont parse codes.
// Only the most common bits, enough so a casual reader can guess what
// the part of speech means.
const POS_LABELS: Record<string, string> = {
 N: "noun",
 V: "verb",
 A: "adjective",
 T: "article",
 D: "demonstrative",
 P: "pronoun",
 R: "relative",
 K: "correlative",
 I: "interrogative",
 X: "indefinite",
 F: "reflexive",
 S: "possessive",
 Q: "indefinite",
 C: "reciprocal",
 ADV: "adverb",
 CONJ: "conjunction",
 COND: "conditional",
 PRT: "particle",
 PREP: "preposition",
 INJ: "interjection",
 ARAM: "Aramaic",
 HEB: "Hebrew",
};

const TENSE_LABELS: Record<string, string> = {
 P: "present",
 I: "imperfect",
 F: "future",
 A: "aorist",
 R: "perfect",
 L: "pluperfect",
 X: "future-perfect",
 "2A": "2nd aorist",
 "2P": "2nd perfect",
 "2R": "2nd perfect",
 "2X": "2nd future-perfect",
};
const VOICE_LABELS: Record<string, string> = {
 A: "active",
 M: "middle",
 P: "passive",
 D: "deponent",
 N: "middle/passive",
 X: "middle deponent",
 O: "passive deponent",
};
const MOOD_LABELS: Record<string, string> = {
 I: "indicative",
 S: "subjunctive",
 O: "optative",
 M: "imperative",
 N: "infinitive",
 P: "participle",
};

/**
 * Render a friendly parse string from a Robinson-Pierpont code.
 * N-NSM -> "noun · nominative · singular · masculine"
 * V-AAI-3S -> "verb · aorist · active · indicative · 3rd person singular"
 * PREP -> "preposition"
 * ADV -> "adverb"
 */
function friendlyParse(code: string): string {
 if (!code) return "";
 // Top-level pos abbreviations.
 if (POS_LABELS[code]) return POS_LABELS[code];
 const parts = code.split("-");
 const head = parts[0];
 const headLabel = POS_LABELS[head] ?? head.toLowerCase();
 const pieces: string[] = [headLabel];

 if (head === "V" && parts[1]) {
 // Verb: tense + voice + mood (TVM) like AAI / RPP
 const tvm = parts[1];
 // tense may be two chars (2A)
 let tense = TENSE_LABELS[tvm[0]];
 let i = 1;
 if (tvm[0] === "2" && TENSE_LABELS["2" + tvm[1]]) {
 tense = TENSE_LABELS["2" + tvm[1]];
 i = 2;
 }
 const voice = VOICE_LABELS[tvm[i]];
 const mood = MOOD_LABELS[tvm[i + 1]];
 if (tense) pieces.push(tense);
 if (voice) pieces.push(voice);
 if (mood) pieces.push(mood);
 // Person + number (3S, 1P, etc.)
 if (parts[2]) {
 const pn = parts[2];
 const person = { "1": "1st", "2": "2nd", "3": "3rd" }[pn[0]] ?? null;
 const number = { S: "sing.", P: "pl." }[pn[1]] ?? null;
 if (person && number) pieces.push(`${person} ${number}`);
 else if (number) pieces.push(number);
 }
 } else if (parts[1]) {
 // Nominal: case + number + gender
 const caseGenderNumber = parts[1];
 const cases: Record<string, string> = {
 N: "nominative",
 G: "genitive",
 D: "dative",
 A: "accusative",
 V: "vocative",
 };
 const numbers: Record<string, string> = { S: "sing.", P: "pl." };
 const genders: Record<string, string> = {
 M: "masc.",
 F: "fem.",
 N: "neut.",
 };
 if (cases[caseGenderNumber[0]]) pieces.push(cases[caseGenderNumber[0]]);
 if (numbers[caseGenderNumber[1]]) pieces.push(numbers[caseGenderNumber[1]]);
 if (genders[caseGenderNumber[2]]) pieces.push(genders[caseGenderNumber[2]]);
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
 aria-label={`Word details: ${token.w}`}
 className="fixed z-50 rounded-lg border border-paper/20 bg-night-soft shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-4"
 style={{ width: POPOVER_W, left, top }}
 >
 <button
 type="button"
 onClick={onClose}
 aria-label="Close"
 className="absolute top-2 right-2 h-7 w-7 rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper flex items-center justify-center text-[14px]"
 >
 ×
 </button>

 {/* The word itself */}
 <p
 lang="grc"
 style={{ fontFamily: "var(--font-greek), serif" }}
 className="text-[22px] text-paper font-semibold leading-tight pr-7"
 >
 {token.w}
 </p>

 {/* Lemma (dictionary form) + transliteration */}
 {entry && (
 <p className="mt-2 font-sans text-[14px] text-paper/80">
 <span
 lang="grc"
 style={{ fontFamily: "var(--font-greek), serif" }}
 className="text-[16px] text-paper"
 >
 {entry.l}
 </span>
 <span className="text-paper/55"> · </span>
 <em className="not-italic text-paper/70">{entry.t}</em>
 </p>
 )}

 {/* Short gloss */}
 {entry?.d && (
 <p className="mt-3 font-sans text-[14px] text-paper/85 leading-[1.5]">
 {entry.d.trim()}
 </p>
 )}

 {/* Parse (small, scholar-friendly) + Strong's badge */}
 <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-paper/10">
 <p className="font-sans text-[12px] text-paper/55 leading-tight">
 {token.p ? friendlyParse(token.p) : " "}
 </p>
 {token.s && (
 <span className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-[1px] rounded-pill bg-paper/10 text-paper/80 px-2 py-0.5">
 Strong&rsquo;s G{token.s}
 </span>
 )}
 </div>

 {!entry && (
 <p className="mt-3 font-sans text-[13px] text-paper/55 italic">
 No lexicon entry found for this Strong&rsquo;s number.
 </p>
 )}
 </div>
 );
}
