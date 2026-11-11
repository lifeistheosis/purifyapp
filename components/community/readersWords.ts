/**
 * A reader's own words, wherever the app draws them outside the feed: the
 * name they chose, their parish, what they wrote under "About me".
 *
 * They are theirs: a long dash or a star a reader typed is not the app's.
 * scripts/mock-check.mjs cannot tell them from the app's words, so each place
 * that draws them says so on itself, and the check lists it instead of
 * failing. The feed has said so since the pre-build gate's first run
 * (components/community/CommunityClient.tsx, READERS_WORDS, on a post, its
 * title, a reply and a name); a reader's profile sheet did not, and the
 * gate's third run found a long dash in a reader's "About me" (2026-11-11).
 *
 * The same mark as the feed's, word for word:
 * lib/community/__tests__/profileReadersWords.test.ts holds the two
 * together. Spread on the element that holds the reader's words, and on
 * nothing of the app's own.
 */
export const READERS_WORDS = { "data-mock-allow": "sparkle emdash", "data-mock-why": "a reader's own words" } as const;
