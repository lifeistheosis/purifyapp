# Saints corpus — gap audit

**Date.** 2026-05-23
**Scope.** 47 saints in `lib/saints/saints.ts`. Audited against the realistic public-domain ceiling (NPNF Series 1 & 2, ANF, CCEL, Wikisource, Project Gutenberg, and pre-1929 English translations of the Russian-tradition fathers).
**Companion to.** `AUDIT.md` (overall site audit). This file is the per-saint expansion plan that backs audit gap C1 ("content depth").

## Headline

Two kinds of gap are present:

1. **Saints with too few works.** 22 of 47 registry entries have either zero or one work shipped, against a realistic PD-available corpus of three or more. This is the larger gap.
2. **Existing works are excerpts, not full texts.** The pre-audit Ignatius/Romans entry was labeled "Sections 1 to 4" and shipped only three sections out of ten chapters. Spot-checking suggests this is the rule, not the exception — most current works are samples extracted into the project's section format, not the underlying text in full. **Expanding existing entries to the full source matters as much as adding new works.**

This commit closes the gap on three works as a proof-of-pattern: Ignatius/Romans (3 → 10 chapters), Ignatius/Ephesians (new, 21 chapters), Polycarp/Philippians (new, 14 chapters). The rest of the table below names what to grind through next.

## Per-saint inventory

Sorted by ROI on the clergy-vetter lens: Apostolic Fathers first (the chain to the apostles is the most-checked dimension), then the Cappadocians, then the Christological fathers, then the late-Patristic and Russian saints.

| Saint | Now | Realistic PD ceiling | Highest-priority adds |
| --- | --- | --- | --- |
| **Ignatius of Antioch** | Ephesians (NEW, full) + Romans (NOW full, 10ch) | All 7 authentic epistles | **Magnesians, Trallians, Philadelphians, Smyrnaeans, To Polycarp** (5 short letters, ~5-15 chapters each, ANF Vol 1, Roberts-Donaldson PD via Wikisource) |
| **Polycarp of Smyrna** | Philippians (NEW, full 14ch) + "Eighty and Six Years" thematic compilation | Epistle to the Philippians + The Martyrdom of Polycarp | **The Martyrdom of Polycarp** (ANF Vol 1, ~21 short sections) |
| **Papias of Hierapolis** | 1 (fragment compilation) | Fragments of the *Exposition of the Sayings of the Lord* | **Complete fragments** as preserved in Eusebius (ANF Vol 1) |
| **Irenaeus of Lyons** | 1 (*Against Heresies* III-V excerpts) | *Against Heresies* Books I-V (full), *Proof of the Apostolic Preaching* | **Against Heresies Book I-II** (anti-Gnostic foundational); **Proof of the Apostolic Preaching** (his summary catechism) |
| **Apostolic Fathers (not in registry as a saint)** | — | Didache, 1 Clement, 2 Clement, Epistle of Barnabas, Shepherd of Hermas | The Didache is the single most-cited extra-canonical Christian text. Add as a standalone work, possibly under a new "Anonymous Apostolic Fathers" registry entry or attached to the relevant Apostle |
| **Athanasius the Great** | 5 (On the Incarnation, Discourses against Arians, On the Councils, Life of Antony, ?) | NPNF2 Vol 4 covers his entire output | **Festal Letters**, **De Decretis** (full text not yet shipped) |
| **Basil the Great** | 1 (*Hexaemeron*) | NPNF2 Vol 8 = 800+ pages | **On the Holy Spirit** (foundational pneumatology); **Letters** (select 30 of 369); **Longer Rule** (monastic foundation) |
| **Gregory the Theologian** | 1 (First Theological Oration) | NPNF2 Vol 7 | **Remaining Four Theological Orations** (2-5); **Festal Orations** (select); **Letters** (curated 20) |
| **Gregory of Nyssa** | 0 | NPNF2 Vol 5 | **Great Catechetical Oration**; **Life of Moses**; **On Virginity** |
| **John Chrysostom** | 20 (homilies on John + many of the Pauline epistles + On the Priesthood + Paschal Homily) | NPNF1 Vol 9-14 = the largest patristic corpus in PD | **Homilies on Matthew** (90 homilies — Chrysostom's longest exegetical series); **Homilies on Acts** (55 homilies); **On the Statues** (his famous 21 Lenten homilies) |
| **Cyril of Jerusalem** *(not in registry)* | — | The 23 Catechetical Lectures (NPNF2 Vol 7) | Worth adding as a registry entry. The Catechetical Lectures are the standard fourth-century catechumenate text |
| **Cyril of Alexandria** | 1 (*Commentary on John* selections) | LFC + select PD | **Full Commentary on John** (12 books); **On the Unity of Christ** |
| **John of Damascus** | 1 (*Exposition* excerpt) | NPNF2 Vol 9 | **Complete Exposition of the Orthodox Faith** (4 books, ~100 chapters); **Three Apologies on the Divine Images** |
| **Maximus the Confessor** | 1 (Four Hundred Chapters on Love, First Century) | Philokalia + PD selections | **The remaining three Centuries on Love**; **Mystagogy** (his short liturgical commentary) |
| **Symeon the New Theologian** | 1 | Limited pre-1929 English | **The Discourses** (selected; the modern Pueblo / Paulist Press translations are NOT PD — work from older sources only) |
| **Augustine of Hippo** | 2 (*Confessions* Book I + homily selections) | NPNF1 Vol 1-8 = enormous | **Confessions Books II-X**; **Tractates on John 1-20** (the first 20 of 124); **On the Trinity** Book I |
| **Anthony the Great** | 1 | The Letters of Anthony (PD selections via Lives of the Desert Fathers) | **Letters of Anthony**; **Sayings** (Apophthegmata) |
| **Seraphim of Sarov** | 1 (Spiritual Instructions) | Selected — *Conversation with Motovilov*, Spiritual Instructions, prayer rules (PD English exists, Helen Kontzevitch period) | **Conversation with Motovilov on the acquisition of the Holy Spirit** (the central Seraphim text); **Little Rule of the Mother of God** |
| **Paisios the Athonite** | 2 | LIMITED — most Paisios material is copyright Holy Monastery of Souroti; use only what's clearly PD | Hold; tread carefully on copyright. The Wisdom-Books series is copyrighted |
| **The Theotokos** | 1 (*The Magnificat*) | Hymnographic + scriptural | **The Akathist Hymn to the Theotokos** (PD Greek + multiple PD English translations); **Selected stichera from the Octoechos** (PD via Hapgood) |
| **Mary Magdalene** | 1 | Mostly hagiographic / hymnographic | Hold; primary written corpus is the Gospel accounts |
| **Marina the Great-Martyr** | 0 | The Acts of Marina (Synaxarion) | The *Life and Martyrdom of St. Marina*, drawn from PD synaxaria |
| **Hermione of Ephesus** | 0 | Synaxarial | Synaxarion-format Life |
| **Isidora of Tabenna** | 0 | Apophthegmata + Palladius's *Lausiac History* (PD) | Excerpts from the *Lausiac History* on Isidora the Fool |
| **Olympias the Deaconess** | 0 | Sozomen + Palladius (PD), Chrysostom's letters to Olympias (NPNF1 Vol 9, PD) | **St. John Chrysostom's Letters to Olympias** (~17 letters, PD); **Vita of Olympias** from Sozomen |
| **Prochorus the Deacon** | 1 | Limited PD; the *Acts of John* attributed to him is non-canonical and partly Gnostic — skip | Hold |
| **Anianus of Alexandria** | 1 | Very limited | Hold |
| **The Twelve Apostles** (12 entries) | 1 each | Each has scriptural + traditional hagiographic material; some have Patristic biographies (Chrysostom's Homily on the Apostles, etc.) | Per-apostle expansion is a multi-quarter project. Lowest priority for clergy-vetter ROI. |

## Pattern (runbook for continuing the import)

The three works imported this commit demonstrate the pattern. Repeat as follows for each missing work:

1. **Source.** Always cite the PD edition (NPNF/ANF/CCEL/etc.) in the JSON `source` field. **Never** paraphrase, modernize, or generate text. The text must be verbatim. The CONTRIBUTING.md `no LLM-generated saint bios` rule applies a fortiori to the saints' own writings.

2. **Fetch.** Wikisource has Roberts-Donaldson (ANF) and Schaff (NPNF) transcribed cleanly. URL pattern: `https://en.wikisource.org/wiki/Ante-Nicene_Fathers/Volume_I/<work-page>` or `https://en.wikisource.org/wiki/Nicene_and_Post-Nicene_Fathers:_Series_I/...`. If `WebFetch` refuses on length grounds, use `curl` + the throwaway HTML→text extractor at `.tmp-extract.mjs` (delete after use).

3. **Structure.** Section convention:
   - `n=1` is the salutation (where the work has one). Title: "Salutation". Include a `framing` field with one short paragraph of editorial context (project's voice, not the saint's).
   - `n=2..N+1` are the original chapters. Titles come verbatim from the source's chapter headings (e.g. NPNF "Praise of the Ephesians"), stripped of the "Chapter I.—" prefix.
   - `paragraphs[]` carries the saint's verbatim text. Each chapter is typically one or two paragraphs.
   - `notes[]` is optional editorial marginalia, used sparingly — only where a famous line, a translation choice, or a doctrinal hinge deserves a one-sentence pointer. Never paraphrase the chapter; the notes are the project's voice, not the saint's.

4. **Register.** Add a `Work` entry to the saint's `works[]` array in `lib/saints/saints.ts`. Required fields: `slug`, `title`, `subtitle`, `year`, `blurb`, `topics`. The `slug` must match the JSON filename.

5. **Cite.** The `source` field on the JSON should name: translator/editor, original series + volume + year, PD status, and source URL. E.g. `"Roberts-Donaldson translation, Ante-Nicene Fathers Vol. 1 (1885), ed. Alexander Roberts and James Donaldson. Public domain. Source text via Wikisource."`

6. **Verify.** `npm run lint && npm run typecheck && npm run build`. The build runs `generateStaticParams` and will catch any saint/slug mismatch between the registry and the data file.

## What this commit closes vs. defers

**Closed in the first import commit (2026-05-23, three Apostolic Fathers works, ~40 chapters):**

- Ignatius/Romans — expanded 3 → 11 sections (full salutation + 10 chapters).
- Ignatius/Ephesians — new, 22 sections (salutation + 21 chapters). Includes "the medicine of immortality."
- Polycarp/Philippians — new, 15 sections (salutation + 14 chapters). The only surviving writing from Polycarp's hand.

**Closed in the second import commit (2026-05-23, eight files: five Ignatian epistles + three new saint registries + first works for each):**

- Ignatius/Magnesians — new, 16 sections. The youthful bishop Damas; against Sabbath observance.
- Ignatius/Trallians — new, 14 sections. Against the Docetic denial of Christ's flesh.
- Ignatius/Philadelphians — new, 12 sections. On the silence of the bishop and the one altar.
- Ignatius/Smyrnaeans — new, 14 sections. The bodily resurrection; "Lay hold, handle me, and see."
- Ignatius/To Polycarp — new, 9 sections. A bishop writes to a bishop.
- **Archangel Michael** — new registry entry + *Hymns to the Bodiless Hosts* (festal hymnography for the Nov 8 Synaxis, PD Hapgood).
- **St. Nektarios of Aegina** — new registry entry + *Apolytikion and the Rule of Life* (festal hymns + his short Rule for the sisters of Aegina).
- **St. Florian of Lorch** — new registry entry + *The Passion of St. Florian* (the Acts of his martyrdom at Lauriacum, May 4, 304, as preserved in the Acta Sanctorum and Butler's *Lives*; received in the East as a saint of the Undivided Church).

All seven Ignatian epistles are now complete in the corpus. The Apostolic Fathers gap is now closed on the Ignatian side. Polycarp still needs *The Martyrdom of Polycarp* to complete his pair.

**Closed in the third import commit (2026-05-23, two works — one large):**

- Polycarp/The Martyrdom of Polycarp — new, 23 sections (salutation + 22 chapters). The earliest surviving Christian martyrology, the eyewitness encyclical of the church of Smyrna. With the Letter to the Philippians already shipped, Polycarp's primary-text corpus is now complete on the PD side.
- Gregory of Nyssa/The Great Catechism — new, 42 sections (framing + Prologue + 40 chapters). Gregory's catechist's notebook on Trinity, Incarnation, Atonement, Sacraments. Closes Gregory of Nyssa's 0-works gap with one of the great systematic theological works of the fourth century. ~120,000 characters of primary text — the largest single import yet, sourced from NPNF Series II Vol 5 (Schaff & Wace, 1893) via per-chapter Wikisource pages.

**Next sprint (next ~3 weeks, in priority order):**

1. Basil the Great — On the Holy Spirit. Currently 1 work (Hexaemeron). The pneumatology gap — Basil's most-cited dogmatic treatise, the foundation of the Church's confession of the Spirit as God.
2. John of Damascus — full Exposition of the Orthodox Faith (4 books). Currently 1 excerpt. The synthesis of the patristic age.
3. Augustine — Confessions Books II-X (currently Book I only).
4. Cyril of Alexandria — full Commentary on John (currently selections only); or On the Unity of Christ.
5. Irenaeus — Against Heresies Books I and II (currently III-V excerpts only); or Proof of the Apostolic Preaching as a complete short work.
6. Expand the new saints' corpora — for Michael, add Chrysostom's homilies on the angels (NPNF1, PD); for Nektarios, his short PD treatises on the path of repentance; for Florian, no further primary text but the entry could grow with a hymnographic compilation as new PD English appears.
7. Add Cyril of Jerusalem to the registry with the 23 Catechetical Lectures (NPNF2 Vol 7, PD) — standard fourth-century catechumenate text.

**Later sprints (out of this audit cycle):**

- Chrysostom's *Homilies on Matthew* (90 homilies, large)
- Augustine's *Confessions* Books II-X
- Irenaeus's *Against Heresies* Books I-II
- Cyril of Alexandria's full *Commentary on John*
- The Apostolic Fathers as a category (Didache, 1 Clement, 2 Clement, Barnabas, Hermas) — possibly a new registry entry "The Apostolic Fathers" rather than attaching to individual saints.

## What this audit does not cover

- **Translation quality assessment.** All PD English translations of patristic texts are 19th-century (Roberts-Donaldson, Schaff, Lightfoot in part). They are accurate but archaic. A future audit could compare against modern PD-eligible translations as those age into the public domain.
- **Russian-tradition modern translations.** Most modern English translations of Seraphim, Theophan the Recluse, the Optina elders, and Ignatius Brianchaninov are still under copyright. Limited PD material exists, but the surface area is much smaller than the Greek tradition.
- **Liturgical hymnography.** The Theotokos's section could grow substantially with PD hymns (Akathist, Octoechos), but that's a separate workstream from the patristic-writings expansion.
- **Apocrypha.** Texts of disputed authenticity (Pseudo-Dionysius, the Long Ignatian recension, the Acts of John attributed to Prochorus) are deliberately excluded.
