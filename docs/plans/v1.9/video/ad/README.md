# The 1.9 ad, stage 1: scenes 1 and 2 and the moving phone

The brief is `../AD.md`. This folder is stage 1 of it: a test of about seven seconds, scene 1 (Today, built by its own pieces) and scene 2 (the journal by the Church's day, built the same way), with the one new thing between them: the phone itself moves from scene to scene.

**Status, 2026-11-20: made, waiting for his yes or no.** One version, one render: 6.95 seconds, 1080 by 1920, 60 frames a second, H.264, silent. The file is not in git (`.promo/v1.9-video/ad/purify-1.9-ad-stage-1.mp4`); it plays on its page, https://claude.ai/artifact/4YMJMQmXcX6HSC7fxZJd6X (his, and private until he shares it), with one still and the reason for each choice. `RECORD.md` is the measured record. Stage 2 (the other six scenes) waits for his yes.

## What it is

- **The app is what the stores serve.** The native export is cut from main `6700c2e65` in a worktree (`node scripts/gate/export.mjs --platform android --cwd <worktree>`), and `out/` in this checkout points at that export. The film's scripts stay on the branch.
- **Each screen is built by its own pieces**, as the sample builds Today (`../sample/README.md`): `take.mjs` finds each piece of `cut.mjs` in the app's own page, holds it outside the screen, and lets it go on `--ease-house`, read from the app's stylesheet. Only `translate` and `scale` move a piece, so the layout is never touched. A take fails unless the screen reads word for word after the build as it did before.
- **Today's pieces are new.** Today on main is one card for the day now (the Nativity Fast's night at its head, then the date, St Nicholas, Morning prayers, Begin and Hymns of the feast), so the sample's list no longer fits and `cut.mjs` has Today's pieces as the export shows them.
- **The journal is reached as a reader reaches it**, before the film rolls: a tap on You, a tap on Your journal. Then it is held and built like Today.
- **The moving phone** (`MOVE` in `cut.mjs`, `STANDS` and `phoneAt` in `compose.mjs`). The phone is the store pictures' plain slab. Scene 1 stands it front, as the store pictures stand Today. Scene 2 stands it in the store pictures' side stand, as they stand the journal. Between them it makes one move on the house curve, entered gently because it sets off from rest. `compose.mjs` refuses to run if the phone ever comes back on its way, passes where it rests, or turns more than the side stand (rotateY 25, rotateX 7, rotateZ 1.2 degrees).
- **How the screen changes under the move.** Scene 1's pieces leave as they came (last in, first out, the house curve run backward) while the phone sets off. When the screen is bare the film changes takes, both screens bare, joined over a few frames. Scene 2's pieces arrive as the phone comes to rest.
- **The words** are the first cut's own for each scene (`../scenes.mjs`): the store pictures' line for Today, and the drop's point `journal` (its name, and "Free for everyone."). None is written here.

## Making it

```
npm ci
git worktree add ../purify-main 6700c2e65 && cp -al node_modules ../purify-main/node_modules   # a linked node_modules fails the build
node scripts/gate/export.mjs --platform android --cwd ../purify-main                            # about 12 minutes
ln -sfn "$(realpath ../purify-main/out)" out
node docs/plans/v1.9/video/ad/take.mjs today        # about a minute (--dry: stills, no film; --dom: what the screen holds)
node docs/plans/v1.9/video/ad/take.mjs journal
node docs/plans/v1.9/video/ad/compose.mjs --times   # the film's clock
node docs/plans/v1.9/video/ad/compose.mjs --sheet   # twelve moments, to look at (--span 3.1-4.7 for the move)
node docs/plans/v1.9/video/ad/compose.mjs --check   # checkMock at six moments
VIDEO_EXPORT=6700c2e65 node docs/plans/v1.9/video/ad/compose.mjs --fresh   # every frame, then the file (about 7 minutes)
node docs/plans/v1.9/video/ad/page.mjs --artifact=<file.html> --video=<address> --still=<address>   # the page, and RECORD.md
```

The page is published from a copy outside the repository, with the video and the still in the page's own asset store (capabilities `assets` and `downloads`); a new session that has to change it builds the copy again and publishes to the same address.

Everything made is in `.promo/v1.9-video/` (out of git, and lost when the container restarts).
