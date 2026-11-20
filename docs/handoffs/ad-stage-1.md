# The 1.9 ad, stage 1: the hand-over

Written 2026-11-20 by the worker chat the arbiter started for this one job (session_01VuYTwdhrUStFNXC4goT9fG).

## What was made

The test: 6.95 seconds, scene 1 (Today, built by its own pieces) and scene 2 (the journal, built the same way), on one phone that moves from standing front to the store pictures' side stand between them. 1080 by 1920, 60 frames a second, H.264 High, 4.9 MB, no sound stream. One version on the page (the third render, after his two changes below).

- **The page:** https://claude.ai/artifact/4YMJMQmXcX6HSC7fxZJd6X (the video, one still, the reason for each choice, Save the video). Private to him.
- **In the repo:** `docs/plans/v1.9/video/ad/` (`cut.mjs`, `take.mjs`, `compose.mjs`, `page.mjs`, `README.md`, `RECORD.md`).
- **Out of git:** the file, the takes and the stills, in `.promo/v1.9-video/`. They are lost when the container restarts; the README's commands make them again (about 25 minutes, most of it the export).

## What was measured (`RECORD.md` has all of it)

- The app is the native export of main `6700c2e65`, cut in a worktree by `scripts/gate/export.mjs --cwd` (the anon key checked and not printed).
- Both takes `ok`: Today 86 words and the journal 83, each word for word after the build as before. No heritage picture in view, no campaign named, the reader new with no Plus.
- checkMock passes at six moments on five palettes, the move among them; `--self-test` passed.
- The script proves the move by its numbers on every frame: one way, never past its rest, never more than the side stand (25, 7 and 1.2 degrees).
- The two sheets (the whole film, and the move from 3.0 to 4.9 seconds) were looked at before the render.

## His words in this chat (verbatim, UTC, 2026-11-20)

- About 18:41: "continue. there is no cap. finish."
- About 18:50, while the render ran: "not liking that font"

- About 20:27: "I don't like the font that you used for the title cards. Re-render with the minimalist, like, better font."
- About 20:36, while that render ran: "And make the background move, so it's like more cinematic-y rather than a static motion graphics."

- About 21:55, after seeing the third render: "it should like a edit not just motion graphics"

What was done at those words (the page now shows only the third render, at the same address):

- **The title** is in the app's sans (DM Sans, 600, 76px), no longer the display serif. This is my reading of "the minimalist, like, better font": the app's own plain face, the one its buttons and labels use. The first cut, the sample and the store pictures still use the serif; whether they follow is his to say.
- **The ground moves** all through: a slow move in toward the hill (11 percent over the film), the far lines lifting faster than the near, and the ground sliding up to 120 pixels against the phone's turn, the far lines less. The light is still one soft pool. checkMock first failed this on mirroring (the pool slid one way in Arabic too); the ground now turns over with the phone in a right-to-left page, and all six moments pass.
- **Three renders** were made in all (the first, the sans title, the moving ground). The first is still in the page's asset store (video `/_blob/619f065d08558e5eeb25ada356577a3f`, still `/_blob/23c2729c623d8eac613d534320239c67`), unused; nothing was deleted, and it is for the Vault. The second was never uploaded and its file was overwritten by the third in `.promo/`; a copy is in this chat's scratchpad only.

## Tokens

get_session read 0 used tokens every time, so there is no measured number. By my own count the chat's context was about 130,000 tokens when I stopped at the cap of 250,000 (own count times two), about 175,000 at the first finish, and about 200,000 after his two changes. By the times-two rule that is about 400,000. He lifted the cap himself.

## What stage 2 needs

- His yes or no on the moving phone, the sans title and the moving ground.
- For each of the six scenes: a `pieces` list read from the export with `take.mjs <scene> --dom`, the way a reader reaches the screen in `REACH`, its stand (the store pictures go front and side turn about), and its words in `../scenes.mjs`.
- `compose.mjs` holds two scenes and one move by name (`A`, `B`). For eight it wants a list of scenes and a move between each pair; the motion, the page and the checks stay as they are.
- Scenes 3 and 5 show things a finger does (holding a verse, opening the Fathers). Decide with him whether those keep real taps, as the sample did, with the phone moving between scenes only.
- Scene 8 needs the campaigns stand-in (`campaignStandIn` in `../lib.mjs`), and posting waits for campaigns open to all and 1.9 live on both stores.

## Found in the app (not mended)

- On `/journal/`, reached by You, then Your journal, the tab bar marks **Bible** as where the reader is, not You. It may be meant; it reads as a fault. It is in the film as the app shows it, and named on the page.
- Today has changed since the sample: one card for the day. The sample's `PIECES` no longer fit main.

## What I would change

- The phone is nearly at rest before the screen has finished emptying, because the house curve does most of its travel early. A slightly longer move, or the journal's pieces let go a little sooner, would close the short beat where the turned phone is bare.
- The ground stays the hill for both scenes. The store pictures put the side stand before a field of rolling lines; stage 2 could change the ground with the stand.
- The change of screen is the film's, not a tap and the app's own transition as in the sample.
- An estimate for a chat should count its fixed cost: this one held about 47,000 tokens of tools and rules before its first command, and the export's first try failed on a linked node_modules and had to be cut twice.
