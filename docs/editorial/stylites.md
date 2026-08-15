# The stylites

Four pillar-saints added to `lib/saints/saints.ts`. Before this batch the
registry had none, while the menologion named six of them, so six calendar
lines were dead text with nowhere to tap through to.

## What shipped

| Saint | Slug | Feast | Group tags |
|---|---|---|---|
| St. Symeon the Stylite | `symeon-the-stylite` | September 1 | stylites, desert-monastics, wonderworkers |
| St. Daniel the Stylite | `daniel-the-stylite` | December 11 | stylites, desert-monastics |
| St. Symeon Stylites the Younger | `symeon-of-the-wonderful-mountain` | May 24 | stylites, desert-monastics |
| St. Alypius the Stylite | `alypius-the-stylite` | November 26 | stylites, desert-monastics |

`SAINT_GROUPS` gains a `stylites` id. `SaintsBrowser` hides a pill whose count
is zero and needed no change, so the filter appeared on its own.

`data/calendar/daily-saints.json` gains a `slug` on the four commemorations that
already carried a name and a note. The four days are now tappable.

## Naming

The menologion spells it **Symeon**, and these profiles are reached from those
calendar lines, so the batch follows the calendar rather than the more common
English "Simeon". Both spellings were already in the registry
(`symeon-the-new-theologian`, `simeon-the-myrrh-streaming`), so neither choice
was a break with precedent.

The Younger is filed as `symeon-of-the-wonderful-mountain` rather than as a
`-the-younger` form. The menologion already disambiguates him that way at 05-24,
and elder/younger in a URL is easy to misread.

## Sources

All public domain in the United States, all verified before use.

- **Catholic Encyclopedia (1913), "Stylites (Pillar Saints)"**, Herbert
  Thurston. The frame for all four, and the only source for Alypius and for
  most of Daniel.
  <https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Stylites_(Pillar_Saints)>
- **Catholic Encyclopedia (1913), "St. Simeon Stylites the Elder"** and
  **"St. Simeon Stylites the Younger"**.
- **Lent, *Journal of the American Oriental Society* 35 (1915), pp. 103-111**,
  a translation of the Syriac Life of Simeon Stylites.
  <https://www.tertullian.org/fathers/simeon_stylites_vita_00_intro.htm>
- Feast days confirmed against the OCA calendar and the Menaion.

The 1915 JAOS translation is the only one of these carrying verbatim quotable
text. Nothing from it is quoted yet: see the open question below.

## Two traps

**Do not use Dawes and Baynes, *Three Byzantine Saints* (1948)** for Daniel.
It is the obvious source, and Fordham hosts it with no rights statement, which
makes it look free. It is not free in the United States. Dawes died on 19 August
1954, so the work cleared UK life-plus-seventy in January 2025, but a 1948
foreign work takes URAA restoration here: 95 years from publication, so 2043.

**The two 1913 articles disagree on the Younger.** One gives "died in 596", the
other "died 24 May 597". The menologion note in this repo carries `+596`. The
entry records the disagreement in `reposed` and says so again in `life[]`
instead of picking a year. Do not quietly resolve it.

Alypius has the same shape of problem, more mildly: the menologion says `+640`,
the 1913 article says only seventh century. The entry does not state the year as
settled.

## What is deliberately absent

**No `quotes` on any of the four.** The `Quote` type permits a saint's recorded
words as well as his own writing, and the Syriac Life would be the candidate.
But it is a witness account rather than Symeon speaking, `Quote.text` renders in
a gold blockquote that reads as the saint's own voice, and nothing in the test
suite validates a quote against its source. Owner's call, not an agent's.

**No `works`.** No public-domain English text belongs to any of these four as an
author. `works: []` is the honest shape, the same one the August Russian block
took.

**No `iconUrl`.** `iconRights.test.ts` asserts that every `iconUrl` resolves to a
file on disk, so setting it before the files exist turns the suite red. The four
entries render the designed placeholder from `SaintIcon` until the images land.
These are the first four saints in the registry without an icon, so they look
different from their neighbours on the index grid, which is the reason to close
this out rather than leave it.

Files needed, one per slug, in `public/saints/icons/`:

```
symeon-the-stylite.jpg
symeon-of-the-wonderful-mountain.jpg
daniel-the-stylite.jpg
alypius-the-stylite.jpg
```

Each needs a rights-complete row in `lib/saints/iconRights.ts`. `UNVERIFIED_ICONS`
sits at its ceiling of 107, which may only fall, so the debt map is closed and
there is no way to add an icon except with full provenance. Per file: 200 KB or
under, real JPEG magic bytes, and `alt` written while looking at the picture,
over 24 characters and not beginning "Icon of".

## Editorial status

The `life[]` prose is an editorial digest in the Purify voice, third person,
built from the attested sources above. That class is permitted with citation per
`docs/editorial/august-menologion.md`. It is not presented as anyone's quoted
words, and no detail is invented: where the tradition is thin the entry is
short, and where the sources disagree the entry says so.

`AGENTS.md` lists doctrinal wording as a stop condition, so this text wants
Edgar's read before it merges.

## Still on the calendar with no profile

Two more pillar-saints are named in the menologion and were out of scope here.
The `stylites` group has room for them.

- Ven. Nicetas the Stylite of Pereyaslavl, 05-24, +1186
- St. Luke the New Stylite of Chalcedon, 12-11, +979
