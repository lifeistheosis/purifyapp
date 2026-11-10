/**
 * The few names the Florilegium's screens share (1.9, build 89 notes 6 and
 * 12, "the Florilegium redesigned as one piece"): its first page, a
 * gathering, a starter's page, the card a reader without Plus meets, and the
 * Plus page's preview of it.
 *
 * The raised tray, its rows and their plates are the house's, first drawn
 * for Theology (app/globals.css, `.theology-tray`, `.theology-row`,
 * `.theology-plate`, `.theology-rule`) and worn by the four pages the owner
 * passed on 2026-11-10 (components/theology/wayStyle.ts). They are the
 * ground and the ink and their mixes, so they hold in every palette.
 */

/** The id of the page's own heading: its bar takes the name once this has gone up under it (MobileTopBar, revealTitleOn). */
export const FLOR_TITLE = "florilegium-title";

/** A part's name, in Lora, never a small label in capitals. */
export const FLOR_H2 = "font-serif text-[17px] font-bold leading-tight text-paper";

/** One raised tray of rows. */
export const FLOR_TRAY = "theology-tray overflow-hidden rounded-[20px] px-1.5 py-1";

/** A row of a tray: a place to go, or one thing to do. */
export const FLOR_ROW = "theology-row flex min-h-[60px] w-full items-center gap-3 rounded-[14px] px-2 py-2 text-start";

/** A row's glyph on its small raised plate. */
export const FLOR_PLATE = "theology-plate grid size-9 shrink-0 place-items-center rounded-[11px] text-paper/85";

/** A count at a line's end: small, in tabular figures. */
export const FLOR_FACT = "shrink-0 whitespace-nowrap font-sans text-[12.5px] tabular-nums text-paper/55";

/** A page's name, in Lora at title size. */
export const FLOR_H1 = "font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper";

/** The one small line under a page's name. */
export const FLOR_KICKER = "mt-1 font-sans text-detail text-paper/55";

/** The house's one white button. */
export const FLOR_BUTTON =
  "tap-press inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90";

/** A small thing to do beside a line: words, 44px to the finger, no outline of its own. */
export const FLOR_QUIET =
  "tap-press inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper";

/**
 * A field: its own fill, which lights when it is reached, and nothing round
 * it (CLAUDE.md, "No box around a tapped field"; app/globals.css, "A field a
 * finger or a mouse has reached"; the For the living sheet's own,
 * components/prayers/NameForm.tsx). The keyboard keeps its ring.
 */
export const FLOR_FIELD =
  "w-full rounded-[12px] bg-paper/[0.06] px-3.5 text-paper placeholder:text-paper/55 transition-colors focus:bg-paper/[0.08]";
