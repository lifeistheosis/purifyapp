/**
 * The languages whose headings break a long word where the language's
 * hyphenation allows (app/globals.css, "A heading's long words stay inside a
 * phone's width"; 1.9, build 90). Measured at 320px in all 21 languages on
 * the pages with the largest headings (Today, the Bible, the prayers,
 * Discover, You, Theology, the Creed, the councils, the reading room, the
 * saints): only German's and Georgian's own words ran past their box.
 * lib/ui/__tests__/longHeadings.test.ts holds the stylesheet to this list, and
 * the export walk's section 61 measures these languages at 320.
 */
export const LONG_HEADING_LANGUAGES = ["de", "ka"] as const;

/** The pages the walk measures them on: the ones with the largest headings, and the saints' cards. */
export const LONG_HEADING_PAGES = ["/", "/prayers/", "/discover/", "/theology/", "/theology/creed/", "/councils/", "/saints/"] as const;
