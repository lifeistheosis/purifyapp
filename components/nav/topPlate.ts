/**
 * Every round button at the top of a screen that a page sets there: the way
 * back and whatever it puts opposite (•••, Share, Save), in the reader's
 * plates and in the overlay bar alike. The bar's own search, and the
 * website's menu, are drawn at the same h-11 w-11 (oneTopBar.test.ts).
 *
 * h-11, the house's 44px target (2.75rem, 47px on the app's 17px root), the
 * size the way back has had since build 88 note 5. Build 89 note 15, his
 * words: "not optimized (size and positioning)". The reader's ••• stood at
 * h-10 beside it, 43px against 47px. One size now, held by
 * lib/ui/__tests__/topPlates.test.ts.
 */
export const TOP_PLATE = "h-11 w-11 inline-flex shrink-0 items-center justify-center rounded-pill";

/**
 * Every mark on those buttons, at one weight: the way back's 20px chevron on
 * its 1.8 line. The save was drawn at 19px on a 1.7 line, the share at 18px.
 */
export const TOP_ICON = { size: 20, strokeWidth: 1.8 } as const;
