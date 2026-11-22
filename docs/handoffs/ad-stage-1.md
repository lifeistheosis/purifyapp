# The 1.9 ad, stage 1: the hand-over

Written 2026-11-20 by the worker chat the arbiter started for this one job (session_01VuYTwdhrUStFNXC4goT9fG).

## What was made

The test: 6.95 seconds, scene 1 (Today, built by its own pieces) and scene 2 (the journal, built the same way), on one phone that moves from standing front to the store pictures' side stand between them. 1080 by 1920, 60 frames a second, H.264 High, 4.9 MB, no sound stream. One version on the page (the fourth render, after his three changes below), 4.95 MB.

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

What was done at "it should like a edit not just motion graphics" (the page is now version 4, the fourth render, same address):

- I asked him one question with three choices (cuts and close-ups; cuts plus speed ramps; one shot with a moving camera). His answer, about 21:55 UTC: "Cuts and close-ups (Recommended)".
- **The film is cut into seven shots** (`SHOTS` in `cut.mjs`, `cameraAt` in `compose.mjs`), hard cuts, each landing while a piece is still moving: wide, close on St Nicholas, close on Begin, wide for Today whole and the turn, close on the journal's name, close on the readings and their pens, wide to end. The script refuses a shot nearer than the takes were filmed, one shorter than 0.4 seconds, or one that moves out. The turn is never cut across.
- checkMock passes at ten moments now: the six of before and the middle of each close shot.
- The second and third renders' videos are also kept in the page's asset store, unused (third: `/_blob/0e6ee7e0cb297530ac1531bbc57773bd`), for the Vault.
- The arbiter asked for no more messages (each wakes a long chat), so this file is the record from here.

His word on the fourth render, about 22:26 UTC, verbatim: "it doesn't feel like a major release type of video it feels like a general video that is to showcase the app. it needs to be cinematic. if you need to make a one shot prompt then make it and start a new chat"

At that word: the prompt is `docs/handoffs/ad-cinematic-prompt.md`, and one new chat was started with it for that one job (a treatment and storyboard first, for his yes). This chat stops here. Stage 2 as planned (six more scenes in this look) is not to be made: the look itself is being redone.

His word on 2026-11-21, about 22:46 UTC, with a 38.6 second clip saved from TikTok ("forever - the little dippers (Bass Boosted + slowed)"), verbatim: "make me full length edit prompts for promo of purify based of these audio". Done: the audio was measured (about 92 beats a minute, eight bars of 3.9 seconds after a 3.7 second intro, one big hit at about 34.5) and the prompt written to `docs/plans/v1.9/video/release/forever-edit-prompt.md`: a beat-timed cut of the brief's eight scenes, with the warning that the music is not cleared for a baked-in file or an ad. Nothing was filmed and no chat was started from it. (Earlier the same day in this chat, off the ad: his Supabase custom domain, `docs/handoffs/supabase-custom-domain.md`; Play Console's website and D-U-N-S steps, which he reports are good; and questions on Mercury, Temu and packaging, answered in chat only.)

His word on the Forever prompt's intro, 2026-11-21 about 23:00 UTC, verbatim: "make the intro about other religions critizing ecuemenism and views like v2 and Muhammad or other religions worshipping the one true God". Not written into the prompt yet. Answered in chat: this is doctrinal wording, which `docs/editorial-standards.md` sends to the clergy queue and which the film's rule limits to the drop's words; it also risks the ad platforms' and stores' rules on religion and the brand. He was offered an intro that states the Orthodox confession in the Creed's own words, or a polemical one whose lines come verbatim from a public-domain source with a priest's yes. It waits for his choice.

His choice, about 23:02 UTC, verbatim: "b". Done: the Forever prompt's intro now carries one verbatim line of St Cyprian (On the Unity of the Church, from the app's own library), cited, and says it does not go out before a priest's yes; it also says plainly that no line on Vatican II or on Muhammad is sourced and none is to be written.

His words after that, verbatim: "it doesn't have to be a editorial video. its just an edit. its just garner views and retention", and, to three question hooks offered, about 23:05 UTC: "I like it". Done: the Forever prompt's intro is now the hook "Do all religions worship the same God?" answered by John 14:6 word for word; the prompt says no attack on any religion or person is to be written and why, and that the hook alone steps outside the drop's words, at his word. He did not say which of the three he liked; the recommended one was taken and the other two are kept in the prompt.

His word, about 23:08 UTC, verbatim: "start a fresh chat with it". Done: one new chat, "Purify promo: the Forever edit" (session_01VuYTwZkhGTEyJ8suxQiF6d), started with `docs/plans/v1.9/video/release/forever-edit-prompt.md` as its brief: a storyboard first for his yes, then the silent film cut to the track. It overlaps with yesterday's chat "Purify 1.9 ad: the release film" (session_01VuYTwdjxDrv3qHjVwVdhve); he was told, so he can keep one.

His word on 2026-11-22, with a 9.9 second template saved from TikTok (a fan edit of a television character), verbatim: "Okay, now I want you to make app promo with this exact style, but instead of people, do Christ. I want you to make it as one-to-one as possible with the template. And yeah, like if you need to crop out the icon, do the 3D of the icon going up with the effects, make it as one-to-one as possible with and matching the audio from effects to visuals to transitions, one-to-one. Let's do it." Asked three choices, he answered: the words "Scripture (Recommended)", the middle cuts "Icon details + app (Recommended)", the sound "Both (Recommended)". Made here, in this chat, since the template file exists only in this chat's uploads: `docs/plans/v1.9/video/release/christ-edit/` (its README has the template's measure, what ours is and the rules held). Rendered about 00:49 UTC; it waits for his yes or no.

His word on that first cut, 2026-11-22 about 00:52 UTC, verbatim: "Use the audio from the second clip because that's the full audio, and also ensure it's one-to-one in every single aspect. For example, the part in the edit where it transitions the multiple faces, put like multiple icons of Christ and like showcase his face, and do that like effect with the faces where like kind of like blurs or warps. But yeah, like make it one-to-one with the edit. And I put you on max, so"

Done, rendered about 02:50 UTC: the edit was made again from the template's own measure, frame by frame (`template.json`: the dome, both figures, the flash, the window, every cut, each shot's push, the words' frames, both runs of faces, the second dome's light point by point, every frame's brightness and sharpness), by a new renderer, `edit.py`. Both runs of faces are now eight icons of Christ, set on His eyes and melting one into the next, in a window that opens on His face as the template's opens on the man's head. Nine icons in all (`pictures.json`: what each is, where it is held, its page, where it is used; all marked Public domain on Wikimedia Commons, none held in Greece or Italy; two are late 19th or early 20th century and the file says so). The first cut's stage (`make.mjs`) is at commit `646414ee8`.

What is not the template's, each named in the folder's README for his yes or no: a word never stands on His face (it stands on His neck or breast, so His face sits higher than the man's); the window opens on His breast; nothing in an icon is redrawn or moved (no lit eyes); the second dome's light has no pattern of beams; the question is set a little smaller; the icon shots are still brighter than the template's.

Not done: the sound. The two files he sent are one file, byte for byte, and its music stops at about 4.7 seconds; the "second clip" with the full audio has not reached this chat. The preview carries the first file's sound. He was told and asked for it again. `checkMock` cannot read this film (it is composed from pictures, not a page); it was held to the rules by eye, and the README says so.

## Tokens

get_session read 0 used tokens every time, so there is no measured number. By my own count the chat's context was about 130,000 tokens when I stopped at the cap of 250,000 (own count times two), about 175,000 at the first finish, and about 200,000 after his two changes, and about 240,000 after the edit. By the times-two rule that is about 480,000. He lifted the cap himself.

## What stage 2 needs

- His yes or no on the moving phone, the sans title, the moving ground and the cuts.
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
