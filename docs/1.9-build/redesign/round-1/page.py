#!/usr/bin/env python3
"""The round's page, from the design kit's own style block and the stills.
python3 page.py <repo> <scratchpad>  ->  <scratchpad>/round1/index.html"""
import json, re, sys, html

repo, S = sys.argv[1], sys.argv[2]
tpl = open(f"{repo}/docs/brand/kit/artifact-template.html").read()
kit = tpl[tpl.index("/* kit:begin"):tpl.index("/* kit:pictures:end */") + len("/* kit:pictures:end */")]
sizes = json.load(open(f"{S}/round1/sizes.json"))
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


body = f'''
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">The fifteen screens, round 1</span>
    <h1>Today, and four house rules</h1>
    <p class="k-lede">Five things to answer yes or no, one at a time, each with its reasons.</p>
    <p class="k-meta">Real screens from the branch's own export, cut as the store build is cut, at 390 by 844. 13 November 2026.</p>
  </header>

  <section aria-label="To decide">
    <div class="k-lead k-night dark-island">
      <span class="k-eyebrow">To decide</span>
      <span class="k-lead-value">5</span>
      <p class="k-lead-change">Today, and the four faults that repeat across the app, each mended once as a rule. One version each. Nothing ships without your yes.</p>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-how">
    <h2 id="s-how">How to read this</h2>
    <p>Each part shows the screen as it is and as proposed, taken from the app itself, never drawn. Under the pictures is each choice with its reason and what it does for the reader. Every proposed still passed the mockup checker on all five palettes unless a line says otherwise.</p>
    <p>The changes live on a branch on this machine only. On your yes, a screen's change goes to an Opus chat with a build spec, to be tested in every language and pushed.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section d" aria-labelledby="d1">
    {decision(1, "Today", "Every reader, every day. A new reader's first screen after the questions.")}
    {pair("today-before", "today-after",
          "Today as it is for a new reader: the date and the saint with a Morning prayers pill, a card that says 0 days over seven empty circles, then the verse in a box.",
          "Today as proposed: one card on the night sky with the date, the saint, the fast, Morning prayers and one Begin button, then the verse of the day on the page itself.")}
    {reasons([
        ("The day leads once, on the night: the date, the saint, the fast and the count to Pascha, the hour's prayer, one Begin.",
         "Before, the saint was named in two places and Morning prayers was offered twice, as a pill and again as a card. The night is the approved look's place for the one thing that leads.",
         "The first sight answers two questions, what day it is in the Church and what to do now, with one button under the thumb."),
        ("One white button on the screen. Read all, and the evening card's Pray, become the quiet outlined button.",
         "Three white pills on one screen each claimed to be first.",
         "Begin is never in doubt."),
        ("No 0 days. The prayer rope appears from the first day kept, as a row on the page and not a box.",
         "A zero over seven empty circles was a new reader's second sight. It reads as a score of nothing. This is rule 2 below.",
         "A new reader meets an invitation. A reader with days kept sees them."),
        ("The verse of the day stands on the page itself, without a box.",
         "The fault was three boxed cards in three treatments. In the approved look quiet things sit on the page and only a thing to act on is raised.",
         "The verse reads like the opening of a chapter: the cross, a small line, the words."),
        ("The day's other prayers are rows in one tray. They were a two by two of tiles of uneven height.",
         "Rows are always the same height and cannot leave one tile alone. This is rule 4 below.",
         "Name, minutes, and the whole row to tap."),
        ("The fast is said in words, in one tray with the Nativity path. It was outlined pills with foods struck through.",
         "You called the Fast outdated, and these pills are its form. The words are the calendar's own lines, already in every language.",
         "What is kept from today, read as a sentence. This row follows the Fast's new look when that lands."),
        ("During the Nativity Fast the star rises in the lead's own sky.",
         "From 15 November the star's card would stand as a second night under the lead. The look keeps the night to one place on a page.",
         "One sky. The star, then the day, then Begin."),
    ])}

    <h3>The whole page</h3>
    {pair("today-whole-before", "today-whole-after",
          "The whole of Today as it is, top to bottom.",
          "The whole of Today as proposed, top to bottom: the lead, the verse, the prayers as rows, the saint's words, the fast and the readings.", tall=True)}

    <h3>Its states</h3>
    <div class="trio">
      {one("today-streak", "Today with three days kept: under the lead, a row that says 3 days with the week's seven knots, three of them filled.", "With days kept")}
      {one("today-fast", "Today on 20 November in the evening: the Nativity star rising over a horizon at the top of the lead, then the forefeast, Evening prayers and Begin.", "In the Nativity Fast, evening")}
      {one("today-ar", "Today in Arabic: the same lead mirrored, the saint's picture at the right and the Begin arrow pointing left.", "In Arabic")}
    </div>
    <div class="duo">
      {one("today-800", "Today at 800 wide: the same column, centred.", "At 800 wide", wide=True)}
      {one("today-1032", "Today at 1032 wide: the same column, centred.", "At 1032 wide", wide=True)}
    </div>

    <h3>What it leaves alone</h3>
    <p>The saint's words with his face, the readings over the manuscript, the top bar and the tab bar are as they were. No word is new: every line is one the app already has in all its languages.</p>
    <h3>What is not drawn here</h3>
    <p>The lead after the hour's prayer has been prayed (the Prayed today mark beside Now). It goes in the build spec on your yes.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section d" aria-labelledby="d2">
    {decision(2, "Rule: no zero as a first sight", "Six screens today: Today, You, Theology, a reading plan, a reading path, Export your library.")}
    <p>A count is shown from one. Until then its place holds one invitation in words, or nothing.</p>
    {pair("zero-theology-before", "zero-theology-after",
          "Theology as it is: The faith, by subject, with 0 of 9 at the end of the line.",
          "Theology as proposed: The faith, by subject, with nothing beside it until a subject is read.")}
    {reasons([
        ("The count beside a heading appears with the first thing done. On Today, the rope appears with the first day kept (shown above).",
         "A zero tells a new reader what they have not done before they have begun.",
         "The first sight is the thing itself. The count arrives as a small reward, at one."),
    ])}
  </section>

  <hr class="k-rule">

  <section class="k-section d" aria-labelledby="d3">
    {decision(3, "Rule: the small line", "26 files under app and components carry spaced capitals today.")}
    <p>The line over a thing is sentence case, small and quiet, as the approved look has it. Never capitals spaced out.</p>
    {pair("line-plans-before", "line-plans-after",
          "Reading plans as it is: BEGINS NOVEMBER 15 and MORE PLANS in spaced capitals.",
          "Reading plans as proposed: Begins November 15 and More plans in sentence case.")}
    {pair("rows-theology-before", "rows-theology-after",
          "Theology as it is: THE WHOLE LIBRARY in spaced capitals over Go deeper, and four rows each with an icon tile.",
          "Theology as proposed: The whole library in sentence case over Go deeper, and four plain rows.")}
    {reasons([
        ("One class for the small line everywhere: 12px, semibold, the quiet ink, sentence case.",
         "The house voice asks for sentence case, and spaced capitals are the mark of a template. Three different sizes and spacings stood on these two screens alone.",
         "Labels read as words. The same line means the same thing on every screen."),
    ])}
  </section>

  <hr class="k-rule">

  <section class="k-section d" aria-labelledby="d4">
    {decision(4, "Rule: a row", "Eight places today: You, Settings, Your rule, Heresies, Apologetics, Theology, the Plus cards, Ambience.")}
    <p>A row is a name, one line and the chevron, with a hairline between rows, in one tray. No icon tile. A picture stands on a row only when it is the thing itself: a saint's face, a book's cover.</p>
    {pair("rows-heresies-before", "rows-heresies-after",
          "Heresies as it is: each row has the same scroll icon in a tile and a paragraph of three or four lines.",
          "Heresies as proposed: each row is the name of the error and one line naming who taught it.")}
    {reasons([
        ("The icon tile goes. On Heresies it was the same icon on every row.",
         "An icon that repeats says nothing, and a tile on every row is one of the looks you have named as generic.",
         "The names line up at the edge and are read straight down."),
        ("One line under the name. On Heresies it is who taught the error, which the app already holds. The paragraph stays on the error's own page.",
         "Four paragraphs in a list made the list a page of reading before any choice.",
         "Twice as many names on a screen, each with enough to choose by."),
        ("The same row is the one Today's prayers use above, and the one The Fathers on everyday struggles already has.",
         "One row in the app, not eight.",
         "Every list behaves the same under the thumb."),
    ])}
    <p>Settings and Your rule are held by other chats. Their rows would follow this rule in those chats' hands, at your yes.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section d" aria-labelledby="d5">
    {decision(5, "Rule: one small choice, one form", "Five forms today: a cloud of pills, a segmented switch, text tabs, boxed tiles, outlined pills.")}
    <p>To switch what is on the screen between two to four views, the house's track, the one the Calendar and Your rule already have. To give one answer from a list, rows in one tray with the chosen row marked. That second form is shown in round 2, on the first launch's questions.</p>
    {pair("choice-saint-before", "choice-saint-after",
          "A saint's page as it is: Life, Writings and Web as three boxed tiles with icons, Life filled white.",
          "A saint's page as proposed: Life, Writings and Web as one track, Life lit.")}
    {reasons([
        ("The boxed tiles become the track.",
         "The track is already the house's switch, and the saint's page already shows it once the reader scrolls. The tiles were a second form for the same choice on the same page.",
         "The switch is recognised from the Calendar, takes a third of the height, and the Life begins higher."),
        ("One shared part draws it.",
         "The saint's doors, the community profile's, the campaign's and the composer's are one piece of code, so they change together.",
         "The same choice looks the same wherever it is asked."),
    ])}
    <p>Community's text tabs and Saved's outlined pills take this form in their own rounds. The community's files are held by another chat, so that change is theirs to make at your yes.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="s-found">
    <h2 id="s-found">Found on the way</h2>
    <ul class="plain">
      <li>The saint's name in Today's words band is a link 24px tall when the name fits one line (any short name, and every name at 800 wide). The checker asks for 44. It is mended in the proposal.</li>
      <li>The greeting drew its arrow as a typed character. The proposal uses the app's own chevron.</li>
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Why this page looks as it does</h2>
    <ul class="why">
      <li><span class="why-what">The design kit's page, unchanged</span><span class="why-line">It is the look you approved, so the proposals are read on the standard they are held to.</span></li>
      <li><span class="why-what">The proposed screen first, the present one after it</span><span class="why-line">On a phone each still is shown near its real size, and the one you are judging comes first.</span></li>
      <li><span class="why-what">Small crops for the rules</span><span class="why-line">A rule changes one line or one row, so the picture is that part and nothing else.</span></li>
    </ul>
  </section>

  <footer class="k-foot">
    <p>The fifteen screens, for Edgar</p>
    <p class="k-meta">Round 1 of 5. Next: the first launch, Prayers and Discover.</p>
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
.pair .shot, .trio .shot { max-width: 390px; }
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

head = '''<title>Today and Four Rules</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap">
'''
page = head + "<style>\n" + kit + "\n</style>\n<style>" + local + "</style>\n" + body
assert "—" not in body and "—" not in local, "an em dash in the words"
open(f"{S}/round1/index.html", "w").write(page)
print(len(page), "bytes")
