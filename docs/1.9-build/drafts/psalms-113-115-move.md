# Readers' things on Psalms 113 to 115: the one-time move (DRAFT)

Fable's release check 1, M1. Waits for Edgar's word. Nothing here runs yet.

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

1. The SQL runs **in the 1.9 merge** (as a migration), or by hand just before
   it. Until then no 1.9 app or website has written anything, so every server
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

## To switch it on, on his yes

1. Copy the SQL into `supabase/migrations/` under a fresh 14-digit name that
   sorts last, and get his sign-off on it as a production data change.
2. Call `moveDevicePsalms` with a `localStorage` adapter at the very start of
   the app shell, before `components/profile/SyncOnMount.tsx` and
   `SyncBridge.tsx` pull, then take out the test that keeps it unused.
3. A Fable review before the merge (a change that moves readers' data).

## Checked

- `lib/bible/__tests__/psalmMove.test.ts`: 7 tests. The mapping agrees with
  the renumbering script's for every old verse. Each store moves. It runs
  once. A newer copy already at the new place stands. It writes no tombstone,
  and nothing in the app calls it.
- The SQL, run twice on a scratch PostgreSQL 16 with the real unique place
  indexes and seeded rows. All 45 notes on 113 to 115 moved with no collision
  (old 114:1 to 113:9, 114:18 to 113:26, 115:1 to 114:1, 115:10 to 115:1,
  115:19 to 115:10). Saved verses and chapters and their labels, a gathered
  verse, journal cards (old 115:9-11 became 114:9 and 115:1-2) and a shared
  page all moved. The second run did nothing.
