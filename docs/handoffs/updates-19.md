# Baton: Updates 19 (the voices: the first patch pushed, the second walked and held for his yes), 2026-11-13

Read this, `docs/NOW.md` and `docs/roles/fixer.md`. The record: `docs/1.9-build/notes/build-95.md`, note 25 (the paragraphs signed Updates 19). Before this: `docs/handoffs/updates-17.md`. Reports go to Arbiter 2 (session_01VuYTwbacb8geNS4VjyJwQh).

## His words that bind this work

- 2026-11-13 about 08:13 UTC: "I want everything fixed in v1.9 no pushing out to 2", and "Both" (the choice of voices in 1.9).
- 2026-11-13 about 14:29 UTC, "all recs": the phone's voices free for every reader, reading the whole Bible, the lives, the councils, history, theology and the works, never the prayers.
- "Every design is justified": his page carries a reason for each choice, and nothing designed ships without his yes.

## Done and pushed

- **Updates 17's first patch** (nothing new for a reader to see; two faults gone): `03e4aa8a` a call, Siri, an alarm or another app's music pauses the phone's voice at its word and it goes on after a call; `9b7714ba` no English Listen in the dock over a downloaded Bible's page, none on the website's pill over a licensed translation; `4e4047d4` the voices' library; `91d8fcd6` the record and the walk. Checks in the record and in the report to the arbiter.
- **The walk**, `scripts/gate/voices.mjs` (`dock` and `voices`), and its fixes (`a27ccaf3`, `e00ea028`). It reads which rule is in force from the tree (`VOICES_IN`, the `player.voice` words), so it serves before and after his yes.
- **A kit piece**, `.k-phone` (`7e446c37`): a still of a phone's screen takes the column on a phone and stands at 390 in the middle of a wide screen. The kit's check passes.

## Held for his yes

- **The patch:** `docs/1.9-build/drafts/build-95-note-25-voices.patch`, refreshed by this chat (one commit; it applies on `08bfdf8e` and after with `git am` or `git apply -3`). It is Updates 17's second patch with: the chapter pill carried onto Updates 18's cb1f2333 (Listen's button keeps cb1f2333's form and gains the Bible), and the gone line mended (Now Playing let it go as soon as it was set with the player closed, so it was never said; `playerOpenForGone` in `lib/listen/speech/speak.ts`, two tests failing on the patch before).
- **The stills:** `docs/1.9-build/notes/build-95/25-voices-*.png`, from the export of 670983035 (the patch applied), 390 wide at twice the pixels, Dark.
- **His page:** https://claude.ai/artifact/LTjMHqyrEvL3eyLJgX7qTL, with a reason for each choice, the stand-in voices named, and three points, each with the arbiter's recommendation: (1) on Android a notification or a navigation prompt does not pause the voice and Android does not lower it either, since the voice comes from the phone's speech service; recommended keep it so; (2) never over licensed translations; recommended yes; (3) Heart named "Heart" with "Purify's reading voice"; recommended yes.
- In this container only (gone with it): the local branch `updates-19-voices` holds the same change as two commits on 91d8fcd6.

## Next, on his yes (the next fixer, or this chat if open)

1. `git am docs/1.9-build/drafts/build-95-note-25-voices.patch` on the head (or `git apply -3`; resolve by keeping the head's form and adding the voices' part, as was done for cb1f2333).
2. The fix checklist: typecheck, the whole suite, eslint on the changed files, `npm run build` (shared files changed), `node scripts/gate/export.mjs` (the key under his "yes key always").
3. The walk on that export: fetch Heart's John 1 (`curl -o john-1.mp3 https://audio.purifyapp.net/read/john/1.mp3`), then `JOHN1_MP3=john-1.mp3 node scripts/gate/voices.mjs voices <shots> --stills-only` (32 checks, a few minutes) and the guards one per language and width, side by side: `node scripts/gate/voices.mjs voices --guard-only --lang en --size 390` and the five others (each takes over an hour on four cores: the pixel check over twenty palettes and looks is slow), and `node scripts/gate/voices.mjs dock`.
4. Push, record under note 25, and NOW's line through the arbiter. Apply his answers to the three points first: a no on (1) is a change in `PurifySpeechPlugin.java` (`setWillPauseWhenDucked` and a pause on `AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK`); a no on (2) or (3) is words or one rule.

## Checks on the held patch (this chat)

- The walk, `voices --stills-only`, on the export of 670983035: 32 checks, every new control tapped, all pass.
- checkMock with pixels, five palettes and fifteen looks, 390, 800 and 1032, English and Arabic: Genesis 1's pill passes everywhere; Now Playing (paused for the measure) passes at 390 and fails at 800 and 1032 only on two faults already in the app, untouched by the patch, named to the arbiter: the dim behind the docked player is `bg-black/55` (a typed black on Light), and the docked player stays on the right with a left edge in Arabic (`md:left-auto md:border-l md:translate-x-full`, components/player/NowPlayingSheet.tsx about line 196). Now Playing's Words view was not measured: unchanged by the patch, and its many lines over a picture take hours with pixels.
- The other states (the ••• sheet, the Voice sheet three ways, Now Playing with the gone line, the none state, the Russian pill, a saint's life): being measured when this baton was pushed (six walks, `--skip pill,cover,words`); their result is sent to Arbiter 2 and written here.
- `dock` under the new rule: not yet run; run it on the next export (`node scripts/gate/voices.mjs dock`).

## Gotchas

- The walk's browser has no PurifySpeech plugin; its speech is stood in (`STAND_IN_SPEECH`), a word every 250ms. What only his phone proves is in note 25's record.
- The walk answers the main web's own files from this checkout's `public/` (the app fetches a chapter's timings from purifyapp.net in the apps; without them Hear it says the title and a change of voice reads nothing). A save for offline is refused: the browser has no phone folder to play a saved copy from.
- While a voice reads, the page follows the verse and the dock draws in to its small pill: tap the dock's card controls before Listen, or scroll up first. Now Playing rises on the house curve: wait for it to rest (`atRest`) before a still or a pixel check.
- checkMock with pixels misreads text that moves or changes during its measure (Heart's ticking time once gave 2.57:1 on Stone, passing when measured again); a fail on one palette that passes on a re-run is that, a fail on every run is real.
- Note 22's held patch (`docs/1.9-build/notes/build-95/22-held.patch`) shares no file with this one; they meet in the player's ••• sheet, where Voice sits just above Ambience, and both sheets stand over the player.
