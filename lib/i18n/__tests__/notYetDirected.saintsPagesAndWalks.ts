// The note 4 families the Updates chat marks (the arbiter's split, 2026-11-10):
// the saints, What's New, the legal and information pages, history, the
// dictionary, the calendar, the parish finder, the shop and the walkthroughs
// (with the liturgy guide). Each file named with how many of its elements say
// a language and not yet its direction (lib/i18n/__tests__/textDirection.test.ts,
// which reads this list beside its own). Kept apart so that the two chats never
// edit one file at once. Lower a count, or remove the line, in the commit that
// marks them; a count may only fall.
export const SAINTS_PAGES_AND_WALKS: Record<string, number> = {};
