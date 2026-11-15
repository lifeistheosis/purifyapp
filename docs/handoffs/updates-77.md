# Baton: Updates 77 (the community feed's jump as it opens, 1.9)

Written 2026-11-15 by Updates 77 (session_01VuYTwcWKu41iFQ8cqhCFRC), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Item: the community feed jumps as it opens (the pre-build gate's rule 1; Updates 72 once, Gate 3b 3 of 3). Touched: components/community/CommunityClient.tsx, lib/community/__tests__/feedFirstScreen.test.ts (new), docs/handoffs/updates-77-runners/ (new). Not touched: `.cv-card` and the other lists, app/globals.css (the post's rule lives in the component), FeedTabs, the scroll restoring code.

## Cause, proved

**The posts.** Every post was `content-visibility: auto` with `contain-intrinsic-size: auto 320px` (CommunityClient.tsx, the article's class, behind `supports-[overflow-anchor:auto]`). A post that may wait is laid out first at the placeholder, 320px and its 32px of padding, and only once the browser has judged it near the screen at its own height. Nothing inside it changes; the first post's shrink pulls the second up. The rule alone makes the step: on the export of the mend, putting the old rule back by a style sheet (and nothing else) brings it back, and taking it away leaves nothing (the measure, below).

Proved on the export of the mend (38610013d), with `feedwatch.mjs` (below) putting the old rule back through an adopted style sheet and changing nothing else (`door@en@4@1@old`), from the Chat door at 390x844, CPU 4x:

- Read in requestAnimationFrame, both posts first stand at 354px (post 1 at y 343, post 2 at y 698); 140ms later they are 273.3 and 294.2px and post 2 stands at y 617: 80.7px up, Gate 3b's numbers to the tenth.
- It was drawn, not only read: Chrome's layout-shift record has the line between the two posts painted at y 697 and then at y 616.
- The sign-in line and its link step 1px down in the frame the posts arrive.
- With the old rule left off (`door@en@4@1`), the same export reads 0 in every frame, in requestAnimationFrame and after paint, with no layout shift.

The posts drawn whole are those the first screen shows: at 390x844 two (post 1 at y 343, post 2 at y 617). Under the old rule posts 1 to 7 were drawn by nearness anyway, and the eighth on was a placeholder; under the mend posts 1 to 8 are drawn and the ninth on is still a placeholder until it comes near (the final heights of the direct open: eight real heights, then 354, 354, ...). The shortest post on the live feed in the scroll walk was 143.1px.

**The 1px step.** While the feed is read, the tabs' place is held by a skeleton row `h-11`: 44px with its line inside (border-box). The tabs that take its place (FeedTabs) are a row of `min-h-11` tabs with a 1px line under it: 45px. The sliders button in that row is 32px with a 6px margin, so the row is 45px for every reader, signed in or not. So everything under the row, the sign-in first, stepped down 1px as the posts arrived.

## Done, with hashes

- **38610013** (the mend and its test).
  - The first eight posts of the feed (`FIRST_SCREEN_POSTS`), the post a notification takes the reader to wherever it stands, and the post a notification brought back over the feed are drawn whole: no `content-visibility`, no placeholder. Every post after the eighth keeps both, so a long feed keeps its saving, and a placeholder there changes size off the screen, where the browser anchors the scroll. Eight is more than a phone's first screen holds (two or three posts at 390x844) and covers a tall window when the posts are short.
  - The tab skeleton is `h-[calc(2.75rem+1px)]`: a tab's `min-h-11` and the line, in step with the tabs if the root size ever changes.
  - No other look changes: a post drawn whole and one that waits look the same once drawn; the skeleton row is 1px taller while the feed is read.
- **The test**, lib/community/__tests__/feedFirstScreen.test.ts, reads the source as the house's community tests do and works out, from the feed's own expression, which of fifty posts are drawn whole (the first `FIRST_SCREEN_POSTS`, between 8 and 12, and the notification's post at 30 but not 31), that the placeholder and the waiting sit only behind `!whole`, and that the skeleton row is the tabs' height. On the old code all four fail (no `FIRST_SCREEN_POSTS`, no `whole`, the waiting on every post, `h-11`); on the mend all four pass.

## The checklist

- `npm run typecheck`: 0.
- `npm run test:unit`: 1205 files passed, 1 skipped; 15212 tests passed, 9 skipped.
- eslint on CommunityClient.tsx and the new test: clean.
- The new test on the old code (the component stashed): 4 of 4 fail; on the mend 4 of 4 pass.
- The push guard on 38610013: every check passed (stylesheet tests, typecheck, eslint, vitest related).
- `npm run build` (web): not run. No CSS file, server file or shared file changed: the change is classes and a prop inside the one client component. The export's own `next build` compiled the new classes.
- The export: `node scripts/gate/export.mjs`, cut from 38610013d, exit 0 (the anon key read into its own command and written nowhere).
- checkMock and the palettes: not run. No look changed but the tab skeleton's row, 1px taller while the feed is read.

## The after measure

On the export of 38610013d, 390x844, CPU 4x, online (the main web's live feed):

- **Gate 3b's tapwatch, the Chat door:** `chat@en@4@1`, `@2`, `@3` and `chat@ar@4@1`: moves of 1px or more on the opened page 0, 0, 0, 0, and moves under 1px 0 in all four. The only moves are on the old page, the tapped Chat door's own title and line on /discover/ 44 to 225ms after the tap, as before the mend.
- **At CPU 1, as Gate 3b read its before** (the arbiter's correction: the before was `chat@en@1@1..3`, not 4x): Gate 3b's tapwatch `chat@en@1@1`, `@2`, `@3` and `chat@ar@1@1` on the same export read moves of 1px or more on the opened page 0, 0, 0, 0 (the old page 3, 3, 3, 1: the tapped door). Gate 3b's chatcause reads `null`: no post's height changes in the 4s after the tap, where the before printed the 354 to 273.3px shrink. The runs above at CPU 4x read the same.
- **feedwatch, the Chat door after** (`door@en@4@1`): 0 steps in requestAnimationFrame, 0 after paint, no layout shift.
- **feedwatch, /community/ opened directly** (`direct@en@4@1`): no post changes height (both posts are first read at 273.3 and 294.2px). But everything under the page's head moves up 77px in five drawn steps between 1.7 and 2.1s (the sign-in line 17.2, 14.8, 12, 9.3, then the posts with it 23.8), with five layout shifts. That is not the placeholder: `directcause.mjs` shows the head's `community-door-place` (CommunityHead.tsx, the door to Pray together) going 60px to 35 to 19 with its margin 17 to 10 to 5. It keeps the switch's place while the app asks the website whether a prayer campaign is open, and a place kept for nothing closes on the house curve (app/globals.css, "The door to Pray together"). Through the Chat door none of it moves (tapwatch 0 on the opened page), so there the place is already settled when the page is drawn; I did not read which way. So the direct open does not meet "0px for the sign-in line", for a reason outside this item and outside my files.
- **The scroll walk** (`scroll@en@4@1`): /community/ opened, then scrolled by 300px steps to the end of the fifty posts and back to the top, read in every frame (1483). In requestAnimationFrame nothing a reader sees steps during the walk: no post on the screen changes height, and in the frames between steps nothing on the screen moves. The 8 steps and 3 layout shifts in that run are all the door's place closing as the page opened, before the walk began. The walk's after-paint read was not counted (a fault in my runner, fixed after the run: its paint samples did not carry the scroll); the requestAnimationFrame read and Chrome's layout-shift record, which has no shift during the walk, are the measure. Posts beyond the eighth were placeholders until they came near (the eighth on read 354px before the walk and their own heights after it).
- One export, no second: the first showed no fault in the mend.

## Second item: the shop's heart (the arbiter's word, 2026-11-15)

- **145e5202**. The heart on every piece (components/shop/FavoriteButton.tsx) said "Save this icon", in English, on a prayer rope and a cross too (Gate 3b heard it on the sold-out 33-knot rope). Its aria-label and title are now `t("saints.saveAria", { name: title })`: "Save {name} to your saved list" with the piece's own name, the words the saints' and the events' hearts already use (BookmarkSaintButton, BookmarkEventButton), in all 21 languages. No look changes. Then, at the arbiter's word (his brief had kept it), **2c0d4310**: the saved state, which said "Remove from saved" in English in every language, takes `t("saints.saveRemoveAria", { name: title })`, "Remove {name} from your saved list", as the saints' heart does; the test, extended, fails on 145e5202 (2 of 3), and the checklist passed again (typecheck 0, 15215 tests, eslint clean).
- **The test**, lib/shop/__tests__/favoriteHeartLabel.test.ts: no "this icon", the label through `saints.saveAria` with the piece's name for both aria-label and title, and those words with `{name}` in every language. On the old code 2 of 3 fail (the third holds the words that were already there).
- **The checklist**: typecheck 0; test:unit 1206 files passed, 1 skipped, 15215 tests passed, 9 skipped; eslint clean on both files. No export (the arbiter's word) and no web build (no CSS, server or shared file).

## Left, and for whom

- **For the arbiter to route (not mine to mend):** the door to Pray together's kept place closes on a direct open of /community/ when the website says no campaign is open (as it did for the runners' signed-out reader), moving the sign-in and the posts up 77px over about 400ms in drawn steps (above). Its comment calls the close deliberate; whether it breaks rule 1 is the arbiter's word. Its owner is CommunityHead.tsx and `.community-door-place`, with lib/community/__tests__/prayAndTalk.test.ts.
- **Not measured:** Back. The rule is by place in the list, so a Back that lands at the top of the feed draws the first eight whole like every other way in. A Back that lands deep in the feed lands among posts that wait; there the browser draws them as they come near and anchors the scroll. I did not walk it.
- **Not proved:** whether other `.cv-card` lists (the saints) jump the same way at their first frame. I read no list but the feed.
- The runners are in docs/handoffs/updates-77-runners/: `feedwatch.mjs` (both reads in every frame, the layout shifts, the before by a style sheet, the scroll walk) and `directcause.mjs` (what moves the feed on a direct open).
