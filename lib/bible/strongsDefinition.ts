/**
 * Splits a Strong's definition (`d` in strongs-greek.json) into the pieces
 * the reader sees styled differently.
 *
 * The lexicon writes a cross-reference as "G3588 (ὁ)", the Open Scriptures
 * form, which nests a parenthesis inside Strong's own: "(with G3588 (ὁ)) the
 * supreme Divinity". Split out, it can be shown as the Greek word with its
 * number set small after it: "(with ὁ G3588) the supreme Divinity". Hebrew
 * references ("H06865") keep only the number, without the zero padding.
 * Greek words the definition quotes (G712 "perhaps from ἦρι") are split out
 * too, so they can take the Greek face.
 *
 * The text itself is never changed: joining the pieces back in the lexicon's
 * own form gives the definition exactly.
 */

export type DefinitionPart =
  | { kind: "text"; text: string }
  | { kind: "greek"; text: string }
  | { kind: "ref"; lang: "G" | "H"; n: string; lemma: string | null };

const PIECE = /G(\d+)(?: \(([^()]+)\))?|H(\d+)|[\p{Script=Greek}̀-ͯ]+/gu;

export function splitDefinition(d: string): DefinitionPart[] {
  const parts: DefinitionPart[] = [];
  let at = 0;
  for (const m of d.matchAll(PIECE)) {
    const i = m.index ?? 0;
    if (i > at) parts.push({ kind: "text", text: d.slice(at, i) });
    if (m[1]) parts.push({ kind: "ref", lang: "G", n: m[1], lemma: m[2] ?? null });
    else if (m[3]) parts.push({ kind: "ref", lang: "H", n: m[3], lemma: null });
    else parts.push({ kind: "greek", text: m[0] });
    at = i + m[0].length;
  }
  if (at < d.length) parts.push({ kind: "text", text: d.slice(at) });
  return parts;
}

/** The parts back in the lexicon's own form. */
export function joinDefinition(parts: DefinitionPart[]): string {
  return parts
    .map((p) => {
      if (p.kind !== "ref") return p.text;
      if (p.lang === "H") return `H${p.n}`;
      return p.lemma ? `G${p.n} (${p.lemma})` : `G${p.n}`;
    })
    .join("");
}

/** A reference's number as the reader sees it: "G3588", "H6865". */
export function refLabel(p: Extract<DefinitionPart, { kind: "ref" }>): string {
  return `${p.lang}${Number(p.n)}`;
}
