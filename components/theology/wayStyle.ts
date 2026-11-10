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
