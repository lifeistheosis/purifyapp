# The August menologion, saints workstream

**Opened.** 2026-08-02
**Goal.** Every commemoration in `data/calendar/daily-saints.json` for `08-01` through `08-31` resolves to a saint profile with a Life, and to public-domain writings wherever a corpus exists.
**Companion to.** `SAINTS-AUDIT.md` (the corpus-depth audit) and `docs/editorial-standards.md` (the binding sourcing rules).

## Why the month, not the saint

The calendar already carries all 31 August days with 61 commemorations. Most of them are dead text: they name a saint and give a repose year, and there is nothing to tap. This workstream turns the month into a navigable surface. The unit of work is the day, not the celebrity, so the small martyrs get the same treatment as Cyprian.

## Sourcing rules in force

Unchanged from `docs/editorial-standards.md`, restated because this workstream generates a lot of hagiography quickly:

1. **Primary texts are verbatim or absent.** A saint's own writing, or an ancient Passion or Life written by someone else, ships only from a named public-domain edition (ANF, NPNF, Wikisource transcriptions of the same). It is never reconstructed from memory, never modernized, never paraphrased into quotation form.
2. **The `life[]` prose is an editorial digest**, third-person, in the Purify voice, built from attested hagiography. That class is permitted with citation. It is not presented as anyone's quoted words.
3. **Every Life JSON carries a `source` field** naming what the account rests on. Where the substance is the common synaxarion tradition, say that in plain words rather than dressing it in a citation it does not have.
4. **No invented detail.** Where the tradition is thin, the entry is short. Where the tradition is disputed (a saint's dates, whether two figures are one person), the entry says so.
5. **Modern translations are not public domain.** This bites hardest on the Russian saints of August (Tikhon of Zadonsk, Herman of Alaska, Job of Pochaev). Their own writings exist in English only in copyrighted translations, so those entries ship with a Life and no primary text until a public-domain English edition is located.

## The network constraint

The shell in this environment has no outbound DNS. Verbatim primary text therefore cannot be fetched during an editing session. The pattern, already used for the Daniel additions:

- Registry entries, group tags, Life JSONs, calendar wiring: written directly.
- Verbatim public-domain corpora: written as an ingest script with hard assertions on section counts, handed to the owner as one command.

`ccel.org` is unreachable even from the fetch tool at present. Wikisource is reachable and carries clean single-page transcriptions of the same ANF and NPNF text, so the August ingest targets Wikisource.

## Inventory

Status key: **live** = profile exists and the calendar links to it. **held** = deliberately not profiled, see below. **scripture** = the commemoration's primary text is Scripture, already in the app, and the profile cross-links rather than duplicating. Every row below is current as of the two commits on `feat/august-menologion`.

| Day | Commemoration | Slug | Status | Life source | Primary text (PD) |
|---|---|---|---|---|---|
| 08-01 | Procession of the Cross | (feast) | live | | |
| 08-01 | Seven Holy Maccabean Martyrs, Solomonia, Eleazar | `maccabean-martyrs` | live | 2 Maccabees 6-7 | **2 Macc 6-7** (Brenton LXX, in app); **St. Gregory the Theologian, Oration 15 on the Maccabees** (NPNF2 Vol 7) |
| 08-02 | Translation of the relics of Stephen | `stephen-the-protomartyr` | live | Acts 6-7 | **Acts 6-7** (KJV and Brenton, in app) |
| 08-02 | Blessed Basil, Fool-for-Christ of Moscow | `basil-the-blessed` | live | Russian synaxarion | none PD |
| 08-03 | Isaac, Dalmatus and Faustus of the Studion | `dalmatus-of-constantinople` | live | Synaxarion | none PD |
| 08-03 | Anthony the Roman of Novgorod | `anthony-the-roman` | live | Novgorod Life | none PD |
| 08-04 | Seven Sleepers of Ephesus | `seven-sleepers-of-ephesus` | live | Synaxarion; Gregory of Tours | none PD in English |
| 08-04 | Virgin-martyr Eudocia of Persia | `eudocia-of-persia` | held | Synaxarion | none |
| 08-05 | Forefeast of the Transfiguration | (feast) | live | | |
| 08-05 | Martyr Eusignius of Antioch | `eusignius-of-antioch` | live | Synaxarion | none |
| 08-06 | Transfiguration | (feast) | live | | St. Ephraim, On the Transfiguration (already in app) |
| 08-07 | Venerable-martyr Dometius the Persian | `dometius-the-persian` | live | Synaxarion | none |
| 08-07 | Or of the Thebaid | `or-of-the-thebaid` | live | Palladius, *Lausiac History* | **Lausiac History** ch. on Or (PD) |
| 08-08 | Aemilian the Confessor of Cyzicus | `aemilian-of-cyzicus` | live | Synaxarion | none |
| 08-08 | Myron the Wonderworker of Crete | `myron-of-crete` | live | Synaxarion | none |
| 08-09 | Apostle Matthias | `apostle-matthias` | live | | |
| 08-09 | Herman of Alaska | `herman-of-alaska` | live | Valaam Life (1894); the mission records | none PD in English |
| 08-10 | Lawrence the Archdeacon of Rome | `lawrence-the-archdeacon` | live | **St. Ambrose, On the Duties of the Clergy I.41** (NPNF2 Vol 10); Prudentius, *Peristephanon* II | **Ambrose I.41** (PD) |
| 08-10 | Sixtus II, Pope of Rome | `sixtus-of-rome` | live | **Cyprian, Epistle 80** (ANF Vol 5) | **Epistle 80** (PD) |
| 08-11 | Euplus the Deacon of Catania | `euplus-of-catania` | live | The *Acts of Euplus* (court record, Ruinart) | **Acts of Euplus** (PD) |
| 08-11 | Theodore and Vasily of the Kiev Caves | `theodore-and-vasily-of-the-caves` | live | *Kiev Caves Paterikon* | none PD in English |
| 08-12 | Photius and Anicetus of Nicomedia | `photius-and-anicetus` | live | Synaxarion | none |
| 08-12 | Pamphilus and Capito | `pamphilus-and-capito` | held | Synaxarion | none |
| 08-13 | Translation of the relics of Maximus the Confessor | `maximus-the-confessor` | live | | |
| 08-13 | Tikhon of Voronezh and Zadonsk | `tikhon-of-zadonsk` | live | Russian synaxarion; his own retirement records | none PD in English (his works are modern translations) |
| 08-14 | Prophet Micah | `prophet-micah` | live, scripture | | **Micah** (Brenton LXX, in app) |
| 08-15 | Dormition | `theotokos` | live | | |
| 08-16 | Translation of the Image Not Made by Hands | (feast) | live | | tied to `thaddeus-of-edessa` |
| 08-16 | Martyr Diomedes the Physician | `diomedes-the-physician` | live | Synaxarion | none |
| 08-17 | Martyr Myron of Cyzicus | `myron-of-cyzicus` | live | Synaxarion | none |
| 08-17 | Straton, Philip and Eutychian | `straton-and-companions` | held | Synaxarion | none |
| 08-18 | Floros and Lauros of Illyricum | `floros-and-lauros` | live | Synaxarion | none |
| 08-18 | John and George of Constantinople | `john-and-george-of-constantinople` | held | Synaxarion | none |
| 08-19 | Andrew Stratelates and the 2,593 | `andrew-stratelates` | live | Synaxarion | none |
| 08-19 | Donskoy Icon | (icon) | out of scope | | |
| 08-20 | Prophet Samuel | `prophet-samuel` | live, scripture | | **1 Kingdoms** (Brenton LXX, in app) |
| 08-21 | Apostle Thaddeus of the Seventy | `thaddeus-of-edessa` | live | **Eusebius, Ecclesiastical History I.13** (NPNF2 Vol 1) | **SHIPPED**: Eusebius EH I.13 (20 sections), the Abgar correspondence and the mission of Thaddeus |
| 08-21 | Abraham of Smolensk | `abraham-of-smolensk` | live | Russian Life by Ephraim | none PD in English |
| 08-22 | Agathonicus and companions | `agathonicus-of-nicomedia` | live | Synaxarion | none |
| 08-22 | Anthusa and her servants | `anthusa-the-martyr` | held | Synaxarion | none |
| 08-23 | Irenaeus of Lyons | `irenaeus-of-lyons` | live | | |
| 08-23 | Hieromartyr Lupus | `lupus-of-thessaloniki` | live | Synaxarion | none |
| 08-24 | Eutyches, disciple of John the Theologian | `eutyches-the-disciple` | held | Synaxarion | none |
| 08-24 | Peter, Metropolitan of Moscow | `peter-of-moscow` | live | Russian Life by Cyprian of Kiev | none PD in English |
| 08-25 | Translation of the relics of Bartholomew | `apostle-bartholomew` | live | | |
| 08-25 | Apostle Titus of the Seventy | `titus-of-crete` | live | Titus, 2 Timothy 4:10, 2 Corinthians | **Chrysostom, Homilies on Titus** (already in app, cross-linked) |
| 08-26 | Adrian and Natalia of Nicomedia | `adrian-and-natalia` | live | Synaxarion | none |
| 08-26 | Vladimir Icon | (icon) | out of scope | | |
| 08-27 | Pimen the Great | `pimen-the-great` | live | **Apophthegmata Patrum**; Palladius | **The Sayings of Abba Poemen** (Budge, *The Paradise of the Fathers*, 1907, PD) |
| 08-27 | Phanourios the Newly-Revealed | `phanourios-the-newly-revealed` | live | Rhodian tradition | none |
| 08-27 | Hosius of Cordova | `hosius-of-cordova` | live | | |
| 08-28 | Moses the Ethiopian of Scete | `moses-the-ethiopian` | live | **Apophthegmata Patrum**; Sozomen VI.29; Palladius | **The Sayings of Abba Moses** (Budge, PD); **Sozomen VI.29** (NPNF2 Vol 2) |
| 08-28 | Augustine of Hippo | `augustine-of-hippo` | live | | |
| 08-28 | Job of Pochaev | `job-of-pochaev` | live | Life by Dositheus | none PD in English |
| 08-29 | Beheading of the Forerunner | `john-the-baptist` | live | | |
| 08-30 | Alexander, John and Paul the New of Constantinople | `patriarchs-alexander-john-paul` | live | Synaxarion | none |
| 08-30 | Alexander of Svir | `alexander-of-svir` | live | Life by Irodion | none PD in English |
| 08-31 | Deposition of the Sash | (feast) | live | | |
| 08-31 | Cyprian, Bishop of Carthage | `cyprian-of-carthage` | live | **Pontius the Deacon, Life and Passion of Cyprian** (ANF Vol 5) | **SHIPPED**: Pontius's Life (19ch), On the Unity (27ch), On the Lord's Prayer (36ch), On the Mortality (26ch). Still available: the other 8 treatises, 82 epistles, the Seventh Council of Carthage |

## The six held commemorations

Six commemorations were deliberately left without a profile rather than given a padded one. In each case what survives is a name, a place, a manner of death and a year, and nothing else: Eudocia of Persia (08-04), Pamphilus and Capito (08-12), Straton, Philip and Eutychian (08-17), John and George of Constantinople (08-18), Anthusa and her servants (08-22), and Eutyches the disciple of John the Theologian (08-24). They keep their line in the menologion with the name and the note, which is the whole of what the Church has kept about them, and the calendar shows it. A profile page whose Life is three sentences of inference would be worse than the line.

If a synaxarion account turns up with real content in it, any of the six is a small addition: a registry entry, a group tag, and one line in the calendar wiring.

## The one large corpus

Cyprian is the reason August is worth doing as a month. He is the largest patristic body in the calendar's August that is not already in the app: eighty-two letters, twelve genuine treatises, plus a contemporary biography by his own deacon who watched him die. `On the Unity of the Church` and `On the Lord's Prayer` are the two that matter most to the reader, and the Life by Pontius is the earliest Christian biography of a bishop that survives.

Priority order for the Cyprian ingest:

1. Pontius, *The Life and Passion of Cyprian* (19 chapters)
2. *On the Unity of the Church* (27 chapters)
3. *On the Lord's Prayer* (36 chapters)
4. *On the Mortality* (26 chapters), written in the plague of 252, the pastoral text the app most needs
5. *On Works and Alms*, *On the Advantage of Patience*, *On Jealousy and Envy*, *On the Lapsed*, *To Donatus*
6. The Epistles, selected, beginning with Epistle 80, the notice of Sixtus II's death, which is also the primary source for the 08-10 entry

## Running the ingest

One command, from the repo root, on a machine with network:

```
node scripts/ingest-august-works.mjs
```

It fetches five works from Wikisource, caches the raw wikitext under `.cache/wikisource/` (gitignored), writes the JSON under `data/saints/`, and prints the `Work` entries to paste into `lib/saints/saints.ts`. It writes nothing on a bad fetch: `scripts/lib/wikisource.mjs` aborts a work if the parsed chapter count does not match the expected count exactly, if the numbering has a gap, or if any chapter comes out nearly empty. A partial text is worse than no text, so the failure mode is a non-zero exit and an untouched `data/`.

What it lands:

| Saint | Work | Chapters |
|---|---|---:|
| Cyprian | Pontius, The Life and Passion of Cyprian | 19 |
| Cyprian | On the Unity of the Church | 27 |
| Cyprian | On the Lord's Prayer | 36 |
| Cyprian | On the Mortality | 26 |
| Thaddeus | Eusebius, Church History I.13, the Abgar documents | 20 |

After pasting the registry entries, `npx vitest run lib/saints/__tests__/saints.integrity.test.ts` is the check: it fails if a registered work has no file, if a file disagrees with the registry on its slugs, if a writing carries no source, or if a menologion entry points at a saint that does not exist.

### Status: run, and what the first run exposed

**All five landed, 128 chapters, roughly 31,500 words of Cyprian and Eusebius, registered and live.**

The first live run found three defects that no amount of offline reasoning had:

1. **404 on the Lord's Prayer.** The page title was written pre-encoded as `On_the_Lord%27s_Prayer`, and `fetchWikitext` runs `encodeURIComponent` over it, so the percent sign became `%25` and the request asked for `%2527`. Titles now carry the literal apostrophe.

2. **`==Footnotes==` shipped as verbatim text.** The stripper handled templates, refs, spans and links but not heading syntax, so every one of the four files that did land ended with a paragraph of Wikisource's own markup sitting inside a Father's text. Headings are now removed, and `splitNumberedChapters` aborts on any surviving markup rather than trusting the stripper to have been exhaustive.

3. **Em dash handling, wrong twice.** Site policy converts em dashes to commas, and the nineteenth-century editions punctuate with a mark before the dash constantly, so a blind swap produced "divine teachings,, foundations". The substitution is now punctuation-aware. It also has to match horizontal whitespace only: the first attempt let a dash consume the blank line after CCEL's "Argument." block, which merged the editorial summary into chapter 1 and silently cost the treatise its first chapter.

Defect 3 is the one worth remembering. It did not throw and it did not look wrong on the page. The count assertion caught it, because 36 chapters had quietly become 35. **Assert the expected count even when the parse looks clean.**

## Open questions for the owner

1. **Sicilian and Western martyrs.** Lawrence, Sixtus, Euplus and Cyprian are pre-Schism Western saints on the Eastern calendar, the same category as Florian of Lorch, who is already live. No new precedent, noted for completeness.
2. **The Russian block** (Basil the Blessed, Tikhon, Herman, Job, Alexander of Svir, Abraham of Smolensk, Peter of Moscow, Anthony the Roman, Theodore and Vasily). Nine entries whose Lives are secure but whose own writings exist in English only under copyright. They ship with a Life and no works. If a public-domain nineteenth-century English edition of Tikhon turns up, that is the single highest-value addition to the group.
3. **Group tagging.** August adds a large number of martyrs and Russian monastics. Consider whether `SAINT_GROUPS` wants a `russian` or `new-world` group, or whether `martyrs` and `desert-monastics` carry the load.
