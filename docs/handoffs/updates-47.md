# Baton: Updates 47 (the sheets, build 97 notes 8, 9 and 2)

Written 2026-11-14 about 17:45 UTC, stopping at the budget line: get_session read 60,766 all session long (it never moved, even between turns), so by Arbiter 8's rule (17:13) my own count of about 150,000 doubled is past 200,000.

## Role and scope

A fixer (docs/roles/fixer.md), from Arbiter 8's brief of 17:11: note 8, note 9, then note 2's jump and flash. Held lib/ui/useDraggableSheet.ts, components/share/PictureSheet.tsx, components/billing/plusTry/TryKit.tsx (TryKit was not changed).

## Done, with hashes

- **Note 8, 692bc56d4.** Cause: the sheet's body asked only about its own scroll (useDraggableSheet.ts, the old line 537, `dy > 0 && body.scrollTop <= 0`), so a thumb drawn down the Plus preview's Bible window, read part way, dragged the whole sheet and it closed. Reproduced with real CDP touch at 390 by 844 on a dev server: the window at 423 never moved, the sheet went 409px down and closed. Fix: lib/ui/sheetGesture.ts (roomUnder reads the room of every window under the finger as it lands; sheetTakes decides once, when the slop is passed; a window with room that way keeps the gesture to its end; no room leaves the sheet's old rules). The handle and header (pointer events) are untouched. Tests: lib/ui/__tests__/sheetGesture.test.ts (11; 2 fail with the old hook, the whole file fails without the module). Walk: scripts/sheet-scroll-walk.mjs, every Plus preview page with real touch. Old hook: FAIL, "moved 501, CLOSED" on the first page. New: all held, 11 windows that scroll walked both ways (cross-refs, profile and supporter-mark have no scroll), and a pull on the body where nothing scrolls still closes the sheet.
- **Note 9, 51e8a8168.** Cause: the tab panel's floor `min-h-[136px]` was shorter than Words. Fix: the three tabs share the panel's one grid cell (TabLayer; a tab not shown is invisible, aria-hidden and inert), so the panel is as tall as the tallest in any language and text size. Test: lib/ui/__tests__/pictureTabsStill.test.ts (3; all 3 fail on the old sheet). Walk: scripts/picture-tabs-walk.mjs (Today's verse card, Share, each tab, at 390). Old sheet, en: FAIL, edge 133.3 on Look and Size, 127 on Words. New, en and de: edge 127, title 164, picture 210.9 on every tab, at the phone's text size and at 1.3 times (Android's Largest).

## Open, each with its owner

1. **The checklist for notes 8 and 9** (next fixer, or the arbiter's export chat as Updates 49 did for Updates 48): the whole suite, typecheck and lint (the push guard ran typecheck, eslint and vitest related); the web build (useDraggableSheet.ts is shared); one export built as `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android` (the preview walk needs Plus sold); then `node scripts/sheet-scroll-walk.mjs` and `node scripts/picture-tabs-walk.mjs` with no address (they serve out/ like the shell; the picture walk does all 21 languages); checkMock `{ pixels: true }` on `[data-plus-try="ambience"]` (scripts/gate/ambience-sheet.mjs line 413 does it) and on the picture sheet's dialog, at 390, 800 and 1032, five palettes, fourteen looks, Arabic; the tabs and a preview page's Next tapped. Neither walk has run on an export yet.
2. **Note 2, not started** (next fixer). Leads, read only: JournalComposer.tsx keeps the writing line in view on `visualViewport` resize and focusin (lines 121 to 140); useDraggableSheet's reflow runs on `window` resize and a ResizeObserver and repaints the panel with transitions "none"; Sheet.tsx has a `keyboard` prop (half 1). Emulate the keyboard by shrinking the visual viewport; only his phone shows the real one (and the Capacitor keyboard's resize mode).
3. **For the arbiter's call:** at the phone's largest text the picture sheet reaches its 85% cap and Save and Share sit 46px below the fold on every tab (the old sheet: on Words only), reached by scrolling the body. The rule "the tallest tab's height" makes that so; shrinking the picture instead would be a design change.

## Other sheets with tabs (searched, named, not changed)

- components/bible/WordStudySheet.tsx: Old and New Testament tabs empty the list and load the other (read in the code, not measured). While it loads the sheet is short, so the reflow drops the half rest and paints at full; the top edge likely falls, then rises to full height when the list comes. The same fault, with a data list. Its owner: the next fixer, measuring first.
- components/community/profile/ProfileViewer.tsx with ProfileDoors: the doors change the sheet's height, eased on purpose (smoothHeight, build 95 note 13). Note 6's fixer, or his word.
- components/journal/JournalComposer.tsx: the kinds are radios with one height. Its whole content is `data-sheet-nodrag`, so note 8 never applied there: only the head drags it.

## Gotchas

- get_session's used_tokens did not move all session, even between turns. Count yourself and double it.
- A dev server needs dummy settings: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=walk-anon`, plus `NEXT_PUBLIC_REVENUECAT_WEB_KEY=walk` to lock Plus on the web (the plans page's Begin then opens the upgrade sheet). Use the app's user agent (NATIVE_UA) or "/" is the website's landing page, not Today.
- CDP `Input.dispatchTouchEvent` scrolls natively in this Chromium, so it is a real touch test; Page.setFontSizes does nothing here (the type is in px), so the picture walk scales the sheet's words itself.
- A probe run from the repo's root writes probe.png there; delete it.

## His words that still apply

- "fix those things. try and take into account usage also" (16:28).
- Note 8, about 16:16: "when you hold down to scroll on the Bible in this context and your thumb reaches outside the Bible (because you are scrolling down to read it starts closing the whole entire window)".
- Note 9, about 16:19: "notice how the words section move the UI up fix that".
- Note 2, about 16:01: "and it's a jump and a flash for the typing bug".
