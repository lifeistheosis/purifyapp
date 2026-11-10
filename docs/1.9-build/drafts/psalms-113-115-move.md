# Readers' things on Psalms 113 to 115: the one-time move

Fable's release check 1, M1. His yes, 2026-11-09 ("And yes to all your 3
questions"; the third: move readers' notes to the new Psalm numbers on
release day). Switched on 2026-11-10: the SQL is the migration
`supabase/migrations/20261110001550_psalms_113_115_move.sql`, and the devices
move their own copies only once the server has moved its own
(`lib/bible/psalmMoveBoot.ts`).

## The device waits for the server (the arbiter's catch, 2026-11-10)

His Android test build syncs with production, where the server's rows stay in
the old numbering until release day. A device that moved its copies then
would push new-numbered rows beside the old ones, and the SQL would later move
those a second time. So:

- The SQL leaves a row in `public.data_moves`, which anyone may read (a select
  policy for the public key; nothing writes it from an app).
- As the app's code loads (`components/layout/RootFrame.tsx`) it asks for that
  row. Found: it moves this device's copies, once (the mark). No table, so no
  move made: it keeps the old numbering, as the server does, and asks again
  next time. No answer (no signal, an error): it moves nothing.
- Every sync of what carries a verse's number (notes and highlights,
  bookmarks, gathered verses, journal pages, what the reader keeps) waits for
  that answer and runs only when the device stands in the server's numbering
  (`lib/sync/gate.ts`, `canSyncPlaces`), so nothing is pulled before the move
  and moved after it, and nothing is pushed in the other numbering.

## Release day, the one step only he can do

**Just before the push to main, he runs the migration's SQL by hand in the
Supabase SQL editor** (the whole file, as it is). The merge's own run then
finds its row in `public.data_moves` and does nothing, so the move is safe
even if the integration's run fails or the deploy goes first. It goes in the
1.9 release checklist when 1.9 is formalized. Fable's final release check on
the merge commit reviews it (a change that moves readers' data).

## What happened

1.9 divides Psalms 113 to 115 as the Septuagint does (84a7bb9, his yes to the
sheet's 6). No word changed, only where each verse stands:

| Old | New |
|---|---|
| 113:1-8 | 113:1-8 (stays) |
| 114:1-18 | 113:9-26 |
| 115:1-9 | 114:1-9 |
| 115:10-19 | 115:1-10 |

A reader's note or highlight on old 114:4 now shows on another verse, and one
on old 114:10-18 or 115:11-19 points at a verse that no longer exists. His yes
accepted that a few notes would move. Fable recommends moving them properly.

## What is ready

1. **The server's rows**: `docs/1.9-build/sql/psalms-113-115-move.sql`. Notes
   and highlights, saved verses and chapters (with their labels), gathered
   verses, and the verse cards in journal pages and shared pages. It can run
   twice safely (a row in `public.data_moves`), and it leaves times as they were.
2. **Each device's own copies**: `lib/bible/psalmMove.ts`, `moveDevicePsalms`.
   Notes and highlights, saved verses, Remember's cards, journal verse cards,
   gathered verses and the last place read. It runs once on a device (the
   `purify:psalms113.moved` mark). It is not called anywhere yet, and a test
   keeps it that way until his yes.

## The order, which is what keeps anything from moving twice

1. The SQL runs **by hand just before the push** (above), and again in the
   1.9 merge as a migration, where it does nothing the second time. Until then no 1.9 app or website has written anything, so every server
   row is in the old numbering and the SQL can tell them apart.
2. Each device moves its own copies **once, at launch, before its first sync
   pull**. After that, the device and the server both use the new numbering,
   and sync carries on as before.

Two things the device move deliberately does not do:

- **No tombstones.** Once the server has moved, an old place is another
  verse's new place: a tombstone for old 115:10 would delete the row now at
  115:10, which is old 115:19's note.
- **No new times.** A device sends nothing it did not change, and an edit made
  later on another device still wins.

If the SQL ran after 1.9 is live, a row at 115:10 could be in either numbering
and nothing could tell which. So the SQL must not run late.

## What it cannot fix

- A note written in a **1.8 app** between the merge and the day that reader
  updates is written in the old numbering, after the SQL has run. It shows
  correctly in the 1.8 app. After the update it can show one psalm off. This
  is rare (a new note on these three psalms, in that window).
- **Remember on the server** (`user_kept`) is empty at the merge, since its
  table is new in 1.9, so only the devices hold Remember cards to move.

## Switched on (2026-11-10)

1. The SQL is in `supabase/migrations/` under `20261110001550`, which sorts
   after every file before it, the shared pages' own among them. Each table's
   statements run only where the table exists (`to_regclass`), so a table
   whose migration has not run yet holds nothing to move and stops nothing
   after it. `docs/1.9-build/sql/psalms-113-115-move.sql` is the same text.
2. `settlePsalmsMove` (`lib/bible/psalmMoveBoot.ts`) asks as
   `components/layout/RootFrame.tsx` loads, and moves this device's copies
   once the server's row is there; `canSyncPlaces` (`lib/sync/gate.ts`) holds
   every verse-numbered sync until it has its answer.
3. Fable's review rides its final release check on the merge commit.

## Checked

- `lib/bible/__tests__/psalmMove.test.ts`: 7 tests. The mapping agrees with
  the renumbering script's for every old verse. Each store moves. It runs
  once. A newer copy already at the new place stands. It writes no tombstone,
  and nothing in the app calls it.
- The guarded SQL with its read policy (2026-11-10), on a scratch PostgreSQL
  16, the public role reading the row once it ran: with every table
  and the real unique place indexes, run twice (every note moved, 45 at 45
  places; saved verses and chapters with their labels; gathered verses;
  journal and shared cards; a saint's paragraph numbered 114 untouched; the
  second run did nothing); and with only notes and saved verses, the other
  three tables absent, run twice (both moved, the absent tables skipped, the
  second run did nothing).
- The SQL as first drafted, run twice on a scratch PostgreSQL 16 with the real
  unique place indexes and seeded rows. All 45 notes on 113 to 115 moved with no collision
  (old 114:1 to 113:9, 114:18 to 113:26, 115:1 to 114:1, 115:10 to 115:1,
  115:19 to 115:10). Saved verses and chapters and their labels, a gathered
  verse, journal cards (old 115:9-11 became 114:9 and 115:1-2) and a shared
  page all moved. The second run did nothing.
