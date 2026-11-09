# Handoff to the arbiter (2026-11-09)

The chat "Version 1.9 brainstorming" (session `session_01VuYTwdgc577D9LMyq2UjXs`,
from 2026-11-06) ran out of room. Edgar's word, 2026-11-09: a new session is
the arbiter, the main chat that sends requests out to the other chats. This
file is what it needs to take over. Read it first, then `BRAINSTORM.md` and
`PLAN.md` in this folder.

## The chats (each Opus 5.5 at max effort)

| Chat | Session | What it is for |
|---|---|---|
| The arbiter (the new main chat) | `session_01VuYTwdsjYL2mmq2C2JSt2A` | 1.9 brainstorming, and the requests to the other chats |
| Admin panel | `session_01VuYTwbteJqs1UmDUwqRvzC` | the admin panel (app/admin and its API) |
| SSM board | `session_01VuYTwcSQmKLThRirvSeWa5` | social media: each release's cards, videos and posts |
| Updates | `session_01VuYTwcNqTWyT6Yab696Eri` | builds the 1.9 updates in the app itself: everything in `PLAN.md` outside the admin panel and social media |
| Discord requests | `session_01VuYTwa9F5ZBKXx8cqDTxg9` | reads every section of the Purify Discord and lists what members asked for, with no member named; replies and moderates on his word (below). It replaced `session_01VuYTwa7ccHk91ufBdtnExY`, which started before the bot's token was saved: a running chat does not pick up a network secret added in the settings, a new one does |

The Updates chat was set up by the arbiter on his word of 2026-11-09: "I
want you to set up a chat for the updates also for version 1.9. So one is
going to actualize the updates, one is going to be the SSM board, and one is
the admin panel." He talks to the arbiter; the arbiter sends the requests out
and reports back.

The Discord requests chat, the same day on his word: "Make one more chat to
go through the Discord server to scan all of the sections, right? To see what
updates people requested so we can add to our panel." It uses the repo's own
read-only scanner (`scripts/discord-scan.mjs`). The bot whose token is in
`.env.discord` on his PC has Administrator in the server
(`scripts/discord-assign-role.mjs` says so). The arbiter proposed a separate
read-only bot; his word was to use the Purify bot itself: "I want to be clear
that you have admin privilege on the server because there's nothing really
sensitive on the server ... you're also supposed to message back, and you're
actually a moderator, so you can do moderator tasks. So use the purify bot."
Its token is saved by him as a network secret on the environment for
discord.com, never written in a file or a chat. The chat reports its list
first, shows its first replies once (a `scripts/discord-act.mjs` plan run
dry), then replies and moderates routinely; bans, kicks, timeouts, deleting
channels or members' real messages, and changes to roles, permissions or
settings go through the arbiter to him each time. Another chat only on his
word.

To send a request: `send_message` with the chat's session id. To see where it
stands: `get_session` (its `status_bucket`) and `list_events` with
`kinds: ["user", "assistant", "result"]`. A chat takes a message from another
chat as a peer's, not as Edgar's: routine work in its own area is fine, but
anything that needs his word (CLAUDE.md, stop conditions) needs his word,
quoted. He can tell each chat once that the arbiter speaks for him; that is
his call.

All three work on the one branch, `ccr-07896cf2-bo0afd`. Each pulls
(`git pull --rebase origin ccr-07896cf2-bo0afd`) before it pushes.

## Where things stand

**Brainstorm mode is on** (since 2026-11-09, his word): notes and plans only;
nothing is built until he says start. He also uses simplified mode: replies
very short and plain, emojis welcome, never an em dash.

**The branch** is clean and pushed. The last two days, on it:

- `d59ab610` A chapter's parts carry keys (a development warning on every Bible chapter, gone).
- `ff40847b`, `ec33ad71`, `02970774` The promo maker in `scripts/promo/` (below).
- `fd7d455a`, `8f3b545b` No light rays (his word: "vibe coded ai slop"), in mockups, promo and the app: the Dome light banner is a soft light from above, the gift box opens in its flood. CLAUDE.md has the rule; `lib/ui/__tests__/noRays.test.ts` holds it.
- `c02e0dfd` Brainstorm mode on again.

## The promo (paused, waiting on his word)

`scripts/promo/README.md` says how everything is made.

- **PR promo**: seven looks, "save these for general promo ... PR, company
  promo" (his word). Kept for later.
- **Edits**: thirteen frames for fast-cut edits, the ones that get views. He
  liked them ("this is perfect") once the words moved to the middle, the years
  sat at the centre in one place and size (so they switch like a counter), and
  the rays were gone. He asked for two-second clips of all thirteen, with and
  without words, in several moves: rise, reveal, focus, push, float, and for
  the four years (33, 325, 330, 1917) a count, the digits rolling into place.
  Built and proved (every move that ends, ends on its still), not yet rendered.
- **To make the clips**, from a local-first export of the release being
  promoted (1.8 is main: build it in a worktree of `origin/main` with the
  shop stubs `docs/RELEASE.md` describes):

  ```
  PROMO_DIR=<somewhere> node scripts/promo/capture.mjs --export <export>
  PROMO_DIR=<somewhere> node scripts/promo/edit-capture.mjs --export <export>
  PROMO_DIR=<somewhere> node scripts/promo/frames.mjs edits
  PROMO_DIR=<somewhere> node scripts/promo/check-ends.mjs --set edits
  PROMO_DIR=<somewhere> node scripts/promo/motion.mjs --set edits all both all
  PROMO_DIR=<somewhere> node scripts/promo/reel.mjs --set edits <look> words
  ```

  About 140 clips at 60 frames a second; three workers at once took about a
  minute and a half a clip. Send him the reels (one per frame, its moves
  labelled) first, then the clips he picks.

## Waiting on him

- Everything under "Waiting on you" in `PLAN.md` (items 1 to 14), among them
  the journal's paywall line (11), its covers (12), print and export staying
  free (13), and the SQL for sharing a page (14).
- St. Basil's works (`PLAN.md` row 35b): on the list, not started, his word.
- The SSM board's own files are in the purify-ads repository (`ssm/`), which
  no cloud chat can reach yet: it is not on GitHub for this account
  (`lifeistheosis/purify-promo-files` is an empty repository), and his PC
  (DESKTOP-H33CQ43) lists Homebase for Remote Control but does not offer it to
  cloud sessions (the Claude app there may need an update). His call how to
  bring it in.
