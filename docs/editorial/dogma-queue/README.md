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

Every one of the 41 florilegium entries was fetched live from its cited URL
during review and confirmed present, in that translation, attributed to that
Father, at that reference. Entries that could not be confirmed were dropped
rather than guessed. Findings worth knowing:

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

## Defect found in already-published content

`data/theology/theosis.json` carries a St Athanasius entry citing *On the
Incarnation* 54 with the source URL
`https://www.newadvent.org/fathers/2802.htm`. **That page covers sections 1
to 29 and does not contain section 54 or the quoted sentence** (verified
2026-07-25). The quoted wording ("He became man that we might be made god")
also differs from the standard NPNF rendering ("For He was made man that we
might be made God"), which suggests a modern translation is being quoted
under a public-domain citation.

No replacement URL is guessed here. An editor should either correct the entry
to the NPNF wording with a working public-domain source, or remove it. This
is live on production today.

## The two apologetics threads

`My reasoning against Atheism` and `God, Necessity, and Metaphysical Dead
Ends` are not in this queue. They are apologetics rather than dogma, and
`data/apologetics/atheism.json` already exists, so they belong as an
enrichment of that topic rather than as new studies. Not started.
