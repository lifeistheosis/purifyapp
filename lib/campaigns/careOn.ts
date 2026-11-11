// Whether a moderator can send the care note (his yes to call 26,
// 2026-11-11): a short private note, in the writer's own inbox, to someone
// whose words may mean they are in danger. What it says is
// lib/community/careNote.ts; what writes it is ./careSend.ts.
//
// ON, from 2026-11-11, with the SQL that lets the database take the note's
// kind. The inbox's table checks the kind of every row, and "care" joins them
// in supabase/migrations/20261111023026_care_note.sql, which the owner signed
// that day and which runs with the 1.9 merge. The switch rides that file: the
// two reach production in one merge, the SQL first. It was built off, and
// lib/campaigns/__tests__/careShips.test.ts refuses it on without that file
// among the migrations, and off with it.
//
// Off, no button is drawn and the action is not a request at all. If the SQL
// has not run on a database this code meets, a send fails quietly and says
// so (./careSend.ts); nothing else of the page is touched.
//
// No secret is here. The server reads it; the screens do not: they draw the
// button only where the server's queue says the note can be sent.

export const CARE_NOTE_SEND: boolean = true;
