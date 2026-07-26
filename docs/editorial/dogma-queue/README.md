# Dogma-exegesis and liturgics import queue

Six long-form studies brought over from the Purify Discord: four from
`#dogma-exegesis` (drafted 2026-07-25) and two from `#liturgics-forum`
(drafted 2026-07-26). All six are ChristosAnesti's threads.

**These are now LIVE in `data/theology/`.** Leona instructed publication on
2026-07-26. This directory is no longer a gate; it is the drafting and review
record, kept because each file's `editorialNotes` array is the handover a
clergy reviewer needs and none of that belongs in reader-facing data.

| File | Group | Florilegium shipped | Editorial notes |
| --- | --- | --- | --- |
| `council-of-florence.json` | ecclesiology | 9 | 45 |
| `theodore-the-studite-and-rome.json` | ecclesiology | 8 | 29 |
| `justin-martyr-subordinationism.json` | trinity | 13 | 30 |
| `penal-substitution.json` | soteriology | 10 | 28 |
| `the-divine-liturgy.json` | liturgics | 17 | 18 |
| `vestments.json` | liturgics | 16 | 21 |

`liturgics` is a new group in `lib/theology/topics.ts`, labelled "The worship
of the Church".

## What is still owed, now that they are live

Publication did not settle these. They are the reason the notes are kept.

1. **Clergy review of the framing.** The essays are AI-drafted. The
   formulations most likely to be pressed on are named in each file's notes:
   the both/and on penal substitution, the reception argument on Florence,
   and the concession that St Theodore in practice gave Rome a weight above
   the other thrones.
2. **ChristosAnesti's permission, on the record.** The precedent is strong
   rather than absent: seven earlier studies from the same forum by the same
   author shipped under the attributed-library model, he is listed as a
   Contributor on /about, and he volunteered material publicly in
   `#purify-suggestions`. But no explicit permission for these six is
   recorded anywhere. Ask him and write the answer down.
3. **A contested citation.** Cyprian, On the Unity of the Church chapter 4
   survives in two ancient recensions, and the other one carries the chair of
   Peter primacy language. A study about Roman claims should either frame
   that or drop the entry. Verifying the words does not settle it.

## Quotations: what was checked and what was removed

### The drafting agents overstated their verification

Each drafting and repair agent claimed it had verified every quotation
against its cited source. **Do not take that claim at face value.** They used
a summarising fetch tool, and that tool truncates long pages and then answers
confidently from the truncation.

Two scripts now do the checking instead, both fetching raw bytes:

- `scripts/verify-florilegium.mjs` reports the longest CONTIGUOUS run. Good
  for spotting an altered quotation, but it under-reports whenever the source
  page splices apparatus into the middle of a quote.
- `scripts/audit-florilegium.mjs` is the one that decides, and the one that
  ran before these shipped. It requires BOTH that 90% of the quote's words
  appear in order AND that at least 8 consecutive words appear verbatim.
  `--drop` removes anything that fails.

**The anchor requirement is not a detail.** In-order coverage alone is nearly
meaningless over a large corpus: the Hapgood Service Book OCR is about 1.6
million words, and almost any English word sequence can be traced through it
in order. The Cherubic Hymn quotation scored **100% in order** against that
book while containing "mystically" and "thrice-holy", neither of which
appears in it anywhere. Its longest verbatim run was 6 words. It was a modern
rendering attributed to a 1906 translation, and only the anchor caught it.

Final state, 75 quotations audited: **73 kept, 2 removed.**

| Removed | Why |
| --- | --- |
| `the-divine-liturgy.json` Cherubic Hymn, cited to Hapgood 1906 | No contiguous anchor, best run 6 words. Not Hapgood's wording |
| `vestments.json` Hapgood on the symbolism of vestments | Only 53% of words present in order |

Two Ostroumoff entries in `council-of-florence.json` had cited
`archive.org/details/...`, which is a catalogue landing page carrying no book
text. Those were repaired in the same pass: `audit-florilegium.mjs` now
rewrites an archive.org detail URL to its `_djvu.txt` full text before
checking, so they verify properly. Florence came through the audit clean.

Note that quotations here carry **commas where NPNF and ANF print em
dashes**, because the house style forbids em dashes. That is why both scripts
ignore punctuation. It is a real editorial decision, silently altering
punctuation inside quotation marks, and it deserves a ruling: keep the
source's dash inside quotations, or keep normalising and say so.

Other findings worth knowing:

- A St Gregory the Theologian quotation (Epistle 101) had been silently
  **reordered inside the quotation marks** by the drafter. Corrected against
  the source and re-verified. This is the exact class of error that a
  fluent-sounding draft hides best.
- Three passages were reproducing **modern copyrighted wording unmarked**
  (a St Philaret catechism phrase, a Sysoev clause, a St Germanus image).
  All three were rewritten to carry the argument without the words.
- New Advent injects inline scripture references into the ANF text
  (`Philippians 2:8` and similar). These are site apparatus, not the
  translator's, and were stripped. The ANF translator's own square brackets
  were kept.
- A long list of quotations from the source threads is **deliberately
  absent** because only modern translations could be found: Germanus of
  Constantinople, Symeon the New Theologian, Fulgentius of Ruspe, Philotheos
  Kokkinos, Proclus of Constantinople, Photios, Innocent of Alaska, Innocent
  of Penza. Several would strengthen the studies. None may be used until a
  pre-1929 English translation is located.

Every file's own `editorialNotes` array is the real handover. Read it before
the essay.

## Defect found in already-published content, now fixed

`data/theology/theosis.json` carried a St Athanasius entry whose text had
been silently altered from the NPNF source it cites. It read "He became man
that we might be made god", with the divine pronouns lowercased and a comma
added. NPNF prints:

> For He was made man that we might be made God; and He manifested Himself
> by a body that we might receive the idea of the unseen Father; and He
> endured the insolence of men that we might inherit immortality.

Corrected 2026-07-26, and the reference sharpened from a bare "54" to
"54.3 (NPNF Second Series, vol. 4)".

**Method note, worth more than the fix.** The first pass concluded the
source URL was wrong, because a fetch-and-summarise tool reported that
`newadvent.org/fathers/2802.htm` covered only sections 1 to 29 and did not
contain the passage. That was false. The page carries all 57 sections; the
tool had truncated it and then answered confidently from the truncated text.
The URL was right and the quotation was wrong, which is the opposite of the
diagnosis. **Before concluding a citation URL is broken, fetch the raw HTML
and grep it.** A summarising fetch will invent a clean negative.

## The two apologetics threads

`My reasoning against Atheism` and `God, Necessity, and Metaphysical Dead
Ends` are not in this queue. They are apologetics rather than dogma, and
`data/apologetics/atheism.json` already exists, so they belong as an
enrichment of that topic rather than as new studies. Not started.
