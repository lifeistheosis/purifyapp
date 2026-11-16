#!/usr/bin/env python3
"""The round's page, from the design kit's own style block and the stills.
python3 page.py <repo> <scratchpad>  ->  <scratchpad>/round3/index.html"""
import json, re, sys, html

repo, S = sys.argv[1], sys.argv[2]
tpl = open(f"{repo}/docs/brand/kit/artifact-template.html").read()
kit = tpl[tpl.index("/* kit:begin"):tpl.index("/* kit:pictures:end */") + len("/* kit:pictures:end */")]
sizes = json.load(open(f"{S}/round3/sizes.json"))
e = html.escape


def pic(name, alt, cls=""):
    w, h, _ = sizes[name]
    return f'<img src="stills/{name}.webp" width="{w}" height="{h}" loading="lazy" alt="{e(alt)}"{f" class=\"{cls}\"" if cls else ""}>'


def pair(before, after, alt_b, alt_a, tall=False):
    c = "pair pair-tall" if tall else "pair"
    return f'''<div class="{c}">
  <figure class="shot shot-after"><span class="k-eyebrow">After</span>{pic(after, alt_a)}</figure>
  <figure class="shot shot-before"><span class="k-eyebrow">Before</span>{pic(before, alt_b)}</figure>
</div>'''


def one(name, alt, label, wide=False):
    return f'<figure class="shot{" shot-wide" if wide else ""}"><span class="k-eyebrow">{e(label)}</span>{pic(name, alt)}</figure>'


def reasons(rows):
    out = ['<ul class="why">']
    for what, why, does in rows:
        out.append(f'<li><span class="why-what">{what}</span><span class="why-line"><b>Why.</b> {why}</span><span class="why-line"><b>For the reader.</b> {does}</span></li>')
    out.append("</ul>")
    return "\n".join(out)


def decision(n, name, reach):
    return f'<div class="d-head"><span class="d-n">{n}</span><h2 id="d{n}">{name}</h2><span class="d-reach">{reach}</span></div>'



JOHN_B, JOHN_A, JOHN_S = (open(f"{repo}/docs/1.9-build/redesign/round-3/measured.txt").read().split() + ["", "", ""])[:3]
def q(text):
    return f'<div class="k-note"><p>{text}</p></div>'


def duo(*figs):
    return '<div class="pair">' + "".join(figs) + "</div>"


# What the checker said, written here once the stills were checked.
CHECKED = open(f"{repo}/docs/1.9-build/redesign/round-3/checked.txt").read().strip()
found = [l.strip() for l in open(f"{repo}/docs/1.9-build/redesign/round-3/found.txt").read().splitlines() if l.strip()]
FOUND = ('<h3>To know before you answer</h3><ul class="plain">' + "".join(f"<li>{e(l)}</li>" for l in found) + "</ul>") if found else ""

body = f'''
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">Purify 1.9, round 3</span>
    <h1>Seven screens, redrawn</h1>
    <p class="k-lede">One version of each, to answer yes or no, each choice with its reason.</p>
    <p class="k-meta">Real screens from the branch's own export, cut as the store build is cut, at 390 by 844. Stills only. 16 November 2026.</p>
  </header>

  <section aria-label="To decide">
    <div class="k-lead k-night dark-island">
      <span class="k-eyebrow">To decide</span>
      <span class="k-lead-value">7</span>
      <p class="k-lead-change">The journal, the chants door, You and Profile, the Bible's opening, Plus, a plan's page and the Voice sheet. Nothing here is in the app. Nothing ships without your yes.</p>
    </div>
  </section>

  <section class="k-section" aria-labelledby="d1">
    {decision(1, "The journal, as its own page", "Your notes of builds 97 and 98: a page, not a pop up, and quoting real works.")}
    <p>The writing was a sheet with two trays stacked at its foot, two Done buttons and a long More panel. It is now a page: the day, its reading, the kind, the title and the words, with one Done and one quiet plus for everything else.</p>
    {pair("journal-before", "journal", "The journal today: a sheet with Close and Done at its head and a toolbar of Verse, Quote, Highlight and More at its foot.", "The journal proposed: a page with a back chevron, the day, one Done, the reading's line, the kind, the title and the words, and one round plus at the foot.")}
    {duo(one("journal-written", "A written page: a cover picture at its head with one line of credit, a title, a reader's own words, and a quote from the library with its citation and Open.", "A page with a cover and a library quote"), one("journal-sheet", "The one sheet: Verse, Quote, Cover, Highlight and More as rows in one tray, then Notebook, Tags, Font and Alignment in a second.", "The plus opens one sheet"))}
    {duo(one("journal-quote", "Quote in the sheet: a search of Purify's library with results grouped by where they are from, the Plus mark on what is Plus, and a quote of your own under the field.", "Quote searches Purify's library"), one("journal-keys", "The page as it stands above the keyboard: the head with Done, the words, and the one plus alone at the foot.", "With the keyboard up (the screen above the keys)"))}
    {reasons([
      ("A page of its own, with one head and one Done", "A sheet over the journal left two layers to read and two buttons that both said Done. A page has one head: back, the day, Done.", "Writing has the whole screen, and there is one way to finish."),
      ("One calm surface, with no boxes", "The reading, the kind, the title and the words stand on the page's own ground. The kind is the house's track, the one form for a small choice from round 1. No field wears a ring when tapped.", "It reads as a page of a notebook, not as a form."),
      ("One plus, one sheet", "Cover, verse, quote, highlight, notebook, tags and font were spread over a tray, a toolbar and a panel. They are now rows in one sheet behind one control, and the sheet changes in place instead of stacking a second tray.", "Nothing stands between the reader and the words until it is asked for."),
      ("Quote searches the library and lays the passage cited", "You asked twice to quote real works from here. The Quote row opens the search Updates 98c built, inside the page's sheet. A passage lands verbatim with its citation, the line that says it is from Purify's library, and Open back to its page. A quote of your own is the second choice and never wears the library's line.", "A Father's words or a verse are quoted exactly and can be followed home."),
      ("The cover scrolls with the page, and nothing moves when the keys come", "The cover used to vanish when typing began, which read as a jump. Now the page only scrolls, and the plus stands alone above the keys.", "The screen holds still when the keyboard opens."),
    ])}
    {q("Yes or no: the journal is written on a page of its own, with one Done and one plus?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d2">
    {decision(2, "The chants door on Prayers", "Your note 3 of build 98: it does not fit its purpose.")}
    <p>The card was a band borrowed from meditation apps, with a white play disc that played nothing. The door now shows what is behind it: the chants' own covers on a shelf, and no play mark.</p>
    {pair("door-before", "door", "The chants card today: a white disc with a play mark beside Sung prayer, Chants and a line.", "The chants door proposed: a row of the chants' own cover pictures running off the edge, then Sung prayer, Chants, the line and a chevron.")}
    {reasons([
      ("A shelf of the chants' own covers", "A door to a library should show the library. The covers are the ones the chants wear inside, the Prayer Rope Anthem first, and the row runs off the edge so it reads as more than fits.", "The reader sees what is inside before the tap."),
      ("No play mark", "A play disc promises sound, and the tap opened a page. The chevron says what happens: you go in.", "The card does what it looks like it does."),
      ("One card, one link, on both Prayers pages", "The name, the small line and its words are the ones already there. The same door stands on a phone and on a wide screen.", "Nothing to learn again."),
    ])}
    {q("Yes or no: the chants door as a shelf of covers?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d3">
    {decision(3, "You and Profile, as one design", "Your note 11 of build 98, and You from the fifteen screens.")}
    <p>Profile read as an account's record: the sign-in address under the name, Member since, Last signed in. The two pages now open with the same piece, who the reader is, and the account's facts are off the face of the page.</p>
    {pair("you-before", "you", "You today: the picture, the name, a Your profile row, the badges, then a boxed streak card.", "You proposed: the picture, the name, the patron saint under it with his small picture, the badges, then the days and the week on the page.")}
    {pair("profile-before", "profile", "Profile today: the picture, the name, the sign-in address, Edit, then Member since, Last signed in and a row about the Community profile.", "Profile proposed: the same piece with Edit, the patron saint as a picture card, the days kept, then the Community card as others see it.")}
    {duo(one("you-new", "You for a new reader: the way to sign in, one line that invites a first prayer or chapter, then four plain rows.", "You, for a new reader"), one("profile-ar", "Profile proposed, in Arabic, mirrored.", "Profile, in Arabic"))}
    {reasons([
      ("One piece for who the reader is, on both pages", "The picture, the name, the patron saint and the badges earned. The tap from You carries the picture and the name across, so Profile reads as the same place opened up.", "The reader meets themself first, not their account."),
      ("The patron saint under the name, where the address was", "The sign-in address stood large on a screen people share. A patron saint is who the reader walks with. On Profile the saint has a card with the icon, the feast and Change.", "A profile that can be shown to someone without showing an address."),
      ("The life kept as one piece, and one invitation while it is empty", "The days, the week's dots and the week's line stand together on the page, in the same form on both pages. A new reader sees one line that invites a first day, never 0 days, and no row of empty things.", "The streak is read in one glance, and an empty page asks for one thing."),
      ("The Community card drawn as the card", "It was a row of words about a card. It is now the card as others see it, with the way in to change it.", "The reader sees what others see."),
      ("The account's facts behind one row", "Address, member since, last sign-in and plan are listed under Account and security, where a reader who needs them looks.", "The face of the page is the reader's, and the record is one tap away."),
    ])}
    {q("Yes or no: You and Profile open with the same piece, and the account's facts leave the page's face?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d4">
    {decision(4, "The Bible, as a chapter opens", "From the fifteen screens. The most read screen in the app.")}
    <p>The first verse of John 1 began {JOHN_B}% of the way down the screen, under a title, two pickers, a box and a standing note in bold and red. It now begins at {JOHN_A}%, and at {JOHN_S}% once the note has been read.</p>
    {pair("john-before", "john", "John 1 today: the book's name, two pickers, a Before you read box and a note in bold and red, with the first verse near the middle of the screen.", "John 1 proposed: John and the translation as a small line, Chapter 1 as the title, Before you read as one line, the note once in quiet words, and the first verse in the first third.")}
    {duo(one("john-seen", "John 1 for a reader who has read the note: the first verse begins a quarter of the way down.", "Once the note has been read"), one("more", "The More sheet proposed: Reader settings, Search the Bible, Chapters, Translation, Interlinear Greek and Bookmark this chapter as rows in one tray, with the note about the red numbers under them.", "The More sheet, as one tray"))}
    {reasons([
      ("The chapter opens as a chapter", "The book and the translation are the small line, the chapter is the title. The two pickers are the same pickers, set into those words.", "Scripture is on the screen as it opens."),
      ("Before you read as one line", "It was a box above every chapter. It opens to the same words.", "It is there for who wants it and costs one line for who does not."),
      ("The note about the red numbers, said once", "It stood in bold and red over every chapter with commentary. It shows once in quiet words, is remembered on the phone, and lives afterwards in the More sheet.", "A reader is told once, and can find it again."),
      ("The More sheet as rows in one tray", "Six separate outlined capsules become one list with hairlines. Nothing is removed.", "One list to read down."),
    ])}
    <p>The books sheet, the translation sheet and the listening dock are untouched: Updates 98a and 98b changed those this week, and this stands on their work.</p>
    {q("Yes or no: the chapter opens with Scripture in the first third?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d5">
    {decision(5, "Purify Plus", "From the fifteen screens. The page that earns.")}
    <p>Under a good opening picture stood eight identical boxes, each an icon tile, a paragraph and Try it. Each part of Plus is now shown as it looks in the app.</p>
    {pair("plus-before", "plus", "Plus today: the opening picture, then boxed cards with an icon tile, a paragraph and Try it.", "Plus proposed: the opening picture, then a verse in Greek with its English as the specimen for Word study, with the part's name and line under it.")}
    {pair("plus-whole-before", "plus-whole", "The whole Plus page today.", "The whole Plus page proposed: a specimen for each part, one under another.", tall=True)}
    {reasons([
      ("Each part shown as it looks", "A reading mode is a verse worn in that mode, the journal's covers are the covers, the Greek is a real verse with its Greek. The specimens are made from the app's own parts and its own text.", "The reader sees what Plus adds instead of reading about it."),
      ("No icon tiles, no boxes, no Try it buttons", "The specimen is the way in to try the part where there was a Try it. Parts with no honest picture stand as a name and a line.", "The page reads as a walk through the app, not a price list."),
      ("The price, the terms and the button are untouched", "They are yours. The dock at the foot is as the code has it.", "Nothing about what is paid has changed."),
      ("One Plus page in the app", "A reader with no plan was sent from the plan's page to the older pricing table. In the apps that way now leads here.", "One place to learn what Plus is."),
    ])}
    {q("Yes or no: Plus shows each part as it looks?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d6">
    {decision(6, "A plan's own page", "Your note 7 of build 97: a better plans design.")}
    <p>The page had no picture, opened on a count over an empty bar, and listed its days as numbered circles. Now the plan's picture leads, the day is one card, and each day says what it holds.</p>
    {pair("plan-before", "plan", "The four Gospels today: the name, a card with Day 1 of 89 and its sources inside, and the days as numbered circles.", "The four Gospels proposed: the plan's picture with its name over the foot, 89 days and the plan's line, the day's card with Begin, and the sources as one line under it.")}
    {duo(one("plan-day3", "The plan on its third day: 2 of 89 days read with its bar, and the day's card for Matthew 3.", "On the third day"), one("plan-day3-whole", "The whole page on the third day: the days behind marked with a check, today marked, the days ahead in words.", "The whole page, with the days"))}
    {reasons([
      ("The plan's picture leads, carried in from its tile", "The tile on the plans list wears a picture and the page had none. It is the same picture, so the tap carries it in.", "The reader arrives where they tapped."),
      ("No zero as a first sight", "Round 1's rule. Before a day is read the page says what the plan is, 89 days and its line. The count and its bar appear from the first day read.", "A plan not yet begun is an invitation, not an empty score."),
      ("The day as one card, with its sources kept under it", "The reading's name is large, with one Begin. Every source is still there, behind one line that opens them.", "Today's reading is found at once, and every citation is still one tap away."),
      ("Each day says what it holds", "Numbered circles said nothing. A day is its reading, with its number as the small part, and a check when it is read.", "The road ahead can be read."),
    ])}
    {q("Yes or no: a plan's page led by its picture, with the day as one card?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d7">
    {decision(7, "The Voice sheet", "Your word of 15 November: Heart, and Emma, Michael and Fenrir for Plus.")}
    <p>Four voices as four rows in one tray. Each row has a sample that plainly plays, says in words where the voice is, and wears a mark for downloaded that cannot be mistaken for not downloaded.</p>
    {pair("voice-before", "voice", "The Voice sheet today.", "The Voice sheet proposed, for a reader without Plus: Heart chosen, then Emma, Michael and Fenrir, each with the Plus mark and a sample to play.")}
    {duo(one("voice-plus", "For a reader with Plus: Emma downloaded and chosen, Michael downloading part way, Fenrir not downloaded.", "With Plus: downloaded, downloading, not downloaded"), one("voice-sample", "A sample playing on Emma's row: the play mark has become pause inside a ring that fills, and the row says it is playing.", "A sample playing"))}
    {reasons([
      ("One list, one answer", "The chosen voice's row is lit and ticked, the house's form for one answer from a list.", "The voice in use is seen at once."),
      ("A sample that plainly plays", "Your words: a distinct play to listen. The round control turns to pause inside a ring that fills as the sample runs, and the row says so in words. One sample plays at a time.", "No doubt whether the tap did anything, or which voice is speaking."),
      ("Three marks that cannot be mistaken", "Your words: a distinct design for a voice that is downloaded and one that is not. Downloaded is a filled mark and the word, not downloaded is the download control and the words, downloading is a ring with its share. The words always say it too.", "The reader knows what is on the phone before going offline."),
      ("Plus shown, never hidden, never promised", "A reader without Plus sees all three with the Plus mark and can hear each sample. Choosing one opens Plus.", "The offer is honest and can be heard first."),
      ("The phone's own voices are not listed in English", "Your decision. Other languages keep the phone's voice, in the same row.", "English readers choose between four good voices only."),
    ])}
    <div class="duo">{one("voice-ar", "The Voice sheet proposed, in Arabic.", "In Arabic")}</div>
    {q("Yes or no: the Voice sheet as four rows, with a sample that plays and plain marks?")}
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="s-check">
    <h2 id="s-check">Checked</h2>
    <p>{CHECKED}</p>
    {FOUND}
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Why this page looks as it does</h2>
    <ul class="why">
      <li><span class="why-what">The design kit's page</span><span class="why-line">It is the look you approved, so each proposal is read on the standard it is held to.</span></li>
      <li><span class="why-what">The proposed screen first, the present one after it</span><span class="why-line">On a phone each still is near its real size, and the one you are judging comes first.</span></li>
      <li><span class="why-what">One question at the end of each screen</span><span class="why-line">You answer yes or no seven times, and each answer stands alone.</span></li>
    </ul>
  </section>

  <footer class="k-foot">
    <p>Round 3, for Edgar</p>
    <p class="k-meta">On a yes, a fixer builds that screen and it goes into the next test build.</p>
  </footer>
</main>
'''

local = '''
/* Local to this page, built only from the kit's tokens. Phone first: the proposed
   still, then the present one, each near its real size; side by side from 640px. */
.d-head { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: var(--k-space-3); align-items: baseline; margin-block-end: var(--k-space-4); }
.d-n { font-family: var(--k-font-display); font-size: var(--k-text-title); line-height: 1.1; color: var(--k-ink-3); font-variant-numeric: tabular-nums; min-width: 1.2em; }
.k-section .d-head h2 { margin: 0; font-family: var(--k-font-serif); font-weight: 600; font-size: clamp(var(--k-text-title-sm), 1vw + 18px, 26px); line-height: 1.25; color: var(--k-ink); text-wrap: balance; }
.d-reach { grid-column: 2; margin-block-start: 2px; font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-3); }
.pair, .trio, .duo { display: grid; gap: var(--k-space-5); margin-block: var(--k-space-5); }
.shot { margin: 0; min-width: 0; }
.shot img { display: block; width: 100%; height: auto; border-radius: 22px; border: 1px solid var(--k-line); background-color: var(--k-well); }
.pair .shot, .trio .shot, .duo .shot { max-width: 390px; }
.pair-tall .shot { max-width: 300px; }
@media (min-width: 640px) {
  .pair { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
  .pair .shot-before { order: -1; }
  .trio { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; }
}
.why { list-style: none; margin: var(--k-space-4) 0 var(--k-space-5); padding: 0; }
.why li { display: grid; gap: 6px; padding-block: var(--k-space-4); }
.why li + li { border-block-start: 1px solid var(--k-line); }
.why-what { font-family: var(--k-font-serif); font-size: var(--k-text-body); line-height: 1.45; font-weight: 600; color: var(--k-ink); }
.why-line { font-size: 15px; line-height: 23px; color: var(--k-ink-2); max-width: var(--k-measure); }
.why-line b { font-weight: 600; color: var(--k-ink); }
.k-page .plain { margin: 0; padding-inline-start: 1.1em; max-width: var(--k-measure); font-family: var(--k-font-serif); font-size: var(--k-text-body); line-height: 1.65; color: var(--k-ink-2); }
.k-page .plain li + li { margin-block-start: var(--k-space-3); }
'''


head = '''<title>Round Three Screens</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap">
'''
page = head + "<style>\n" + kit + "\n</style>\n<style>" + local + "</style>\n" + body
assert "—" not in body and "—" not in local, "an em dash in the words"
open(f"{S}/round3/index.html", "w").write(page)
print(len(page), "bytes")
