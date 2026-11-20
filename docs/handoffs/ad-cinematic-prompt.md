# The 1.9 ad as a release film: the one-shot prompt

Written 2026-11-20 about 22:26 UTC by the stage 1 worker (session_01VuYTwdhrUStFNXC4goT9fG), at his word in that chat: "it doesn't feel like a major release type of video it feels like a general video that is to showcase the app. it needs to be cinematic. if you need to make a one shot prompt then make it and start a new chat". This file is the prompt the new chat was started with.

---

You are a worker chat for ONE job on Purify: make the 1.9 ad feel like a **major release film**, not an app showcase. The owner (Leona, Edgar) asked for this himself and told the last chat to start you. He may write to you directly: answer in extra simplified mode (a few plain lines, emojis welcome, never an em dash).

## Start

1. `git fetch origin ccr-07896cf2-bo0afd && git checkout -B ccr-07896cf2-bo0afd origin/ccr-07896cf2-bo0afd`. All work and every push go to that one branch. Never main. If a push is rejected, fetch, merge, push; never force.
2. Read only these: `docs/handoffs/ad-stage-1.md` (what exists, and every word he said, with times), `docs/plans/v1.9/video/AD.md` (the brief, his four answers, the eight scenes, the rules), `docs/plans/v1.9/video/ad/README.md` (how the test is made, and the commands), and `docs/plans/v1.9/video/ad/cut.mjs`. Read `compose.mjs`, `take.mjs` and `../lib.mjs` only when a step needs them. Do not read docs/NOW.md, docs/1.9-build/HANDOFF.md or BRAINSTORM.md.
3. Send the arbiter no messages (it asked for none: each wakes a long chat). Keep `docs/handoffs/ad-cinematic.md` current instead: his words verbatim with the time, what changed, the page's link and version.

## What he has said, in order (2026-11-20, verbatim)

- On the first cut (13 November): "not bad it's looks good but I wanted it to be more animated (I.e button move onto the screen and the actual cards move on the app and fit into place and it transitions to each screen etc)"
- The ad's ask: "now I want you to make a v1.9 advertisement (motion graphics with animated transitions from screen to screen, etc)". Then: sample plus a moving phone, 30 seconds, 8 screens, all three stories, silent.
- "I don't like the font that you used for the title cards. Re-render with the minimalist, like, better font." (The display serif went; the title is now the app's sans. Do not bring the serif back for titles.)
- "And make the background move, so it's like more cinematic-y rather than a static motion graphics."
- "it should like a edit not just motion graphics" (he then chose "Cuts and close-ups").
- On the result of all that: "it doesn't feel like a major release type of video it feels like a general video that is to showcase the app. it needs to be cinematic."

Read these as one direction that the last chat answered too literally, one patch at a time. He does not want a tidy tour of screens with nicer motion. He wants the film a studio puts out on launch day: it announces that something has arrived.

## What exists (use it, do not rebuild it)

`docs/plans/v1.9/video/ad/` makes a 6.95 second test: Today and the journal, each built on the screen by the app's own elements, on one phone that turns from a front stand to a side stand, cut into seven shots, over a moving ground. Its page: https://claude.ai/artifact/4YMJMQmXcX6HSC7fxZJd6X (version 4). The machinery is sound and proven: the takes (real app, real elements, word-for-word proof), the 3D phone, the camera and its cuts, checkMock on the film's page, the render. What is wrong is the **direction**: it is evenly lit, evenly paced, centred, and it explains the app. Nothing in it says "release".

The export and the takes are lost when a container restarts: the README's commands make them again (the export is about 12 minutes; a linked node_modules fails it, a hard-linked copy works).

## The job

**First a treatment and a storyboard, for his yes. Then the film.** He prefers talk and understanding before doing, and stills before video.

1. **The treatment** (one short page in the repo, and on the page you publish): what makes a launch film feel like one, said concretely for this film. Think it through yourself; these are the levers the last version did not pull, not a recipe:
   - **An opening that announces.** Black, then the release itself: Purify's mark and "1.9" (or the drop's own name for the release) arriving with weight, before any screen is seen. An end card that lands the same way, with the drop's first sentence.
   - **Light and dark.** A real key light and deep shadow, the phone emerging from darkness, light passing over the glass, the screen's own glow falling on the ground. Soft pools only: the house forbids rays and beams.
   - **A camera with intent.** Slow dolly and orbit with depth, a shallow depth of field so the ground falls soft, a big scale change between shots (a detail filling the frame, then the whole phone small in a wide dark frame). Not a centred phone with a gentle push.
   - **Rhythm.** A build: slow and held at the start, quickening through the features, a peak, then stillness on the end card. It is silent, so the rhythm must be seen: cuts on motion, held beats, one or two moments of real speed.
   - **Type as part of the film.** Large, confident, few words, the app's sans; words that arrive as events between shots (a full-frame title card for each chapter), not a caption sitting above the phone the whole time.
   - **One idea.** A launch film has a line. Find it in the drop (`docs/plans/v1.9/drop.json`); do not write one.
2. **The storyboard**: six to nine still frames of the film's key moments, rendered from the real stage (the compose script can already wear any moment), on one page with the reason for each. Publish it as an Artifact for his yes or no before any full render. One version, no variants.
3. **At his yes: a cinematic test of about 10 to 12 seconds** (the opening, scenes 1 and 2 in the new direction, the end card), 1080 by 1920, 60 frames a second, H.264, no sound stream. Then its page (the video, a still, the reason for each choice, Save the video), made the way `ad/page.mjs` makes its page. The other six scenes wait for his yes to the test.

## The rules that still bind (CLAUDE.md has them in full)

- **Real screens only.** The app in the film is the native export of main `6700c2e65` (what the stores serve), a new reader with no Plus, Dark, Sunday 6 December 2026. Nothing of the app's interface is drawn, and every piece is the app's own element; a take must read word for word after its build as before. What the film may add is everything round the screen: the phone as a plain slab, light, shadow, ground, camera, type.
- **Words** only from the drop, the store pictures' lines or the app's own labels. None is written for the ad. No Plus feature shown in use. The heritage list read all through every take. No em dash anywhere.
- **No** rays or beams, side stripes, sparkle stars, parchment, floating pills. Phone first. `checkMock` passes on the film's page at the moments you name, and its `--self-test` first.
- **Motion** settles on `--ease-house`. Nothing bounces, overshoots or spins. A fast move is allowed; a springy one is not.
- **Every design is justified** to him, choice by choice, and nothing ships without his yes.
- **Spend:** one version. Name the cost before anything that costs real compute. The Higgsfield tools in your list generate AI video and cost his credits: do not use them without his yes, and never to draw the app or its interface. Say in one line if you think a generated background plate (light, ground, atmosphere only) would help, and what it would cost, and let him choose.
- Change nothing under app/, components/, lib/, android/, ios/ or supabase/. No other chats, no subagents, no scheduled tasks, no GitHub builds, nothing that touches production. Never `git push --no-verify`.
- Commit and push the scripts early (new work under `docs/plans/v1.9/video/release/`, leaving `ad/` as it is: nothing made is deleted, it is for the Vault).
- **Tokens:** he lifted the cap for this work, but conserving usage is still his first rule. Aim to reach the storyboard within about 150,000 tokens of your own count, say plainly in the hand-over what each step cost, and stop and ask him before a step you expect to cost more than 100,000.

## Deliver

The treatment and storyboard page (an Artifact, the link given to him in your reply), `docs/handoffs/ad-cinematic.md`, and everything pushed. Then stop and wait for his yes or no.
