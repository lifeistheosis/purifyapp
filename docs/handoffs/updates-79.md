# Baton: Updates 79 (the round's leftover checks, 1.9)

Written 2026-11-15 by Updates 79 (session_01VuYTwe4qYEZSvijyyHnbaJ), a checks chat on the fixer card started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). No app code touched. get_session read 91,670 after the first turn and never moved after that (its updated_at stayed at 02:40), so the budget was kept by my own count. It reached the 150,000 line after step 9, so steps 6, 7 (the walks) and 8 were not started.

## Commits

- **a18d206e**: `scripts/gate/ambience-sheet.mjs`. `PREVIEW_ONLY=390[,800,...]` runs the Plus preview alone at those widths. The runner now says when checkMock ran against the preview's minute (from Try it) and when the lock's words came. On a fail it reads the failing line's box against the window's own clip.
- **this baton's commit**: `docs/handoffs/updates-79-runners/feed79.mjs` (steps 3, 4 and 9) and this file.

## The steps

| Step | Result | Measure |
|---|---|---|
| 1 | **PASS** | `npm run test:unit`, alone: exit 0 after 175s. Files 1207 passed, 1 skipped (1208). Tests 15,226 passed, 9 skipped (15,235). |
| 2 | **PASS** | `node scripts/gate/export.mjs`, cut from **a18d206e8** (the app is f637f7b8's): exit 0 after 115s, **206.0 MB on disk in 7,372 files, 75.3 MB packed** (ceilings 240 and 85). The key was checked to be the anon role, and is in the log nowhere. |
| 3 | **FAULT** (2 moves) | See below. |
| 4 | **PASS** | See below. |
| 5 | STEP5 | STEP5DETAIL |
| 6 | not started | the budget |
| 7 | code answered; walks not run | See below. |
| 8 | not started | the budget |
| 9 | **PASS** (the 3px is the runner's) | See below. |

### Step 3: the Arabic sign-in link on a direct open (390x844, CPU 4x)

`feed79.mjs out <jsonl> signin@ar@new signin@ar@keptno` (6 opens: 3 new readers, 3 with the door's no kept). The reads were taken in requestAnimationFrame, plus a MutationObserver on the link's words, `document.fonts` loadingdone and the layout shifts.

1. **A late string: the link is drawn with the English words first.** The DOM inserts the link as "Sign in" (x 151.6, 86.8 wide) at **1362ms** (new reader) and **1497ms** (kept no) after the open, while `<html>` is already `lang="ar" dir="rtl"`. About 120 to 150ms later its words become "تسجيل الدخول" (x 131.1, 127.7 wide). The left edge moves **20.5px**, the right edge **20.4px**, and the width grows **40.9px**, with top and height unchanged.
   - It was painted in 5 of 6 opens: the layout shift reads `A x 152->131 w 87->128`, scored 0.0103, at 1555 to 1841ms. This is the shift Updates 78 saw.
   - The bottom bar's labels change in the same shift (three spans at y 807: 28 to 76, 51 to 36, 35 to 24 wide).
   - The read in requestAnimationFrame never saw the English frame: its commit comes later in the same frame.
   - Cause: the client imports a language's words after the first render (`lib/i18n/client.ts:31`, `ar: () => import("./messages/ar.json")`). Until the import resolves, words are drawn from the English table. The key exists in Arabic (`ar.json:2289`, `community.signIn`).
   - This is the apps' direct open in a language other than English, and likely any screen drawn before that import resolves. Not mine to mend (lib/i18n).
2. **A face arriving: 1.4px each way.** One frame after the Arabic words, the link widens **2.8px**, centred (**dx -1.4**), at 1523 to 1872ms. That is just before `document.fonts` reports loadingdone for Noto Naskh Arabic and Noto Sans Arabic (1608 to 1934ms). In the one open where the faces had finished before the link's first frame (faces 2135ms, link 2364ms), there was no such move, and no English frame either.
3. Known, not new: the new reader's held place still closes (the sign-in line steps up 77px between 1.9 and 2.8s). That is Updates 78's case 1.

### Step 4: Back by a page link deep in the feed (CPU 4x, the no kept)

`feed79.mjs out <jsonl> back@1 back@2 back@3`: `/` first, then `/community/` (history 3).
- The only post among the 50 loaded with a link to another page was the **9th**: "Read about this day in the library", to `/saints/nektarios-of-aegina/`. None stood nearer the twentieth. The 9th still waits behind content-visibility.
- It was put in the middle (top 371, scrollY 2331), its link tapped, then `history.back()`.
- In 3 of 3 tries the reader came back to **top 371 at scrollY 2331: 0px off**. Nothing moved by 1px or more in the 6s after.
- The read in requestAnimationFrame showed one frame at scrollY 65 (266ms after Back) with the post at 2637, then 2331. The read after that frame's paint (a task queued from it) stands at **2331 and 371**: `lib/ui/returnPlace.ts` corrects the scroll in its own requestAnimationFrame callback, after mine, before the paint. So the first frame painted with the post shows it in its place.
- Before that, three frames (34 to 80ms after Back) stand at scrollY 65 with the post not yet drawn. What they show was not photographed.

### Step 5: the ambience preview at 390

STEP5BODY

### Step 7: the keyboard sheets

- **In the code: the same shared rule.** These all open a `<Sheet ... keyboard>`:
  - the campaign sheets: the change sheet (`CampaignChangeSheet.tsx:47`), the pictures' add sheet (`CampaignPictures.tsx:330`) and the report sheet (`CampaignReportSheet.tsx:72`);
  - the highlight names sheet (`HighlightNamesSheet.tsx:127`);
  - the florilegium picker (`FlorilegiumPickerSheet.tsx:124`) and living (`Diptychs.tsx:274`), the same path.

  `Sheet` passes `keyboardFoot` to `useDraggableSheet`, which holds the edge with `heldHeight` (`lib/ui/sheetKeyboard.ts`). Every sheet built on `useDraggableSheet` runs `holdFieldOnKeyboard` on its body, with no condition (`useDraggableSheet.ts:465-469`). Journal (`JournalComposer.tsx`) uses `useDraggableSheet` with `fill`: it has the field rule, but not the keyboard sheet's held edge.
- **Walks: not run** (the budget). Next step: in `scripts/keyboard-sheet-walk.mjs`, open the florilegium picker by a long press. That is a touchstart held past `LONG_PRESS_MS` on the verse's words (`components/bible/VerseRow.tsx`, the `p` with `data-own-press` and `onTouchStart={onWordsTouchStart}`, about line 803; the handler is about line 515). Then Gather, then "Begin a new gathering". The highlight names sheet opens from the Bible's highlight colours (`HighlightLegend.tsx` or `HighlightPicker.tsx`).

### Step 9: the feed's 3px as a profile opens deep in it

`feed79.mjs out <jsonl> prof@1..6`. The twentieth post was put in the middle (top 52.3, scrollY 6254) and its author tapped.
- With Playwright's `locator.tap()` (tries 1 to 3, as Updates 78 tapped): **3 of 3 moved 3px** (top 55.3, scrollY 6251, the document unmoved), at 115 to 165ms, in a frame with no scrim yet.
- With a finger at the control's middle (`touchscreen.tap`, tries 4 to 6): **0 of 3 moved**. The post stood at 52.3 and scrollY at 6254 in every frame, and the profile opened over it (scrim 1, blur 10px, the panel's top at 68).
- So the 3px is the runner's tap scrolling the control into view, not the app. Nothing to see under the scrim.

## Left, for the arbiter to route

1. **The late string (step 3)**: the apps draw English words until the reader's language is imported (`lib/i18n/client.ts`). Seen here on Community's sign-in link and the bottom bar, in Arabic. Owner: whoever holds lib/i18n. A test would show a stored language's words on the first frame of a direct open.
2. **The face's 1.4px (step 3)**: the Arabic faces arrive after the link is drawn. Same owner question.
3. **Step 6** (the journal placeholder): not started. mockrun60's `journal@390@en` opens it. Find the svg across "Write what is on your heart, or pray in your own", hide it, and run checkMock with pixels on the five palettes and the two earned.
4. **Step 7's walks**: as above.
5. **Step 8** (quote51 on a day whose headline saint has words): not started. Find such a day in the calendar data and fix the clock in the runner (`ctx.clock`), then run `docs/handoffs/updates-51-runners/quote51.mjs out <json> en`, then `ar`.

## Where things are

- `docs/handoffs/updates-79-runners/feed79.mjs`: `signin@<lang>@<new|keptno>`, `back@<n>`, `prof@<n>`, on the gate's export.
- `SELLS_PLUS=1 PREVIEW_ONLY=390 node scripts/gate/ambience-sheet.mjs <shots>`.
- Logs and JSON were in this session's scratchpad; the numbers above are the record.
