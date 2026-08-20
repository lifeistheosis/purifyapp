# Purify editorial standards

The standing rules this codebase already practices, written down so they are enforceable, plus the open review queues. Voice for all user-facing copy: "Edgar, the Purify Team" — reverent, plain, no em dashes (commas/periods; en dashes in ranges are fine), no theatre (empty sections render nothing rather than placeholders).

## Content classes and their rules

| Class | Source rule | Enforcement |
|---|---|---|
| Scripture | Public-domain editions only, identified per chapter (`source` field: `brenton-lxx-pd`, `kjv-pd`) | data files carry the field; never mix editions silently |
| Patristic commentary | Verbatim public-domain translations only (NPNF/ANF, Schaff), ingested by script from CCEL, never hand-typed or paraphrased-as-quotation. Every note carries `author`, `work`, `citation` | ingest scripts abort on parse anomalies (header-count gates, sequence repair); `citation` is required in the note shape |
| Editorial digests | Third-person summaries describing what a Father teaches are allowed with citation; **invented first-person patristic text is never allowed** | review at PR time; no generator may emit quotation-form text |
| AI-generated material | Never presented as Scripture, patristic text, or Church teaching. AI may draft editorial framing ONLY into a review queue | queue below; nothing ships unreviewed |
| Hagiography/history | Sourcing gate + certainty model per the history-content rules (see project memory / prior decisions); no invented artwork | pre-existing rules, unchanged |

## Verse-keying integrity (commentary)

- Keying is editorial, not textual: a note may sit a verse adjacent to its quote; every note must quote its lemma so misplacement is visible, never silent.
- The Psalms ingest maps Schaff's Hebrew numbering onto the app's Brenton arrangement and lemma-snaps each section. Current measured quality: 1,560 exact / 304 snapped / **170 unmatched of 2,034 markers** (kept claimed number, clamped).
- Rule: any future ingest must print alignment stats, and unmatched sections should be written to a review file. Implemented by `createAlignmentReport` in `scripts/lib/lemma-verify.mjs`; the files land in `docs/editorial/ingest-review/`, one per ingest. Any ingest built on that library gets both for free.
- Stronger rule where it can be met: an anchor should be **verified against the Scripture we already ship**, not matched by shape. `createLemmaVerifier` in the same file accepts a lemma only when its opening words really are the verse it claims, which makes a wrong anchor structurally impossible rather than merely unlikely. It is what recovered Matthew's missing chapter headings for 1, 11 and 15 by evidence, and what refuses a note at Matthew 3:19 in a chapter with seventeen verses. Calibrated on Mark, whose correct output is known and shipped: `node scripts/ingest-catena-aurea.mjs --book mark` must report **679 of 679 verified**. Do not retune `MATCH_TOKENS`, `MATCH_THRESHOLD` or `MIN_VERIFIED_RATE` without re-running it. (This rule used to add "and leave `data/bible/commentary/mark/` byte-identical". That half has been false since the EO purge landed, for two reasons, neither of them drift; see the pipeline note below. Restore Mark with `git checkout` after running the oracle.)
- A note anchored past the end of its chapter is unreachable, so both ingest paths now throw rather than warn. Where the source follows a different arrangement of the text, declare it: Schaff prints Chrysostom's Homily XXVII on "Rom. XIV. 25-27", following the manuscripts that place the doxology at the end of chapter 14, and `verseRemap` in `scripts/ingest-chrysostom-romans.mjs` moves it to the Romans 16:25 our own KJV carries. Never widen a `verseCounts` entry to silence the throw.
- **Decode a source with the encoding it declares, never with `res.text()`.** `fetch` picks its charset from the Content-Type header alone and never looks at the document. A server that omits the charset while the page declares windows-1252 in a meta tag therefore yields UTF-8 mojibake, and every smart quote and section sign becomes U+FFFD before a parser sees it. This is unrecoverable rather than cosmetic: the original bytes are gone once the string exists, and once the result is cached the loss is permanent. It shipped, in the largest work in the library. 795 of the 920 Job notes carried 11,125 replacement characters and a reader met "by ?the seven sons? is represented" throughout, from 2026-08-12 to 2026-08-19. Take `arrayBuffer()`, sniff the declared charset, decode deliberately. `decodeDeclared` in `scripts/ingest-gregory-job.mjs` is the pattern.
- **Decode numeric character references, never delete them.** `.replace(/&#\d+;/g, "")` removes characters from a verbatim text silently, and it fused `intoEgypt` and `confoundthem` in Job by eating the non-breaking spaces between words. Handle the hex form too: Pusey's and Payne Smith's Greek is set that way, and ignoring it put 2,617 literal `&#x03BA;`-style codes in front of readers of Cyril.
- **Never write an apparatus marker against text you have not fixed the encoding of first.** The marker for the editorial note in Job read `Note from ?. 74 above:`, where the `?` was a mojibaked `§`. A regex written against that would have stopped matching the moment the encoding was fixed, and the note would have returned unnoticed. Encoding first, always, then markers, and prefer a pattern that does not depend on the damaged character at all.
- **Back matter is not apparatus, and the cleaners cannot see it.** The two cleaners look for footnote apparatus inside a note. They are structurally unable to catch a slice that swallowed a whole region of a *different document*: an endnote list, the title page of the next work, an editor's appended essay. Those are ingest-layer defects and must be fixed at the ingest, where the source still carries the edition's own markers. Cut only on a doubly-positive signal, a rule the edition prints AND a second marker naming what follows, and prove afterwards that every surviving note is a strict prefix of what it replaced. Found three of these on 2026-08-19 (see F-25); `lib/bible/__tests__/commentaryIntegrity.test.ts` now forbids all three shapes.
- **A word count is a smell test, not a verdict.** The long-note ratchet never saw `matthew/7.json` v21, which sat at 2,989 words with 1,158 of them another book's front matter. Conversely the corpus's longest note is genuine. Bound the size, but test the markers.
- **The committed corpus is ingest output plus `scripts/apply-eo-saints-only.mjs` plus `scripts/clean-commentary-footnotes.mjs`, so re-running an ingest is only half the job.** The purge is a separate post-ingest stage and it is easy to forget: a raw re-run of the Catena on Mark restores 410 notes under Pseudo-Jerome, Pseudo-Chrysostom, The Gloss and Origen, and only the purge takes them out again. Note also that Mark is no longer byte-identical after a full re-run even with the purge applied, because the Catena merge re-inserts preserved foreign-source notes before rather than after its own. **So the Mark oracle's live half is the 679 of 679 lemma verification, which is the regression signal for `scripts/lib/`. Byte-identity is not, and has not been since the purge landed.**
- **Why the cleaner stage disguises itself.** Raw CCEL output carries editorial apparatus that reads as prose: manuscript notes ("Field reads *egelasate* with one or two mss."), stray "O.T." markers, orphaned reference headings. The cleaner strips them, and the shipped data has been through it. This matters because it disguises itself: re-running an untouched ingest today produces files that differ from what is committed, which looks like the source drifting under us and is not. Verified 2026-08-15 on Romans, where the whole difference was five apparatus segments in three notes. Run the cleaner dry after any ingest, read the "containing English" list, then `--apply`, and only then judge whether anything really moved. Apparatus has leaked to production twice already, in `john/21.json` and `psalms/150.json`.

## The coverage ceiling, and why it is not 100%

Run `node scripts/audit-corpus-coverage.mjs` for the current number. What follows
is why that number cannot keep climbing, established 2026-08-16 so nobody spends
another day rediscovering it.

**The Old Testament is the ceiling, and the reason is a decision taken in the
1840s.** The three translation programmes that put the Fathers into English
before copyright expiry, the Library of the Fathers (Oxford, 1838 to 1881), the
Ante-Nicene Fathers and the Nicene and Post-Nicene Fathers, between them
translated the patristic commentary on exactly **two** Old Testament books:

- **Job**, in Gregory the Great's Morals (LFC volumes 18, 21, 23 and 31)
- **Psalms**, in Augustine's Expositions (LFC volumes 24, 25, 30, 32, 37 and 39)

Both are already ingested. The omission was deliberate and the editors said so:
by leaving out the voluminous patristic commentaries on the Old Testament they
gained room for works they judged more useful. Everything else, Origen and
Chrysostom on Genesis, Jerome and Cyril on Isaiah, Origen on Jeremiah, Ephrem on
Genesis, first reached English in the twentieth century, in the Fathers of the
Church and Ancient Christian Writers series, and is in copyright.

So the 788 chapters sitting in books that carry nothing are not waiting on
effort. They are waiting on translations that do not exist in the public domain,
and mostly will not for decades. Isaiah is 66 of them, Jeremiah 52, Sirach 51,
Ezekiel 48.

**Named blocks, so they are not re-investigated:**

- **Ezekiel (48 chapters).** The only complete English of Gregory the Great's
  Homilies on Ezekiel is Theodosia Gray's, 1990, Center for Traditionalist
  Orthodox Studies. In copyright.
- **Genesis beyond chapter 1.** Basil's Hexaemeron (NPNF2-08, ingested) covers
  the six days. Chrysostom's Homilies on Genesis are FOTC 74, 82 and 87;
  Origen's are FOTC 71; Ambrose's Hexaemeron is FOTC 42. All refused.
- **Isaiah, Jeremiah, the Minor Prophets.** No pre-1929 English patristic
  commentary exists for any of them.

**What raising coverage still can mean.** Depth rather than breadth: a book with
one voice getting a second, or a Gospel carried by Catena fragments getting a
Father who reads it straight through. That is real work and worth doing. It just
does not move the chapter count, which is the number to stop optimising.

## Review queues (open)

### Clergy / theological review
1. **Revelation 20 — Victorinus of Pettau (F-05).** The extant ANF07 text carries chiliast readings. Needed: a short framing note that Victorinus writes before the Church's mature consensus and that literal millenarianism is not Orthodox teaching ("His kingdom shall have no end"). AI may draft; clergy approves wording before ship.
2. **Pre-Nicene councils copy** (from prior session records: Carthage copy shipped unreviewed). Status: stale/unverified this session — confirm and either clear or review.
3. **ChristosAnesti's publication permission: GRANTED, 2026-07-27** (owner-confirmed). This clears the attributed-library gate on all six studies imported from `#dogma-exegesis` and `#liturgics-forum`. It covers his work only. It does NOT unlock the modern copyrighted translations several of his citations rest on, which belong to third parties and stay out.
4. **Four dogma-exegesis studies drafted 2026-07-25**, staged in `docs/editorial/dogma-queue/` and deliberately NOT in `data/theology/`: the Council of Florence, St Theodore the Studite and Rome, St Justin Martyr and subordinationism, and penal substitution. All 41 patristic quotations were fetched and verified against their cited public-domain sources during drafting; the framing essays are AI-drafted and need approval as formulations. Each file's own `editorialNotes` array is the handover, and each names the passages most likely to be pressed on. Permission is now on record (item 3). See that directory's README.
5. **The seven ORIGINAL `/theology` studies do not survive a provenance audit: 16 quotations verify, 52 do not.** Run `node scripts/audit-florilegium.mjs data/theology` to reproduce; it requires 90% of a quotation's words present in order plus an 8-word verbatim anchor. The six studies added 2026-07-26 pass 73 of 73, so the failures are entirely in the originals: `original-sin.json` 0 of 13, `the-theotokos.json` 0 of 5, `filioque.json` 5 of 16 (including Maximus' Letter to Marinus, that study's load-bearing citation), `papacy.json` 4 of 14, `comma-johanneum.json` 3 of 8, `mark-longer-ending.json` 2 of 7 (one quotation is **James Snapp Jr, a living author, in a florilegium of Fathers**), `theosis.json` 2 of 5. The dominant cause is that **38 of those 68 entries carry no `source` field at all**, so nothing can be checked. The standing rule is public-domain sources only, cited per note. Found 2026-07-26 while fixing item 5, and larger than the defect that led to it. Run `node scripts/verify-florilegium.mjs data/theology` to reproduce. Worst first: `filioque.json` (9 uncited, including Maximus' Letter to Marinus, which is the load-bearing citation of the whole study), `original-sin.json` (10, several of them modern authors such as St Theophan, Justin Popović, Nektarios of Aegina and Peter Mogila, whose available English is modern and copyrighted), `comma-johanneum.json` (5), `mark-longer-ending.json` (5, one of which is **James Snapp Jr, a living author, quoted in a florilegium of Fathers**), `papacy.json` (6), `the-theotokos.json` (2), `theosis.json` (1). The standing rule is public-domain sources only, cited per note. Every one of these needs a public-domain source located and recorded, or the entry removed. Of the 30 that do carry a source, all point at newadvent.org and most verify; the script lists the individual stragglers. **This is live in production.**
6. **RESOLVED 2026-07-26: `data/theology/theosis.json` Athanasius entry.** The quotation had been silently altered from its cited NPNF source: it read "He became man that we might be made god" with lowercased divine pronouns and an added comma, where NPNF prints "For He was made man that we might be made God; and He manifested Himself by a body... and He endured the insolence of men that we might inherit immortality." Corrected against the raw source page and the reference sharpened to 54.3. **Method note for future checks: the source URL was fine all along.** `newadvent.org/fathers/2802.htm` carries all 57 sections; a fetch-and-summarise tool truncated the page at section 29 and produced a confident false report that section 54 was absent. Fetch the raw HTML and grep it before concluding a citation URL is wrong.

### Editorial review
1. **Psalms unmatched keying (F-06):** 170 sections; regenerate the list via the ingest script and spot-check the worst psalms. Seam psalms (9, 113-115, 146-147) were hand-verified 2026-07-11.
2. **RESOLVED 2026-08-16: author-name normalization.** The rail carried both "St. Augustine" and "St. Augustine of Hippo". Four notes used the second form, all of them from the Tractates on John (acts/9:4, john/1:18, john/3:16, john/14:6), against 2,989 using the first. They now read "St. Augustine". The author-count audit is the check: `node scripts/audit-author-veneration.mjs` names every distinct author, so a second spelling shows up as a separate row rather than hiding.

### Rights / legal (pre-existing, owner-owned)
- Real product photos to replace representative supplier-derived listings; LLC + product insurance; sales-tax registration; lawyer pass on ToS. No new items found 2026-07-11.

## Rules for AI agents writing in this repo

- Never fabricate or "restore" patristic text from model memory; ingest from a named public-domain source or do not add it.
- Never resolve a disputed theological question by editorial fiat; queue it here.
- Patch notes and marketing may not claim a feature that is dark in production (see F-07: reviews require the prod migration before being described as live).
