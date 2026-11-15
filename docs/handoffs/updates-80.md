# Baton: Updates 80 (a reader's own language and faces from the first frame, 1.9)

Written 2026-11-15 by Updates 80 (session_01VuYTwb6pGgC1iuuUYyPHjs), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). get_session read 91,721 after the first turn and never moved (its updated_at stayed at 03:18), so the budget was kept by my own count. It reached the 150,000 line after the push, so step 5 (the export and the measures) was not started. It is the next chat's first job, below.

## Commits

- **44d567fa**: the mend and its test (hash before any rebase; the push names the final one).
- This file.

## The cause, as proved in the code

1. **English first, on any screen but Today.** The apps are one document, the front door's (`scripts/lib/shell-server.mjs`), built in English (`lib/i18n/server.ts`: the export has no cookie). `components/i18n/LocaleBootstrap.tsx` corrects the language after hydration: it reads the stored choice (Capacitor Preferences, async), then `setLocale` imports the language's chunk (`lib/i18n/client.ts`, `loadClientCatalog`). Until that commit, `useTranslate()` reads the English table. The only hold on that wait was `LaunchLanguageGate`, and it wraps **Today alone** (`app/page.tsx:209`); the launch slate (`LaunchFrame`) is part of the front door's page too. A screen opened straight away (a link, a notification, Updates 79's direct open: `go()` pushes the router as soon as it exists) was drawn at once, outside any hold, in English. Updates 79's 20.5px move and the tab bar's labels are that.
2. **`<html lang="ar" dir="rtl">` while the words were English.** The only writes to `<html>` lang and dir are in `MessagesProvider.setLocale`, right after its `setState` and before React's commit. Updates 79 saw the English link inserted with lang already `ar`: a commit that mounted the link on its own update (the sign-in is read on the device: `authSettled`) landed before the commit carrying the Arabic table. There is no pre-paint script for the language (`app/layout.tsx` has six, none for it).
3. **The faces after the words.** Every script's face but Latin's is `preload: false` and `display: swap` (`app/layout.tsx`): Noto Sans and Noto Serif (Greek, Cyrillic), Noto Sans Arabic and Noto Naskh Arabic (Arabic, Urdu), Noto Sans Georgian and Noto Serif Georgian, Noto Sans Devanagari (Nepali), and DM Sans's latin-ext file (Romanian, Turkish, Polish, Hungarian letters). A browser asks for a face only when it first lays out a letter it covers, so the words were drawn in the fallback, then again in their face: the 2.8px.

## The mend

- `lib/i18n/client.ts`: `loadClientLanguage(code)` = the catalog, then `facesReady`: `document.fonts.load("400 1em <face>", <every non-ASCII letter the catalog draws>)` for each face variable next/font sets on `<html>`. The browser fetches exactly the faces whose unicode-range covers those letters, so it is right for all twenty languages with no table of whose face is whose. Bounded at `FACES_WAIT_MS` (1500), never rejects. English asks for nothing.
- `components/i18n/MessagesProvider.tsx`: `setLocale` commits only after `loadClientLanguage`, so the settled mark (set after that commit) now means words **and** faces. In the apps it wraps its children in `RouteLanguageHold`.
- `components/i18n/LaunchLanguageGate.tsx`: `RouteLanguageHold` suspends any screen but Today while the language is not settled (React `use()` on `languageSettledPromise()`, new in `lib/i18n/launchLanguage.ts`). The router's move is a transition, and a suspended transition keeps the screen it came from: the front door, under the slate. So the slate covers the wait and the screen is drawn once. Never on the server, never on the website (`IS_STATIC_EXPORT`), never Today. The settled mark's own deadline (2.5s) bounds it.
- Catalogs stay lazy: one chunk per locale, unchanged. No catalog words changed. English readers: `LocaleBootstrap` marks them settled without calling `setLocale`, so nothing waits and nothing is asked for.

## The test

`lib/i18n/__tests__/firstFrameLanguage.test.ts` (8 tests). On the old code 6 fail; the one that matters, "draws nothing until the language is settled, so no English word is drawn first", fails with `expected true to be false`: React's `prerender` drew the screen, in English, while the language was unsettled. The others: the words wait for their faces, asked with the catalog's own letters; English asks for nothing; the wait is bounded; the sample works for any script; the provider commits only after `loadClientLanguage`.

## The checklist

- `npm run typecheck`: **0** (the first run failed on three type errors in the new test alone, children passed as `createElement`'s argument; fixed with a typed props helper, which eslint also accepts; run again: 0).
- `npm run test:unit`, alone: **exit 0** after 264s. Files 1208 passed, 1 skipped (1209). Tests 15,234 passed, 9 skipped (15,243): Updates 79's 15,226 and the 8 new.
- eslint on the five changed files: **clean**.
- `npm run build` (web): **exit 0**, compiled, 6,526 of 6,526 pages generated. (Its one "[invest] live numbers unavailable" line is this container having no Supabase address, not the change.)
- Not run: the export (`build:android`), checkMock and the taps. Nothing drawn changed: no page, style or control, only when a screen is first drawn.

## Not done: step 5, for the next chat

Cut one export of the head (`node scripts/gate/export.mjs`), then measure cold, 3 opens each, reads in requestAnimationFrame: `/community/` and Today in ar, ru and ka, and English once.
- `/community/`: `node docs/handoffs/updates-79-runners/feed79.mjs <out> <jsonl> signin@ar@new signin@ar@new signin@ar@new` (the link selector does not depend on the language, so `signin@ru@new` and `signin@ka@new` work as they are). Expect the first frame of the link in the reader's words and face: no "Sign in", no move of 1px or more, and no layout shift from the words or the faces. The first frame should come later than Updates 79's 1362ms, by about the words' 120 to 150ms and the faces' load (their loadingdone came within about 0.3s of the words there), under the slate.
- Today: the same reads on the first `[data-route-content]` heading after the slate lifts.
- English once: is its first paint unchanged (Updates 79 has no English number; take one before and after if the budget allows, the before from an export of `a18d206e8`).

## The trade

In the apps, a screen opened straight away is drawn later than before, by the wait for the reader's words and faces, under the slate instead of in English. By Updates 79's numbers that is about 0.2 to 0.25s on the slowed phone; it is bounded at 2.5s. Not yet measured after the mend. Nothing changes on the website or for English readers.

## Found on the way, not mended

1. **The website's faces.** The website draws each page on the server in the reader's language, so it has no English flash. But its script faces are `preload: false` too, so a first visit may draw the fallback face and swap (the same 1 to 3px). `facesReady` runs only in `setLocale`, which the website does not use (its switcher reloads). A mend needs the face files preloaded for that request's language (next/font does not hand out their addresses) or a `display` other than `swap` for those faces, which trades a blank or a lasting fallback; not mine to choose without numbers. Not measured.
2. **The slate's stars may turn.** `LaunchFrame` places each star by `insetInlineStart`, and its comment says no one sees them turn because the splash is up until the language settles. Since 1.6 the phone's logo lifts at the cover's first paint, so `dir` flipping to rtl under a visible cover may move them. Not measured. A language pre-paint (beside the six in `app/layout.tsx`) setting `lang` and `dir` from a synchronous guess (a localStorage mirror of the applied language, else `navigator.languages`) would mend it.
3. **`setLocale` writes `<html>` lang and dir before React commits.** At launch that is now under the hold and the slate; on a switch from the language picker a frame may still show the old words in the new direction. Not changed.

## Where things are

- The mend: `lib/i18n/client.ts` (`loadClientLanguage`, `facesReady`), `components/i18n/LaunchLanguageGate.tsx` (`RouteLanguageHold`), `components/i18n/MessagesProvider.tsx`, `lib/i18n/launchLanguage.ts` (`languageSettledPromise`).
- The runner for step 5: `docs/handoffs/updates-79-runners/feed79.mjs`.
