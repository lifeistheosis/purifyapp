/**
 * A study read one part at a time (1.8, round 3 r3-13, C's "one part at a
 * time" in the owner's hybrid of B and C): the parts are the essay's own
 * headings, and the Fathers' passages stand in the study where it rests on
 * them, as a deck at the end of their part.
 *
 * Where a passage stands, by the sheet's rule: after the first paragraph
 * that names its Father, so in the part that paragraph is in. A passage
 * whose Father no paragraph names stands at the study's end. The editors may
 * set a passage's place themselves (Quotation.placement in data/theology/
 * <slug>.json, a part's number or "end"), and theirs wins; none is set yet.
 *
 * Pure, so a test holds it without a page to draw.
 */

import type { EssayBlock } from "./load";

export type StudyPart = {
  /** The part's own heading in the essay. */
  heading: string;
  /** Its paragraphs. The first part also holds what comes before the first heading. */
  blocks: EssayBlock[];
  /** The passages that stand at its end, as indexes into the passages given. */
  passages: number[];
};

export type PlacedStudy = {
  parts: StudyPart[];
  /** The passages no paragraph names a Father of: "From the Fathers", at the end. */
  end: number[];
};

/**
 * The essay cut at its headings of the second level. What comes before the
 * first heading opens the first part, under that part's heading. An essay
 * with no heading is one part, with no heading of its own.
 */
export function splitParts(essay: readonly EssayBlock[]): Omit<StudyPart, "passages">[] {
  const parts: Omit<StudyPart, "passages">[] = [];
  let lead: EssayBlock[] = [];
  for (const block of essay) {
    if (block.kind === "heading" && (block.level ?? 2) === 2) {
      parts.push({ heading: block.text, blocks: parts.length === 0 ? lead : [] });
      lead = [];
      continue;
    }
    if (parts.length === 0) lead.push(block);
    else parts[parts.length - 1].blocks.push(block);
  }
  if (parts.length === 0) return [{ heading: "", blocks: lead }];
  return parts;
}

/** A name as a paragraph would write it: "St. Basil the Great" is "St Basil the Great". */
export function nameForm(name: string): string {
  return name
    .replace(/\b(Sts?|Ss)\.(?=\s)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a text names a Father by one of his names, whole: "St Basil the Great", not "St Basil". */
export function namesFather(text: string, names: readonly string[]): boolean {
  const plain = nameForm(text);
  return names.some((name) => {
    const form = nameForm(name);
    return form.length > 0 && new RegExp(`(^|[^\\p{L}])${escape(form)}(?![\\p{L}])`, "u").test(plain);
  });
}

/** The words of a block a reader reads as prose: a paragraph, a quotation, a list's items. */
function words(block: EssayBlock): string {
  if (block.kind === "list") return block.items.join(" ");
  if (block.kind === "heading") return "";
  return block.text;
}

/** One passage as the rule sees it: its Father's names, and the editors' place for it if they set one. */
export type PlaceablePassage = {
  /** The saint's name as the registry has it, and the name the source prints. */
  names: readonly string[];
  placement?: number | "end";
};

/** Every passage in its part, by the editors' place, else by the rule. */
export function placePassages(essay: readonly EssayBlock[], passages: readonly PlaceablePassage[]): PlacedStudy {
  const parts: StudyPart[] = splitParts(essay).map((p) => ({ ...p, passages: [] }));
  const end: number[] = [];
  passages.forEach((passage, i) => {
    const set = passage.placement;
    if (set === "end") {
      end.push(i);
      return;
    }
    if (typeof set === "number" && Number.isInteger(set) && set >= 1 && set <= parts.length) {
      parts[set - 1].passages.push(i);
      return;
    }
    const at = parts.findIndex((part) => part.blocks.some((b) => namesFather(words(b), passage.names)));
    if (at >= 0) parts[at].passages.push(i);
    else end.push(i);
  });
  return { parts, end };
}
