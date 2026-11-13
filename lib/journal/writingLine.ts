/**
 * Keeping the line being written above the foot of the writing sheet
 * (components/journal/JournalComposer.tsx).
 *
 * The sheet's last field is tall, so a new page has room to be tapped on:
 * 30 percent of the screen as it stood when the sheet opened. Until build 95
 * the sheet kept that field's foot in view, and not its words. So on a page
 * with nothing written yet, when the keyboard came up and the sheet grew
 * short, it scrolled 74px to show the foot of an empty field, and Reflection,
 * Prayer and Question went up under the sheet's head before a letter was
 * typed (build 95 note 4, "some visual and ux bugs"; measured on the walk at
 * 390 by 844 with a keyboard of 320px: the kinds from 109 to 35, the head's
 * foot at 92).
 *
 * The line being written is where the words end, which is the field's foot
 * only once the words fill it.
 */

export type WritingLine = {
  /** The top of the field with the cursor, in the window. */
  fieldTop: number;
  /** Its foot. */
  fieldBottom: number;
  /** How tall its words are, set at the field's width: one line for a field with none. */
  wordsHeight: number;
  /** The foot of the part of the sheet that scrolls. */
  scrollerBottom: number;
  /** The room kept under the line. */
  room?: number;
};

/** How far the sheet scrolls to bring the last line of the words above its foot: 0 when it is there already. */
export function scrollForWritingLine({ fieldTop, fieldBottom, wordsHeight, scrollerBottom, room = 24 }: WritingLine): number {
  const lineBottom = Math.min(fieldBottom, fieldTop + Math.max(0, wordsHeight));
  return Math.max(0, Math.ceil(lineBottom - scrollerBottom + room));
}
