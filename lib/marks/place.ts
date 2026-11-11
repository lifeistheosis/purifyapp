"use client";

import { readParagraphAnnotation, writeParagraphAnnotation, type ParagraphAnnotation } from "@/lib/saints/annotations";

import type { MarkPlace } from "./placeAttr";
import { parseTextKey, readTextAnnotation, writeTextAnnotation } from "./textAnnotations";

export { placeAttr, parsePlace, type MarkPlace } from "./placeAttr";

/** What is on the paragraph now. */
export function readAt(p: MarkPlace): ParagraphAnnotation {
  return p.kind === "saint" ? readParagraphAnnotation(p.saintSlug, p.workSlug, p.sectionN, p.paragraphIdx) : readTextAnnotation(p);
}

/** Keep this on the paragraph (dated now); nothing on it removes it. */
export function writeAt(p: MarkPlace, next: ParagraphAnnotation): void {
  const dated = { ...next, at: undefined };
  if (p.kind === "saint") writeParagraphAnnotation(p.saintSlug, p.workSlug, p.sectionN, p.paragraphIdx, dated);
  else writeTextAnnotation(p, dated);
}

/** The place a storage key names (lib/saints/annotations.ts, ./textAnnotations.ts), or null. */
export function placeOfKey(key: string): MarkPlace | null {
  const text = parseTextKey(key);
  if (text) return { kind: "text", ...text };
  if (!key.startsWith("purify:saint:")) return null;
  const [, , saintSlug, workSlug, section, paragraph] = key.split(":");
  const sectionN = Number(section);
  const paragraphIdx = Number(paragraph);
  if (!saintSlug || !workSlug || section === undefined || paragraph === undefined || !Number.isInteger(sectionN) || !Number.isInteger(paragraphIdx)) return null;
  return { kind: "saint", saintSlug, workSlug, sectionN, paragraphIdx };
}
