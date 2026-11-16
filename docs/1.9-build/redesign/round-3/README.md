# Round 3: the journal's page, the chants door, You and Profile, the Bible's opening, Plus, a plan's page, the Voice sheet

Drawn 2026-11-15 and 16 by the Fable designer (session_01VuYTwZzdQrU9XZZ1P8snyX), started by Arbiter 14 at his word of 2026-11-15 about 22:06 UTC. The Voice sheet was added by the arbiter at 22:52 UTC (his word on the voices). The method is `../README.md`. Not approved and not applied: nothing here ships without his yes, a screen at a time.

## What `held.patch` stands on

The whole proposal as one diff against `ccr-07896cf2-bo0afd` at `a96345f91` (after Updates 98a, 98b, 98c and 98f). To stand it up: `git checkout -b held/round-3 a96345f91 && git apply docs/1.9-build/redesign/round-3/held.patch`. Never push that branch. The designer decided each screen; five builders fitted them to the code on worktrees of their own, and their commits were taken onto the held branch in the order below.

## The proposal, by screen

1. **The journal as its own page** (`app/(app)/journal/write/page.tsx`, `components/journal/JournalWritePage.tsx`, `WriteSheet.tsx`, `useSourceLabel.ts`, `lib/journal/openWriting.ts`, `JournalClient.tsx`, `PageBlocks.tsx`, `JournalComposer.tsx`, `lib/nav/backBar.ts`, `lib/analytics/screens.ts`, `.journal-add` in `app/globals.css`). A static route; back, the day, one Done; the reading's line, the kind as `.set-track`, a title and words with no box and no ring; one plus that opens one sheet (Verse, Quote, Cover, Highlight, More; Notebook, Tags, Font, Alignment); Quote is 98c's library search inside that sheet. No new word.
2. **The chants door** (`components/chants/ChantsDoor.tsx`, `lib/chants/shelf.ts`, `ChantCover.tsx`, `ChantsHome.tsx`, `components/mobile/PrayersMobile.tsx`, `app/(app)/prayers/page.tsx`). A shelf of the chants' covers, the name, the line, the chevron; no play mark. `FeatureBand` is left unused. No new word.
3. **You and Profile** (`components/profile/ReaderIdentity.tsx`, `components/you/LifeKept.tsx`, `components/profile/CommunityCardPreview.tsx`, `AccountFacts.tsx`, `lib/profile/myCard.ts`, `components/you/YouIdentity.tsx`, `components/mobile/YouMobile.tsx`, `YouRows.tsx`, `PickUpCard.tsx`, `KeptVerse.tsx`, `KeptShelf.tsx`, `components/today/StreakRow.tsx`, `ProfileHero.tsx`, `ProfileTabClient.tsx`, `PatronSaintPicker.tsx`, `PatronChooser.tsx`, `LocalProfileHero.tsx`, `AccountAuthGate.tsx`, `AccountTopBar.tsx`, `SecurityTabClient.tsx`). One identity piece on both pages; the patron saint where the sign-in address was; the life kept as one piece; the Community card drawn as the card; the account's facts under Account and security. No new word.
4. **The Bible's opening** (`components/bible/ChapterScreen.tsx`, `ReaderMoreSheet.tsx`, `lib/bible/commentaryHint.ts`, the chapter's `loading.tsx`, `app/globals.css`). The first verse of John 1 at 390 by 844: 49% of the screen before, 32% after, 24% once the note is read (`purify:bible:commentary-hint-seen`). The More sheet as one tray. No new word.
5. **Plus** (`components/billing/PlusParts.tsx`, `lib/premium/plusParts.ts`, `PlusPaywall.tsx`, `PlanScreen.tsx`). Nine specimens and five plain parts; a reader with no plan is sent to this page in the apps. Price, terms and button untouched. No new word.
6. **A plan's page** (`components/plans/PlanHead.tsx`, `app/(app)/plans/[id]/page.tsx`, `PlanClient.tsx`, `PlanTodayCard.tsx`, `PlanPath.tsx`, `PlansClient.tsx`, `components/citations/Marked.tsx`). The tile's picture carried in; words until a day is read, then the count and bar; the day's card with its sources folded under it; days in words. No new word.
7. **The Voice sheet** (`components/player/VoiceSheet.tsx`, `lib/listen/speech/recorded.ts`, `voiceKeep.ts`, `voiceChoice.ts`, `lib/player/preview.ts`, `components/player/PreviewButton.tsx`, `PlayerMore.tsx`, `en.json`, `ar.json`). Six new words: `player.voice.usWoman`, `.ukWoman`, `.usMan`, `.included`, `.notDownloaded`, `.downloadName`. Stand-ins are listed in `recorded.ts`'s header.

## What it meets of the others' work

- **Updates 98c**: the journal page uses its `LibraryQuote.tsx` (two props added, `inSheet` and `onStep`) and its search; `scripts/quote-library-walk.mjs` has its steps moved to the page and was not run. Its seven keyboard tests (`keyboardSlide`, `returnKeyboard`) read the safe-area patch as installed, so they need `npm ci` after its patch.
- **Updates 98a and 98f**: no file of theirs is changed. The Voice sheet's stills reach it through 98f's dock. `ChantCover.tsx` and `ChantsHome.tsx` gain one attribute each.
- **Updates 98b**: the Bible's books and translation sheets are untouched; only their triggers at the chapter's head are set into the small line.
- `app/globals.css` is shared by all; every merge was clean.

## For the build spec, on a yes

- Journal: a note on a verse or a Father's words opened from the Bible or a work still uses the old sheet; iPhone needs the plus's place above the keys; the keyboard walk on a phone.
- You and Profile: `AccountAuthGate` lets a kept session in with the page on every account screen (the carry needs it): a fixer should read that change with care, since it is in an audited area's neighbourhood. Edit opens the name only, as today. Offline the Plus mark by the name does not show.
- Plus: the header's Plus button opens the upgrade sheet, which keeps the old rows; `/premium` is still linked by the website's nav and sitemap.
- Plan: the plan's description shows only until a day is read; the books button overlaps the translation trigger's lowest 7px of touch room on the Bible's head.
- Voice: the three Plus voices need their recordings, samples, sizes and the download itself; the upgrade sheet has no voices row; no Remove for a downloaded voice.
- Tests the builders changed or wrote are in each commit of the held branch (`git log` on it, or the patch).

## Rebuilding the page

Cut both exports (`../tools/export.mjs`; the before from the working branch, the after from the held branch), then from the repo's root: `node docs/1.9-build/redesign/round-3/plans.mjs <scratchpad>`, `../tools/shots.mjs` for each plan (before into `<scratchpad>/b3`, after into `<scratchpad>/a3` with `--check`), `node docs/1.9-build/redesign/round-3/pics.mjs <scratchpad>`, `python3 docs/1.9-build/redesign/round-3/page.py <repo> <scratchpad>`, `node docs/1.9-build/redesign/round-3/check.mjs <scratchpad>/round3`, and publish to the same link with its `url`. The still lines for the journal, You and the Voice sheet are the builders' own (`journal-lines.json`, `you-lines.json`, `voice-lines.json`).

## Applied

His word at about 05:20 UTC on 2026-11-16: "finalize this build and it's drop kit and yes to all EXCEPT the Bible screen". Screens 2, 3 and 6 were applied by Round 3 apply B (session_01VuYTwc73BLRrRv2aMF7T3E), these screens' files only, byte-identical to the held branch's (the head had not moved in them), with only their own two sections of `app/globals.css`: `bf80d4cfd` the chants door, `088fb1d48` You and Profile, `5fab250a9` a plan's page, and `437ebc9be` the plan's sources folding open with the house's motion (the motion walk found the days under them jumping 28px at once). The account gate is safe as drawn: it lets in early exactly whom `resolveUser` lets in (`lib/auth/__tests__/accountGateKeptSession.test.ts`, a walk and a read-only probe). The record: `docs/handoffs/round-3-apply-b.md`. Screen 4 was his no; screen 7 goes in with the voice system (since dropped: see the end of this page).

## Applied (2026-11-16, Round 3 apply A, at his yes "yes to all EXCEPT the Bible screen")

Screen 1, the journal's page: 161d84b3 (with a verse's note on the page, opened from its verse with no Open back; a Father's words keep the old sheet), 0e75e05c (the verse-note walk). Screen 5, Plus: fed40e3c (the header's Plus button shows the same parts; a lock's row still leads its sheet). The hand-over: `docs/handoffs/round-3-apply-a.md`, with the checks and the one item left (the header's Plus pill in Arabic on six earned looks, scrolled).

## Screen 7 dropped (2026-11-16)

His word at about 22:35 UTC on 2026-11-16: "remove locally LLM voices and full drop and turn on campaigns etc (only leave one the standard prerecorded voices)". Heart's recording is the only voice: the phone's own voices are gone and Emma, Michael and Fenrir are dropped, so there is no voice to choose and no Voice sheet. Screen 7, the Voice sheet's redesign, is dropped and will not be applied; the sheet itself and every door to it (the player's Voice row, Now Playing, the root frame's mount) came out of the app with Updates 98r. `held.patch` stays here as it is, screen 7 in it (the Vault rule: nothing made is deleted), with `voice-lines.json` and its stills.
