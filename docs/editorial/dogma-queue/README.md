# Dogma-exegesis import queue

Four long-form studies drafted on 2026-07-25 from the remaining
`#dogma-exegesis` threads on the Purify Discord. **None of these ship until
a clergy reviewer signs them off and the author's permission is on record.**
They live here, and not in `data/theology/`, on purpose: the app reads that
directory at request time, so a file placed there is published.

| File | Group | Florilegium | Editorial notes |
| --- | --- | --- | --- |
| `council-of-florence.json` | ecclesiology | 10 | 28 |
| `theodore-the-studite-and-rome.json` | ecclesiology | 8 | 24 |
| `justin-martyr-subordinationism.json` | trinity | 13 | 23 |
| `penal-substitution.json` | soteriology | 10 | 21 |

## Why they are not live

`docs/editorial-standards.md` is binding on two points that both apply here:

1. **AI may draft editorial framing only into a review queue.** The essays
   are drafted, not written by a priest. The framing of penal substitution
   and of Florence in particular are formulations, not reportage, and they
   need approval as formulations.
2. **The content is a member's work.** The threads are ChristosAnesti's
   (`@glorytochrist13_`), who credits two other members inside them.
   Publication is gated on his explicit permission under the
   attributed-library model, the same gate the earlier seven studies passed.
   That permission is **not** on record for these four.

## What the rights pass actually did

The drafting agents claimed all 41 quotations were verified against their
cited URLs. **Do not take that claim at face value**, because they used a
summarising fetch tool, and that tool truncates. Re-checked against raw page
bytes with `node scripts/verify-florilegium.mjs`:

| Result | Count | What it means |
| --- | --- | --- |
| OK | 29 | Full word sequence found on the cited page |
| PARTIAL | 5 | 60 to 99 percent contiguous. Usually New Advent splicing inline scripture references into the text, or an elision |
| UNVERIFIED | 7 | Words not on that page. **These need an editor** |

The two worst are both in `council-of-florence.json` and are the same
problem twice: **Ivan Ostroumoff cited to
`archive.org/details/historycouncilf00nealgoog`, which is a catalogue
landing page containing no book text**, so neither quotation can be checked
at its source. One of them is the duress passage the Florence essay leans on
materially ("The Pope found this the best way of making the Greeks
obedient"). Ostroumoff is also a nineteenth-century historian sitting in a
florilegium of Fathers, which is a category error even if the text checks
out. Either source him to a page-level scan or move him into the essay as
narrative.

Note also that quotations here carry **commas where NPNF and ANF print em
dashes**, because the house style forbids em dashes. That is why the
verifier ignores punctuation. It is a real editorial decision, silently
altering punctuation inside quotation marks, and it deserves a ruling: keep
the source's dash inside quotations, or keep normalising and say so.

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
