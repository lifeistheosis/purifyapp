"use client";

import { readParagraphAnnotation, writeParagraphAnnotation, type ParagraphAnnotation } from "@/lib/saints/annotations";

import { readTextAnnotation, writeTextAnnotation, TEXT_KINDS, type TextKind } from "./textAnnotations";

/**
 * Where a paragraph's marks are kept, written on the paragraph itself
 * (`data-mk`), so the one selection tool of a page
 * (components/reading/SelectionTools.tsx) can read and write any paragraph
 * it is used on without knowing which page it is: a Father's work
 * (lib/saints/annotations.ts) or one of the other texts
 * (lib/marks/textAnnotations.ts).
 */
export type MarkPlace =
  | { kind: "saint"; saintSlug: string; workSlug: string; sectionN: number; paragraphIdx: number }
  | { kind: "text"; text: TextKind; slug: string; doc: string; sectionN: number; paragraphIdx: number };

/** A slug, as every page's is: no bar, no colon. */
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function placeAttr(p: MarkPlace): string {
  return p.kind === "saint"
    ? `saint|${p.saintSlug}|${p.workSlug}|${p.sectionN}|${p.paragraphIdx}`
    : `text|${p.text}|${p.slug}|${p.doc || "-"}|${p.sectionN}|${p.paragraphIdx}`;
}

export function parsePlace(attr: string | null | undefined): MarkPlace | null {
  if (!attr) return null;
  const parts = attr.split("|");
  const int = (v: string | undefined) => (v !== undefined && /^\d+$/.test(v) ? Number(v) : null);
  if (parts[0] === "saint" && parts.length === 5) {
    const [, saintSlug, workSlug] = parts;
    const sectionN = int(parts[3]);
    const paragraphIdx = int(parts[4]);
    if (!SLUG.test(saintSlug) || !SLUG.test(workSlug) || sectionN === null || paragraphIdx === null) return null;
    return { kind: "saint", saintSlug, workSlug, sectionN, paragraphIdx };
  }
  if (parts[0] === "text" && parts.length === 6) {
    const [, text, slug, doc] = parts;
    const sectionN = int(parts[4]);
    const paragraphIdx = int(parts[5]);
    if (!(TEXT_KINDS as readonly string[]).includes(text) || !SLUG.test(slug) || !(doc === "-" || SLUG.test(doc)) || sectionN === null || paragraphIdx === null) return null;
    return { kind: "text", text: text as TextKind, slug, doc, sectionN, paragraphIdx };
  }
  return null;
}

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
