# How Purify drops a release

`docs/RELEASE.md` ends at a release that is pushed, built and checked. A drop
is everything after that: the words and pictures that tell people it exists,
and the order they go out in. Written 2026-10-05, with the drop of 1.5.

It exists because of 1.5. The website carried 1.5 on 4 October and 1.5.2 on
5 October. On the evening of the 5th What's New still showed the 1.4 note, no
announcement had been posted, the release email had not been sent, no card had
been made, and the store builds sat unsubmitted. Every one of those was a line
on a checklist that nothing held. Now they are one file, and a tool and the
unit tests hold it.

## The short version

```
node scripts/drop.mjs new 1.6     # start docs/plans/v1.6/drop.json from the release's notes
# write the points in that file: what the release brought, ten at most
node scripts/drop.mjs draft       # every piece is drafted from the points; nothing written is touched
# tune the pieces in drop.json
node scripts/drop.mjs kit         # check it, and write the kit the owner sends from
```

Then, as things happen, in the owner's own words where he gave them:

```
node scripts/drop.mjs note 1.6 accepted
node scripts/drop.mjs served android
node scripts/drop.mjs sent discord-announcement --words "posted it"
node scripts/drop.mjs status
```

## What a drop is

One file for each release, `docs/plans/v<release>/drop.json`. A patch has no
drop of its own: 1.5.1 and 1.5.2 are covered by 1.5's, which is why that file
`covers` three notes and is carried by the 1.5.2 builds. To a reader the
release is "1.5", whichever build brings it.

| In the file | What it is |
|---|---|
| `points` | What the release brought, said once: a mark, a name, a line, a short form. Ten at most. Each names the note it comes from and words that note carries, letter for letter. |
| `also` | Smaller things, for the places with room. Each tied to a note the same way. |
| `never` | What may not be said yet, with why: switched off, not built, not seen working. |
| `figures` | The numbers a caption or a card may carry, each with its source. Any other number ages. |
| `notes` | Where each note stands: `written`, `queued` (in the owner's queue) or `accepted`. |
| `builds` | The two store build numbers, and the day each store began to serve its build. |
| `pieces` | Everything that goes out, and every step between. |

A piece has a place (`channel`), a moment, its words, and what it still waits
for. `lib/drop/kit.ts` lists the places with what each holds and refuses.

## The five moments

Nothing later goes out before what is earlier is done.

| # | Moment | What goes |
|---|---|---|
| 1 | Before anything goes out | The notes accepted, so every link leads to the right note. Anything the pieces promise is made true (a verified priest behind "Ask a Priest"). |
| 2 | With the store submissions | The stores' own texts, and the builds handed over. |
| 3 | The announcement | Discord, Purify's own post in Community, the board message. The website has the release; the apps are said to follow. |
| 4 | The day a store has it | The store post, the update prompt, the release email, the cards and their captions, a letter. Each store on its own day. |
| 5 | A few days later | A notification, a "try this first", a video if there is one. |

Moments 3 and 4 can be one day. That is the owner's call: hold the
announcement until a store has the build and post both.

## The rules

`lib/drop/check.ts` holds them, `lib/drop/__tests__/dropRules.test.ts` plants
one fault at a time and makes sure each is caught, and
`lib/drop/__tests__/currentDrop.test.ts` holds the drop this checkout carries.
An error refuses the drop. A warning is for a person to read.

**What is said**

- **D1.1 Only what the notes say.** A point names a note and words that note
  carries. Change the note and the drop fails until it agrees. Ten points at
  most; a name of 40 characters with no full stop; a line of 230.
- **D1.2 Nothing dark.** A word on the `never` list in any pasted piece.
- **D1.3 The writing.** No em dash, no exclamation mark, no clock put on the
  reader ("last chance", "hurry").
- **D1.4 The public voice.** We are a team, and the words are a person's.
- **D1.5 No number that ages.** A caption carries only figures on the drop's
  list. A warning: a person decides.

**Where it goes**

- **D2.1 It fits.** Google Play holds 500 characters, the App Store 4,000 and
  170 for its promotional text, Discord 2,000 a message, a notification 80
  and 300, a YouTube title 100.
- **D2.2 The place's own rules.** No emoji or link in a store text. Neither
  store's text names the other platform. A caption has no link, five hashtags
  at most, and on Instagram no line break.
- **D2.3 A notification passes the notification rules.** The check runs
  `lib/push/doctrine.ts`, the same test the admin send route runs. It allows
  no digits, so a notification cannot name a version.
- **D2.4 The release email says the same.** Its points are written in
  `lib/whatsNew/releaseEmail.ts`, where the send route reads them. The drop
  does not copy them: it holds every point marked `email` to that file, word
  for word and in order.

**The order**

- **D3.1 Nothing before its moment.** A piece is not recorded as sent while it
  waits, before the release's note is accepted (its link would lead to the
  release before), or, for moments 4 and 5, before a store serves the build.
- **D3.2 A send says who and when.** A piece sent for the owner carries his
  words.
- **D3.3 Every piece is whole.** A known place, a known moment, an id of its
  own. A piece with no words yet is a warning.

**The books**

- **D4.1 The drop speaks for whole notes.** It covers real notes of its own
  release, carries a build of that release, and says where each note stands.
  A note of the release it does not cover is a warning.
- **D4.2 Nothing made off the books.** Cards and video are made in the
  `purify-ads` repository and tracked there (`ssm/`). The piece here names the
  piece there, or says what it waits for.

**What the check cannot do.** It can prove a point is in a note. It cannot
prove the note is true: `docs/RELEASE.md` holds that, by hand, when the note
is written. It can refuse a word and cannot read a sentence. So a drop that
passes has still to be read before it is sent. One rule in particular is a
person's: what only a store build has (a lighter app, a hold that copies) is
said as the apps', and never as live, before a store serves it.

## The kit

`node scripts/drop.mjs kit` writes three things:

| Where | What |
|---|---|
| `.release-logs/drop/<release>/kit.html` | The page the owner sends from: every piece in order, a button that copies it, a count against the place's limit, and what the check found. Published as a private artifact; never committed. |
| `.release-logs/drop/<release>/paste/` | A text file for each pasted piece. |
| `docs/plans/v<release>/drop.md` | The drop as a page, so a change to it can be read in a diff. Committed with `drop.json`; a unit test fails when it falls behind. |

The whole note (every line of every note the drop covers, as one text) is
never written into `drop.json`. The kit sets it out from the notes each time.

## The Drop tab

The kit, inside the admin panel: Reach, Drop. The owner asked for it on
2026-10-05 as "pretty much the drop kit, but for its own section and some
extra stuff": scheduling, all the content, every message to copy, and the
release email to send.

| View | What it holds |
|---|---|
| Send | Every piece by moment, with its count against the place's limit, a button that copies it, and one that marks it as sent. The release email is read and sent from the same card the Email tab uses. Notes link to Patch notes, the notification to Push. |
| Schedule | A day for each of the five moments, a mark for each store once it serves the build, and "Coming next": updates still being planned, each with its day. |
| Content and cards | The points, small copies of the cards with their captions, what may not be said yet, the links and tags, and the whole note. |

- **The words come from the build, the state from the server.** The tab
  imports the release's `drop.json` through `lib/drop/current.ts`, so every
  piece is there to read and copy even when nothing else answers.
  `/api/admin/drop` adds what is true this minute: the plan, the marks, which
  notes What's New is really showing, and what the rules say about the drop
  as it now stands (`lib/drop/live.ts` lays the plan over the file).
- **The plan lives in the Calendar's table.** A moment's day, a mark and an
  update to come are rows in `admin_tasks`, told apart by their rule key
  (`drop:<release>:m:<moment>`, `drop:<release>:p:<piece>`,
  `drop:<release>:s:<store>`, `release:<version>`). No new table, and a
  planned day is on the Calendar tab and in the daily digest as soon as it is
  saved.
- **A mark is checked before it is kept.** Rule D3.1 runs on the server: a
  piece is not marked as sent before the release's note is showing, or
  before a store has the build it describes. Refused, the tab says why in the
  rule's own words.
- **It sends one thing.** The release email, through the campaign route, with
  that route's draft, blockers and confirm. Nothing goes out at a set time by
  itself: a planned day is a day on the Calendar, and the owner sends.
- **A new release needs two lines.** Its `drop.json` is named in
  `lib/drop/current.ts` (a test fails until it is), and its cards are copied
  in with `node scripts/drop.mjs cards <the folder of stills>`, which writes
  540 pixel copies to `docs/plans/v<release>/cards/` and the module the tab
  imports. They are imported, not placed under `public/`, so they ride in the
  admin page's own bundle and never in the apps.

## Who does what

- **The owner sends.** Every post, email, submission and notification. A tap
  or a draft is never a send.
- **We record.** `sent`, `served` and `note` write down what he said happened,
  with his words. Each record is checked before it is kept, and one the rules
  refuse is put back as it was.
- **Ours, on his word.** Filing a note in his queue, pulling accepted notes
  back into the files, raising the update prompt's numbers, and any push.

## A drop for a patch

There is none. A patch refines its release, so when one lands before the
release has been told to anybody, add it to `covers`, set `version` to the
build that now carries the release, give its lines a point or an `also`, and
write the kit again. After a release has been told, a patch gets its note and
at most a line in the stores' "What's new".

## What refuses a drop

- `npm run test:unit`: the two files under `lib/drop/__tests__/`.
- `node scripts/drop.mjs check`: the same rules, with the warnings.
- `node scripts/release.mjs check`: a release with no `drop.json`.
- `node scripts/drop.mjs sent | served | note | waits`: a record the rules
  refuse is not kept.
- The Drop tab: a mark the order does not allow yet answers 409 and is not
  saved. `lib/drop/__tests__/live.test.ts` holds how the owner's rows are
  read, and that every `drop.json` on disk is the one the panel shows.
