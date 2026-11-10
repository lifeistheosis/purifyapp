/**
 * The few names a way's page shares between its server frame
 * (components/theology/WayPage.tsx) and the parts drawn on the device
 * (StudyShelves.tsx), kept apart so neither pulls the other into its bundle.
 */

/** The id of a way's own heading: its bar takes the name once this has gone up under it (MobileTopBar, revealTitleOn). */
export const WAY_TITLE = "way-title";

/** A part's name on a way's page, in Lora, as the hub names its own ("Recently added"). */
export const WAY_H2 = "font-serif text-[17px] font-bold leading-tight text-paper";

/** One raised tray of rows, the hub's (TheologyLibrary's WaysRows, RecentStudies). */
export const WAY_TRAY = "theology-tray overflow-hidden rounded-[20px] px-1.5 py-1";

/** A count or a length at a line's end: small, in tabular figures. */
export const WAY_FACT = "shrink-0 whitespace-nowrap font-sans text-[12.5px] tabular-nums text-paper/55";

/**
 * The id of a leaf page's own heading: a topic, a heresy, an answer, the
 * Creed line by line (components/theology/LeafPage.tsx). Its bar takes the
 * name once this has gone up under it.
 */
export const LEAF_TITLE = "leaf-title";

/** Running words on a leaf page, at the size a study is read at (components/theology/StudyPartText.tsx). */
export const LEAF_TEXT = "font-serif text-[16.5px] leading-[1.7] text-paper/88";

/** The words a leaf page opens on, a step larger, as a study opens on its summary. */
export const LEAF_LEAD = "font-serif text-[17px] leading-[1.65] text-paper/90";

/** A Father's or a council's own words, set apart by their type alone (CLAUDE.md, "No side stripes"). */
export const LEAF_WORDS = "font-serif text-[16.5px] italic leading-[1.7] text-paper/88";

/** One quoted passage on its raised surface, as a study sets what the councils said (StudyCouncils). */
export const LEAF_CARD = "theology-tray rounded-[18px] px-4 py-4";
