// An emoji used as an interface marker, drawn in the panel's ink.
//
// The tabs mark things with emoji: a category in the shop pickers, a stage in
// Fulfillment, a kind of task on the week's board, the subject of a card. The
// panel is one ink (app/admin/admin-theme.css, v6), and those markers were the
// only colour left on it, so a row of them read louder than the status beside
// it. Here each is set in the outline cut of the same emoji, which is a font
// like any other: it takes the colour and the weight of the text it sits in,
// in both themes and on the filled card. The face is loaded by
// app/admin/layout.tsx and applied by .adm-mark.
//
// MARKERS ONLY, and the line matters. An emoji a person typed (a customer's
// message, a review, a community post) and an emoji in copy that is about to
// be sent (the Drop tab's pieces) are content, and content is shown as it was
// written and as it will arrive. Nothing here reaches those: the outline face
// is applied by this component and by the Select's icon slot, never by the
// panel's font stack.
//
// No "use client": nothing here needs the browser, so a server page can use it.

import type { ReactNode } from "react";

// U+FE0F, the selector that asks for the colour form of the character before
// it. Built by number: this repo's editing tools turn a typed escape for an
// invisible character into the character itself, which no reviewer can see.
const EMOJI_STYLE = String.fromCharCode(0xfe0f);
// U+200D, the joiner inside a compound emoji.
const JOINER = String.fromCharCode(0x200d);

/**
 * The marker with its "draw me in colour" selector taken off.
 *
 * Needed because a browser treats that selector as an instruction to find a
 * colour font, and will pass over the outline face to do it. About a third of
 * the markers in the tabs carry one (a framed picture, a candle, an envelope)
 * and the rest do not (a memo, a box), so without this a list would come out
 * partly in ink and partly in colour.
 */
export function inkMark(mark: string): string {
  return mark.split(EMOJI_STYLE).join("");
}

export function Mark({ children, className }: { children: string; className?: string }) {
  return (
    <span aria-hidden className={"adm-mark" + (className ? ` ${className}` : "")}>
      {inkMark(children)}
    </span>
  );
}

// One emoji (with its selector, or joined to others) and the space after it,
// at the very start of a string.
const LEADING_MARK = new RegExp(
  "^(\\p{Extended_Pictographic}(?:" +
    EMOJI_STYLE +
    "|" +
    JOINER +
    "\\p{Extended_Pictographic})*)\\s+([\\s\\S]+)$",
  "u",
);

/**
 * A title that may open with a marker, as several card titles do (a truck
 * before "Free shipping over a threshold"). The marker goes through <Mark>;
 * the words are left exactly as they were.
 *
 * For a title that is a plain string. Anything else is returned untouched.
 */
export function withLeadingMark(title: string): ReactNode {
  const m = LEADING_MARK.exec(title);
  if (!m) return title;
  return (
    <>
      <Mark>{m[1]}</Mark> {m[2]}
    </>
  );
}
