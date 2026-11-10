# A month of saints: the path that repeats

**Opened.** 2026-11-10, with November (docs/1.9-build/notes/november-saints.md).
**The owner's word.** Every saint a month commemorates shown, with a page, his
life, his works, and his links to the Fathers, the councils, History and the
timelines. Done the same way each month, so the next month is in before its
first day.
**Binding.** docs/editorial-standards.md. Public-domain sources only, verbatim,
cited per passage. No life of ours, no invented patristic text, no AI-drafted
doctrinal framing shipped (it goes to the clergy queue).

The August workstream (august-menologion.md) wrote a short life of ours for
each saint. From November that is no longer done: a new page carries no prose
of ours beyond a short entry of plain facts.

## The standard a new page is held to

| Part | What it is | Where |
|---|---|---|
| Entry | Two or three plain sentences of fact: who, when, where, how he died or reposed, what the Church keeps. At most 80 words. No praise, no doctrine, nothing the source does not say. | `shortBio` in lib/saints/saints.ts |
| Source of the entry | Where those facts are read, named under the entry on his page (edition, year). | `entrySource` |
| Life | Only where a witness wrote one (a Church historian, a Father, a chronicle, Scripture): the witness's words, verbatim, one section per passage, each under its book, place and edition. It is one of his works. | data/saints/&lt;slug&gt;/&lt;work&gt;.json, by scripts/ingest-witness-lives.mjs |
| `life` | Empty. | `life: []` |
| Works | His own writings, from a public-domain English edition (before 1931), verbatim. | data/saints/, the reading room's ENTRIES |
| Icon | Only with settled rights, and only his own. Never another saint's face over a name. Otherwise the house's plate. | lib/saints/iconRights.ts, public/saints/icons/ |
| Links | Groups, the councils he sat in, the History events he is in, his teachers and disciples. | groups.ts, councils.ts, events.ts, saints.ts |

lib/saints/month.ts holds a page to all of that once it has `entrySource`.
Pages written before November (with a life of ours) are reported, never failed.

## The steps

1. **See the month.** `node --experimental-strip-types scripts/menologion-month.mjs plan <month>`
   prints every line the calendar has for the month (data/calendar/daily-saints.json)
   and what the app has for each: a page or none, its works, its icon's rights,
   its events and councils.

2. **Write the plan** in the release's notes (`docs/<release>/notes/<month>-saints.md`):
   the counts, and for each line without a page, its witness (if any) with
   edition, year and translator, the works that can go in, the links, and the
   icon. Note the Old-calendar day (13 days later) where it matters. Size it in
   hours and MB. Send the arbiter the counts and two or three plain lines.
   Stop and ask through the arbiter before going on if the plan needs a source
   that is not public domain, framing for the clergy queue, more than about
   10 MB, or more than about three days of work.

3. **Find each saint's witness.** Read the ancient sources first (Eusebius,
   Socrates, Sozomen, Theodoret, Jerome, the Fathers' letters, the Acts of the
   martyrs in ANF, the chronicles, Scripture). A modern compiler (Butler,
   Baring-Gould) is not a witness: his book is used only on the owner's word,
   and the plan asks for it by name. A line with no witness gets an entry
   only.

4. **Ingest the Lives.** Write `scripts/menologion/<month>-lives.mjs` (copy
   November's: one object per Life, its passages, the scans of the printing).
   `node scripts/ingest-witness-lives.mjs <month> --check` compares every word
   of CCEL's transcription with archive.org's text of scans of the same
   printing. Each difference is settled on the page image (archive.org,
   `/download/<id>/page/n<index>.jpg`): `fix` where CCEL slipped (the page
   wins), `ocr` where the scan's text misread. A misprint of the page itself is
   kept and noted. The script writes nothing while a difference is open. Then
   run it without `--check`; it writes the files and the review
   (docs/editorial/ingest-review/<month>-lives.md).
   The saints' own writings go the same way with `--works`, from
   `scripts/menologion/<month>-works.mjs`: a whole work is split at the
   edition's own chapter headings (`chapters`), a commentary the edition
   prints after each chapter is left out (`dropFrom`), and a part the
   edition itself judges not the author's is left out and said so in the
   work's source line (St Gregory's eleventh canon, November).

5. **Write the pages.** For each saint: the registry entry (`life: []`, the
   entry, `entrySource`, the works); the group membership (groups.ts); the
   reading room's AUTHOR_META row and an ENTRIES row for each work
   (`review: "pending-clergy"`); the slug on his calendar line; his council
   (`principalFathers[].slug`) and History events (`rel.saints`); his
   teachers and disciples. A feast line opens the page it belongs to (the
   Theotokos, a Great-martyr) by slug.

6. **Icons.** scripts/fetch-saint-icons.mjs stages candidates; each is looked
   at, its rights read at the source, cut to 315 x 420 under 200 KB, and given
   a full row in ICON_RIGHTS. A picture of a different saint, a modern painting
   under copyright, or a photograph with no licence is not used.

7. **Regenerate.** `node --experimental-strip-types scripts/emit-saint-briefs.mjs`
   and whatever else the tests name.

8. **Check.** `node --experimental-strip-types scripts/menologion-month.mjs check <month>`
   until it is clean. A line that cannot be done this month goes in
   DONE_MONTHS' `held` list with its reason, never silently. Then add the
   month to DONE_MONTHS (lib/saints/month.ts);
   lib/saints/__tests__/menologionMonth.test.ts keeps it done.

9. **Gates and push.** `npm run typecheck`, `npm run test:unit`, `npm run lint`,
   `npm run build:android` then `npm run build:ios` (never both at once), a
   walk of a few new pages on the export, checkMock on any changed screen, and
   stills. Commit on the release branch, pull with rebase, push, and report
   the hash to the arbiter.

## What a month's pages change elsewhere

- **Generated files.** `node --experimental-strip-types scripts/emit-saint-briefs.mjs`,
  `node scripts/saint-names.mjs` (the name links) and
  `node scripts/reading-stats.mjs` (the books' minutes). The tests name each
  one when it is behind.
- **The reading room's posters.** Every new work is a book, and its title and
  its saint's name must fit the posters at every size
  (lib/reading/__tests__/coverText.test.ts). A group of more than three names
  is named for the first two "and Companions", with every name kept in the
  epithet under it; a title is reworded, never cut.
- **The covers.** A book whose saint has a settled icon gets it on its cover
  (COVER_ART in lib/reading/coverArt.ts, `bundled`, with where the face
  sits); the rest stand on the plate, and
  lib/reading/__tests__/coverArt.test.ts lists the plate by name, so the new
  ones are added to it.
- **Today.** The Desert Fathers' saying stands on Today only on a day whose
  saint has no page to open (components/today/ChurchTodayRail.tsx). When a
  month is filled its days stop showing it, and a test that drew the saying on
  one of them moves to a day that still has no page
  (lib/today/__tests__/churchToday.test.ts).

## What November taught

- CCEL's transcription of NPNF and ANF is good, not perfect: November found
  slips the page corrects. Compare with the scans every time.
- A footnote's mark removed from the text leaves two words glued; the script
  puts a space in its place and tidies the space before punctuation.
- Old editions print the dash as "--" (CCEL) and the house keeps the edition's
  punctuation in a witness's words. Em dashes are refused only in what is ours:
  the entry, its source line, titles and citations.
- A passage that runs on into another man's story is cut at the last sentence
  about the saint (`endAfter`), never edited.
