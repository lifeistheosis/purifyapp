/**
 * The reader emails' look, by version: the one place that says which look
 * the list emails (the Sunday email, the monthly note, the feast shop email,
 * a release letter) go out in.
 *
 * "1" was the look readers had from 2026-09: the night shell of
 * lib/email/layout.ts and the pieces of lib/email/blocks.ts. "2" is the
 * design kit's look (docs/brand/kit/email/, the Fable designer's, his yes of
 * 2026-11-13: "yes look"), drawn by lib/email/kitLetters.ts. A look that
 * replaces it bumps this in the same commit.
 *
 * THE FIRST-SEND GUARD (the arbiter's ask of 2026-11-13: "the first reader
 * email in the new look goes to him alone (ADMIN_EMAILS), and the automatic
 * sends to readers wait until he has seen one in his real inbox (a flag he
 * clears)"). When this differs from the look he last cleared on the owner's
 * desk, the first email that would go out by itself goes to him alone, and
 * nothing goes to readers by itself until he says he has seen it
 * (lib/admin/autoSends.ts). A send he presses from the panel is his own and
 * is not held. The owner's brief always goes to him.
 */
export const READER_EMAIL_LOOK: string = "2";

/** The look readers already have, which counts as seen until he clears another. */
export const LOOK_ALREADY_SEEN = "1";
