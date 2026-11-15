# Baton: Updates 95 (three arrivals that moved with no network)

Done 2026-11-15. Mend: `b20824d5`. Brief: Arbiter 14. Runs: `docs/handoffs/updates-95-runners/` (one export of `b20824d5`).

**Two of three mended (Gate 4 groups 1 and 6). Item 2 (group 2) is proved and not mended**: its cause is not item 1's, the mend is named under Left, and this chat was past 150,000 by its own count when it was proved.

## The causes, as proved

Read with `probe95.mjs`: a read in requestAnimationFrame running before the tap (as the walk's sampler), a MutationObserver, the layout-shift entries (the walk's "jump" is one of these, `scripts/gate/frames.mjs`) and the pictures' load and error events. Items 1 and 3 on a dev server under the apps' agent with motion pinned, every request off the origin cut and the website's history pictures too (the export asks the website for them). Item 2 on the export, since dev showed no shift there.

1. **The /history/ page settles 30px** (both lanes). The page reaches for the event's picture, at the website's address in the apps (`lib/history/media.ts`). Dev, / to /history/alaska-mission/, reduced:
   - t3797: the page arrives, the column (`div.mx-auto`, the walk's box) at y 72, the plate (whole, 348x494) at 72.
   - t3847: the AVIF fails; the plate swaps to the JPEG at the same size.
   - t3897: the JPEG fails. t3914: `EventPlate` returns null and its figure leaves the `div.mb-7` that held it.
   - t3947: the column goes from 72 to 102 (layout shift 0.48) and the account rises by the plate.
   - What stood in until then: the plate's frame, the picture's blurred preview and the credit. What the failure drew: nothing, and the empty holder's `mb-7` (29.75px at the 17px root) collapsed through it into the column's top margin. That is the 30px.
2. **Matthew 28:19-20 from /history/alaska-mission/** (motion on). Not item 1's cause. On the export, offline, the new reader and the open reader alike:
   - t2563: the chapter's first frame at sy 3211, the page left's scroll held at the chapter's end, KeepScrolling at y 81.
   - t2613: a section "Discussed in Community", "No one has ..." is added above KeepScrolling (`components/bible/ChapterDiscussions.tsx`).
   - t2630: the page is 205px longer (4055 to 4260) and KeepScrolling shifts from 0 to 91 (layout shift 0.158). Then the glide to the verse (sy 2173).
   - The page reaches for the chapter's Community feed (`fetchCommunityPosts`, the main web). Nothing stands in until it answers. Its failure (`error`, unreached) is drawn as the quiet card, as though the feed had answered with no posts.
   - Offline the failure comes back in the frame after arrival, while the page still stands at the chapter's foot with KeepScrolling on the screen. Online the answer comes after the glide, when the foot is below the screen, and a layout shift is only reported for what is on the screen. That is why online showed none.
   - Dev showed no section (Community is not switched on there) and no shift. With the history pictures let through on dev (the plate standing), the chapter's arrival was the same.
3. **Job's "Context for verse 1" and "5"** (reduced). The note reaches for the person's icon, asked of the website in the apps (`streamedUrl`). Dev, old code:
   - t2901: the name and feast at 89,645, beside the 60x60 square at 17.
   - t2934: the icon fails and `PortraitIcon` returns null (the `size-14` square is removed).
   - t2951: the name at 17,645. The square (56px) and the gap (12px) at the 17px root are the 72px.
   - What stood in: the empty square.

## The mend (`b20824d5`)

- `components/history/EventPlate.tsx`: a plate whose picture cannot come stays as it opened (frame, preview, credit).
  - A failed AVIF still falls back to the JPEG. A failed JPEG changes nothing. A picture already in before the page listened is shown at once.
  - The broken picture stays unseen (it never arrives) and still holds a whole plate's height. On dev the plate was 348x494 before and after both errors.
- `components/walkthrough/NoteFigures.tsx`: a note's portrait square stays, empty, when its icon cannot come.
- **Online nothing changes**: the pictures come and fade in over what stood in for them.
- **The offline look changes only where the pages moved.** A /history/ plate now keeps the picture's blurred colours and its credit offline instead of going. The event's peek sheet, the rail and the Thread draw the same `EventPlate`, so they keep theirs too. A walkthrough note keeps the empty square beside its person.
- Dev after, offline and reduced:
  - /history/alaska-mission/: both errors, the plate at 72 and the column at 72 throughout, no shift.
  - Job verse 1: the icon's error, the name at 89 throughout, no shift.

## Tests failing on the old code

`lib/ui/__tests__/pictureStaysOffline.test.ts`, 6 cases. With the two components put back to the old code and the test kept, 4 fail:

- the plate is never taken away (no failed state, no `return null`);
- a failed AVIF falls back to the JPEG, and a failed JPEG changes nothing;
- a picture in before the page listened is shown, and a broken one is left unseen;
- the portrait's square is never taken away from beside the name.

The two that pass are preconditions: the stand-in each keeps.

## Checklist

- typecheck **0**; eslint **clean** on the 4 changed files.
- `npm run test:unit` **exit 0**: files 1226 passed, 1 skipped; tests 15332 passed, 9 skipped.
- `npm run build` (web) not run: no CSS, server or lib file changed (two client components, a test, the runners).
- The push guard passed (30s). `node scripts/gate/export.mjs` **exit 0** on `b20824d5`.
- Not run: checkMock with pixels on the two screens offline. Nothing new is drawn: each keeps the stand-in it already drew while its picture was coming.

## The walk, after (export of `b20824d5`)

`walks95.sh` ran one walk at a time, with nothing else running: `--only` /, /history/alaska-mission/, /dictionary/ and /walkthroughs/job/1/ and `--controls` the six named links. That is the arrival from / into /history/alaska-mission/, "1782 Philokalia", "New Martyrs", "Matthew 28:19-20", "Hesychast councils" and "Context for verse 1" and "5".

- With no network: both readers, motion on then `--reduced`, twice each. That is 8 walks with every named control reached (9 tapped a walk), 0 errors and 0 control errors.
- Then `--online`, once per reader and lane: 4 walks, every control reached, 0 errors.
- `sum95.mjs` prints every walk's line from the JSON.

| finding | Gate 4 (no network, new reader) | after, no network (both readers) | after, online |
|---|---|---|---|
| /history/ arrival from /, 30px (72 to 102) | 3/3 each lane | **0/8** | 0/4 |
| "1782 Philokalia", "New Martyrs", "Hesychast councils", 30px | 3/3 motion on; reduced 2/3 | **0/8** | 0/4 |
| Job, "Context for verse 1" and "5", x 89 then 17 (reduced) | 3/3 | **0/4** reduced, 0/4 motion on | 0/4 |
| "Matthew 28:19-20", KeepScrolling shifted (motion on) | 3/3 (91, 134, 205px) | **4/4** motion on (83 or 91px, both readers), 0/4 reduced | 0/2 motion on, 0/2 reduced |

- Each motion-on walk also lists two layers crossing in passing on the chapter, for the eye and not failures: the top bar over its plates row, and the pill over the tab bar. These are the same crossings Updates 89 and 91 listed.
- The Matthew 28 shift is item 2, not mended (see Left). That it shows for the open reader too, offline, agrees with the probe: the reader makes no difference.

## Left

- **Item 2's mend** (group 2), in `components/bible/ChapterDiscussions.tsx`: draw the section only once the feed has answered.
  - Today it does `setLoaded({ ref, posts: res.state === "ok" ? res.posts : [] })`. The mend is `if (alive && res.state === "ok") setLoaded({ ref, posts: res.posts })`. A failed or dark feed then draws nothing, which is also truer: offline nobody knows that "no one has" discussed the chapter.
  - The test: the component sets its posts only from an `ok` answer.
  - Then a new export and the walk on /history/alaska-mission/ with "Matthew 28:19-20".
  - Online, the same section still arrives after the page. A reader at a chapter's foot with KeepScrolling on the screen (a short chapter, a jump to its last verse) would see it come in above KeepScrolling. The walks have not seen it.
- On dev, the arrival on /history/alaska-mission/ also replaced a list in the account's thread (the page 10253 to 10499 high), far below the screen. The walk has not seen it.
