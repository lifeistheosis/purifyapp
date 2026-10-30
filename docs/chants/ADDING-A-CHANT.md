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
  `public/audio/chants/**/*.mp3`, and the data test fails on one. The timing
  files and `live.json` stay on the website, under `public/audio/chants/`,
  which `scripts/native-build.mjs` sets aside from the apps. The Prayer Rope
  Anthem's three recordings, from 1.7, are the only ones on the website.
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
| `public/audio/chants/christ-is-risen/el-byzantine.json` | Its timed words, made by `scripts/chants/timing-from-transcript.mjs`. Optional: a version with none has its words without Sing along. |
| `public/audio/chants/live.json` | Add `"christ-is-risen/el-byzantine"` to `live`. A recording plays only while it is listed there. |
| `docs/licensing/audio-provenance.md` | One row in the Chants section, named by the recording's bucket address: where it came from (the upload's link, its uploader and date), the performer or "not known", licence **none**, the day it came, his decision, and its takedown line. |

A cover is optional: a public-domain icon, square, at
`public/audio/chants/<slug>/cover.webp` (on the website, streamed like the
timing files) or one the bundle already carries (as the Anthem's
`/audio/art/anthem.jpg` is). Without one the page draws the plain plate.
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
3. **The times.** `node scripts/chants/timing-from-transcript.mjs <transcript> <slug> <id>`.
   It lays the transcript's segments on the data file's lines one for one and
   refuses when the counts differ. Lines marked `?` share few words with the
   transcript: listen to those. A bucket recording's length is taken from its
   data file. Where no transcript can be made (no speech model on the PC for
   its language), leave `timing` out: the words show without Sing along.
4. **The prose.** `about.what`, `about.history` and `about.when`, in English,
   plain, with no em dash, nothing invented, every claim resting on a source
   in `sources`. Set `review` to `{ "status": "awaiting-clergy-review", "since": "<today>" }`.
   `when.windows` puts it on the home for its feast (`paschal` counts days
   from Pascha; `fixed` is `MM-DD` to `MM-DD`, kept on the reader's own
   calendar); `tone` puts it in that week's row; `kind: "psalm"` and `psalm`
   (the Septuagint number) put it under the Psalms.
5. **The cover.** A public-domain icon, opened and looked at before it ships
   (the subject is what you meant, no face cut off, no watermark, no white
   edge), with its credit in `cover.credit`.
6. **The rights.** The provenance row, and the line in `live.json`.
7. **The checks.** `npx vitest run lib/chants lib/player lib/search` and
   `node scripts/i18n-check.mjs`. The data test fails on a missing catalog
   line, a timing file that does not match the words, a recording with no
   provenance row, a licence claimed in the Chants rows, a related chant that
   does not exist, or an em dash.

A new chant reaches the apps with the next app release (its page is in the
bundle); its recording plays from the website as soon as the website carries
it and `live.json` lists it.

## Taking a recording down

Move its `<slug>/<id>` from `live` to `pulled` in
`public/audio/chants/live.json` and push the website. Every installed app
stops offering it within minutes (`lib/chants/live.ts` reads the list; the
website keeps it fresh for five minutes, `next.config.ts`). Nothing else has
to change, and no store release is needed. A bucket recording can also be
deleted from the bucket afterwards; the list does not need it. To take a
whole chant away from the next release, set its `status` to `"hidden"`.
