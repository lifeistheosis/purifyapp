# Voices, and the Bible's tools on every historical text (phase 1: the plan, measured)

Fable voices chat, 2026-11-11. Nothing is built and no audio was made. His words of
2026-11-10 20:41 UTC and his yes of 2026-11-11 00:56 UTC are in `BRAINSTORM.md`.

## For Edgar, one screen

**What you asked for is three things, and they are very different sizes.**

1. **Highlight and share as image on every text.** Small. The Fathers' works already
   have highlights and notes, and the picture sheet is already used on councils and
   theology passages. It needs wiring on lives, councils, theology and history. No
   spend. **Fits 1.9.**
2. **Listen on every text.** The catch is the Fathers' works. They are 6.0 million
   words: about 544 hours of sound, six times the whole Bible. Everything else you
   named (the lives, the councils, theology, history) is small: 48 hours together.
   - Lives, councils, theology, history in Heart: **fits 1.9**, if your PC can render
     about 64 hours nonstop (it makes sound at 0.75x real time, your own number
     from 1.7).
   - The Fathers' works: **1.9.1 and after**, most read first. On your PC alone they
     are 725 hours of rendering (30 days nonstop) for one voice.
3. **More voices for Plus.** Keep doing what Heart does: sound made ahead, kept in
   your Cloudflare bucket, streamed, saved per book for offline. Do not put a voice
   engine on the phone (reasons below). A voice costs nothing in app size either
   way, because no sound ships inside the app.
   - The picker, a 20 second sample of each voice, and the Plus check on the
     server: **fits 1.9**.
   - How many voices are ready by November 20 depends only on rendering. Today
     Heart itself has only the New Testament (16.3 hours). Each extra voice for the
     New Testament is 22 hours on your PC. Two Plus voices is realistic for 1.9;
     four is tight.

**Spend.** Storage is the only running cost and it is cents: Heart for everything is
11.9 GB, about 3 cents a month past the bucket's free 10 GB. Five voices of
everything would be about 75 cents a month. Listening costs nothing per listen (the
bucket does not charge for downloads). Nothing here starts a paid service.

**The one real limit is render time on your PC.** A rented GPU takes it off your PC
for a few dollars (the follow-up of 2026-11-11, near the end of this file). Kaggle's
free GPU is dropped: its terms could not be read, so it is not used.

**My recommendation.**

- **1.9 (by about November 20):** highlight and share on all the texts you named;
  Listen in Heart on the lives, councils, theology and history; the voice picker
  with samples and two Plus voices on the New Testament. If a voice's rendering is
  not finished by November 17, that voice waits for 1.9.1 and the notes do not
  mention it.
- **1.9.1:** the Old Testament in Heart (still not recorded), then in the Plus
  voices; the Fathers' works in Heart, most read first; more voices.
- **What I need from you:** yes or no to the plan; which voices (you choose by ear
  from samples, I would make 6 candidates of 20 seconds each on your say); your PC
  free to render; one secret added on Render so the server can sign the Plus
  voices' addresses; your sign-off on one small migration so highlights on the new
  pages sync.

Everything below is the measurement and the working.

---

## 1. The corpus, measured

Counted from the repository on 2026-11-11 (`data/saints`, `data/councils`,
`data/theology`, `data/history`, `lib/saints/saints.ts`). Hours are at the Bible's
own pace, measured from the 260 recorded chapters: 180,798 words in 16.34 hours,
**184.4 words a minute**. Size is at the Bible's own rate, 295 MB for those 16.34
hours, **18.1 MB an hour** (about 40 kbit/s mp3).

| Section | Words | Parts | Hours per voice | Size per voice | Render on his PC (0.75x) |
|---|---:|---:|---:|---:|---:|
| Bible, New Testament (recorded in Heart) | 180,798 | 260 chapters | 16.3 | 295 MB | done |
| Bible, the rest (not recorded yet) | about 770,000 | about 1,070 chapters | about 70 | about 1.2 GB | about 93 h |
| Saints' pages, the short life (ours, 162 saints) | 48,075 | 746 paragraphs | 4.3 | 78 MB | 5.8 h |
| Lives as works (a witness's words, 69 files) | 255,551 | 403 sections | 23.1 | 417 MB | 30.8 h |
| Editorial retellings (16 files) | 8,537 | 45 sections | 0.8 | 14 MB | 1.0 h |
| Councils (documents) | 123,435 | 650 sections | 11.2 | 201 MB | 14.9 h |
| Theology (14 pages: essay, passages, councils' words) | 40,305 | 14 pages | 3.6 | 66 MB | 4.9 h |
| History (40 events) | 51,937 | 40 events | 4.7 | 85 MB | 6.3 h |
| Apologetics and topics | 6,954 | 8 pages | 0.6 | 11 MB | 0.8 h |
| **The short texts together** | **534,794** | | **48.3** | **0.85 GB** | **64 h** |
| The Fathers' works (149 files) | 6,016,671 | 4,851 sections | 543.8 | 9.6 GB | 725 h |
| **Everything, Bible included** | about 7.5 million | | **about 678** | **about 11.9 GB** | about 904 h |

Notes on the count:

- The works are top heavy: the 5 longest are 37% of the words, the 10 longest 56%,
  the 20 longest 75%. St Gregory's Morals on Job alone is 789,542 words (71
  hours). My Life in Christ is 246,866 words (22.3 hours).
- The Life of Antony and the Life of Hilarion sit under two saints each and are
  counted twice here (about 35,000 words). One recording serves both pages.
- Sections vary wildly: the middle one is 323 words (under 2 minutes), one in ten
  is over 3,100 words (17 minutes), and 72 are over 9,000 words (49 minutes; the
  longest is 37,363 words, over 3 hours). Paragraphs: the middle one is 89 words
  (29 seconds), one in ten is over 365 words (2 minutes).
- The theology count is the 14 pages with a body in `data/theology`. The translated
  copies (`i18n` folders) are not counted: the voices are English, as Listen is
  today.

### How each section is read

The Bible is one recording per chapter, with each verse's start and end, and the
reader lights the verse. The same shape carries over: **one recording per part, a
timing for each paragraph, and the reader lights the paragraph being read.**

| Section | One recording is | The reader lights | The page today |
|---|---|---|---|
| Saint's short life | the whole life | the paragraph | plain paragraphs, no ids: ids to add |
| Lives as works, the Fathers' works | a section (a homily, a chapter). Sections over about 30 minutes are cut at paragraph ends into parts | the paragraph (`p-<section>-<n>`, already there) | ready |
| Councils | a section of a document (a canon, a letter) | the paragraph (ids already there) | ready |
| Theology | a part of the study (the essay; then each passage with who said it) | the paragraph or the passage card | no ids: ids to add |
| History | a part (context, the story, why it matters, what followed) | the paragraph | parts have ids, paragraphs do not: ids to add |

Decisions inside this:

- Because a paragraph can run two minutes, the render records each **sentence's**
  timing too, at no extra cost, and the page lights the sentence inside the lit
  paragraph. Now Playing shows the words sentence by sentence as it shows verses.
- The voice reads what the page shows as text: the title, then the words. It says
  whose words they are once where the page labels them ("Recorded by Athanasius"),
  and it does not read footnote marks, source lines or citations.
- The timing files for these texts carry no copy of the words (the Bible's do).
  The page already has them, and 6 million words copied once per voice would be
  about 36 MB a voice for nothing.
- Names and Greek or Latin words are the quality risk. The render uses
  `data/dictionary/pronounce.json` where it has an entry, and each newly rendered
  work gets a spot listen before it is listed.

## 2. The voices: three ways compared

**What was measured here:** the corpus (above); the bucket rate (18.1 MB an hour);
the on-device model's file sizes, read from the host's own headers; the app's
budget (85 MB packed in `lib/build/exportSize.ts`, 67.2 now, so 17.8 MB of room).
**What was not measured, and why:** speed on a real low-end Android and an iPhone,
and battery. This session has no phone, and a speed test makes audio, which phase
1 was told not to do. Where a number below is not mine it says whose it is.

| | A. Made ahead, streamed (today's way) | B. Made on the phone, neural (Kokoro) | C. The phone's own voice |
|---|---|---|---|
| Sound | Heart as it is now, same on every phone | the same voices, if the phone keeps up | varies by phone and maker, clearly weaker on many Androids |
| Storage per voice, everything | 11.9 GB in the bucket | none | none |
| Download for the reader | per book, as now (John 22 MB, the New Testament 295 MB) | the engine once: 86 to 92 MB (measured; 163 MB and 326 MB for the better grades), then 0.5 MB a voice (measured) | none |
| App size | none | a native speech runtime in both apps, several MB of the 17.8 MB left (not measured) | a small plugin |
| Speed | instant | his own 1.7 note: 0.75x real time on his PC. A low-end Android is several times slower than a PC, so it cannot speak as it goes; a 5 minute chapter would be made ahead over 20 minutes or more | instant |
| Battery | playing a file | the processor flat out for as long as it renders | light |
| Offline | saved books | yes, once made | yes |
| The verse lighting up | exact, from the render | must be worked out on the phone | word events, uneven across phones |
| Lock screen, speed, sleep timer, mini player | all work today | work once the sound is a file | a second player to build: it does not play through the app's player at all |
| A sample before choosing | a 20 second file | needs the 86 MB engine first | not ours to sample |
| Cost per listen | none (the bucket does not charge for downloads) | none | none |
| Render work for us | 904 PC hours a voice for everything | none | none |

**Finding.** B is tempting on paper: one 86 MB download and every voice after it is
half a megabyte, with no render work for us. It fails on the phones that matter. It
cannot keep pace on a low-end Android, it heats the phone, it needs a native
library in both apps (a new Capacitor plugin, new R8 keep rules, a phone walk of
the release build, an iOS framework) nine days before the final build, and the
lighting of the verse stops being exact. C gives up the one thing Listen is liked
for, the voice. Piper (his 1.7 note: about 10x real time on a phone, about 60 MB a
voice) is fast enough but is a different, plainer voice, so the Bible and the
Fathers would not sound alike.

**Recommendation: A for everything, no engine on the phone.** The only cost of A is
render time, and that is a one time cost on our side, never the reader's. The mix
worth having is not ahead versus on the phone, it is **which texts get which
voices**:

- Heart (free): everything, in this order: the New Testament (done), the short
  texts, the Old Testament, the Fathers' works most read first.
- Plus voices: the Bible first (the New Testament for 1.9), then the short texts.
  The Fathers' works in a Plus voice only when a faster render is proven.

### Storage and spend

Cloudflare R2's published prices (to be read again on the day): 10 GB free, then
$0.015 a GB a month; downloads free; 10 million reads a month free.

| What is in the bucket | Size | A month |
|---|---:|---:|
| Today (Heart, New Testament, plus chants) | about 0.3 GB | $0 |
| 1.9 as recommended: Heart NT and short texts, two Plus voices NT | about 1.7 GB | $0 |
| Heart for everything | 11.9 GB | about $0.03 |
| Heart for everything, four Plus voices for the Bible and short texts | about 21.4 GB | about $0.17 |
| Five voices for everything | about 59.5 GB | about $0.74 |

Render compute: his PC, free, slow. A rented or free GPU should be many times
faster, but I have no measured number for it and will not put a guess in a table.
The test in the summary (10 minutes on Kaggle's free GPU, one short passage, $0)
gives the real one. It needs his yes because it makes audio.

### What a voice is to the reader

- **Choosing a voice** is a setting, like choosing a Bible. Listen then streams in
  that voice. Nothing has to be downloaded to hear it.
- **Downloading** works as saving a book for offline works today
  (`lib/readAloud/offline.ts`, `saving.ts`: Wi-Fi first, resumes, one book at a
  time, listed under Settings, Storage), per voice. A whole voice of the Bible is
  1.5 GB, so "download this voice" offers a Testament or a book with its size
  shown, never one silent 1.5 GB download. This is the Bible versions' model with
  the sizes of sound.
- **A sample** of each voice: the same 20 seconds (about 100 KB), in the public
  part of the bucket, playable by every reader, Plus or not. Hearing them is what
  sells Plus.
- **Which voices.** Kokoro has about 28 English voices (American and British, men
  and women) under the same Apache licence as Heart. He chooses by ear. I would
  render the same 20 seconds in six candidates (two American men, one American
  woman, two British men, one British woman), about 3 minutes of his PC, and he
  keeps two to four. Names shown to readers are his to give.

### Plus, decided by the server

Today `audio.purifyapp.net` is fully public and no route hands out Plus content;
the offline save asks the client (`plusFeaturesNow()`), which is the pattern F-27
warns about. For voices:

- Heart and the samples stay public, as now.
- Plus voices go in a **private** place in the bucket. The app asks a new route,
  `POST /api/listen/voice` (zod, rate limit, `createClientFromRequest`, `OPTIONS`
  for the apps), for a book or a work in a voice. The route reads the reader's
  entitlement on the server (`lib/entitlements/server.ts`, never a flag from the
  client) and answers with short lived signed addresses for that book's files, or
  403 `plus_required`. Signing is arithmetic on the server: no paid service, no
  cost per listen, one request per book, not per chapter.
- This needs an R2 access key as a secret on Render (owner step; a stop
  condition), and the bucket's CORS and the site's `media-src` to name the signed
  host.
- Two honest limits. A file already saved on a phone keeps playing after Plus
  lapses until the app next checks and removes it (the same as saved books
  today). And Plus is not enforced on iOS today (`lib/entitlements/entitlements.ts`),
  so on the iPhone every voice is open until Plus is sold there. Voices follow
  that existing rule; they do not change it.
- `docs/audit/findings.yaml`: none of the open findings blocks this. F-09 applies
  (routes on the money path need tests): the new route ships with tests for no
  session, no Plus, lapsed Plus, and a voice or book that does not exist.

## 3. Highlight and share as image

What the Bible has, and where each text stands today (file names from the survey of
2026-11-11):

| | Highlight, colour, note | Share as image | Listen |
|---|---|---|---|
| Bible | yes, per verse and per word | yes | yes |
| The Fathers' works, lives as works | **yes already**, per paragraph (`lib/saints/annotations.ts`, `ParagraphRow`) | no | no |
| Saint's short life | no | no | no |
| Councils (documents) | no (paragraph ids are there) | on the overview page only | no |
| Theology | no | on passages (`PassagePicture`) | no |
| History | no | no | no |

What can be reused as it is:

- **Highlights.** `lib/saints/annotations.ts` is already the Bible's shape per
  paragraph, with colours, notes, tombstones and sync. It becomes one module for
  any text, with a locator of (kind, page, part, paragraph). `ParagraphRow` (the
  row with the hold menu: highlight, note, copy, link) is the component the other
  pages adopt. The colours, the picker and the Saved list are shared already.
- **Share as image.** `PictureSheet` takes words and a reference and is not tied to
  the Bible. It refuses text too long to fit and never cuts it. A paragraph is often
  too long (the middle one is 89 words, one in ten over 365), so the tool is
  **"share the words I selected"**, falling back to the whole paragraph when it
  fits. The reference line is the work and its place ("St John Chrysostom, Homily
  4 on Matthew, 3"), built by the citation code that exists (`lib/citations`).
  Council and saint pictures use the Portrait and Seal looks that exist.
- No new interface is drawn by hand: every screen is the app's own component, and
  any mockup passes `checkMock` first.

What each page needs:

| Page | Work |
|---|---|
| Works, lives as works | add Image to the paragraph menu; nothing else |
| Councils (documents) | swap the server paragraphs for `ParagraphRow`; the ids exist |
| Saint's short life | paragraph ids, then `ParagraphRow` |
| Theology study | paragraph ids on the essay; highlight on essay paragraphs and passages |
| History | paragraph ids inside each part, then `ParagraphRow` |

Two things to know:

- **Sync needs a migration.** The `annotations` table accepts only two kinds
  (`bible-verse`, `saint-paragraph`) and its unique index names their keys. A new
  kind for the other texts is a production schema change: one new file, written to
  run twice, his sign-off on the SQL before the merge. Until it runs, highlights on
  the new pages work and stay on the phone; sync (a Plus feature already) follows.
- **A highlight is tied to a paragraph's number.** If a text is edited so that
  paragraphs move (the Fathers' quotation marks were just mended this week), a
  highlight can land on the neighbour. This risk exists today on the works. The
  short life, theology and history are our own prose and are edited more often, so
  on those the highlight also stores the paragraph's first words and is dropped,
  not moved, if they no longer match.

## 4. Size of the work, risk, and where it fits

Hours are build hours for one chat, verification included (typecheck, unit tests,
both native exports, a browser walk). Render hours are his PC and run alongside.

| Piece | Build | Render (his PC) | Risk | Spend | Fits |
|---|---:|---:|---|---|---|
| a. Share as image on works, lives, councils, theology, history | 10 to 14 h | none | low: an existing sheet, new entry points | $0 | **1.9** |
| b. Highlight and notes on councils, short lives, theology, history (local) | 14 to 18 h | none | low to medium: five page types other chats are also in | $0 | **1.9** |
| c. Sync for those highlights (the migration) | 4 to 6 h | none | medium: production schema, his sign-off | $0 | 1.9 if signed by Nov 15, else 1.9.1 |
| d. Listen on any text: the render list, timing files, the follow, Listen buttons, the player's steps, resume, lock screen, offline | 30 to 40 h | (below) | medium to high: it touches the player mended in F-51, and needs a phone walk | $0 | **1.9** for the short texts |
| e. Heart on the short texts | (in d) | 64 h | low: rendering only; names need a spot listen | bucket, $0 | **1.9** if rendering starts by Nov 13 |
| f. Voices: the picker, samples, per voice files, the signed route with tests, offline per voice, Storage settings | 28 to 36 h | 3 min for samples | medium to high: Plus, a new secret, a new route | $0 | **1.9** |
| g. Each Plus voice, New Testament | none | 22 h a voice | low | bucket, $0 | **1.9**: two voices (44 h) |
| h. The Old Testament in Heart | none | about 93 h | low | bucket, $0 | 1.9.1 |
| i. The Old Testament in each Plus voice | none | about 93 h a voice | low | bucket, $0 | 1.9.1 and after |
| j. The Fathers' works in Heart | 6 to 10 h (long sections cut into parts, most read first) | 725 h | medium: 544 hours nobody can listen through; needs an automatic check | bucket, about 3 cents a month | 1.9.1 and after, in order |
| k. The GPU test | 1 h | 10 min, free GPU | none | $0 | whenever he says yes |

Totals for 1.9 as recommended: about 85 to 115 build hours, and 108 hours of his
PC (64 for the short texts, 44 for two voices), which is four and a half days
nonstop. That is tight against November 20 with six other chats on the branch,
so the order protects the date:

1. a and b first (no spend, no render, low risk): his "same features as the Bible"
   lands whatever else slips.
2. d and e together, councils first (the page is already shaped for it).
3. f and g last. The code can merge dark; a voice appears only when its files are
   in the bucket, so a late render delays a voice, not the build.
4. November 17 is the cut: whatever is not rendered and walked on a phone by then
   moves to 1.9.1, and the patch notes say only what is live.

What does not fit 1.9, plainly: the Fathers' works read aloud (725 hours of
rendering for one voice), the Old Testament in any voice, and more than two Plus
voices. "Listen on every text" is true in 1.9 for everything he named except the
works, and those arrive work by work.

## 5. What phase 2 needs before it starts

- His yes to the plan and the date.
- The voices: yes to rendering six 20 second candidates (3 minutes of his PC),
  then his pick.
- His PC rendering from about November 13, in the order above. The render tool
  lives in Homebase, outside this repository, so the render list and its format
  are agreed with whoever runs it.
- One secret on Render (an R2 key that can only read the private voices).
- His sign-off on the highlights migration SQL.
- Optional: yes to the free GPU test.

---

## Follow-up, 2026-11-11: can the rendering run off his PC?

Asked by the arbiter after reading the plan. Nothing was rendered to answer it.

- **A rented GPU: yes.** RunPod or Vast.ai, an RTX 4090 at about $0.34 to $0.69 an
  hour (third-party price pages checked late October 2026; read the price on the
  day). Kokoro's speed on a GPU was not measured here; published figures disagree
  by about ten times (35x to 100x real time in Kokoro-FastAPI's README, 17x to
  25x in Spheron's write-up), so the plan uses 20x. At 20x: the 1.9 scope (81
  hours of sound) is about 4 GPU hours, under $5; all the Fathers' works in one
  voice (544 hours) about 27 GPU hours, under $25. A 10 minute paid test (about
  10 cents) gives the true speed and needs his yes, since it makes a recording.
  From him: an account and a card with prepaid credit, an R2 key that can only
  write to the bucket typed into that machine and never a chat, and the Homebase
  render tool put on the machine.
- **The six voice samples can be made in this chat's own container**, on CPU, for
  $0: the library and the model files are reachable from it. Made only on his yes.
- **Kaggle is dropped.** Its Terms of Use could not be read and nothing found says
  rendering for a commercial app is allowed.

The lines above that say "1.9.1" were written before his rule of 2026-11-11 ("a
release ships finished"). What goes in 1.9 and when is his call on the voices; the
measurements stand either way.

## Phase 2, part 1: highlight and share on every text (built 2026-11-11)

The arbiter's go of 2026-11-11 about 01:37 UTC, with build 93 note 13: "allow you
to quote sentences and highlight whichever section or whichever word you want in
the actual work itself, so it doesn't just highlight the whole paragraph."

**What a reader can do now**, in a Father's work, a saint's short life, a council's
document, a theology study and a history page:

- Hold a word: it is selected, washed the way a held verse is (no box). The
  finger runs it on across lines and into the next paragraphs; two handles move
  its ends; one tap widens it to its sentence or the whole paragraph.
- One card for the selection: the seven colours, the words copied with whose they
  are, the paragraph's link, the picture sheet, keep, and a note.
- Tap marked words to recolour, note, share or remove them.
- With a mouse on the website, the browser's own selection feeds the same card.
- Saved lists every run of marked words with its words, the note, whose they are
  and a tap to its place; a swipe removes that one mark, with Undo. The You tab's
  count and the library a reader takes away include them.
- A double tap still highlights a whole paragraph of the Fathers in the last
  colour.

**How it is kept.** A mark (`lib/marks/anchor.ts`) stores its offsets in the
paragraph, its words, and up to 32 characters either side. When the text changes
it is found again by its words, then by its words as a change of quotation marks
or spacing leaves them, then between the words that stood either side, then in the
section's other paragraphs. One that cannot be placed is not drawn and is never
deleted. It rides in the paragraph's own value, so one paragraph is still one row.

**How it is drawn.**

- A Father's work is drawn by the device already, so its marks are drawn in the
  text (`components/reading/MarkedText.tsx`).
- The other four pages write their text on the server. Each paragraph says where
  its marks are kept (`components/reading/MarkHost.tsx`) and the marks are painted
  behind the words afterwards (`MarksLayer.tsx`). The page's words are never handed
  to the device a second time (AGENTS.md, "A page carries what it shows").
- The apps turn the system's selection off, so the selection is Purify's own
  (`components/reading/SelectionTools.tsx`): the word under a finger is found from
  the words' own boxes, including a finger that lands between two lines.

**Whose words.** A life, a history page and a study are Purify's own telling. A
copy or a picture of their words is signed Purify with the page's title, never
with a saint's or a council's name. A Father's words and a council's are signed
with theirs.

**Sync.** `supabase/migrations/20261111024250_annotation_marks.sql` was signed by him on 2026-11-11 ("yes these are all fine") and runs on the merge: one new
column (marks), one new kind (text-paragraph) and its three keys in the unique
index. Dry-run twice on a scratch PostgreSQL 16 standing on the folder's 105
files. Until it runs, marks stay on the phone: the sync asks whether the column is
there, sends nothing that the table cannot hold, and a row coming down never takes
a paragraph's marks away (`lib/sync/__tests__/marks.test.ts`).

**Checked.** Typecheck 0, lint 0 errors, the unit suite green but for one test
that is another chat's (the new change-of-email page has no screen name yet,
`lib/analytics/__tests__/screens.test.ts`). Walked in a phone-sized browser with
real touch events on a work, a council document, a life, a study and a history
page, and with a mouse at 1280. The exports' results are in the commit that adds
this section.

**Not checked, and why.** The feel of the hold, the drag and the handles on a real
phone: that is his walk. The exports here ran against a local stand-in for the
shop's catalog, since this container has no Supabase key; the store builds use the
real one.

**Tests of other chats that changed, because note 13 replaces what they held.**
`lib/saints/__tests__/paragraphDoubleTap.test.ts` (the hold no longer opens the
paragraph's sheet), one line of `lib/bible/__tests__/readerScreen.test.ts` and
section 64 of `scripts/export-walk.mjs` (a hold on a paragraph opens the
selection's card), and four tests that pinned the old markup of the council,
history, life and study pages.

**Known limits, said plainly.**

- A mark made while reading a text in one language is found only in that
  language's text.
- A selection runs through at most 12 paragraphs.
- On the four server-drawn pages a highlight is painted from the words' boxes, so
  it is measured again when the type size or the width changes; between the change
  and the next frame it can sit a line off.

## Phase 2, part 2: Listen on every text, recorded on his PC (built 2026-11-11)

His call of 2026-11-11, through the arbiter: "no I'm not renting a computer",
"just do it on our PC". The on-phone voice he then asked about is decided
apart (the arbiter's recommendation to him is 2.0); this part is what every
reader hears in Heart, with nothing on the phone but the app.

**What a reader gets.** Listen, the Bible's own pill, on a saint's short life,
each section of a council's document, each part of a study, an event's account,
and each section of a Life that is a witness's own words (the Life of Antony
and its like) in the works reader. Through the one player: the reader's speed,
the mini player, Now Playing, the sleep timer, the lock screen. It begins where
the reader stopped in that text. The paragraph being read stays bright and the
others step back; the sentence being read is washed line by line. Previous and
next step to the section or part before and after, never out of the document;
a recording that ends rolls on into the next, and the page opens that part. A
document is saved for offline as a book of the Bible is, with the same mark,
the same Wi-Fi rule, the same row under Storage, and Plus asked first.

**No Listen that plays nothing.** A text shows Listen only when the list names
its recording. A build carries the list as it stood (`data/listen/index.json`,
empty today) and asks the website for it, so a text recorded after an app was
built is heard in it and no store build waits on his PC.

**What his PC records, measured from the batches** (`npm run listen:batches`,
`lib/listen/batches.ts`), at the Bible's pace, his PC at 0.75x:

| Group | Recordings | Words | Sound | His PC |
|---|---:|---:|---:|---:|
| The saints' lives | 162 | 49,213 | 4.4 h | 5.9 h |
| The councils | 646 | 122,438 | 11.1 h | 14.8 h |
| Theology (the studies with their Fathers' passages) | 60 | 25,899 | 2.3 h | 3.1 h |
| History | 40 | 35,605 | 3.2 h | 4.3 h |
| The Lives in their witnesses' own words | 406 | 257,063 | 23.2 h | 31 h |
| **The five** | **1,314** | **490,218** | **44.3 h** | **59.1 h** |
| The Old Testament in Heart (his tool as it is) | about 1,070 | about 770,000 | about 70 h | about 93 h |

Phase 1's "short texts, 48 hours" was an upper bound that also counted source
lists, people and chronologies, which are not read aloud. These are the real
batches.

**What is read.** The title, then the text in the page's order: paragraphs,
headings, the passages it quotes, its lists, and in a study the Fathers'
passages at a part's end, each named before it is read. An editor's note above
a council's or a work's text is ours and is not read, nor a source line, nor a
footnote. Each paragraph is named by the place its page gives it, which is
what lets the reader light it; tests hold the batches to the pages.

**How a recording comes back.** His render tool is handed one file a recording
and hands back the sound and its timings: one row a block, a start and an end
for each sentence, no words (`lib/listen/texts.ts`; his steps are
`docs/1.9-build/OWNER-STEPS.md`, "Voices on your PC", V1 to V7). The sound goes
to the bucket under `listen/`; the timings come into `public/audio/listen/`;
`npm run listen:index` lists a text only when its timings answer what was read,
block for block and sentence for sentence. A text edited after it was recorded
falls off the list until it is recorded again.

**Checked.** Typecheck 0, lint 0 errors, the unit suite green but for one test
that is another chat's (`screens.test.ts`, the change-of-email page). Walked in
a phone-sized browser with silent stand-in files and made-up timings built
from the real batches and served to the test browser only (no speech was
made): Listen stood on the text that had a recording and on no other; the
paragraphs lit in order; Canon I of Nicaea ended, the page moved to Canon II
and lit it. On the final state: the whole unit suite green (975 files, 12,562
tests), both native exports green with the release's shop and community
switches on (69.0 MB packed of the 85 MB ceiling), and the export walk's
sections 64, 65 and 67 passing every check (67 is Listen against a silent
stand-in).

**Not provable here, named for his walk.**

- A real recording through his tool: V1 to V6. One test file through early
  costs an hour if the timings are not what the app reads; a night of
  rendering if found late.
- Saving a text for offline on a real phone. The names, the routing and the
  player's recognition of a saved file are held by tests; the phone's file
  system is not something this container has.
- The lock screen showing a text's title: the same player code as a chapter's.

**Known edges, said plainly.**

- A passage an event's account quotes is lit as it is read and can be marked,
  signed with its own source. The one list in all of History is read but not
  lit.
- The size beside the save mark is known for recordings that existed when the
  app was built; one recorded after shows no size until the next build, and
  still saves.
- A Life that stands under two saints (the Life of Antony, the Life of
  Hilarion) is recorded once for each page: about two and a half more hours of
  his PC, for a much simpler app.
- A council's document read in another language than English shows no Listen:
  the recording is the English.

## The metany guide (2026-11-11)

Asked by the owner through the arbiter: in the Hours, when to bow and when to prostrate, following the Church year. His bar: every rule from a named public-domain source, quoted and cited; nothing invented; where no such text says it, the plain sentence and "ask your priest".

What ships, and it is exactly what a quotation could be put under:

1. The Lord's Day: prayer is made standing. First Nicaea canon 20, Trullo canon 90, St Basil, On the Holy Spirit 27, all from the files the app carries. The day runs from Saturday's Compline to Sunday's Ninth Hour, after Trullo.
2. Pascha to Pentecost: the same. First Nicaea canon 20, St Basil 27.
3. The weekdays of the Great Fast, Clean Monday to the Friday before Lazarus Saturday: the Prayer of St Ephraim with reverences to the earth, at the First, Third and Sixth Hours, each from its own page of Hapgood's Service Book of 1906 (pp. 41, 47, 52; p. xvi for the season). Each rubric was read on the page image of the scan (archive.org, cu31924029363128), not its machine reading, and is kept with its page and leaf in `data/prayers/metanies/hapgood-1906.json`.

Every other day says only that the custom is given by the Typikon, differs between traditions and parishes, and to ask your priest. That sentence stands at the foot of the guide's page; under an Hour, a day no rule speaks to shows only the door to the guide (the arbiter, 2026-11-11: no clutter in a prayer).

What does not ship, for want of a public-domain sentence, and the arbiter has told him so: the feasts; Saturdays of the Fast; Holy Week; the Fast's rubric at the Ninth Hour and at Compline (Hapgood prints it under the Interhour, and her Compline is the Grand one), which say only that more reverences are appointed in the Fast. The Annunciation on a weekday of the Forty Days, on the reader's own calendar, gets the plain sentence (the arbiter's mend). A Sunday in the Fast stands.

One sentence is the editorials' own and not a quotation: "A lesser reverence is a bow from the waist. A great reverence is made to the earth." It is named as such in the clergy's queue (docs/editorial-standards.md, item 32). The reader is not told the guide awaits review (his standing note of 2026-11-06, item 27); the mark is `METANY_GUIDE_REVIEW` in the data. The arbiter had approved a reader-facing review line; it was left out for that note, and the arbiter was told.

Where it is: `lib/prayers/metanies.ts` (the rules, the quotations, the day), `components/prayers/MetanyLine.tsx` (under each Hour's title, mounted by `afterHead` on `PrayerRuleReader` from `app/(app)/prayers/hours/[id]/page.tsx`), `components/prayers/MetanyGuide.tsx` and `app/(app)/prayers/bows/page.tsx` (the guide; it is not under `/prayers/hours/` because the site answers 404 for any Hour it does not have, lib/seo/unknownAddress.ts). Fourteen lines in the 21 languages; the quotations stay in the English they were published in.

The gate: `lib/prayers/__tests__/metanies.test.ts` (20 tests: every quotation verbatim in its file, Hapgood's page for each, each rule by date over four years, Holy Monday, Holy Thursday, the Annunciation on both calendars, the catalogs, no em dash, no word of review to a reader); export walk section 69 (ten days at the Hours on both calendars, the door touched, the guide, Back, checkMock on five palettes for the line and the guide, Arabic).

## The native build puts the website's files back when it is stopped (2026-11-11)

Found by Fable Themes, given to this chat by the arbiter. `scripts/native-build.mjs` set 29 website-only trees aside in `.native-export-stash/` and put them back only in a `finally`. A build that was stopped left them there: git showed `app/api` and the rest deleted, and orphaned workers held `.next/lock`, so the next build refused to start.

Now (`scripts/lib/export-stash.mjs`):

- **On entry** a leftover stash is put back first, and the build says so. If the build that owns it is still running, the new one refuses to start and touches nothing. If the dead build's `next build` is still alive it is stopped, which frees `.next/lock`. A tree that had already come back another way (git) is never overwritten: it stays, and the stashed copy is moved to `.native-export-stash-kept/` (ignored by git), nothing deleted.
- **On a stop signal** (SIGINT, SIGTERM, SIGHUP) the build stops `next build` and every worker it started, puts the files back, and exits 130, 143 or 129. `next build` now runs as a child the script waits on, in a group of its own, because a handler cannot run while `execSync` holds the process.
- The stash says whose it is (`owner.json`: the build's pid and its `next build`).

Proved on the real build, three ways: SIGTERM midway (1,367 files shown deleted while building, 0 after, no worker left, exit 143); SIGKILL (the stash and one worker left behind), then the next build's entry (the worker stopped, 29 trees restored, said in its first two lines); SIGINT (exit 130, 0 deleted, no worker). `lib/build/__tests__/exportStash.test.ts` holds the entry guard on a scratch checkout (eight cases) and the script's wiring.

## St Cyril on John opens no section inside a sentence (2026-11-11)

Moved to this chat from Updates by the arbiter, with Updates' count (614 of 1,070 sections; 16,328 words). The whole record, with the numbers, is in docs/audit/findings.yaml under F-49 ("DONE 2026-11-11"). In short: `scripts/mend-cyril-john-openings.mjs` carried 640 open sentences forward verbatim (16,732 words), put back 32 openings the ingest had dropped (from the transcription, `scripts/cyril-john/lost-leads.json`), and rewrote 859 of the 1,071 notes on John's rail from their sections. No paragraph was added or removed (88 new empty slots), so no paragraph mark moves; every word the work had is there in the same order. `lib/saints/__tests__/cyrilJohnOpenings.test.ts` holds all of it, and export walk section 74 walks John 1, the 158-word sentence (sections 793 to 794) and a word mark over carried words. Section 452 was the tail of a translator's footnote shown as St Cyril's: emptied on the arbiter's word the same day, its note off John 7's rail, and the reader given the work without a section that has no words (`withWords`, lib/saints/load.ts).

## The 27 November and December saints without a picture (2026-11-11)

Handed over by the November and December chat on the arbiter's word, for the pre-build gate's part 3.

- **Thirteen have a picture**, each the icon printed for its day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, 1903 to 1911, the November volume; anonymous, public domain by age): Acindynus and companions; Acepsimas, Joseph and Aithalas; Galaction and Episteme; Patrobas and those with him; the martyrs of Melitene (St Hieron); St Matrona; Erastus and those with him (Erastus and Quartus); Plato and Romanus (St Plato); St Proclus; Philemon and Apphia; St Amphilochius; St Paramon; St Frumentius. Every one was looked at before use (the saints standing, named beneath, no death shown), cut inside its frame with no caption and never enlarged; the rows are in `lib/saints/iconRights.ts`. The Martyrdom of Romanus wears St Romanus's own print with the child Barulas. Six books took their own saints' pictures.
- **Six modern saints wait on a permission**, each with the icon, its maker where named, and where to write, in `docs/1.9-build/ICON-PERMISSIONS.md`: Arsenius of Prislop, Iakovos of Evia, Sophrony of Essex, Philoumenos, Gabriel of Georgia (nothing found to ask for yet), Arsenius of Cappadocia. No photograph of any could be shown to be free.
- **Eight older saints have no free picture that passed** and are in the same list with what was found and refused: Theodota, Marcian of Cyrrhus, Nicander and Hermas, Lazarus of Galesion, Onesiphorus and Porphyrius, Zacchaeus and Alphaeus, Irenarchus, Elias of Murom. Refused: two frescoes of Dionysiou (1547) and the Menologion's miniature of St Irenarchus, each the killing itself; a whole-month Menaion icon; a museum mural not shown to be this St Theodota, under a share-alike licence the house tool does not pass. Held for the arbiter: the Rotunda's 5th-century mosaic of Sts Onesiphorus and Porphyrius, theirs and public domain, but free only in a 400-pixel file.

How it was searched: Commons' API by the series' own list for the month and by each saint's names in English, Greek and Russian (it answered about half the requests; the limit is shared between chats), ordinary web search, and two research passes over the saints' own monasteries, dioceses and the Princeton index of medieval art, every contact then read again on its own page. Nothing in the permissions list is a guess: a gap says "not found".


## The on-phone voice in 1.9 (his word, 2026-11-11, about 13:24 and 13:32)

"phone voice in v1.9"; then, to the arbiter's two questions, "yes engine, yes
free Heart". Section 2 above recommended against an engine on the phone; he
chose it, by route B (in the web view), so this is the record of building it.

**What is decided.** The download is the reader's choice, about 90 MB once.
It is free to every reader with the Heart voice, which is how the Fathers'
works are heard free. Every other on-phone voice is Plus, checked on the
server. The files come from his own storage and from nowhere else.

**Built so far, with no engine (2026-11-11):**

- `lib/listen/phoneVoices.ts`: the list (Heart free and offered; the six
  candidates of OWNER-STEPS V7 Plus and not offered until he keeps them by
  ear) and `decidePhoneVoice`, the server's rule.
- `app/api/listen/phone-voice`: a Plus voice's file after the entitlement is
  read on the server. The files sit in `data/listen/phone-voices/`, outside
  `public/`. No storage key is held. 17 tests (no session, no Plus, lapsed,
  supporter, Plus, Pro, a voice not offered, a name that is not a voice).
- `lib/listen/phoneVoiceDownload.ts`: the download as a job the app keeps.
  One list (`manifest.json`) names each file with its size and SHA-256; a
  file that does not match is not kept. Waits for Wi-Fi and for a signal as
  a book's saving does; Remove frees every byte. 15 tests.
- `lib/listen/phoneVoiceEngine.ts`: the seam the player will speak through.
  A stub: `PHONE_VOICE_ENGINE_READY` is false, and a test holds that no
  screen uses the download while it is.
- `scripts/phone-voice-manifest.mjs` and OWNER-STEPS V8: his upload.

**Not done, and why.**

- **The engine itself, the speed number and the samples.** The session's
  permission check refused `npm install kokoro-js` twice ("denied by the
  Claude Code auto mode classifier. Reason: [Auto-Mode Bypass]"), the second
  time after his yes came through the arbiter. It was not worked around. He
  allows it in this window himself, or nothing here can be proved.
- **Speed on a phone.** The app is not cross-origin isolated (COOP only in
  next.config.ts; the apps' web view has neither header), so the engine runs
  on one thread. Unmeasured. If it is slower than speech on an ordinary
  Android, each paragraph is made ahead and kept, or the app is isolated:
  one to two more days, said to the arbiter at 13:36.
- **Where the files are kept on an iPhone.** The download keeps them in the
  web view's cache storage. Whether that is there under `capacitor://` on
  iOS is for the phone walk; the store is behind an interface so the apps'
  file plugin can take its place.
- **Whole files only.** A 92 MB file broken off begins again; a resume by
  byte range is the mend if his walk shows it is needed.

### The engine measured (2026-11-11, about 14:10 to 14:25 UTC)

He typed the yes in this window at about 14:00 ("yes: install kokoro-js and
onnxruntime-web from npm and download the Kokoro 82M model in your scratch
folder, to build and test the phone voice"). Installed in the scratch folder,
not the repository: kokoro-js 1.2.1 (Apache-2.0), @huggingface/transformers
3.8.1 (Apache-2.0), onnxruntime-web (MIT), the model `onnx/model_quantized.onnx`,
92,361,116 bytes.

**Speed, Heart voice, John 1:1 to 5, Chromium on one thread** (a page that is
not cross-origin isolated, as the app's web view is not), every file served
from this machine:

| Where | Speech made per second of work | A 13.4 s passage took |
|---|---:|---:|
| This server (Xeon 2.1 GHz) | 0.31 to 0.36 | 37 s |
| The same, slowed 4x to stand in for a mid-range phone | 0.07 to 0.08 | 3 min 6 s |
| For scale: the native engine, four cores, Node (not possible in a web view; taken while an export ran) | 0.71 | |

The 4x figure is an emulation, not a phone. Load: 2.8 s here, 9.8 s slowed.

**So:** by route B a phone cannot speak as it reads. A 10 minute text on a
mid-range phone is about two hours of the processor flat out. Sent to the
arbiter at 14:25 with three options (recorded voices only for 1.9; route B as
"make this text ready to hear", on charge; a native engine in both apps) and
my recommendation of the first. His decision.

**Found on the way.**

- The first download is about 115 MB: the model and a 21.6 MB runtime
  (`ort-wasm-simd-threaded.jsep.wasm` and its `.mjs`), not 90.
- In a browser kokoro-js fetches voices from huggingface.co (the address is
  hard-coded) and the runtime from cdn.jsdelivr.net. Neither may reach a
  reader's phone: the app would load all of it from his storage through a
  wrapper of its own over transformers.js.
- `npm audit`: three high-severity findings, all through `sharp`, which the
  speech path does not use in a browser. To be proven absent from the bundle
  before anything ships.
- The Voice section's first stills (scripts/mock-phone-voice.mjs) failed
  checkMock on Light (a filled button typed as paper on ink, 1.60:1); mended
  to the settings' own button. Not sent; the second pass waits on his choice.
