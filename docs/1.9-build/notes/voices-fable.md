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

**Sync.** `docs/1.9-build/sql/annotation-marks.sql` waits for his sign-off: one new
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
