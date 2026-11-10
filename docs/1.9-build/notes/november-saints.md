# November's saints, all of them, in 1.9 (the plan)

The November saints chat (Opus), opened on his word of 2026-11-10. Reports go
to the arbiter.

His words (2026-11-10): "And also, I want all the saints commemorated on the
month of November shown and added into version 0.9. Sorry, version 1.9.
Alright. And check if any, well, also remember to add their works, add their
life, and also if they are affiliated to any of the, right, like the fathers
that we have associated, or if they're associated to any historical events or
any timelines or any works that they need to get added. If it's also
attributed to any councils, right, then we need to add that." Then, to the
arbiter's recommendations (a new Opus chat; a plan first; public-domain lives
only; a path that repeats each month): "All recommendations. Start."

## What November holds, in counts

The app's own calendar (`data/calendar/daily-saints.json`, plus the saints'
pages whose feast falls that day, which the calendar folds in) names **67
lines on November 1 to 30**: **61 saints' lines** and 6 feasts. Readers on the
Old calendar see the same lines on November 14 to December 13 (the app shifts
the Menaion by 13 days, `lib/calendar/orthodox.ts`); what they see in their own
November (the Menaion's October 19 to November 17) belongs to October's run of
this path and December's.

- **15 lines have a page today**, all with a life of ours from before (marked
  for the clergy review, as every life of ours is). **11 of them wear an icon
  with no rights record**, and St Victorinus has no icon.
- **46 lines have no page**: the calendar shows a name and a note, and nothing
  to tap. They hold about 480 people (the Paramonus line alone is 371).
- Of the 46, **21 have a public-domain witness** to build their Life from (the
  Fathers, the Church historians, Scripture, the martyrs' own acts, the
  Novgorod Chronicle, Mouravieff), **8 have a life only in Alban Butler**
  (a Catholic priest, 1756), which needs his word, **1 is held** for the clergy
  review, and **16 have no public-domain life at all**.
- **Works:** St Clement's letter to the Corinthians, St Gregory the
  Wonderworker's writings, St Peter of Alexandria's canons and the Life of
  Barlaam and Joasaph (St John of Damascus's) are public domain and go in.
- **Links:** one council (Antioch, 268, already names St Gregory the
  Wonderworker with no page to open), one more council to propose (Sardica,
  343, which restored St Paul the Confessor), six History events, four
  Fathers already in the app.

## The rules this is built to

`docs/editorial-standards.md` binds it, and the arbiter's brief narrows it:

- **No written lives.** A saint's Life is a witness's own public-domain words,
  verbatim and cited, read word for word against the printed page, as the
  desert fathers' were on 2026-10-30. A saint with no such witness gets **a
  short factual entry with its source**: who, when, where commemorated. No
  prose of ours is added to any new page beyond that entry.
- Only public-domain editions: published before 1931 (the United States rule
  the library already keeps: R. M. French's 1930 Way of a Pilgrim is in it).
- Icons only where a rights record passes (`lib/saints/iconRights.ts`, staged
  and looked at with `scripts/fetch-saint-icons.mjs`); otherwise the house's
  plate (the halo on the dark panel). Never another saint's face over a name:
  the 6th century icon of Christ and Abba Menas is a monk, not the martyr, and
  an icon of the Cosmas and Damian of Rome or Arabia is not the pair of Asia.
- A page carries what it shows. A saint's page shows its entry; his Life and
  works are works, which the apps read as files from the bundle
  (`app/saints-data/`), never as a prop.

## What a new November page is

Built on the page the saints already have, with one small addition:

- **His entry:** name, epithet, feast day, repose where the source gives it,
  and one or two plain factual sentences (the short bio the page and the cards
  already show).
- **Its source, under it (new):** one line, "Source: ...", naming the book the
  entry's facts come from. It uses the word the app already has in every
  language (`study.source`). This is the one change to the saint's screen, so
  it is checked with `checkMock` and stills.
- **His Life, under Writings:** where a witness exists, "The Life of St. X",
  the witnesses' own words, each passage with its book, chapter and edition
  (`voice: "witness"`, as St Ammon's), with a cover in the reading room.
- **His works, under Writings:** where he wrote and a public-domain English
  exists.
- **His links:** the calendar line opens his page; councils, History events,
  his teacher or disciples in the app, as the saint's web and Timeline read
  them.

## Every November line

Day, the line as the calendar names it, what is there now, and what is added.
"Witness" means the Life is built from those words; "entry" means a short
factual entry only, with the source named.

### The 46 lines with no page

| Day | Line | Life (public domain) | Works | Links to add | Icon |
|---|---|---|---|---|---|
| 1 | Cosmas and Damian of Asia | entry (the Synaxarion of Constantinople, Nov 1, ed. Delehaye, 1902). Butler's and Baring-Gould's Cosmas and Damian are the Arabian pair, not these | | | to find: a picture of this pair only |
| 1 | Theodota, their mother | entry (Synaxarion) | | | plate likely |
| 2 | Acindynus, Pegasius, Aphthonius, Elpidephorus, Anempodistus | entry (Synaxarion) | | | to find |
| 2 | Marcian of Cyrrhus | entry now; Butler, Nov 2, on his word | | | plate likely |
| 3 | Acepsimas, Joseph and Aithalas | **witness:** Sozomen II.13 (NPNF II 2, tr. C. D. Hartranft, 1890), which names Acepsimas and Aithalas | | | to find |
| 4 | Joannicius the Great | entry now; Butler, Nov 4, on his word | | History: Second Iconoclasm, Triumph of Orthodoxy (if their texts name him) | to find |
| 4 | Nicander and Hermas | entry (Synaxarion) | | | plate likely |
| 5 | Galaction and Episteme | entry (Synaxarion; Baring-Gould, Nov 5, for facts) | | | to find |
| 5 | Patrobas, Hermas, Linus, Gaius, Philologus | **witness:** Romans 16:14-15, 23 and 2 Timothy 4:21 (the app's King James); on Linus, Irenaeus III.3.3 (ANF 1, 1885) and Eusebius III.2, III.4 (NPNF II 1, tr. A. C. McGiffert, 1890) | | | plate |
| 6 | Paul the Confessor, of Constantinople | **witness:** Socrates II.6-7, 12-13, 15-16, 22-23, 26 (NPNF II 2, tr. A. C. Zenos, 1890); Athanasius, History of the Arians 7 (NPNF II 4, 1892) | | Council of Sardica (343): proposed among its Fathers (Socrates II.22: it restored him) | to find |
| 6 | Varlaam of Khutyn | **witness:** The Chronicle of Novgorod, 1192 (tr. R. Michell and N. Forbes, London, 1914) | | | to find |
| 7 | 33 Martyrs of Melitene | entry (Synaxarion) | | | to find |
| 7 | Lazarus of Mount Galesion | entry (Synaxarion; his Life has no public-domain English) | | | plate likely |
| 9 | Onesiphorus and Porphyrius | **witness:** 2 Timothy 1:16-18 and 4:19 (King James); Porphyrius from the Synaxarion | | | to find |
| 9 | Matrona of Constantinople | entry (Synaxarion) | | | plate likely |
| 10 | Erastus, Olympas, Rodion, Sosipater, Quartus, Tertius | **witness:** Acts 19:22; Romans 16:11, 15, 21-23; 2 Timothy 4:20 (King James) | | | plate |
| 10 | Arsenius of Cappadocia (+1924) | entry (his glorification by the Ecumenical Patriarchate, 1986); nothing of his is public domain | | | plate (modern icons are in copyright) |
| 11 | Menas of Egypt | entry now; Butler, Nov 11, on his word | | | to find (not Abba Mena's Coptic icon) |
| 11 | Theodore the Studite | entry now; **Life held**: Butler and Gardner (1905) both turn on his letters to Rome, which is clergy queue item 4 | none in public-domain English | History: Second Iconoclasm | to find |
| 11 | Maximus of Moscow, Fool for Christ | entry (Russian synaxarion facts) | | | to find |
| 12 | John the Merciful, of Alexandria | entry now; Butler, Jan 23 (or J. M. Neale, 1847), on his word | | | to find |
| 12 | Nilus of Sinai | entry now; Butler, Nov 12, on his word | none in public-domain English | | to find |
| 15 | Gurias, Samonas and Habib | **witness:** The Martyrdom of Shamuna, Guria and Habib, and The Martyrdom of Habib the Deacon (ANF 8, tr. B. P. Pratten, 1871/1886) | | | to find |
| 17 | Gregory the Wonderworker | **witness:** Eusebius VI.30, VII.14, VII.28 (NPNF II 1); Jerome, Lives of Illustrious Men 65 (NPNF II 3, tr. E. C. Richardson, 1892); Basil, On the Holy Spirit 74 (NPNF II 8, 1895) | **his writings** (ANF 6, tr. S. D. F. Salmond, 1886): the Declaration of Faith, the Metaphrase of Ecclesiastes, the Canonical Epistle, the Oration and Panegyric to Origen | **Council of Antioch (268)**: it names him already; his name will open his page | to find |
| 17 | Nikon of Radonezh | entry (Mouravieff, 1842, names him with St Sergius) | | St Sergius's disciples | to find |
| 18 | Plato and Romanus | **witness** for Romanus: Eusebius, The Martyrs of Palestine 2 (NPNF II 1); Plato from the Synaxarion | | History: the Great Persecution | to find |
| 18 | Zacchaeus and Alphaeus | **witness:** Eusebius, The Martyrs of Palestine 1 (NPNF II 1) | | History: the Great Persecution | plate likely |
| 19 | The Prophet Obadiah | **witness:** his prophecy (Obadiah, in the app's Bible) | the book itself, linked, not copied | | to find |
| 19 | Barlaam and Josaphat | **witness:** the Life of Barlaam and Ioasaph, attributed to St John of Damascus (tr. G. R. Woodward and H. Mattingly, Loeb, 1914) | the same book, whole | St John of Damascus (the book's author on its cover) | to find |
| 20 | Gregory of Decapolis | entry (Synaxarion) | | | to find |
| 20 | Proclus of Constantinople | **witness:** Socrates VII.28, 40, 41, 45 (NPNF II 2) | none found yet in public-domain English | | to find |
| 22 | Philemon and Apphia | **witness:** the Epistle to Philemon 1-2 and Colossians 4:9, 17 (King James) | (St John Chrysostom's Homilies on Philemon are already in the library) | | to find |
| 22 | Michael of Tver | **witness:** The Chronicle of Novgorod, 1319; Mouravieff, 1842 | | | to find |
| 23 | Amphilochius of Iconium | **witness:** Theodoret V.16 (NPNF II 3, tr. B. Jackson, 1892); Sozomen VII.6; Jerome, Lives 133 | none in public-domain English | St Basil's disciples (On the Holy Spirit is written to him); History: First Council of Constantinople (Socrates V.8 names him there) | to find |
| 23 | Alexander Nevsky | **witness:** The Chronicle of Novgorod, 1240, 1242 and 1263 (his tonsure on November 14, his burial on the 23rd, "the Day of St. Amfilokhi"); Mouravieff, 1842 | | | to find |
| 24 | Clement, Pope of Rome | **witness:** Irenaeus III.3.3 (ANF 1); Eusebius III.4, III.15-16, III.38 (NPNF II 1); Jerome, Lives 15 | **The First Epistle to the Corinthians** (ANF 1, 1885) | | to find |
| 24 | Peter of Alexandria | **witness:** The Genuine Acts of Peter (ANF 6, tr. J. B. H. Hawkins, 1886); Eusebius VII.32, VIII.13, IX.6 (NPNF II 1) | **the Canonical Epistle** and the fragments (ANF 6) | History: the Great Persecution | to find |
| 25 | Catherine of Alexandria | entry now; Butler, Nov 25, on his word | | | to find |
| 25 | Mercurius | entry (Synaxarion) | | | to find |
| 26 | Innocent of Irkutsk | **witness:** Mouravieff, 1842 (the first bishop of Irkutsk) | | | to find |
| 27 | James the Persian | entry now; Butler, Nov 27, on his word | | | to find |
| 28 | Stephen the New | entry now; Butler, Nov 28, on his word | | History: the First Iconoclasm | to find |
| 28 | Irenarchus and the seven women | entry (Synaxarion) | | | plate likely |
| 29 | Paramonus and the 370 | entry (Synaxarion) | | | plate likely |
| 29 | Acacius of Sinai | entry (St John Climacus's Ladder, Step 4, which has no English before 1959) | | | plate |
| 30 | Frumentius, of Axum | **witness:** Socrates I.19 (NPNF II 2); Sozomen II.24; Theodoret I.22; Athanasius, Apology to Constantius 29-31 (NPNF II 4) | | St Athanasius's disciples (he consecrated him) | plate likely |

### The 15 lines with a page

| Day | Page | What is missing |
|---|---|---|
| 2 | St Victorinus of Pettau | no works: his Commentary on the Apocalypse waits on clergy queue item 1 (its chiliast readings); his short On the Creation of the World (ANF 7) can go in |
| 2 | St Gabriel of Georgia | icon has no rights record; nothing public domain to add |
| 9 | St Nektarios of Aegina | icon has no rights record; no public-domain English of his writings |
| 13 | St John Chrysostom | complete for November |
| 14 | The Apostle Philip | icon has no rights record; History: Pentecost (Acts 1:13 names him in the upper room) |
| 14 | St Gregory Palamas | icon has no rights record |
| 14 | St Justinian the Great | complete for November |
| 15 | St Paisius Velichkovsky | icon has no rights record; no public-domain English of his writings |
| 16 | The Apostle Matthew | icon has no rights record; History: Pentecost (Acts 1:13) |
| 22 | St Iakovos of Evia | icon has no rights record |
| 26 | St Alypius the Stylite | complete (icon used with permission) |
| 26 | St Nikon the Metanoeite | icon has no rights record |
| 28 | St Arsenius of Prislop | icon has no rights record |
| 29 | St Philoumenos | icon has no rights record |
| 30 | The Apostle Andrew | icon has no rights record; History: Pentecost (Acts 1:13) |

### The 6 feasts

The Synaxis of the Archangels (Nov 8) and the Entrance (Nov 21) already open
the Archangel Michael's and the Theotokos's pages; both of those icons have no
rights record either. The Dedication of St George's church at Lydda (Nov 3)
will open St George's page, and the Forefeast of the Entrance (Nov 20) and the
Icon of the Sign (Nov 27) the Theotokos's. The Nativity Fast's start has no
page to open.

The 13 icons with no record (the 11 saints' and these two) are not among the
14 the Updates 2 chat is checking for the councils (build 90 note 3), so there
is no overlap. I take them after the new pages, and send the results through
the arbiter.

## Needs his word

1. **Butler's lives, for eight saints:** Marcian, Joannicius, Menas, John the
   Merciful, Nilus, Catherine, James the Persian and Stephen the New. Their only
   public-domain English life is Alban Butler's (a Catholic priest, 1756 to
   1759). Rec: yes, word for word, with his name and year on it, his paragraphs
   on Roman doctrine left out and the cut shown, and the work marked as
   selections. Until his word they have the short entry.
2. **St Paul the Confessor among the Fathers of Sardica:** one new face on that
   council's page, with the line "restored to his see by the council"
   (Socrates II.22). Rec: yes.
3. Not a question, for the record: **St Theodore the Studite's Life** waits
   for the clergy review, because both public-domain lives turn on his letters
   to Rome (Butler quotes his letter calling Pope Paschal "the rock on which the
   catholic church is built"; clergy queue item 4 is that question); he has the
   short entry.

## The size

- **Work:** about 30 hours: the 46 pages, their entries, calendar links and
  groups (8); the 21 witness Lives (8); the works, Barlaam the largest (6);
  icons for the new pages (6); the month path and its test (2). I run parts in
  parallel and expect two to three days. Butler's eight, on his word, about 4
  more; the 13 old icons about 3.
- **The apps:** about 3 MB more, packed (about 7 MB on disk): 46 saint pages
  and about 20 work pages (10 KB each packed, measured from the 417 saint pages
  of test build 89), the texts as files (about 1.5 MB raw, Barlaam 0.6 MB of
  it), and the icons (about 30 KB each). Measured on the first build with
  `scripts/export-size.mjs`; the export is 70.9 MB packed against its 85 MB
  ceiling.

## The path that repeats (December before December 1)

- `node scripts/menologion-month.mjs plan <month>` lists every line of a
  month from the calendar, with what each page has: page, entry and source,
  Life (witness, entry, or a life of ours), works, icon rights, councils and
  History events.
- `node scripts/menologion-month.mjs check <month>` fails while a saint's line
  has no page and no reason it is held, a new page has prose of ours, an entry
  has no source, or an icon has no rights record.
- `lib/saints/__tests__/menologionMonth.test.ts` holds every month marked done
  (November first) to the same, so a month stays done.
- `docs/editorial/menologion-month.md`: the steps, in order, for the next
  month, with this one as the example.

## Order of work

1. Push 1: the 46 pages with entries and sources, the calendar links, the
   source line on the saint's page, the witness Lives from the Fathers, the
   historians, Scripture, the Chronicle and Mouravieff, the links, and the month
   path with its test.
2. Push 2: the works (St Clement, St Gregory, St Peter, Barlaam), the icons
   that pass, and the Edessa martyrs' acts.
3. On his word: Butler's eight; Sardica.
4. Then the 13 old icons, unless the arbiter sends them elsewhere.

Each push passes typecheck, the unit tests, lint, the Android export and then
the iOS export, a walk of new pages on the export, and `checkMock` on the
saint's screen, with stills to the arbiter.

## Push 1, as built (2026-11-10)

- **All 46 pages are in**, and `node --experimental-strip-types
  scripts/menologion-month.mjs check november` is clean; November is the first
  month in `DONE_MONTHS` (`lib/saints/month.ts`), held there by
  `lib/saints/__tests__/menologionMonth.test.ts`.
- **20 witness Lives**, as planned, less Barlaam and Josaphat: the Loeb book is
  the size of a work of its own and goes with the works in push 2, so their
  page has the entry from it for now. The Prophet Obadiah's book is copied as
  his work after all (one chapter, from the app's own Bible), so his page has
  something to open. Every passage was read against two scans of its printing
  where two exist; the differences and how each was settled are
  `docs/editorial/ingest-review/november-lives.md`.
- **26 entries** read from the Dictionary of Christian Biography (1877 to
  1887), The Book of Saints (1921), Baring-Gould (1897), Dunbar (1905),
  Mouravieff (1842) and the Loeb Barlaam (1914), every fact checked on the
  printed page. Butler is not used for any entry, so his question stays open
  only for the eight Lives. Three saints have no public-domain source at all
  (Lazarus of Galesion, Maximus of Moscow, Acacius of Sinai): their entries
  hold only what the calendar line says, and Acacius points to The Ladder. St
  Arsenius died in 1924, so his rests on modern references, named.
- **Where the sources disagree with the calendar's notes** (repose years for
  Acindynus, the Melitene martyrs, Stephen the New, Catherine, Mercurius, John
  the Merciful and Nilus), the page gives what its source says and the
  calendar line is left as it was. Mercurius's entry is from The Book of
  Saints and Baring-Gould, not Butler (who has no Mercurius in November).
- **Two names shortened to fit the room's posters**, with every name kept in
  the epithet under them: "Sts. Patrobas, Hermas and Companions" and "Sts.
  Erastus, Olympas and Companions". The Lives of Sts. Gregory, Amphilochius and
  Michael are titled to fit the same way.
- **Links:** St Gregory the Wonderworker now opens from the council of
  Antioch (268); the History events gained St Peter of Alexandria, Sts
  Zacchaeus and Alphaeus, Plato and Romanus (the Great Persecution), St
  Stephen the New (the first Iconoclasm), St Theodore the Studite (the second
  Iconoclasm and the Triumph of Orthodoxy), St Amphilochius (the council of
  381); Pentecost now names all of Acts 1:13 with the Theotokos and St Matthias;
  St Sergius's page names St Nikon as his disciple and successor, and St
  Athanasius's names St Frumentius, whom he made bishop.
- **Icons:** nine settled for the new pages on the day (Cosmas and Damian of
  Asia, Joannicius, Paul the Confessor, Varlaam, Menas, Theodore the Studite,
  Maximus of Moscow, John the Merciful, Nilus), each looked at and recorded in
  `lib/saints/iconRights.ts`; the rest stand on the plate until a picture of
  each passes. Two of the nine are on their books' covers.

## Push 2, as built (2026-11-10)

- **Seven works, whole, every word read against two scans of its volume**
  (`scripts/menologion/november-works.mjs`, review in
  `docs/editorial/ingest-review/november-works.md`): St Clement's First
  Epistle to the Corinthians, complete in its 65 chapters (ANF 9, 1896, the
  translation of ANF 1 completed from the manuscript found after it); St
  Gregory the Wonderworker's Declaration of Faith, Metaphrase of
  Ecclesiastes, Canonical Epistle and Oration to Origen (ANF 6, 1886), the
  four the edition counts as his, with canon XI of the epistle left out as the
  edition's own note judges it a later addition; St Peter of Alexandria's
  Canonical Epistle, his fifteen canons without the commentaries of Balsamon
  and Zonaras the edition prints after each (ANF 6); and St Victorinus's On
  the Creation of the World (ANF 7, 1886), its gaps as printed.
- **Misprints of the printed page are kept**, as push 1 kept them: "inquity"
  (St Clement 35), "wisdon" and "may he" (the Metaphrase), "coveteousness"
  (St Gregory's epistle). Each is read on the page image and listed in the
  review.
- **Fifteen more icons settled** for the second half of the month (St Gregory
  the Wonderworker, Nikon, Obadiah, Barlaam and Ioasaph, Gregory of
  Decapolis, Michael of Tver, Alexander Nevsky, Clement, Peter of Alexandria,
  Catherine, Mercurius, Innocent, James the Persian, Stephen the New,
  Acacius); seven of them on their saints' books, and St Gregory's face now
  stands on the council of Antioch's page. Two candidates did not pass: the
  only picture of St Romanus is Zurbarán's painting of him alone, and the
  panel of Sts Gurias, Samonas and Habib shows three standing figures that
  cannot be cut to a portrait without losing one. Nothing usable was found
  for Proclus, Amphilochius, Philemon and Apphia, Zacchaeus and Alphaeus,
  Irenarchus, Paramonus or Frumentius; the Vatican's scans of the Menologion
  carry its watermark and were not used.
- **Barlaam and Ioasaph goes in push 3**: the Gutenberg transcription of the
  Loeb has no chapter marks, so the forty chapters are being placed from the
  scan before every word is compared.

## Push 3, as built (2026-11-10)

- **Barlaam and Ioasaph**, the whole book (82,504 words, its Introduction
  and forty chapters), on Sts Barlaam and Josaphat's page, in the 1914 Loeb
  English, from Project Gutenberg's transcription read word for word against
  three scans of the printed book (the 1914 printing twice, the 1937 reprint
  from the same plates). The transcription, made in 1996, had 55 slips the
  page corrects ("weft" for "wert", "wily" for "why", "time" for "thee",
  "ease" for "case"); each is put back, and the page's own misprint "anwers"
  is kept. It is ascribed to St John of Damascus, as the Loeb gives it; the
  book names its writer John the Monk, of the monastery of St Sabas, and the
  page says both. Their icon (the Russian North, 17th century) is on its
  cover.

## Push 4, as built (2026-11-10)

- **Butler's Lives for the eight, held for a priest**, on his yes through the
  arbiter ("rec yes to all"): St Marcian, St Joannicius, St Menas, St Nilus,
  St Catherine, St James the Persian, St Stephen the New and St John the
  Merciful, in Alban Butler's words (about 9,200), from the London
  stereotype edition (John Murphy; vol. I 1812, vol. XI 1815). No one has
  transcribed that printing, so each Life was drafted from two scans of it
  (Princeton's and the Digital Library of India's, the same pages line for
  line), and every page image was read against the draft. The page put the
  drafts right where the scans' text was wrong: "389" for St Marcian's "387",
  "aiaebins" for "Eusebius", words run together, and a two-column footnote
  run into St Nilus's text. The ingest then checked every word against three
  more scans (the DLI's and the Edinburgh and Derby printings): nothing open.
  The page's own misprints are kept and named ("Methodias", "harshnesss",
  "worse that beastly lust", St John's closing comma). Two cuts, each shown
  as [...]: Butler's sentence that the iconoclast council was not general
  without the pope of Rome (St Stephen; his rule), and a sentence likening
  peoples he calls savages to apes (St Catherine; not Roman doctrine; he
  confirmed the cut on 2026-11-10). They are not in the app:
  `docs/editorial/held/november/`, clergy item 31 in
  docs/editorial-standards.md, and a test keeps them out of data/saints/ and
  the registry until `--held --release`. Until then each saint keeps his
  short entry.
- **St Paul the Confessor among the Fathers of Sardica**, with his icon:
  "Bishop of Constantinople, whom the bishops of the East would have shut out
  with St. Athanasius, and whom the council restored to his see" (Socrates
  II.20 and II.22). The councils now name 37 Fathers, 20 with a face.
- **The thirteen older icons**, each opened and checked (a helper traced
  each file on Commons; every picture and every rights page was then read
  here). The Theotokos's is the Vladimir icon (12th century, public domain)
  and stays. Seven give way to settled pictures of the same saints: St
  Andrew and the Archangel from their pages' Kirillo-Belozersky icons (1497),
  St Matthew, St Philip and St Gregory Palamas from their books' covers, St
  Nikon from the Hosios Loukas mosaic (early 11th century), St Nektarios
  from a photograph taken before 1908. Four modern saints have no
  public-domain picture and stand on the plate: St Gabriel of Georgia, St
  Arsenie of Prislop, St Iakovos of Evia and St Philoumenos. St Paisius
  joins them on the arbiter's word: the one old portrait of him on Commons
  names no painter or date, so it waits until they are found. Icons with no
  rights record: 99 to 86.
- **The path**: `--held` in scripts/ingest-witness-lives.mjs, and the
  drafting tools in scripts/menologion/scan-draft/ (README there), both in
  docs/editorial/menologion-month.md.
- **The apps**: the held Lives are not in them; the icons are 140 KB lighter
  (seven new files, twelve gone).
- **Stills** (the Android export, the app's way): St Paul among Sardica's
  Fathers (`november-saints/11-st-paul-at-sardica.png`); St Andrew, St Nikon
  and St Nektarios with their new pictures, and St Iakovos's page without one
  (`november-saints/12-the-older-icons-settled.png`).
