# Ingest review files

Generated. Do not hand-edit: the header of each file names the command that
rebuilds it.

`docs/editorial-standards.md` requires that any ingest print alignment stats and
write its unmatched sections somewhere a person can read them afterwards. A
printed stat scrolls off; this directory is the part that survives the run.

One file per ingest, written by `createAlignmentReport` in
`scripts/lib/lemma-verify.mjs`. Each carries:

- **Alignment.** How many lemmas verified against the Scripture we ship, how
  many candidates were refused as ordinary prose, and the floor below which the
  matcher is treated as broken rather than the data as messy.
- **Unmatched candidates.** Lines shaped like a lemma that did not match the
  verse they claimed. None of this text was dropped: it stayed with the anchor
  above it, so what needs review is that anchor, not the words.
- **Lemmas needing an editor.** Where the reference printed by the source and
  the arrangement of the text we ship disagree. Nothing is moved on a guess.
  These end either in a `verseRemap` entry naming the arrangement they
  reconcile, or in a decision that the printed reference is right.
- **Unrecognised speaker labels.** Names the speaker map does not know. These
  were folded into the preceding note and never written as authors, because an
  unmapped label misattributes rather than omits: two hundred notes were handed
  to Rabanus in Matthew before that was caught.

The files carry no timestamp on purpose. Re-running the same ingest against the
same source should leave the tree clean, so a changed review file always means
changed evidence.
