# Cover titles that still set badly (notes, not fixed in 1.7.1)

The owner, 2026-10-17: "some books, they have like dashes, they have like weird
parsing like issues that ruin the design ... You don't even have to do it for
this update. It's just, you know, just read it, take notes on it."

What 1.7.1 does for every title (lib/reading/coverText.ts, the reading room's
posters in components/covers/WorkCover.tsx): balanced lines, "St." held to its
name, small words carried down with their word, a size fitted to the words so
nothing is cut, and the author never touching the title. It changes no title
and treats a hyphen as the browser does, as a place a line may break. What is
left is below: books whose title (or author line) is itself the problem. Each
note says what the data is, how it sets today, and the fix I would make,
marked **data** (change the registry text, the owner's or an editor's call),
**parsing** (read the text into parts) or **display** (set it differently).

Sizes below: row = a row tile on a phone (112px), grid = the search's grid on
a 360px phone (100px), hero = the featured book and a book's page (188px),
sm = a saint's Writings list (72px). "/" is a line break.

## Hyphens

1. **Scholia on the Incarnation of the Only-Begotten**
   (`cyril-of-alexandria/scholia-on-the-incarnation`). Breaks inside the
   compound at every size: row, grid and sm set "of the Only- / Begotten",
   hero "of the Only- / Begotten" too. **Display:** never break a hyphenated
   compound. In coverText.ts `pieces()` stops splitting at a hyphen and the
   compound is measured as one word; the cover wraps it in a no-wrap span
   (not U+2011: Lora has no non-breaking hyphen, so the browser would draw
   that one glyph in a fallback face).
2. **The Life of the Holy Mother Isidora, Fool-for-Christ**
   (`isidora-of-tabenna/life-of-isidora`, no picture). Row and grid: six lines,
   "The Life / of the Holy / Mother / Isidora, / Fool-for- / Christ". The comma
   and the compound together make it the tallest poster. **Display** as 1, and
   **parsing** as 7: the epithet after the comma is a second part.
3. **The First-Called** (`apostle-andrew/the-first-called`). The row, the grid
   and sm break it "The First- / Called"; the hero and the computer's sizes
   set it on one line, and held whole it fits one line everywhere.
   **Display** as 1.
4. **The Senator-Bishop** (`nectarius-of-constantinople/the-senator-bishop`,
   no picture). Breaks at every size: row, grid and sm "The / Senator- /
   Bishop", hero "The Senator- / Bishop". **Display** as 1.
5. **The Life of St. Ignatius the God-bearer, Bishop of Antioch**
   (`ignatius-of-antioch/life-of-ignatius`). The longest title in the room (58
   characters). It is whole everywhere, but the row sets it at 82 percent of
   full size and the grid at 76: "The Life / of St. Ignatius / the God-bearer, /
   Bishop of Antioch". At sm the compound breaks too ("the God- / bearer,").
   **Data:** the work already has a subtitle ("From his own letters and the
   witness of Polycarp, Irenaeus, Origen, and Eusebius"); the cover would read
   best as "The Life of St. Ignatius the God-bearer", with "Bishop of Antioch"
   either dropped from the cover title or moved into a short cover subtitle.
   Rewording, so his call.

## Commas, colons and other parsing

6. **Against Heresies: On the Fourth Gospel**
   (`irenaeus-of-lyons/against-heresies-on-john`, no picture). The work and its
   part share one title, and the lines cross the colon: row "Against /
   Heresies: On / the Fourth / Gospel" (grid the same), hero "Against /
   Heresies: / On the Fourth / Gospel". **Parsing:** split at ": " into a title
   ("Against Heresies") and a part ("On the Fourth Gospel"), set as two lines
   of two sizes, the part smaller. A display-only fix is to break after the
   colon whenever the title has one.
7. **The Essence and the Energies, in the Words of the Fathers**
   (`gregory-palamas/essence-and-energies`). 57 characters; whole, but four
   lines, set at 88 percent in the row ("The Essence and / the Energies, / in
   the Words / of the Fathers") and 82 in the grid. **Parsing** as 6, at the
   comma: "The Essence and the Energies" over "in the Words of the Fathers".
8. **The Life of St. Hermione, Daughter of the Apostle Philip**
   (`hermione-of-ephesus/life-of-hermione`, no picture). 56 characters, set
   small: the row at 76 percent, the grid at 88 over five lines ("The Life of /
   St. Hermione, / Daughter of / the Apostle / Philip"). **Parsing** as 7.
9. **The Life of Malchus, the Captive Monk**
   (`jerome-of-stridon/life-of-malchus-the-captive-monk`). The one title left
   with a short word alone at the end in the room's sizes: row and grid "The
   Life / of Malchus, / the Captive / Monk". **Parsing** as 7, or **display:**
   prefer a line end after a comma when a title has one.
10. **The Life of S. Hilarion** (`jerome-of-stridon/life-of-saint-hilarion`).
    Sets well ("The Life / of S. Hilarion"), but "S." stands where every other
    title in the room says "St.", so it reads as a typo on a cover. **Data:**
    "St. Hilarion", if the editorial standard allows the house abbreviation
    over the translation's own spelling.
11. **Our Lord's Sermon on the Mount** (`augustine-of-hippo/sermon-on-the-mount`)
    and **On the Lord's Prayer** (`cyprian-of-carthage/on-the-lords-prayer`).
    The straight typewriter apostrophe (') draws as a tick in Lora. **Display:**
    turn an apostrophe between letters into the typographic one (U+2019) when
    a title is set, on covers and in headings alike; or **data**, once, in the
    registry.

## Author lines

The cover names the saint as the registry does, in full, and some names are
titles of office written out. They are whole and balanced, but they take
three lines below the hero, which pushes their titles smaller and covers more
of the icon:

- "Holy Prophet, Forerunner, and Baptist John"
  (`john-the-baptist`): row and grid "Holy Prophet, / Forerunner, / and Baptist
  John".
- "Holy Apostle and Evangelist Matthew", "Holy Apostle and Evangelist John":
  three lines in the grid.
- "Holy Apostle James, Son of Zebedee", "Holy Apostle James, Son of Alphaeus",
  "Holy Apostle Simon the Zealot": three lines in row and grid, "Holy /
  Apostle James, / Son of Zebedee".
- "The Holy Maccabean Martyrs" (row and grid) and "The Holy Archangel
  Michael" (grid): a lone "The" over "Holy Maccabean / Martyrs". "The Seven
  Sleepers of Ephesus": "The Seven / Sleepers / of Ephesus".
- "St. Prochorus, Deacon and Bishop": "St. Prochorus, / Deacon / and Bishop".

**Data:** a short cover name per saint (the registry's `byname` is the wrong
field: it is "The Theologian", "Golden-Mouth"), for example "St. John the
Baptist", "St. Matthew", "St. James, Son of Zebedee", "Archangel Michael".
New words on a cover, so the owner's call; the page itself keeps the full name.

## Not on the cover, seen while reading these

- The subtitle of **Mystic Treatises** (`isaac-the-syrian/mystic-treatises`),
  shown under the title on the book's page, is "Six Treatises on the Behaviour
  of Excellence" followed by an em dash and "opening homilies". The house
  writes no em dash in anything a reader sees. **Data:** a colon or a period
  there, an editor's call since it is the work's own subtitle.
