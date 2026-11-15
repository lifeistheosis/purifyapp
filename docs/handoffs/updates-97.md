# Baton: Updates 97 (a chapter's Community section, offline and at the foot)

Done 2026-11-15. Mend: `9139600d`, then `9f6b8936` and `46074d1f` (how an answer waits, found by the probe after the export). Brief: Arbiter 14. Runs: `docs/handoffs/updates-97-runners/` (one export, of `74dc0d0a`).

**Mended.** Updates 95's item 2 (Gate 4 group 2): from /history/alaska-mission/, "Matthew 28:19-20" moved the chapter's foot with no network, motion on.

## The cause, as proved

1. **The walks' record.** Read again from Updates 95's own JSON (`sum95.mjs` on its runs of `b20824d5`): every motion-on walk with no network, both readers, has `div[data-keep-scrolling]` "Mark 1 The next chapter opens when you r..." jumped 83 or 91px in one frame (21,0 to 21,83 or 21,91), 301 to 385ms after the tap. 4 of 4. Online, 0 of 2.
2. **The code** (`components/bible/ChapterDiscussions.tsx`, before `9139600d`):
   - `fetchCommunityPosts` answers `{ state: "error", unreached: true }` the moment a request has no answer (`lib/community/client.ts`, the catch around `apiFetch`), so offline the failure is back in the frame after the chapter arrives.
   - The component did `setLoaded({ ref, posts: res.state === "ok" ? res.posts : [] })`: every failure, and a dark feed (404), became an empty answer.
   - An empty answer is drawn as the quiet card: the heading, `bible.discussedNone` ("No one has discussed ..."), the start button. The section stands between the pager and the foot, so the foot fell by it.
3. **The rule's reach online.** The section was drawn the moment any answer came, wherever the reader stood. Online the walk's answer came after the glide, below the screen; a reader already at a chapter's foot (a short chapter, a jump to its last verses, a reader who has read down to it) would have seen it come in above KeepScrolling. Read on the export with `probe97.mjs` (below).

## The mend (`9139600d`)

- **A feed that cannot be reached draws no section and moves nothing.** Only the feed's own answer is kept: `if (alive && res.state === "ok") setLoaded(...)`. A failed, dark or unreached feed draws nothing, which is also truer offline.
- **An answer is drawn only while the section's place is below the screen** (the choice the brief offered: let it arrive below the screen). The place is read in a frame, at once and after every scroll or resize, and the section is let in when the place is below the screen (`top >= innerHeight`). A chapter read from its top gets it as before (its foot is far below); a reader at the foot gets it once the place has gone below the screen, so they never see it arrive. Nothing is drawn while the place is on the screen or above it (WebKit has no scroll anchoring, so a section let in above the screen would move the page on iOS).
- **`9139600d` used an IntersectionObserver; `9f6b8936` replaced it** after `probe97` on the export: a reader standing at Matthew 28's foot had the place a few pixels above the screen when the answer came, and a jump up carried it to below the screen without crossing it. An observer reports only crossings, so the section never came (nothing moved, but nothing arrived either). Read in a frame after every scroll, a jump is seen like a glide.
- **`9f6b8936` also asked for a quarter of a screen to spare; `46074d1f` took it out.** After the glide to Matthew 28:19 the place stands at y 1015, below the 844 screen but inside that quarter, so a reader who then reads down would never have had the section. With no margin it comes as it did before.
- **The place is kept from the first frame** by an empty holder, `<div ref={slot} />`, in the chapter's plain block column: no class and no children, so the margins run through it and the page is laid out as before.
- **Online the section is unchanged**: the same card, words and links. Only when it is let in differs, and only for a reader who stands where it would appear.
- Why not keep its place drawn from the first frame: the brief's other road. The section's height depends on the answer (none, one to three posts, the "see all" link), so a box drawn early would still change height, and offline it would have to stay empty or go.

## Test failing on the old code

`lib/bible/__tests__/chapterDiscussionsArrival.test.ts`, 4 cases. With the component put back to the old code and the test kept, 3 fail:

- a section only from the feed's own answer (no `res.state === "ok" ? res.posts : []`, one `setLoaded`);
- drawn only once its place is below the screen (the observer's rule, one `setPlaced`, the holder until then);
- the holder takes no room (no class).

The one that passes is the precondition: the section's own card and its quiet line for an answer with no posts, and no request while Community is off.

## Checklist

- typecheck **0**; eslint **clean** on the 2 changed files.
- `npm run test:unit` **exit 0**, the whole suite alone: files 1229 passed, 1 skipped; tests 15345 passed, 9 skipped.
- `npm run build` (web) not run: no CSS, server or shared file changed (one client component and a test).
- Again for each later change: `9f6b8936`, typecheck 0, the whole suite exit 0 (files 1229 passed, 1 skipped; tests 15345 passed, 9 skipped); `46074d1f`, SUITE3.
- The push guard passed each time (28s, then 1m 47s). `node scripts/gate/export.mjs` **exit 0** on `74dc0d0a` (the observer's version; one export, as briefed).

## The walk, after (export of `74dc0d0a`)

`walks97.sh` ran one walk at a time, with nothing else running: `--only /history/alaska-mission/ --controls "Matthew 28:19-20"`. Every walk reached and tapped the control, with 0 errors and 0 control errors. `sum97.mjs` prints every walk's line from the JSON.

| "Matthew 28:19-20", KeepScrolling moved | Updates 95 (`b20824d5`) | after (`74dc0d0a`) |
|---|---|---|
| no network, motion on, both readers | 4/4 (83 or 91px) | **0/4** |
| no network, reduced, both readers | 0/4 | **0/4** |
| online, motion on and reduced | 0/4 | **0/4** |

- The only findings are the two crossings each motion-on walk lists in passing, for the eye and not failures: the top bar over its plates row, and the reader pill over the tab bar (as Updates 89, 91 and 95 listed).
- The offline numbers hold for the head: with no answer every version draws only the empty holder. The online walk's answer comes after the glide, its place below the screen, so it is let in at once in every version.

## The probe (`probe97.mjs`, on the export)

Updates 95's probe with the section among the boxes it reads and a `feed` network: everything off the origin is cut but the chapter's feed, which answers at once (or after `--delay`) with the walks' one stand-in post in plain words. The reads are in the runners folder.

- **The old offline arrival, answered** (`export74dc-probe-a-matthew-feed-on.txt`): the chapter's first frame at sy 3211 with KeepScrolling at y 81, as Updates 95 read it offline, and the answer in at once. The section did not come then; it came during the glide, its place at y 912 below the 844 screen. KeepScrolling never moved.
- **A reader at the foot** (`export74dc-probe-b-foot-feed-on.txt`, `--end --delay 2500 --up 1500`): standing at sy 3211 when the answer came, nothing was drawn and nothing moved. After a jump up to sy 1711 the observer's version still drew nothing: the gap `9f6b8936` mends.
- **The head's code**, read on a copy-backed patch of the export's chunk (the observer swapped for the frame read, minified by hand; the chunk restored byte for byte after, `cmp`): at the foot nothing came and nothing moved, and after the jump up the section came in the next frame at y 1477, below the screen (`patched-nomargin-probe-b-foot-feed-on.txt`); on the arrival into Matthew 28 it came during the glide at y 912 (`patched-nomargin-probe-a-matthew-feed-on.txt`). With the quarter's margin it did not come after the glide (`patched-margin-probe-b-foot-feed-on.txt` holds the foot read with the margin).
- The reader pill's own settle (its row 1 to 15px, as the screen reaches the chapter's end) shows in every read, with and without the section. It is not the section and no walk reports it.
- Not a cut export: the brief allows one, so the head's code was read on that patch, not on a build of it. A dev server could not stand in: it has no Supabase key here, and only the export script may read one.

## Left

- **The next export carries `9f6b8936` and `46074d1f`.** Read on a patch of this one, not walked on a build. Its walk: the same command, offline and online, and `probe97.mjs` at the foot (`--end --delay 2500 --up 1500`).
- A reader who stands with the section's place on the screen and never scrolls up (a chapter that fits on one screen, Psalm 117) does not get the section on that visit. That is the choice: it comes in only where nobody sees it come.
- Updates 95's other left: on dev, the arrival on /history/alaska-mission/ replaced a list in the account's thread far below the screen. Not seen by the walks.
