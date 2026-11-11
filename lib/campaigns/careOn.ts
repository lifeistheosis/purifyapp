// Whether a moderator can send the care note (his yes to call 26,
// 2026-11-11): a short private note, in the writer's own inbox, to someone
// whose words may mean they are in danger. What it says is
// lib/community/careNote.ts; what writes it is ./careSend.ts.
//
// OFF, and it stays off until the database takes the note's kind. The inbox's
// table checks the kind of every row, and "care" is not one of them until the
// owner's SQL has run (docs/1.9-build/sql/care-note.sql, which moves into
// supabase/migrations on his sign-off and runs with the 1.9 merge). Before
// that the database would refuse the row. So while this is off no button is
// drawn and the action is not a request at all. The commit that moves the SQL
// turns this on, and lib/campaigns/__tests__/careSend.test.ts refuses it on
// without that file.
//
// No secret is here, so the server and the screens both read it.

export const CARE_NOTE_SEND: boolean = false;
