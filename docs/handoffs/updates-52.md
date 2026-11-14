# Baton: Updates 52 (the sheets' rest, build 97 notes 2 and 9)

Written 2026-11-14 about 18:50 UTC, at the budget line. get_session read 91,680 until about 18:39, then 254,257 (cost $5.96): past the 200,000 stop line after item 1, so items 2 and 3 were not started.

## Role and scope

A fixer (docs/roles/fixer.md), from Arbiter 9's brief of 18:16: note 2's jump and flash, the Word study tab switch, the picture sheet's foot at 1.3x. Held components/journal/JournalComposer.tsx, components/ui/Sheet.tsx, lib/ui/useDraggableSheet.ts, lib/ui/sheetGesture.ts, components/bible/WordStudySheet.tsx, components/share/PictureSheet.tsx, scripts/picture-tabs-walk.mjs, scripts/sheet-scroll-walk.mjs. Changed only JournalComposer and useDraggableSheet among them; added lib/ui/sheetKeyboard.ts and scripts/keyboard-sheet-walk.mjs.

## Done, with hashes

- **Note 2, the journal's jump, 87d8d82e.** The app has no Keyboard plugin: the safe-area plugin pads the window by the keyboard (EdgeToEdge in MainActivity), so the web view itself grows shorter. Stood in that way at 390 by 844 (one resize of 300px), then Chromium's own step after such a resize, scrollFocusedEditableNodeIntoView (centre if needed in every scroller), stood in by `scrollIntoViewIfNeeded(true)`. On a page with a cover (his screenshots) the field went 476.3, then 417.3 (the sheet's own line rule, 59px, needed: the tapped line would be under the foot), then 217.3 a frame later (the WebView's scroll of the field's whole 253px box, 200px more; the cover gone). With no cover the WebView alone moved it 30px. The sheet's edge never moved (12.8). Mend: lib/ui/sheetKeyboard.ts, run by useDraggableSheet for every sheet's body: for 1.5s after a field takes the focus and 0.7s after each keyboard resize, the body keeps its scroll, moved only as far as the line being written needs; any other scroll is put back before it is drawn; a finger on the body lets go at once; typing past the foot keeps the line above it (the journal's copy of that rule moved here). Tests: lib/ui/__tests__/sheetKeyboard.test.ts (4; the file fails without the module), lib/journal/__tests__/build95.test.ts reads the rule's new home. Walk, `NATIVE=1 [COVER=1] node scripts/keyboard-sheet-walk.mjs http://localhost:3000 journal step 300`: old code FAIL (247.4 to 217.4; 476.3 to 417.3 to 217.3), new code ok (247.4 held; 476.3 to 417.3 held), also with the keyboard in eight steps; `FINGER=1`, a real touch drag up the body inside the hold, scrolled it 59 to 201 and it stayed. Checklist: typecheck 0; whole suite 1191 files, 15116 tests green; eslint clean on the changed files; the web build (below); the field tapped with real touch at 390.

## Open, each with its owner

1. **For the living's edge jumps** (next fixer, after the arbiter's yes; components/ui/Sheet.tsx, `keyboard`). Its panel is 733px, taller than the 544 the keyboard leaves, so as the keyboard comes its top edge rises from 110.6 to the cap at 12.8 in one frame and the name field from 266 to 168.5 (`NATIVE=1 node scripts/keyboard-sheet-walk.mjs <base> living step 300` fails on it). Every `keyboard` sheet taller than what the keyboard leaves does it (Diptychs, the florilegium picker, the campaign sheets). Proposed: the edge stays where it stood while the field still shows under it (the panel's max height becomes the frame's foot less that edge), and rides up as today otherwise; a short sheet rides up as it must.
2. **Build 97 item 2, Word study's tab switch** (next fixer): not started; measure the edge every frame across Old and New Testament at 390 first (Updates 47's reading of the code: the list empties, the sheet goes short, the edge falls then rises).
3. **Build 97 item 3, the picture sheet at 1.3x** (next fixer): not started. The arbiter's call: at the 85% cap, Save and Share held at the sheet's foot, the body above them scrolls, the picture not shrunk; extend scripts/picture-tabs-walk.mjs to measure Save and Share inside the viewport at 1x and 1.3x on every tab.
4. **The flash, likely native** (the arbiter's call; only a phone shows it). Android pads the window at the start of the keyboard's slide (the safe-area plugin's insets listener, no WindowInsetsAnimation callback), so the sheet's foot jumps up at once and the window's background (#101013, MainActivity) shows under it until the keys cover it: a dark band on a light palette. His screen recording, or a phone walk on a light palette, would say. Also seen, never drawn: on the keyboard's resize the hook's window-resize reflow measures the panel before React sizes its box, so the scrim's strip is set to 0px and back to 45px by the ResizeObserver in the same frame (useDraggableSheet `paint`, `window.innerHeight - height.current`). Harmless in Chromium's order; measuring the scrim from the panel's own top would remove it.
5. **The export side for note 2** (the round's checks chat): one export, checkMock `{ pixels: true }` on the journal's sheet, and the walk on out/ (it takes a base address; serve out/ or give it serveLikeTheShell as picture-tabs-walk has).

## Gotchas

- get_session's used_tokens stood at 91,680 for the first twenty minutes, then read 254,257. Count yourself and double it, and read it again before each new item.
- The walk needs a dev server with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=walk-anon`; COVER=1 adds a cover through More, Cover (Plus is open on a dev server with no RevenueCat key).
- A build started with `&` inside a Bash call dies with that call's shell; use the tool's background run.
- `page.setViewportSize` is the app's keyboard (the window shrinks); the export walk's stand-in (visualViewport only) is the website's. They differ: test the one the change is for.

## His words that still apply

- "fix those things. try and take into account usage also" (16:28).
- Note 2, about 16:01: "and it's a jump and a flash for the typing bug".
- Note 9, about 16:19: "notice how the words section move the UI up fix that".
