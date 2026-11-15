# Baton: Updates 97 (a chapter's Community section, offline and at the foot)

Done 2026-11-15. Mend: `9139600d`, then `7fd11890` (how an answer waits, found by the probe after the export). Brief: Arbiter 14. Runs: `docs/handoffs/updates-97-runners/` (one export, of `74dc0d0a`).

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
- **An answer is drawn only while the section's place is below the screen** (the choice the brief offered: let it arrive below the screen). The place is read in a frame, at once and after every scroll or resize, and the section is let in when the place is a quarter of a screen below the screen (`top >= innerHeight * 1.25`; the spare quarter covers a frame of a fling, whose scroll runs ahead of the page). A chapter read from its top gets it as before (its foot is far below); a reader at the foot gets it once the place has gone below the screen, so they never see it arrive. Nothing is drawn while the place is on the screen or above it (WebKit has no scroll anchoring, so a section let in above the screen would move the page on iOS).
- **`9139600d` used an IntersectionObserver; `7fd11890` replaced it** after `probe97` on the export: a reader standing at Matthew 28's foot had the place a few pixels above the screen when the answer came, and a jump up carried it to below the screen without crossing it. An observer reports only crossings, so the section never came (nothing moved, but nothing arrived either). Read in a frame after every scroll, a jump is seen like a glide.
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
- The push guard passed (28s). `node scripts/gate/export.mjs` EXPORT_RESULT.

WALK_AND_PROBE

## Left

LEFT
