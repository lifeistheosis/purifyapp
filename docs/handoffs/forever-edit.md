# The Forever edit: the hand-over

Written 2026-11-21 by the worker chat started for this one job ("Purify promo: the Forever edit", session_01VuYTwZkhGTEyJ8suxQiF6d). The brief is `docs/plans/v1.9/video/release/forever-edit-prompt.md`.

**Status, 2026-11-21 about 23:35 UTC: the storyboard is made and published, and waits for his yes or no. No film is rendered. No credits spent.**

## The page

https://claude.ai/artifact/4Lp3SBagwRwLi5d8QtVd2B (version 1). Private to him. Twelve stills: one for each of the eleven rows of the cut, and one more that shows how a bar's title lands. Each has its time, the hits it lands on, its reason, and its title's words with their source.

## His words in this chat (verbatim, UTC)

- About 23:35, on the storyboard: "When I say edit, I'm referring to a whole new approach. It's not promo for the app, but it's like an edit. It's like just search up like black pill edits. Search up like, yeah, black pill edits are the best example. So make like black pill purify with like high retention topics like we talked about, like ecumenism, even the filioque. Actually, don't do filioque, just do like polytheism stuff."

At that word: the storyboard above is set aside (kept, for the Vault; nothing deleted). One search was made. Nothing new is made yet: a plan was put to him in chat for his yes, since the words are doctrinal (a stop condition) and the film's rule on sourced words still binds. The plan: no app screens, icons and Scripture only; every line on screen verbatim from Scripture or a Father in the app's own library, cited; a question for the hook; nothing that names or attacks a person; Purify's mark only at the end.

- About 23:40, to the plan: "But yeah, the black pill sounds like a gritty, like high effects type of edit with clean cuts."

At that word: the style is taken as gritty and heavy with effects (grain, hard contrast, shake on the hits, flash frames, fast zooms), with hard clean cuts on the measured hits. He has not yet said yes to the plan's lines or named the account that posts it; nothing is made.

- About 23:45, to the lines (the hook, Psalm 96:5, 1 Corinthians 10:20, Ephesians 4:5, St Cyprian, John 14:6) and the question of which account posts it: "yes, separate account, make the storyboard"

At that word: the new storyboard is made and published, https://claude.ai/artifact/C4rmkeUGKs5mEaLw5rnDpQ (version 1), private to him. It waits for his yes or no. No film, no credits.

- `release/blackpill-board.mjs`: eleven rows on the same measured hits, no screen of the app. Hard black and white icons with grain, words one line to a beat in the app's sans, colour coming back once on the last swell, Purify's mark alone on the last hit. `release/blackpill-page.mjs` makes its page.
- Every line but the hook is checked by the script, word for word, against the app's own files: Psalm 95:5, 1 Corinthians 10:20, Ephesians 4:5, St Cyprian (On the Unity of the Church), the Creed's line on the Church (`lib/councils/creed.ts`, added by me, his to strike), John 14:6.
- **The Psalm differs from what he said yes to.** I offered "are idols" (King James, Psalm 96:5). The app's Old Testament is Brenton's Septuagint, where it is Psalm 95:5 and reads "For all the gods of the heathen are devils: but the Lord made the heavens." The app's text is used, and the page says so.
- Pictures: eight icons from the app's own bundle, none on the heritage list (the script refuses one that is), none a modern painter's work (the app's icons of St Cyprian and St Mark of Ephesus are modern and were left out). They are small files enlarged; larger public-domain copies are wanted for the film.
- `mock-check --self-test` passed earlier in this chat; `blackpill-board.mjs --check`: all eleven stills pass.
- Still open, and his: a priest's yes before it goes out (the editorial rule on doctrinal framing); the song's licence (the file stays silent, the sound is added in the app on the separate edits account); whether the mark stays at the end.
- Cost so far by my own count: the chat's context is about 230,000 tokens. The film is estimated at 200,000 to 300,000 more.

- About 23:55, on the new storyboard: "Honestly, this is good, but just make the effects grittier. Make sure it adds, I don't know, what should you add actually for like a cool effect, right? Like cinematic effect. Because yes, we're gonna add like a I don't know if we should add a gritty filter, but like I don't know, what should we add to make it better?"

At that word: answered in chat with a short list and one recommendation (heavier moving grain with dust and scratches, crushed blacks, a slight colour split on the hits only, a shake and punch in, flash frames under three a second, a short blur on fast moves; no glow, no rays, no lens flare). Nothing made; it waits for his yes.

The chat was started by the ad stage 1 chat at his word there, about 23:08 UTC: "start a fresh chat with it" (`docs/handoffs/ad-stage-1.md`).

## This overlaps with another chat

"Purify 1.9 ad: the release film" (session_01VuYTwdjxDrv3qHjVwVdhve, `docs/handoffs/ad-cinematic.md`) made a 21.4 second release film cut to another track. This edit is a second film of the same release to a different track. The two were not coordinated. He can keep one, or both for different posts. This edit uses that film's stage (`release/board.mjs`, not changed) and its phone.

## What was made

- `docs/plans/v1.9/video/release/forever-board.mjs`: the cut as `ROWS` (each row's time, measured hits, the still's moment, the phone's stand and the reason), the words and their sources, and the stills. `--check` runs checkMock on every still.
- `docs/plans/v1.9/video/release/forever-take.mjs`: the one new take, the Fathers on the verse (Genesis 1, a tap on verse 1's commentary mark, St Basil the Great).
- `docs/plans/v1.9/video/release/forever-page.mjs`: makes the page from the rows and the stills.
- Nothing under `ad/`, `app/`, `components/`, `lib/`, `android/`, `ios/` or `supabase/` was changed.

## What was measured and checked

- The export: main `6700c2e65`, cut in a worktree with `scripts/gate/export.mjs --platform android`, exit 0.
- Eight takes, all "ok", a new reader with no Plus, Dark, Sunday 6 December 2026: `ad/take.mjs today` and `journal` (86 and 83 words, word for word after the build), `record.mjs verse`, `release/take.mjs` (the Bibles), `release/forever-take.mjs` (the Fathers), `record.mjs saints creed pray`. All at `VIDEO_SHARP=4`; the verse, the Bibles and the Fathers at `VIDEO_SLOW=12`.
- John 14:6 reads in `data/bible/john/14.json` word for word as the brief has it; the script refuses to run if it does not.
- `mock-check --self-test` passes, then `forever-board.mjs --check`: all twelve stills pass.
- The page at 390 wide: no sideways scroll.

## Where the storyboard differs from the brief (each named on the page, each his to overrule)

1. **No glow behind the hook, the verse or the end card.** The brief put the verse in a pool of light. His word on the release film, 2026-11-21 about 01:32: "It's just the glow. The glow looks vibe coded."
2. **The light does not answer the track.** The brief had it swell with each voice swell. His word on the release film, about 01:13: "I want you to not time the glow to the beat. I want it to be purely clean transitions."
3. **The ground is the release film's dark stage, with no hill.** The brief asked for the store pictures' hill far off.
4. **Bar 3 stops at the verse's tools and a highlight.** The Greek opens inside Study, beside parts marked Purify Plus.
5. **Bar 5 is Genesis 1, not John 1.** The Fathers' sheet on John 1 shows St John Chrysostom's picture, which is on the heritage list (the take failed on it). Genesis 1 is what the store picture for the Fathers uses.
6. **Bar 8 has no count of those praying.** The app shows none on a new campaign's page; nothing is drawn. The campaign's page shows the app's own picture of Christ (`/icons/prayer/christ-pantocrator.v2.jpg`), which passed the heritage check.
7. **The title for the Bibles is "Seven more Bibles"**, the drop's own name. `../scenes.mjs` still breaks it as "Six more Bibles to download", which the drop no longer says; that file was not changed.

## To make it again

```
npm ci
git worktree add ../purify-main 6700c2e65 && cp -al node_modules ../purify-main/node_modules
node scripts/gate/export.mjs --platform android --cwd ../purify-main
ln -sfn "$(realpath ../purify-main/out)" out          # never commit `out`
VIDEO_SHARP=4 node docs/plans/v1.9/video/ad/take.mjs today && VIDEO_SHARP=4 node docs/plans/v1.9/video/ad/take.mjs journal
VIDEO_SHARP=4 VIDEO_SLOW=12 node docs/plans/v1.9/video/record.mjs verse
VIDEO_SHARP=4 VIDEO_SLOW=12 node docs/plans/v1.9/video/release/take.mjs
VIDEO_SHARP=4 VIDEO_SLOW=12 node docs/plans/v1.9/video/release/forever-take.mjs
VIDEO_SHARP=4 node docs/plans/v1.9/video/record.mjs saints creed pray
node docs/plans/v1.9/video/release/forever-board.mjs && node docs/plans/v1.9/video/release/forever-board.mjs --check
node docs/plans/v1.9/video/release/forever-page.mjs <file.html>      # then publish to the same address
```

Everything made is in `.promo/v1.9-video/` (out of git, lost when the container restarts).

## What the film needs, at his yes

- Bars 1 and 2 are built by the app's own pieces (`ad/take.mjs`). Bars 3 to 8 are finger takes; for pieces to land on beats there, each needs a `pieces` list as `ad/cut.mjs` has, or the take's own moments (a sheet rising, a list drawn up) timed to the hits by choosing where each shot begins.
- The Fathers take gave only 26 frames in 4.8 seconds: the sheet's rise may not be filmed smoothly. Film it again and look before it is used in motion.
- A clock like `release/film.mjs`, with the brief's measured hits as its grid, and a sheet of every cut against those times before the render.
- Posting waits for campaigns open to every reader and 1.9 live on both stores. The sound is added in the app; the file stays silent.

## Tokens

get_session read 0 used tokens, so there is no measured number. By my own count the chat's context was about 150,000 tokens when the storyboard was published. My estimate for the film is 250,000 to 400,000 tokens and two to three hours, said on the page.
