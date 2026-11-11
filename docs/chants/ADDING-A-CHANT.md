# Adding a chant

Chants (1.7) took the Kitchen's place. Every chant is the same page: what it
is, where it comes from, when it is sung, its versions to play, and its words.
Adding one is adding files. Nothing in the app's code changes.

The owner's decisions this follows (Homebase/boards/purify-master/r17/BRAINSTORM.md,
notes 15, 26 and 28, 2026-10-16):

- He sends the recordings: the popular, widely reposted ones, not the
  recordings of the choirs known to own them. They are **not licensed**, he
  knows the risk, and the record says so honestly. Never write a licence that
  does not exist. (On 2026-10-30 he carried six named choirs' recordings
  anyway, "Add all 6 now", credited and with a takedown line each; that was
  his decision for those six, recorded in `docs/licensing/audio-provenance.md`,
  not a new rule.)
- The audio streams and never ships inside the apps (the bundle is at its
  85 MB packed ceiling). Since 1.8 every recording is in Purify's bucket on
  Cloudflare R2, at `https://audio.purifyapp.net/chants/<slug>/<id>.mp3`, as
  the Bible read aloud is (his "R2, like the Bible audio", 2026-10-30), and
  **never in this repository**: `.gitignore` refuses
  `public/audio/chants/**/*.mp3`, and the data test fails on one. `live.json`
  stays on the website, under `public/audio/chants/`, which
  `scripts/native-build.mjs` sets aside from the apps. The Prayer Rope
  Anthem's three recordings, from 1.7, are the only ones on the website.
- The timing files ride in the apps (build 86 note 78): each is
  `data/chants/timing/<slug>/<id>.json`, written out at build time as
  `/chant-timing/<slug>/<id>.json` (`app/chant-timing`), so a build always
  carries the timing of the words it shows. Through build 86 the apps asked
  the website for them, and a website still running an older build left a
  chant untimed on the phone. The old copies under `public/audio/chants/`
  stay, frozen, for those builds: never edit one, and never add one.
- The words on screen are the Church's published text, never a transcript.
  His transcript only gives each line its time.
- No priest reviews Purify yet. Write the prose as canonically as it can be
  written, cite it, invent nothing, and leave it marked
  `awaiting-clergy-review`.

## The files

For a chant with the slug `christ-is-risen` and a version `el-byzantine`:

| File | What |
| --- | --- |
| `data/chants/christ-is-risen.json` | The chant: the shape is `lib/chants/types.ts`, checked by `lib/chants/schema.ts`. Its name must be its slug. |
| `https://audio.purifyapp.net/chants/christ-is-risen/el-byzantine.mp3` | The recording, in the bucket: made by `scripts/chants/prepare-audio.mjs` into a staging folder outside the repository, then uploaded. Its data file's `audio.src` is this address. |
| `data/chants/timing/christ-is-risen/el-byzantine.json` | Its timed words, made by `scripts/chants/timing-from-transcript.mjs`. Rides in the app as `/chant-timing/christ-is-risen/el-byzantine.json`, the data file's `timing`. Optional: a version with none has its words without Sing along. |
| `data/chants-live.json` | Add `"christ-is-risen/el-byzantine"` to `live`. A recording plays only while it is listed there (the website serves this list at `/audio/chants/live.json`). |
| `docs/licensing/audio-provenance.md` | One row in the Chants section, named by the recording's bucket address: where it came from (the upload's link, its uploader and date), the performer or "not known", licence **none**, the day it came, his decision, and its takedown line. |
| `public/audio/art/<icon>.v1.jpg` | Its cover (1.8, the owner's note 57: every chant has one): a public-domain icon matched to its words, a square of 640 by 640 in the bundle, with its row under "The chants' covers" in `docs/licensing/audio-provenance.md`. A cover another chant already has is used again (King David for a psalm). |
| `lib/i18n/messages/*.json` | Two lines in all 21 languages: `chants.item.<key>.title` (English exactly the data file's `title`) and `chants.item.<key>.line`, one sentence for the cover. |

## Steps

1. **The recording.** `node scripts/chants/prepare-audio.mjs <file> <slug> <id> --out <staging folder>`,
   the folder outside the repository. With ffmpeg it trims the silence and
   evens the loudness; without it an MP3 is copied as it is. It needs only
   silencedetect, atrim, loudnorm and libmp3lame, so the ffmpeg Remotion
   carries will do: on the owner's PC, set
   `FFMPEG=Homebase/projects/purify-ads/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe`.
   It prints the `audio` and `timing` lines for the data file. Then upload
   the staging folder: `node Homebase/tools/r2/upload.mjs <staging folder> chants --dry`,
   read what it would put (nothing already in the bucket is touched unless its
   name is the same), then the same without `--dry`. Check each address
   answers 200 with its size and the CORS header for `https://localhost` and
   `https://purifyapp.net` before its line goes into `live.json`.
2. **The words.** Take them from a published, public-domain text and cite it
   in `sources`: Greek and Church Slavonic from the printed service books,
   English from Hapgood's Service Book (1906, 1922), Brenton for the Psalms
   (word for word: the test holds a psalm's English to `data/bible/psalms/`),
   Neale where his translation applies. Where there is no public-domain
   English, write Purify's own, set `translation.kind` to `"ours"`, and say so.
   Never a modern copyrighted translation (HTM, Lash, the OCA's), and never a
   machine translation presented as the Church's text. A transliteration goes
   only under a script that is not Latin, and it is ours. Any Arabic or
   Georgian word you are not sure of goes back to the owner, marked.
   Since 1.8 (notes 56 and 59) the reader switches the words themselves
   between the original, its transliteration, and both, both drawing each
   word over its sound: so a transliteration has exactly one word for each
   word of its line (a prefix joined with a hyphen, `lir-Rabbi`, `l-abadi`),
   in one plain scheme an English reader can say (Latin letters, an
   apostrophe for the Arabic ayn and hamza, no scholar's marks), written as
   the recording sings it. Every Arabic line has one. The data test holds
   both. A refrain the singers add after each half verse (the Alleluia of the
   Polyeleos) is its own line, so it lights when it is sung.
3. **The times.** `node scripts/chants/timing-from-transcript.mjs <transcript> <slug> <id>`.
   It lays the transcript's segments on the data file's lines one for one and
   refuses when the counts differ. Lines marked `?` share few words with the
   transcript: listen to those. A bucket recording's length is taken from its
   data file. Where no transcript can be made (no speech model on the PC for
   its language), the lines can still be timed by the recording itself, as
   Psalm 135's Greek, Serbian and Arabic were (2026-10-31): read one verse's
   line starts by hand on a spectrogram (Homebase/projects/purify-ads,
   `edits/tools/speechmap.mjs`), then find every other verse by its breaths
   and by matching that verse's refrain and Alleluia along the recording.
   Never take a speech model's word times as they are: they run late.
   **Then each word** (build 86 note 78, "each word timestamped and followed
   in the lyrics section"): `node scripts/chants/time-words.mjs <slug> <id>
   --wav <the recording at 16 kHz, mono> --transformers <transformers.node.mjs>
   --cache <the models' folder> --keep <a file outside the repository>
   --report <a file outside the repository>`, through
   `purify-ads/tools/renderlock.mjs`. It hands Whisper small each line's own
   words and their stretch of the recording, takes where its attention puts
   each word (a tenth of a second early, as its times run late; the first
   word where the line is first heard), and writes the timing file as
   version 2, each word with its start and end. Then the model hears every
   stretch on its own, and a word it did not hear is listed as `unheard` on
   its line: read the report, and listen to every line marked `?`.
   A line whose words could not be confirmed carries `unsure` in the data
   file, saying why; a line that is the nearest public-domain wording rather
   than the words sung (a choir singing a wording still under copyright, or
   one no public-domain printing has) carries `nearest`. Since build 93
   neither is shown at all: a line is shown only where the recording sings
   its words and a published text of the chant in that language has them,
   and every other line also carries `hidden`, saying why. A hidden line
   keeps its place and its time in the data, so the recording plays and the
   lines around it stay timed, but the page does not carry it and the timing
   file the app is given leaves it out. The version's `wordsSource` says it
   in prose. Check every line against the singing with a speech model before
   a chant ships, as docs/chants/lyrics-check.md did, and lift `hidden` only
   for words confirmed both ways.
4. **The prose.** `about.what`, `about.history` and `about.when`, in English,
   plain, with no em dash, nothing invented, every claim resting on a source
   in `sources`. Set `review` to `{ "status": "awaiting-clergy-review", "since": "<today>" }`.
   `when.windows` puts it on the home for its feast (`paschal` counts days
   from Pascha; `fixed` is `MM-DD` to `MM-DD`, kept on the reader's own
   calendar); `tone` puts it in that week's row; `kind: "psalm"` and `psalm`
   (the Septuagint number) put it under the Psalms.
5. **The cover.** A public-domain icon matched to the chant's words, never a
   picture made by AI, opened and looked at before it ships (the subject is
   what you meant, every face whole, no watermark, no white edge:
   `node scripts/check-picture-edges.mjs audio/art`), cut square and brought
   down to 640 by 640 (JPEG through mozjpeg at quality 80, about 100 KB: the
   bundle is near its ceiling), with its credit in `cover.credit` and its row
   in the provenance document. `lib/chants/__tests__/cover.test.ts` fails on
   a chant without one.
6. **The rights.** The provenance row, and the line in `live.json`.
7. **The checks.** `npx vitest run lib/chants lib/player lib/search` and
   `node scripts/i18n-check.mjs`. The data test fails on a missing catalog
   line, a timing file that does not match the words, a recording with no
   provenance row, a licence claimed in the Chants rows, a related chant that
   does not exist, or an em dash.

A new chant reaches the apps with the next app release (its page is in the
bundle); its recording plays from the website as soon as the website carries
it and `live.json` lists it.

## The builds already in readers' hands

An installed app cannot be changed, and it asks for a recording at the
address it was built with. So a file in the bucket or under
`public/audio/chants/` is never moved, renamed or replaced by another take: a
new take is a new version id beside the old one. And the list at
`/audio/chants/live.json` stays version 1, at that address, readable from
another origin. `scripts/chants/store-builds.json` records what each store
build asks for; `lib/chants/__tests__/storeBuilds.test.ts` holds the
repository to it, and `node scripts/chants/probe-live.mjs` asks purifyapp.net
and the bucket for all of it, as each app. Add a store build to the record
when it ships.

## Taking a recording down

In the admin: Content, Chant recordings, then Take down, with a few words of
why (1.9, once `supabase/migrations/20261110002921_chant_pulls.sql` has run (the 1.9 release)). Every
installed app stops offering it within minutes, and takes a saved copy off
the phone: the website serves `/audio/chants/live.json` as the committed
list less every recording switched off there (`lib/chants/pulls.ts`), and
keeps it fresh for five minutes. Nothing to push, and no store release.

By hand, or before the table exists: move its `<slug>/<id>` from `live` to
`pulled` in `data/chants-live.json` and push the website. A bucket recording can also be
deleted from the bucket afterwards; the list does not need it. To take a
whole chant away from the next release, set its `status` to `"hidden"`.
