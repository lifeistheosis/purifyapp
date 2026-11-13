# Now

The state of the work, in one page. The arbiter rewrites this at each change of state. The log is `docs/1.9-build/HANDOFF.md`, his words are `docs/1.9-build/BRAINSTORM.md`, and how the chats run is `docs/OPERATIONS.md`.

Updated 2026-11-13 19:01 UTC by Arbiter 3, rewritten to one page. What it held before is at d2fde152; the list of chats archived on 2026-11-13 moved to the log.

## 1.9 now

- **Everything in 1.9, nothing to 2.0** (his word, 2026-11-13 about 08:13 UTC: "I want everything fixed in v1.9 no pushing out to 2"). The drop day moves for it; none is set.
- **The last test builds passed the gate** (`docs/1.9-build/notes/gate-run-1.md`, from 6193982d5): build 96 on the android-release page (07:04 UTC) and on TestFlight. Much has landed since (the voices' first patch, the World English Bible, Gate 2.0's causes, the in-page faults), so **the next test build waits for the gate again** on the head's export, once the apply rounds and the fifteen screens are in. His notes on the current build go to `docs/1.9-build/notes/build-95.md`.
- **The main web** has only 1.9's canonical fix (c7cdc638c). Merge day is `docs/1.9-build/MERGE-DAY.md`; the 21 migrations are signed.
- **For his next phone walk** (the walks' Chromium cannot show these): Back on Discover's search; coming back from typing in another app; a field letting go of the cursor when Back closes the keyboard; the release APK walked before the AAB goes to Play (the safe-area patch, note 14, and the voices' plugin: screen off, both lock screens, ambience under the voice, the silent switch, the iPhone's 2x). Campaigns, Bible versions and links to the 86 new works need the website, so they work from the merge; the patron chooser offers 162 saints until then (270 after).
- **One gap, named to him:** no gate tool measures page-level sideways spill (phones clip it, so it would be cut off, not scroll). A measure goes into the nightly gate.

## Running

| Chat | Session | Holds |
|---|---|---|
| Arbiter 3 | session_01VuYTwajSPo1Rq2R34jWrk6 | his words, NOW, routing; from 18:55 UTC (Arbiter 2 archived by it before 19:00 UTC) |
| Updates 22 | session_01VuYTwcwrZdGSAQKSDTMEwD | from 18:21, from docs/handoffs/updates-21.md: the in-page faults by lib/ui/inPageMove.ts (Community 9, plans/acts 5, Today 3, prayers 4, pagers and tabs, the aria-expanded disclosures, /premium/ anchors, the two Terms lines, the council's Next); the calendar's wide grid on Cappadocian (4.40 and 3.78:1 at 800 and 1032); the profile card's 240px; causes 7, 8 and 9 |
| Updates 23 | session_01VuYTwZhTJ9z4k23jxRtLQC | from 19:00, the apply chat: the voices (note 25's patch) with Now Playing's two faults (bg-black/55 on Light; the docked player not mirrored in Arabic); note 23 with his two calls; the retention opt-in line in the welcome email. One page of stills for his look. Takes later design yeses while under 200,000 tokens |
| Fable: the 1.9 film's sample | session_01VuYTwbd5RZmjWw31fdhsiS | from 19:00: five seconds, 9:16, Today built by the app's own cards and buttons settling in, then one transition; on a page for his yes; writes in docs/plans/v1.9/video/sample/ |
| Fable: Orthodox America in 3D, second scene | session_01VuYTwbX9EgiUvadznNeBP1 | from 18:26, not 1.9: a new face for the numbers, no cut at 10 seconds, scene two; rendering at 18:55; past 200,000 tokens, so archived once its page is in |
| Company guide | session_01VuYTwcFgb1g1Py4mRbRNrD | LLCs, tax, Florida (no repository); waits on his two facts |

Every chat rotates at 200,000 tokens (OPERATIONS section 2).

## Waiting on him

1. **The design pages.** No recommendation: his taste. "designs yes", or the noes by name:
   - the fifteen screens, round 1 (five answers): https://claude.ai/artifact/7i93tDncctM4SU3qeqPjb4
   - Settings' row of modes and words (notes 18, 19): https://claude.ai/artifact/8FLKFQDUhaVExnP59vzjL3
   - the four land looks (note 16; Desert out, decided): https://claude.ai/artifact/QqnzGPTD41qdsX9EPnFMZr
   - the Share row on every work (note 15): https://claude.ai/artifact/DK83EpgvurR1W935GFVVyn
   - Discover's hold to reorder (note 9): https://claude.ai/artifact/FsbWs6XqM9qT8igd5gN5bj
   - the patron saint chooser (note 17): https://claude.ai/artifact/GFtBS2BJ29P7ZfeYCJqhmH
   - the ambience with photographs (note 22): stills in docs/1.9-build/notes/build-95/22-*.png
   - earning a look by reading (note 27): https://claude.ai/artifact/JvH8j4Pzs5doo957UuS46j
   - the Fast and the Journal (notes 3, 4, 6; three answers): https://claude.ai/artifact/CQvAy39zXXmA62dVXjj785
   - the emails, round 3 (the colours as drawn; the fast's calendar): https://claude.ai/artifact/PsWzPU7ycgdmGzFjzLYdz5
   - the 1.9 social cards: https://claude.ai/artifact/2H7zX18mPgJh9LMZnkw6bs (his yes clears the drop's `cards` piece)
2. **The voices' page was taken as a yes** in "all recs" (18:53 UTC): https://claude.ai/artifact/LTjMHqyrEvL3eyLJgX7qTL. Said to him in Arbiter 3's first message, so he can say otherwise.
3. **The two Fable samples:** the 1.9 film's five seconds, and the documentary's second pass (not 1.9; its full film on his yes, about 2 hours of machine time and no money).
4. **The company:** C0 (the D-U-N-S record's address), C0b (the papers), the company's exact name as the EIN letter has it; for the Company guide, how many owners and how it is taxed; Florida sales tax for EIKON (C3b); the EIKON trade name before Stripe shows it. Steps in OWNER-STEPS.md.
5. **Also:** the 22 permission letters; the Android notifications test; the owner's desk question 3 (a shop and sourcing chat after 1.9).

## Parked for his yes

Each held change is a patch in the repo. On his yeses the apply chat applies the approved ones together, with one export and one round of checks (OPERATIONS section 6).

| Note | The patch |
|---|---|
| 9, Discover's hold | docs/1.9-build/drafts/build-95-note-9.patch |
| 15, the Share row | docs/1.9-build/drafts/build-95-note-15.patch |
| 16, the land looks | docs/1.9-build/drafts/land-looks/held.patch (its README names Desert's part to drop; Desert's drawing kept once in kept/desert-look/) |
| 17, the patron chooser | docs/1.9-build/drafts/build-95-note-17.patch |
| 18 and 19, Settings | docs/1.9-build/drafts/build-95-notes-18-19.patch |
| 22, the ambience photographs | docs/1.9-build/notes/build-95/22-held.patch (decided with it at 14:29: the sea's photograph becomes Simonopetra; the Plus preview takes the photographs) |
| 25, the fifteen screens, round 1 | docs/1.9-build/redesign/round-1/held.patch. Then round 2 in a fresh Fable chat from docs/handoffs/fable-fifteen-screens.md, and note 28, the desktop revamp (his yes, 18:53), the computer's frame first |
| 27, earning a look | docs/1.9-build/notes/build-95/earned-looks/prototype.patch (on apply: the 13 earn.* lines in the other 20 catalogs, the whole suite, both native builds) |
| 3, 4 and 6, the Fast and the Journal | docs/1.9-build/held/fast-journal/fast-journal-look.patch (its README is the handoff; applies on df48a34cd) |
| The emails, round 3 | docs/1.9-build/drafts/emails-round-3/held.patch (applies on 774248d5). Decided with it at 18:53: Dark for everyone (the light scheme out of all nine), and the account and order emails' shell (lib/email/theme.ts EMAIL_THEMES.night) to Dark, with before and after stills. Also: the retention look wired; a look in real Gmail, Apple Mail and Outlook with the first send, which goes to him alone |

## Next, in order

1. Updates 23 pushes the voices, note 23 and the opt-in line, and sends one page of stills for his look.
2. On his design answers: the apply chat applies the yeses; the fifteen screens' round 2 in a fresh Fable chat; then note 28.
3. A fresh SSM chat from docs/handoffs/ssm-board.md once his design answers are in: seven Bibles in the drop's line, the store texts, Discord and board.json; the Holy Mountain's line; the count of looks after Desert; the voices' line; the Vault (the 1.8 kit page, the 1.9 film's first cut, the documentary's first film).
4. The whole 1.9 film once the screens are final, on his yes to the sample.
5. The gate again on the head's export; a test build to the android-release page and TestFlight (its build number read from the page before he is told); his walk as a new reader; the 1.9 note in his Admin queue; the drop day; merge day.

## After 1.9 ships

- The nightly gate's runner (a fresh Admin chat, docs/handoffs/admin.md), with the sideways-spill measure.
- The owner's desk, sections 2 and 3 (docs/handoffs/admin-panel.md). The money charts fill from the merge (plus_events); older history needs a RevenueCat key with the charts permission, which he would make.
- The store accounts move to the LLC (OWNER-STEPS C1 and C2, then C3 to C5).
- 1.9.1: campaign pictures and their legal steps (his word, 2026-11-11).
- Every chat rotates; HANDOFF, BRAINSTORM and PLAN close; a new NOW begins.

## Spend

His word at 15:38 UTC: "well we are fine but yes optimize of course". At 19:00 UTC every chat's seven-day limit reads "allowed_warning"; it resets 2026-11-20 08:00 UTC. Few chats, faults first, design work only on his yes, and a Fable run only on his word.
