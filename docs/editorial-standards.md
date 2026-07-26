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
- Rule: any future ingest must print alignment stats, and unmatched sections should be written to a review file.

## Review queues (open)

### Clergy / theological review
1. **Revelation 20 — Victorinus of Pettau (F-05).** The extant ANF07 text carries chiliast readings. Needed: a short framing note that Victorinus writes before the Church's mature consensus and that literal millenarianism is not Orthodox teaching ("His kingdom shall have no end"). AI may draft; clergy approves wording before ship.
2. **Pre-Nicene councils copy** (from prior session records: Carthage copy shipped unreviewed). Status: stale/unverified this session — confirm and either clear or review.
3. **Four dogma-exegesis studies drafted 2026-07-25**, staged in `docs/editorial/dogma-queue/` and deliberately NOT in `data/theology/`: the Council of Florence, St Theodore the Studite and Rome, St Justin Martyr and subordinationism, and penal substitution. All 41 patristic quotations were fetched and verified against their cited public-domain sources during drafting; the framing essays are AI-drafted and need approval as formulations. Each file's own `editorialNotes` array is the handover, and each names the passages most likely to be pressed on. **Also gated on ChristosAnesti's explicit publication permission**, which is not on record for these four. See that directory's README.
4. **`data/theology/theosis.json` cites a source that does not contain its quotation.** The St Athanasius entry references *On the Incarnation* 54 at `newadvent.org/fathers/2802.htm`; that page covers sections 1 to 29 only, and the quoted wording differs from the NPNF rendering, so a modern translation may be quoted under a public-domain citation. Verified 2026-07-25. **This is live in production.** Correct to NPNF wording with a working source, or remove the entry.

### Editorial review
1. **Psalms unmatched keying (F-06):** 170 sections; regenerate the list via the ingest script and spot-check the worst psalms. Seam psalms (9, 113-115, 146-147) were hand-verified 2026-07-11.
2. **Author-name normalization:** commentary data contains both "St. Augustine" and "St. Augustine of Hippo" (john/1.json). Cosmetic; normalize when convenient.

### Rights / legal (pre-existing, owner-owned)
- Real product photos to replace representative supplier-derived listings; LLC + product insurance; sales-tax registration; lawyer pass on ToS. No new items found 2026-07-11.

## Rules for AI agents writing in this repo

- Never fabricate or "restore" patristic text from model memory; ingest from a named public-domain source or do not add it.
- Never resolve a disputed theological question by editorial fiat; queue it here.
- Patch notes and marketing may not claim a feature that is dark in production (see F-07: reviews require the prod migration before being described as live).
