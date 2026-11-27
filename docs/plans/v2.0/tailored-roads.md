# Purify for a reader from another church: a brainstorm

His words, 2026-11-27, about 21:15 UTC: "Remember, it must be tailored to the user and who the user is. So for example, if it's Protestant, it's going to be tailored towards them as if they're a Protestant ... when you're Orthodox, for example, it says your fast, right? Or your next week's fast or whatever, right? But for Protestants, they're not actually going to see that ... just brainstorm ways so that if there's any pre-assumptions, right, it's tailored towards the user and them being a Protestant, Roman Catholic ... let's brainstorm."

Nothing here is built. Each idea waits for his yes; anything designed is drawn and justified first (CLAUDE.md, "Every design is justified").

## The rule it stands under

- **The frame changes, never the faith.** `lib/onboarding/road.ts`: "no page of content knows who is reading it". A road changes the order things are met in, the first step and the words around the content (a label, an invitation, a note), never what a council, a saint, a prayer or Scripture says.
- **Doctrine goes to the queue.** Any line that touches doctrine (the Assumption, Communion, the filioque) is drafted for the clergy and editorial queue, never shipped straight (`docs/editorial-standards.md`).
- **Respect, never polemic.** Orthodox practice is described as Orthodox ("Orthodox Christians keep..."), never as the reader's, and never as a correction of their church.
- **Only the app can tailor.** The answers stay on the phone (the privacy page says so), so emails and the website cannot tailor until the answers live on the account (SCOPE D1, recommended for 2.1).
- **By the road, as the fast is.** The Catholic's and the Protestant's roads (`fastApplies`), so a Catholic or a Protestant who goes to the services, the catechumen's road, meets the app as it is.

## Done already

The fast is not set on their day (2026-11-27, `fastApplies`): Today, the Nativity Fast's count and band, Prayers, the journal, the fasting rule in Settings. The Fast's page, search and the library stay theirs to read. His call still open: the calendar (kept as the Church's year, fasts shown) and the home-screen widgets (native work).

## The ideas, by place

Found in the app's own words (`lib/i18n/messages/en.json`, 2026-11-27): 11 lines say "your priest", 16 speak of name days, 9 of "your rule", and the date line counts to Pascha.

| # | Where | What an Orthodox reader sees | What a Catholic or Protestant would see | Doctrine? | Size |
|---|---|---|---|---|---|
| 1 | Today's date line, Prayers' day card, the calendar | "170 days until Pascha" | "170 days until Pascha, the Orthodox Easter", and the Western date when it differs | No, dates | Small |
| 2 | The Bible, the prayers, the readings | The Psalms by the Greek numbering: Psalm 50 | "Psalm 50 (51)": the number in their own Bible beside it | No | Medium |
| 3 | The Bible's contents | Tobit, Judith, Sirach, Baruch among the books | Protestant: a quiet line, "In the Orthodox and Catholic Bibles; most Protestant Bibles leave it out". Catholic: only on the few their Bible lacks, where the app holds them (1 Esdras, 3 and 4 Maccabees, Psalm 151, the Prayer of Manasseh) | Light, factual | Small |
| 4 | Feasts on Today and the calendar | "The Dormition", "The Meeting of the Lord" | "The Dormition (in the West, the Assumption)", "The Meeting of the Lord (Candlemas)" | Yes (the Assumption) | Medium |
| 5 | Community's notes, the clergy answers | "for confession or guidance, your own priest" | Protestant: "your own pastor or priest" | No | Small |
| 6 | Today's name-day card | "Happy name day" | Catholic: as it is (they keep name days). Protestant: off, or "A saint who shares your name" | No | Small |
| 7 | Prayers, "Your rule" | "Your rule" | The first time: "A rule: a daily pattern of prayer, kept since the early Church." The house keeps its word and explains it | No | Small |
| 8 | Your first Liturgy, the prayers before Communion | The guide as written | A visitor's note: welcome at the whole Liturgy; Communion is received by Orthodox Christians; the blessed bread at the end is often offered to visitors too (parishes differ). Read the guide first: it may say this already | Yes | Small |
| 9 | Their first week (already their own steps) | Each step's title | A bridge line in their terms. Protestant: Carthage, "The Bible you read: how its books were received"; John, "The Gospel you know, read with the Fathers who first heard it". Catholic: Leo, "The Pope both East and West honour"; the Schism, "What East and West share, and what divided them" | Yes | Medium |
| 10 | Find a parish | "Find a parish" | "Visiting an Orthodox parish: what to expect", with the first Liturgy guide first | Light | Small |
| 11 | A few frame lines that speak of "the Church" | "the Church" | "the Orthodox Church", on a short named list only (Today's lead, the calendar's title, the parish finder), never on content | Light | Medium |

**Not recommended:**

- Changing how the saints or the Theotokos are spoken of. That is content, and the road rule keeps it whole. The order they are met in is already set by the road's week.
- A Bible of their own as the default. The app holds the KJV in English, which a Protestant knows. A Catholic's own public-domain Bible (Douay-Rheims) is not in the app, and adding one is content work for later.

## How it would be built, at his yes

- **One table of tailored words.** A message key gets a road variant (`today.paschaCount@catholic`), and the translate hook picks it from the reader's road. A test holds three things: each variant exists in all 21 languages; variants touch only a named list of frame keys, never content; and every variant has its own Orthodox key.
- **Cost.** Each tailored line is written once and then translated 20 times. The table keeps the set small and easy to review. Rough cost: items 1, 5, 6 and 7 together about $8 to $15; item 2 about $10 to $20 (mapping the numbering, with a test over every Psalm); items 3, 4, 8, 9 and 10 about $15 to $30 a group, plus the editorial queue's time.
- **First, if he wants a start:** 1 (Pascha and Easter), 2 (the Psalms' numbers), 5 ("your pastor or priest") and 6 (name days for Protestants). They are low risk, clear to a reader on the first day, and touch no doctrine. Then 8 and 9 through the queue.

## His to answer

1. Which of the eleven, and in what order.
2. Does "Another Christian tradition" (the `christian` road) get the same tailoring, or only Catholics and Protestants?
3. The two open calls from the fast work: the calendar and the widgets.
