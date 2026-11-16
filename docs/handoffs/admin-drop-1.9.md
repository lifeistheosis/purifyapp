# Handoff: Admin, the 1.9 drop kit (2026-11-16)

Started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at 05:23 UTC for one job: the 1.9 drop kit, at his word of about 05:20 ("finalize this build and it's drop kit"). Nothing was sent, filed, bumped, merged or migrated. The owner sends.

The work is in `094d0cd2`; this hand-over is the commit after it.

## What changed

**The note** (`docs/plans/v1.9/patch-note-1.9.json`, written into `data/changelog/entries.json` and `patches.json` by `node scripts/release.mjs note 1.9`): 45 lines to 63, each under its Update Hierarchy category (fixes 23, saints 5, library 16, shop 2, perks 17; stats skipped, its reason unchanged and still true). The checklist `data/changelog/checklists/1.9.json` is complete and unchanged.

- From `note-lines-drafted.md` (the arbiter's call of 2026-11-14 06:16, "in, as drafted"): lines 2 to 9 and the earned palettes' change. Line 1 (the phone's own voices) stays out: build 98 note 1 settled the voices otherwise.
- From build 98's Done lines: note 2 (line 8 gains a sentence: every text read aloud listens as a chapter of the Bible does), note 5 (Quote searches the library: Scripture and your own words for everyone, the rest in Purify Plus, as `quoteNeedsPlus` decides), note 7 (a sentence on line 4: the books list names the Bible you are reading), note 8 (Now Playing's slide), notes 4 and 12 (the keyboard, said as Android's, since the mend is the Android safe-area patch), note 13 (a chant's words), note 14 (tab switches). Notes 6 and 9 mend what is new in 1.9 and need no line, as the journal's refinements did.
- From round 3, as designed (`docs/1.9-build/redesign/round-3/README.md`): screen 1 (the journal's page of its own), 2 (the chants door), 3 (You and your profile), 5 (the Purify Plus page), 6 (a plan's page). Not checked against the applied screens: the two fixers were applying them as this was written. Screen 4 is in no line (his no).
- The long note (`patch-long-1.9.json`): the journal's and listening's sections carry the new things, and one new section, "You, Discover and the way around".

**The drop** (`docs/plans/v1.9/drop.json`, `drop.md`):

- Points: the ten are unchanged. Seven are held word for word to `lib/whatsNew/releaseEmail.ts`, which this job could not edit.
- Also: seven new, each tied to a new line letter for letter (listening, the journal's page, Quote, sixteen reading modes, You and your profile, Discover, sharing a work).
- Pieces: the App Store's text carries the seven in its Also list (3,487 of 4,000); Community's post carries five (2,894 of 4,000). Google Play (465 of 500) and the Discord announcement (1,981 of 2,000) have no room and are unchanged. The board names only what is free and is unchanged.
- Never: "phone voice" and "phone's voice" kept with a new reason; "Fenrir", "Plus voices", "voices in Purify Plus" and "choose your voice" added. Not "Emma" or "Michael": a plain substring would catch lemma, dilemma and the Archangel.
- Three new steps in moment 1, each waiting: `step-round3-check` (the five round 3 lines and the Android keyboard line read against what is built), `step-voices-line` (the voices join the note only when live), `step-bibles-merge` (the seven Bibles probed on purifyapp.net after the merge, one download in his walk).

**The record:** `since-1.8.md` (a section for today) and `note-lines-drafted.md` (what went in).

## drop.mjs status, in short

1.9, carried by 1.9 (Android 0, iOS 0). 21 to go, 6 waiting, 0 done. No drop day. The check passes.

## What waits on what

| What | Waits on | In the drop |
|---|---|---|
| The five round 3 lines | the two fixers' apply, then a read against the export the gate passes | `step-round3-check` |
| The Android keyboard line | his walk of the next test build, on the release APK | `step-round3-check` |
| The voices (Heart for every reader; Emma, Michael and Fenrir in Plus) | the recording on GitHub's runners once his secrets are in, then the Voice sheet and the signed route in a build he walks | `step-voices-line`, the never list |
| Prayer campaigns | his account at the merge, every reader at his word (R5c) | `step-campaigns-line`, the never list |
| The Bible versions' downloads | the merge | `step-bibles-merge` |
| The cards | made again from the export the gate passes (they say six Bibles, and show screens from before round 1) | `cards` |
| The video | campaigns open to every reader, and the video itself | `video` |
| The note in his queue | the round 3 read, then his yes in Admin | `note-1.9` |

## Not proved, and why

- The round 3 lines: written from the designs, not from applied screens, which were not in this checkout.
- The Android keyboard line: only a phone draws those frames (build 98 note 4).
- The new lines were checked against the code where a word could drift (sixteen reading modes and the four families, `lib/reader/readingModes.ts`; the Holy Mountain's line, `settings.paletteHolyMountainHint`; Simonopetra, `lib/ambience/ambience.ts`; Quote's Plus rule, `lib/journal/libraryQuote.ts`). The rest stand on the Done lines in the record.
- The kit page (`.release-logs/drop/1.9/kit.html`) was written and is not committed, as the drop guide says. It was not published.
