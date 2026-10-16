# 1.7 brainstorm

Brainstorm mode is on since 2026-10-15: notes and plans only. Nothing here is
built until Edgar says to start.

## Decided, 2026-10-15

- **The three screens:** Today **B** (the verse first), Discover **A** (a
  picture on each tile), You **B** (the picture stays on top). His words: "For
  the today, do B. For the discover, do A. And for the you, do B." (He first
  wrote "b for both", then replaced it with these.) Each is drawn in
  `shots/ask-*-calm.png`; what each holds is in BRIEF-1.7.md.
- **Read-aloud joins 1.7.** His words: "In v1.7 we will start implementing a
  low mb high quality TTS model to read out scripture and the saints and their
  lives, the history or the councils. So all of those will have a tts model
  reading all of it to them and premium (plus) users will have access to
  ambient noises."

## His answers to the seven, 2026-10-15

He wrote: "1 yes. 2. tts model for every language. 3 yes. 4 yes. 5 unsure.
6 unsure. 7. sure a orthodox dictionary".

1. **Yes.** Read-aloud is free for everyone; ambient sounds are Plus.
2. **A voice model for every language**, not the phone's own voice. Checked
   the same day: Piper's open voice library (`rhasspy/piper-voices`) has
   folders for 20 of our 21 app languages (ar, bg, de, el, en, es, fr, hu,
   id, it, ka, ne, pl, pt, ro, ru, sr, tr, uk, ur). **Filipino has none.**
   Meta's MMS voices cover Tagalog but their licence forbids commercial use,
   and Purify sells Plus. Ways for Filipino: a voice trained from one or two
   hours of a native reader's recordings (the same native reader 1.7 already
   needs for the Filipino Bible), or another model found with a usable
   licence. Each Piper voice carries its own licence and quality level
   (some are restrictive): checked voice by voice before shipping. One
   engine can run both kinds of model on the phone (sherpa-onnx runs Piper
   and Kokoro natively), and a reader downloads only their own language's
   voice.
3. **Yes.** Studio Audio stays a separate Pro promise, for real narrators
   later. So the free voice is never called "Studio" or "professionally
   narrated": it is plain "Listen".
4. **Yes.** Fasting shows what is not allowed beside what is. Into 1.7.
5. **Unsure, then "automatic it"** (Psalm numbers both ways). Explained
   again in chat with my pick (yes). His reply, "automatic it", read as: go
   with my picks, and make it work by itself. So: yes, into 1.7, with no
   setting. Searching "Psalm 23" shows both at once, our 23 and "The Lord is
   my shepherd" (our 22, "23 in most Bibles"), and a Psalm's own page names
   its other number. It never jumps a reader away on its own: "Psalm 50" is
   "Have mercy on me" to an Orthodox reader, so a guess either way would
   send someone to the wrong psalm.
6. **Unsure, then "automatic it"** (tone of the week). Read the same way:
   my pick stands, parked for now.
7. **Yes: "an Orthodox dictionary"** (his name for the word list). Into 1.7.

## The music player

His words, 2026-10-15: "Source recent photos online of Apple and Spotify's
most recent design and use that as your reference. So I'm gonna" (the
message stops there). So the Spotify-or-Apple question is answered: both,
their newest designs, as the reference.

**What the player is for in Purify:** today the only audio is the Prayer
Rope Anthem (`/prayers/anthem`, synced lyrics in three languages) and the
global now-playing bar (`components/prayers/NowPlayingBar.tsx`, one audio
element that survives navigation). 1.7 makes it the home of all listening:
the read-aloud voice, chant (free, under the prayers), the anthem, and the
Plus ambient sounds.

**References** (saved in `ref/music/`, sources in `ref/music/SOURCES.md`,
every picture opened): Apple Music's App Store set (iOS 26), Spotify's App
Store set (version 9.1.90, Oct 8), Apple Music's iOS 27 artist page, and
Spotify's April 2026 tablet redesign. Sheet sent to him:
`shots/ask-music-refs.png`. Noted, not saved: one report that the iOS 27.2
beta 4 (Oct 13) turns Apple Music black and white; a beta, may change, but
it runs his way.

**What we take, the plan:**
1. Now Playing: the icon or picture big, everything else black. No colour
   washed out of the icons into the background as both apps do with album
   art: our icons are gold, and gold is out.
2. The words being read, big, the current line lit and the rest dim,
   scrolling by itself (Apple's and Spotify's lyrics). For read-aloud and
   for chant. The anthem's synced lyrics already work this way.
3. Speech controls from Spotify's podcast player: speed, back 15, forward
   15, a sleep timer.
4. A slim, solid player just above the tab bar (Spotify's dark bar). No
   blur: blur in the scroll path makes Android stutter.
5. Up next: the next reading in order (the day's Epistle, Gospel, the
   saint's life). Plus readers get an ambient sound button in the bottom
   row, where Apple keeps lyrics, AirPlay and the queue.
6. A saint's page borrows the iOS 27 artist page: the icon melts into the
   top of the page, Listen sits under the name.
7. Tablets and the computer: Now Playing as a panel on the right (Spotify,
   April 2026).

**Asked:** draw Purify's player from these, yes or no (a drawing is a plan;
nothing is built in Brainstorm mode).

## Read-aloud (TTS) and ambient sounds

**My reading, to confirm (question 1):** Listen is for everyone; ambient
sounds are Plus.

**What the app has today:** no speech code at all. One audio piece, the
Prayer Rope Anthem (English, Arabic, French). Plus already sells "Premium
Reading Modes: Candlelight and Monastery reading", which ambient sounds pair
with. His own spec of 2026-09-28 put "genre soundscapes" and "word-synced
narration" in a Plus reading mode; this is that idea, with the voice opened
to everyone.

**The conflict (question 3).**
`S2 RISK/TRUST · (read)` Purify Pro ($19.99 a month) lists "Studio Audio:
Professionally narrated Scripture, saints, and Orthodox History", marked
"Coming soon" (`lib/premium/plans.ts`). A free machine voice reading the same
things makes that line odd, and calling a machine voice "professionally
narrated" would mislead Pro buyers. Either Studio Audio stays a separate
promise for human narration later, or its words change. Pricing wording is
his call.

**The plan.**
1. **The voice.** English, the language most readers use: our own small
   voice model, downloaded once the first time a reader taps Listen, never
   inside the app download (1.6 sits at 222.9 of its 235 MB limit). Every
   other language: the phone's own voice, built in, 0 MB, until a small model
   speaks it well. Candidates for English, to be tried by ear, sizes and
   licences to be confirmed on each model card before anything ships:
   - Kokoro-82M: about 80 to 90 MB quantized, Apache 2.0, the usual pick for
     natural English.
   - Kitten TTS: smaller (reported 15 to 80 MB by size), licence not yet
     confirmed.
   - Pocket TTS (Kyutai): about 150 MB, CC BY 4.0.
   - Supertonic speaks 31 languages but carries a use-limit licence: a
     candidate for the other languages later, if its terms fit.
2. **How it plays.** A native player on the phone, so reading goes on with
   the screen off and play and pause sit on the lock screen. That is the same
   work as the 1.7 phone touch "chant with the screen off": build it once for
   both.
3. **What it reads.** A Bible chapter, a saint's life, a History piece, a
   council text: the text exactly as printed, nothing added. Stretch: the
   sentence being read is lit, like his spec's "word-synced narration".
4. **Names.** A pronunciation list for the words a voice gets wrong
   (Theotokos, Chrysostom, Nicaea, Ignatius, Septuagint, Paschal...), each
   checked by ear.
5. **Ambient (Plus).** A few sounds under the voice and in the Candlelight
   and Monastery modes: rain, a candle, bells far off, wind, a monastery
   courtyard. Each one a recording we made or a CC0 one, listened to whole
   before it ships. Off by default, with a volume slider.

**First step when he says start:** a voice bake-off. The same three passages
(John 1:1 to 5, a paragraph of a saint's life, a line full of Greek names)
in each English candidate and in the phone's own voice, sent to him as audio
files. He picks by ear. Then the pick is timed on his Android phone through
the test app (speed, battery, the download).

**Open:** a reader with no connection cannot fetch the voice the first time
(the phone's own voice can stand in); how long a whole chapter takes to
start on an older phone is unknown until measured.

## Gemini's list, checked against the app

His Gemini wrote a prompt for a full expansion spec (`gemini-prompt.txt`).
Checked against the 1.7 branch on 2026-10-15.

**What it gets wrong about us**
- It says the app has the digital prayer rope with haptics. The rope page
  came down in 1.6, on his ban.
- It treats the library as database tables and asks for SQL migrations. The
  library is files inside the app, which is why it works with no signal. New
  content needs no SQL; a database change is only ever for a reader's own
  data.
- It lists Studio Audio as existing. It is a Pro promise marked "Coming soon".

**What we already have** (its numbers are right on the commentary): 26 books
with 24 Fathers, 12,045 passages; the Psalter by kathisma, the 20 kathismata
(a Plus reading plan); Old and New Calendar; one search across the Bible; a
glossary of the Fathers' old English inside the commentary
(`data/glossary/archaic.json`); 158 saints with lives; Prayers before
Communion; Small Compline and the four Hours.

**Good for 1.7: small, and no rights problem**
- 🍞 **Fasting, what is NOT allowed.** Gemini says readers asked for it. The
  day's fast level is already known (strict, wine and oil, fish, fast,
  fast-free), so the "not allowed" list follows from it. "Your priest guides
  the rest" stays. Size S.
- 📖 **Psalm numbers both ways.** Typing "Psalm 23" today opens our Psalm 23,
  "The earth is the Lord's", not "The Lord is my shepherd", which is our 22.
  Show both numbers and offer the other one. Size S. Read from the search's
  own test (`lib/search/__tests__/references.test.ts` pins "ps 23" to
  `/bible/psalms/23`); not tried on the live site.
- 🎼 **Tone of the week**, and the Matins Gospel of the week, on Today and the
  calendar. Date math only. Size S.
- 📚 **An Orthodox word list page** (Theotokos, Kathisma, Theosis, Antidoron...),
  grown from the glossary we have, each word linked to our own pages. Short
  definitions of accepted teaching. Size M.
- 🔊 **Daily readings and the saint of the day read aloud:** that is the
  read-aloud above.

**Later: big, or blocked by rights**
- Whole daily services with the day's hymns (Vespers, Matins, the Liturgy):
  XL, and most English service texts are under copyright. We ship public
  domain only.
- Every saint of all 365 days with troparion and kontakion: XL; few public
  domain English lives exist.
- 200 Fathers on every book of the Bible: XL; it grows as public domain
  translations are found.
- Thanksgiving after Communion (still marked "planned" in the app) and the
  three Communion canons: each needs a public domain text first.
- The kathisma Lent schedule (two a day) and Psalms inside the daily prayers:
  M, and it changes a Plus reading plan.
- Jurisdiction presets (ROCOR, Greek, Antiochian, Serbian): wait on the Old
  Calendar letter.
- Chanted troparia: need recordings and their rights.
- The Church Slavonic Bible beside the English: with the other Bibles, if
  the size allows.
- School and era tags on the Fathers (Alexandrian, Cappadocian...): small,
  but a filter few readers would reach for.

**No**
- The digital prayer rope (banned 2026-10-10).
- A "modern English" switch for prayers: it means rewording prayers, and we
  ship the text as printed.

## Questions put to him (one picture, `shots/ask-brainstorm-1.png`)

1. Read-aloud free for everyone, ambient sounds for Plus?
2. English in our own natural voice (one download the first time you tap
   Listen), other languages in the phone's own voice?
3. Pro's "Studio Audio" (professionally narrated, coming soon): keep it as a
   separate promise for real narrators later?
4. Fasting: show what is not allowed too?
5. Psalm numbers both ways?
6. Tone of the week on Today?
7. An Orthodox word list page?

## Voices by tier (decided 2026-10-15)

"premium gets all the voices free gets 1 voice". Free: one voice, the one he picks on the voice page. Premium (any paid tier): every voice. Engine still open: Kokoro sounds best but runs at about 0.75x real time on his PC, so it means audio made ahead and streamed (and every Premium voice multiplies that work and storage); Piper runs about 10x real time on the phone, with a voice for 20 of 21 languages, though many languages have only one or two voices, so Premium extras are mostly English and the larger languages.

## Reader screen notes (2026-10-16, brainstorm mode ON, usage nearly out)

His words, from the Scripture screen (phone and tablet). Nothing built yet.

1. **Translation picker:** Book and Reader open a scrollable sheet (right).
   Translation pops up floating buttons (wrong). Make it the same scrollable
   sheet as Book and Reader.
2. **The control chips** (Translation, Book, Reader, Interlinear) look
   loose: not side by side, not clean. Wants them minimal, aligned, reading
   as buttons. Same on tablet.
3. **Remove the Reader pill:** it repeats the reader settings icon in the
   top right.
4. **Listen button** sits randomly. Give it a real place.
5. **"John" over "Chapter 1"** does not look minimal or finished.
6. **Chapter strip** (the scrolling 1 2 3 circles) could look much better.
7. **Tablet, focus mode:** the exit button clashes with the cards in the
   top right. Move it (bottom, or somewhere better).
8. **Tablet text column** sits a little left. Center it like the iPhone:
   one centered column, scroll down.
9. **Now Playing cover for read-aloud:** an icon of the book's saint, e.g.
   John shows the Apostle John. New Testament first. Clear, high-quality
   icons tied to the book.

### My suggestions, for his yes when work resumes
- One row: Translation and Book as two equal pills with drawn chevrons,
  Interlinear as a toggle pill; Reader pill gone. All three open the same
  bottom sheet style (useDraggableSheet).
- Title: one line, "John 1" in Lora, translation as a small meta line; drop
  the separate "John" label.
- Listen: a headphones icon in the top bar beside search and bookmark, or a
  play button on the same line as the title. Mock both and let him pick.
- Chapter strip: move chapters into the Book sheet as a grid, or keep a
  slimmer strip with the current chapter filled. Mock both.
- Focus exit on tablet: a small pill bottom center that fades in on tap,
  plus Esc.
- Cover art map: Matthew, Mark, Luke, John (the Evangelists); Acts, Luke;
  Romans to Hebrews, St Paul; James, St James; 1 and 2 Peter, St Peter;
  1 to 3 John and Revelation, St John (Revelation: at Patmos); Jude, St Jude.
  Public-domain icons from Commons, every one opened before it ships, square
  crops (rules: never ship an image unseen, picture crops).
- Questions for him: Old Testament covers too (Moses, David, the prophets)?
  Mock the reader header as 2 options on one sheet first?

## More notes, same evening (2026-10-16, brainstorm mode)

10. **One top bar for all five tabs (phone).** Today, Bible, Discover,
    Prayers and You each draw the top right differently. Same design on all.
11. **Remove "Support this work" from the phone top bar:** it does nothing
    useful there. Desktop stays as it is.
12. **Today's search** could look better.
13. **Premium pill moves:** left on Today, right on the other tabs. Pick
    one place.
14. **Premium pill's star** (the sparkle) is a vibe-coded symbol: remove it.
15. **Chant pages.** The Prayer Rope Anthem page reads like a web page, not
    a phone section. Every chant gets its own page in one format: what it
    is, where it comes from (history), its variants. Many more chants are
    coming. (The anthem is a hymn; the no-digital-prayer-rope rule still
    stands: no counter, no tap widget.)
16. **Prayers, the pages inside.** The Prayers landing is good; the pages
    under it are not: the Hours (Today), Learn how to pray, the Akathists,
    and the prayer rules themselves.
17. **Your own rule** is the least useful and least finished page in
    Prayers. Needs a real rethink.

### My suggestions, for his yes when work resumes
- One shared top bar: title on the left, the same icons on the right on
  every tab (search, notifications), Premium in one fixed spot, no Support
  button on phones.
- Premium pill as the word alone, no star. Ask: in the bar on every tab,
  or only Today and You?
- Today's search: either the shared bar's search icon (same everywhere), or
  one clean full-width field under the greeting. Mock both.
- Chant page format, one data file per chant (adding a chant = adding a
  file): cover and play at the top; What it is; Where it comes from;
  Variants (each version playable: languages, tones, choirs); the Words
  (verbatim, public domain, with translation); When it is sung; related
  chants. History and framing are drafts for his priest. Recordings need a
  licensed or public-domain source per variant.
- Prayer pages: one shared service layout: a header with the hour's art,
  length and Begin; then clean steps; ties into the immersive prayers idea.
  Hours: the day as a timeline with the current hour lit. Learn how to
  pray: lessons in order with progress. Akathist: stanza by stanza (kontakia
  and ikoi) with progress.
- Your own rule: a builder (pick morning and evening prayers from the
  library, order them, see the minutes), one "Pray my rule" button into the
  prayer reader, shown on Today as the main Pray card, counted for the
  streak.
- Questions for him: where Premium lives; which chants come next and where
  their recordings come from; one mock sheet per area before building?

18. **The Reading section, "a Netflix for books"** (2026-10-16). Turn the
    reading room into one of the best reading UIs anywhere: a cover for
    every work (e.g. On the Incarnation, St Athanasius), browsing by
    swiping through rows, sections by theme and emotion (love, lust,
    hatred...), keywords and tags, and jurisdictions. Clean, smooth, the
    most inclusive reading section. He said to look for the best book
    sites and apps as references.

### My suggestions for 18, for his yes when work resumes
- Research first: reference shots of Apple Books, Netflix, Libby, Kindle,
  Everand, saved in r17/ref/books/ like the music references.
- Home: one large featured work at the top (cover, title, author, Read),
  then rows of covers: Continue reading; the passions (the eight thoughts:
  gluttony, lust, avarice, anger, sorrow, acedia, vainglory, pride); the
  virtues (humility, love, prayer, repentance, watchfulness); life (grief,
  marriage, temptation, work); seasons (Lent, Pascha, Nativity); Desert
  Fathers; Cappadocians; short reads under 20 minutes; new to Orthodoxy.
- Covers: one cover system, not AI art: the author's icon (public domain,
  opened before it ships) on a dark plate, the title in Lora. Every cover
  looks related and real.
- Work page: cover, author with icon, minutes to read, era, tradition,
  tags, chapters, Start reading (Listen later, with read-aloud), More like
  this.
- Search and filter chips: theme, author, era, length, tradition.
- Tags live in each work's data, so a new book only needs its tags filled
  in. Summaries are drafts for his priest; texts stay verbatim public domain.
- Question: "jurisdiction" as the author's Church (Greek, Russian, Serbian,
  Romanian, Antiochian...) or as tradition and era (Desert, Byzantine,
  Russian, Athonite, modern saints)? The second fits older works better.

19. **A saint's page on phones** (2026-10-16). Clean, but it reads like
    the desktop page shrunk: the name's layout, "Sign in to request" with a
    triangle, the 0 count, the "What does requesting do?" line. The sheet
    that opens from that line is good (keep it). "Read his works" should be
    the book rows of note 18, each work opening its own book page.
20. **Orthodox History needs real work.** The interactive timeline's
    colored era backgrounds need redoing; it still uses the red dot (he
    thought it was gone, read as vibe coded); every section is barely
    written; it needs better structure and photos.

### My suggestions for 19 and 20, for his yes when work resumes
- Saint page, phone first: the icon full width at the top, the name in
  Lora with feast day and title as one meta line, then a segmented switch
  (Life, Writings, Miracles) instead of one long page; a slim bar with the
  name once the hero scrolls away.
- Requesting: one clear pill, "Ask for this life", with the count as words
  ("12 readers asked") and no triangle or bare 0; the good sheet stays.
- Writings: the cover rows from note 18, so a saint's works and the
  reading room are one system.
- Timeline: one quiet vertical line in the app's own colors, era names as
  headers that stick while you scroll, a drawn marker in place of the red
  dot, no colored bands.
- History content: a fixed structure per event (what happened, why it
  matters, the people, sources) with one public-domain photo or icon each,
  opened before it ships. Write the 20 most important events properly
  first; drafts for his and his priest's read. Each history video still
  ships with its History piece.
- Question for him: which events come first, and does anyone besides his
  priest review the history text?

**Standing note (2026-10-16): there is no priest reviewing yet.** Every
"for his priest" above means a future clergy review. Nothing waits on it:
make each text as canonical as possible now (public-domain verbatim,
cited, nothing invented, split usage noted), and keep it marked for that
future review.

21. **Your saved ("what you've kept")** (2026-10-16): make it better for
    phones, cleaner, a simpler UI.

### My suggestions for 21, for his yes when work resumes
- One list, newest first, with a slim row of filter chips on top (All,
  Verses, Prayers, Saints, Readings, Highlights) instead of many sections.
- Each item one clean row: what it is in small text, the words or title,
  where it is from; tap opens it in place, swipe to remove (with undo).
- Verses show their words, not just the reference; a highlight shows its
  colour as a small dot by its label (no side stripe, no box).
- Search inside saved once the list is long; an empty state that shows how
  to save (the star on a verse) in one line.
- Same top bar as the other tabs (note 10).

22. **Reading plans as a guided session** (2026-10-16). Today a plan just
    sends you to the book and leaves you there: no guidance, no sense of
    progress. Wants it guided and welcoming: notes and questions that pop
    up, an animation when you finish, a cleaner UI with more motion.

### My suggestions for 22, for his yes when work resumes
- A session, not a link: "Day 3 of 30" opens an intro card first (what to
  watch for, a line of context), then the passage with a plan bar at the
  bottom (the same idea as Today's readings in one go: where you are, Next).
- Along the way: a few notes that open at the verse they belong to (tap the
  mark, a sheet comes up), never covering the text unasked.
- The finish: a short moment when you tap Done (the day's step fills on
  the plan's path, the streak counts), then 2 or 3 questions to answer in
  a line or skip (saved to the journal), one saying of the Fathers on the
  passage (verbatim, public domain, cited), and a look at tomorrow.
- The plan's home: the days as a path you can see, done ones filled,
  today lit, the next few waiting.
- Motion follows his rules: driven by the scroll where it can be, always
  behind the app's motion switch.
- Notes and questions are written as canonically as possible and marked
  for a future clergy review. Plans stay Plus, shown with the mark, never
  hidden.

23. **The journal** (2026-10-16) feels thin and not made for phones. Needs
    a lot of work. He also asked me to look across all of these notes for
    patterns and recurring issues, and plan around them.

### My suggestions for 23
- Phone first: entries by day in one calm list (the words first, the date
  small), one Write button always in reach, writing full screen with the
  verse or reading it came from attached on top.
- Prompts: the reading plan's questions (note 22) land here as entries you
  can answer; an empty journal offers one gentle prompt, not a blank page.
- Search, and filters by kind (reflection, prayer, question).
- Stays Plus, shown with the mark, never hidden.

## Patterns across notes 1 to 23 (my read, 2026-10-16)

1. **Desktop pages shrunk onto phones:** saint pages, the journal, saved,
   chant pages, history, the pages inside Prayers, the reading room. Fix
   once: a phone-first page frame (a hero, a segmented switch between
   parts, a slim bar that takes over on scroll, sheets for detail) that
   every one of these pages uses.
2. **The same job done differently in different places:** the top bar on
   each tab, the Premium pill's place, two reader-settings buttons, the
   translation picker unlike the book and reader sheets. Fix once: one top
   bar, one sheet for every picker, one row of pills for controls.
3. **The generic AI look:** the striped box, the sparkle star, the red dot,
   the triangle, gradient words, all-caps labels, ▾ and ‹ › characters,
   colored bands. Fix: the Impeccable check plus a look by eye before
   anything reaches him, and quiet native forms instead.
4. **Dead ends with no guidance or progress:** reading plans, your own
   rule, the reading room, prayers that just open a page. Fix: guided
   flows with a start, a sense of where you are, a finish moment, and what
   comes next.
5. **Thin content without structure:** history barely written, chants
   without history, saints' works as plain lists. Fix: one fixed shape per
   kind (event, chant, book, saint life) with real public-domain pictures,
   written as canonically as possible.
6. **Lists where he wants covers and browsing:** books, saints' works,
   chants, read-aloud covers. Fix: one cover system (a real icon on a dark
   plate, the title in Lora) shared by all of them.
7. **Tablet as an afterthought:** the column off center, focus mode's exit
   in the way. Fix: a tablet pass on every screen the phone pass touches.

**Proposed order when usage resets:** the shared pieces first (top bar,
sheet, phone page frame, cover system, guided flow, the check), then each
area on top of them: the reader screen, Prayers, saints, the reading room,
history, saved, journal, plans. Mock each area for his pick before
building it.

24. **Walkthroughs need a full rework** (2026-10-16). Good concept (Job's
    walkthrough as the example), but the execution feels vibe coded: the
    star, the animations, the custom drawings, the line. Impeccable would
    flag it all over.

### My suggestions for 24
- Rebuild on the shared pieces (patterns 1, 3, 4): the Scripture text is
  the hero; context opens as sheets (the kind he likes); progress is the
  guided-flow path (where you are in the book, a finish moment per
  chapter, what is next).
- No custom drawings, stars or decorative lines. Pictures only where they
  are real: a public-domain icon or manuscript for the book or the scene,
  opened before it ships, or none at all.
- Motion only where it carries meaning, driven by the scroll, behind the
  motion switch.
- Run Impeccable's check and the by-eye bans on every walkthrough screen
  before he sees a mock.

25. **Ambience, out in the open** (2026-10-16). It feels hidden as buttons
    in the reader's settings. Keep it in the reader, but put a noticeable
    control where you can press play and switch sounds easily, and give it
    its own small UI: volume and the other settings.
26. **DECIDED: the Kitchen goes, Chants takes its place** (2026-10-16). His
    words: "Remove the kitchen and switch it out for chants ... I guess just
    put chants. And then, yeah, make it its own UI for that." Reason: people
    will use chants far more than recipes. Also: chants need an easier way
    in.

### My suggestions for 25 and 26
- Ambience: a small sound button in the reader's bottom bar (by the
  chapter pager), lit while a sound plays; tapping it opens a sheet with
  the sounds as large tiles (tap to play, tap another to switch), a volume
  slider, a sleep timer (15, 30, 60 minutes), and a balance against
  read-aloud when both play. Stays Plus, shown with the mark.
- Chants: its own section where the Kitchen was (same tile, same place in
  Discover and the nav), built on the chant page format of note 15: a home
  with rows (this week's tone, the feast, by language, short chants), each
  chant its own page, playing through the app's player and mini player.
  "Pray with chant" in the prayer rules opens the same library.
- The Kitchen's way out, to settle with him before building: hide it from
  the apps and the site's menus; what happens to recipes readers already
  posted (kept readable at their links, or archived); old /kitchen links
  lead to Chants. No data is deleted without his word.

25. **Ambience, out in the open** (2026-10-16). It feels hidden as buttons
    in the reader's settings. Keep it in the reader, but put a noticeable
    control where you can press play and switch sounds easily, and give it
    its own small UI: volume and the other settings.
26. **DECIDED: the Kitchen goes, Chants takes its place** (2026-10-16). His
    words: "Remove the kitchen and switch it out for chants ... I guess just
    put chants. And then, yeah, make it its own UI for that." Reason: people
    will use chants far more than recipes. Also: chants need an easier way
    in.

### My suggestions for 25 and 26
- Ambience: a small sound button in the reader's bottom bar (by the
  chapter pager), lit while a sound plays; tapping it opens a sheet with
  the sounds as large tiles (tap to play, tap another to switch), a volume
  slider, a sleep timer (15, 30, 60 minutes), and a balance against
  read-aloud when both play. Stays Plus, shown with the mark.
- Chants: its own section where the Kitchen was (same tile, same place in
  Discover and the nav), built on the chant page format of note 15: a home
  with rows (this week's tone, the feast, by language, short chants), each
  chant its own page, playing through the app's player and mini player.
  "Pray with chant" in the prayer rules opens the same library.
- The Kitchen's way out, to settle with him before building: hide it from
  the apps and the site's menus; what happens to recipes readers already
  posted (kept readable at their links, or archived); old /kitchen links
  lead to Chants. No data is deleted without his word.

**His answers on 25 and 26 (2026-10-16):** "Yeah, these are good" (the
ambience sheet and the Chants plan as written). Old Kitchen links, recipe
pages included: no redirect, they show the app's usual not-found page
(components/layout/NotFoundScreen). Recipe data stays in the database; it
is not deleted (nothing said to delete it).

27. **"New to Orthodoxy? Start here", reworked** (2026-10-16). Every part
    phone first and better looking. And its own guided onboarding for an
    inquirer going to a first Liturgy: what to know beforehand, the do's
    and don'ts, the general rules, then the customs of that kind of parish
    (pews, prostrations, the different traditions). It asks what church
    they are going to. No search engine for parish names (he does not want
    one): a simple pick of the kind of Orthodox church, which the parish's
    name usually says (Greek, Russian, Antiochian...), and the advice is
    personalized to that pick.

### My suggestions for 27
- The flow, one card at a time: Going to your first Liturgy? Which kind of
  church is it? Then three short parts: Before you go (what to wear, when
  to arrive, how long it lasts), During (standing and sitting, the sign of
  the cross, candles and icons, Communion is for Orthodox Christians and
  the blessed bread may be offered to visitors), After (coffee hour,
  meeting the priest). Then "In a <kind> parish you may see": that
  tradition's customs (pews or standing, head coverings, prostrations,
  the languages used, a long Saturday Vigil). A checklist to keep, and a
  reminder on Today for that Sunday.
- The pick list, canonical only, from a public source rather than an
  engine: the jurisdictions of the Assembly of Canonical Orthodox Bishops
  of the USA (Greek, Antiochian, OCA, Russian (ROCOR and Moscow parishes),
  Serbian, Romanian, Bulgarian, Georgian, Ukrainian, Carpatho-Russian,
  Albanian), the local Churches for other countries, plus "Not sure".
- Careful with "Assyrian": the Assyrian Church of the East is not in
  communion with the Orthodox Church, and neither are the Oriental
  Orthodox (Coptic, Armenian, Ethiopian, Syriac). Names like those, and
  "Not sure", get a gentle note: ask the parish which bishop it is under
  and compare with the list. Never a verdict on a parish by name.
- Customs differ by parish more than any list can say: every custom is
  worded "you may see", written as canonically as possible and marked for
  a future clergy review.
- The rest of Start here moves onto the shared phone page frame and the
  guided flow (patterns 1 and 4).

**His answer on 27 (2026-10-16):** he agreed the Assyrian Church of the East is not part of the Orthodox Church ("ignore that I said that"); it stays off the pick list.

**Added to 27, "When you get there" (2026-10-16):** explain the basics of
what a visitor sees, plainly: how to approach the icons, what the candles
are for, why people kiss the icons, what is going on. My outline:
- Coming in: the entrance (narthex), the candle stand; a candle is lit
  with a prayer for someone living or departed; leave a little by the
  candles if you wish; no one minds if you only watch.
- The icons: people make the sign of the cross and bow, kiss the icon (the
  hand or the feet, not the face) and bow again; this is honour given to
  the person shown, passing to them, not worship of wood and paint (the
  Seventh Council). A visitor may simply bow, or just look.
- What is going on: the icon screen (iconostasis) with the altar behind it;
  the priest, the deacon, the chanters; incense; the Little Entrance with
  the Gospel book, the readings, the Great Entrance with the gifts, the
  Creed, Communion, the blessed bread at the end; people crossing
  themselves at the Holy Trinity's name, kissing the cross or the priest's
  hand at the end.
- Each line written as canonically as possible, cited where it rests on a
  council or the Fathers, and marked for a future clergy review.

**His answers to my pushback (2026-10-16):**
- **Chant recordings, DECIDED by him:** the popular chants, the
  recordings widely reposted (many accounts put them on Spotify); avoid
  the specific groups and choirs whose own recordings those are known to
  be. He knows the risk and takes it ("this is a risk I am willing to
  take ... it's more of a tradition"). He will send the audio himself.
  My conditions for building it: a source line per recording in
  docs/licensing/audio-provenance.md saying honestly where it came from
  and that it is not licensed (never a made-up licence), the performer
  credited where known, and a takedown path (one data change pulls a
  chant). Audio streams from the web, not inside the app.
- **App size:** he will send an optimization prompt (written by Gemini).
  Check it against the real repo before acting, like the earlier Gemini
  prompt, which had errors.
- **First Liturgy guide:** customs do vary a lot (agreed). Add: if they
  can, contact the priest beforehand and give him time to answer; it makes
  everything easier. The tone: it nearly always goes well.

**On my 1.7 / 1.8 split (2026-10-16):** he will decide it himself once usage resets ("don't even worry about that"); a big project is fine by him. Do not push the split again; build in the order he gives.

## Open questions for him, all in one place (2026-10-16)
1. Premium pill: in the top bar on every tab, or only Today and You? (13)
2. Read-aloud covers for the Old Testament too (Moses, David, the
   prophets)? (9)
3. Mock each area as 2 options before building it? (process)
4. Reading room "jurisdiction": the author's Church, or tradition and era? (18)
5. History: which events are written first? (20)
6. Chants: which ones first; he sends the audio. (26)
7. The free read-aloud voice: still the af_heart demo until he picks on
   the voice page.
8. Today's search: the shared bar's icon, or a full field under the
   greeting? (12)
9. Hallow (or other) screenshots for the immersive prayers, asked at 1.7's
   kickoff, still to come.
10. The build order once usage resets: he decides.

28. **Chant lyrics pipeline** (2026-10-16). He already has a pipeline (to
    go over later). When he sends a chant MP3, it gets transcribed with
    timestamps so the player's live lyrics work. He can transcribe it
    himself (saves my tokens); I double-check the other languages, where
    transcription goes wrong (Arabic especially: dialect, wrong words) and
    the translations must be right.

### My suggestions for 28
- Honest limit: I cannot listen to audio. Timing comes from his pipeline,
  or from a speech model run on this PC (a download, so his yes first).
- Words come from the liturgical text, not from the transcript: each chant
  is a known hymn (Christ is risen, the Trisagion...), so the transcript
  only supplies the timing, and the words on screen are the published
  text, matched line by line. That removes the dialect and wrong-word
  problem at the root.
- One lyrics file per chant, in the same shape the read-aloud captions
  already use (lines with a start and an end), so the live lyrics need no
  new code: the original line, a transliteration where the script is not
  Latin (Greek, Arabic, Slavonic), and an English line under it.
- Translations: public-domain liturgical translations where they exist,
  never a machine translation shown as the Church's text; my check goes
  line by line against the source, and any word I am unsure of goes back
  to him marked.

**His answers to the open questions (2026-10-16):**
- 1, DECIDED: the Premium pill stays on every tab (same place, no star).
- 2, DECIDED: yes, read-aloud covers for the Old Testament too (Moses,
  David, the prophets), alongside the New Testament saints.
- 4, ANSWERED: "jurisdiction" meant tradition, as categories: Russian
  chants, Greek chants, and so on. So Chants and the reading room browse
  by tradition (Byzantine/Greek, Russian, Serbian, Arabic/Antiochian,
  Romanian, Georgian...), not by a parish's bishop.
- New for Chants: a section of their own for the Psalms ("we love singing
  the Psalms in the Orthodox Church").
- Still open: 3 (two mock options per area), 5 to 10.

**Build decisions (2026-10-16, after the reset, max mode):** build straight from specs/ with each spec's recommended option (no mocks); he reviews on the Design Board. Yes to downloading about 40 public-domain icons from Wikimedia Commons for the covers (scratch folder, about 6 MB kept on the website, nothing in the apps, every one opened before use). Saint page pill: "Ask for more writings" (matches the sheet).

**His answers on the first Liturgy guide (2026-10-16):** keep it as Day 1 for an inquirer going to Liturgy. Icon veneration in Georgian, Russian and Ukrainian: "keep it strictly honor": use only the honour word (no word that can also mean worship). To apply after the walkthrough agent finishes (it is editing the catalogs now).

**His answer on the prayer pages (2026-10-16):** no retention loops inside prayers (no step path, counts or bars; the old rule stays). Make the design better: the prayer flows down like the audio player's lyrics, the sign of the cross marked with the drawn Cross icon where the rubrics say, and "Pray with" offers chant (free and Plus) and ambience (Plus).
