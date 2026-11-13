#!/usr/bin/env python3
"""The round's page, from the design kit's own style block and the stills.
python3 page.py <repo> <scratchpad>  ->  <scratchpad>/round2/index.html"""
import json, re, sys, html

repo, S = sys.argv[1], sys.argv[2]
tpl = open(f"{repo}/docs/brand/kit/artifact-template.html").read()
kit = tpl[tpl.index("/* kit:begin"):tpl.index("/* kit:pictures:end */") + len("/* kit:pictures:end */")]
sizes = json.load(open(f"{S}/round2/sizes.json"))
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



# What the checker said, written here once the stills were checked.
CHECKED = open(f"{repo}/docs/1.9-build/redesign/round-2/checked.txt").read().strip()
found = [l.strip() for l in open(f"{repo}/docs/1.9-build/redesign/round-2/found.txt").read().splitlines() if l.strip()]
FOUND = ('<h3>Found on the way</h3><ul class="plain">' + "".join(f"<li>{e(l)}</li>" for l in found) + "</ul>") if found else ""

body = f'''
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">The fifteen screens, round 2</span>
    <h1>The first launch, Prayers and Discover</h1>
    <p class="k-lede">Three screens to answer yes or no, one at a time, each with its reasons.</p>
    <p class="k-meta">Real screens from the branch's own export, cut as the store build is cut, at 390 by 844, with round 1 and Discover's hold to move under them. 13 November 2026.</p>
  </header>

  <section aria-label="To decide">
    <div class="k-lead k-night dark-island">
      <span class="k-eyebrow">To decide</span>
      <span class="k-lead-value">3</span>
      <p class="k-lead-change">One version of each screen. Round 1's rules hold on all three. Nothing ships without your yes.</p>
    </div>
  </section>

  <section class="k-section" aria-labelledby="d1">
    {decision(1, "The first launch and its questions", "Every new reader, once. The first impression.")}
    <p>The steps switched between the night and a flat grey, and asked for one answer in three forms. Now the opening's night stays under every step, and every answer is asked the same way: rows in one tray, the chosen row ticked. This is rule 5's second form from round 1, drawn here for the first time.</p>
    {pair("q1-before", "q1-after", "The first question today: six outlined pills in three uneven rows, the chosen one lit white, with a line under them.", "The first question proposed: seven rows in one tray, Prefer not to say the last; the chosen row, Orthodox, is ticked and says where Purify will start the reader.")}
    {pair("q2-before", "q2-after", "The second question today: three boxed cards on flat grey, each with an icon tile and an empty ring, starting a third of the way down.", "The second question proposed: three rows in one tray on the night, under a centred heading.")}
    {pair("q3-before", "q3-after", "The calendar and fasting step today: two boxes side by side, then three boxed cards, each with a ring.", "The calendar and fasting step proposed: two trays of rows, the chosen row in each ticked.")}
    {pair("welcome-before", "welcome-after", "The welcome today: an app-icon tile over the words on flat grey.", "The welcome proposed: the lit cross of the opening over the words, on the night with its horizon.")}
    {reasons([
      ("The night under every step", "Five steps switched between the opening's night and a flat grey. The stars now stay under all of them, and the horizon stands wherever the foot of the screen is free.", "One place from the welcome to the last question, so the steps read as one walk."),
      ("Every answer as a row in one tray, the chosen row ticked", "The first question was a cloud of outlined pills, the second boxed cards with an icon tile and a ring to fill, the third a grid of boxes. A row is a name and at most one line, with no tile and no ring, as round 1 set it.", "One thing to learn once: tap a row, see it ticked."),
      ("The chosen row says where Purify will start you", "Your pick of 28 October kept this line under the pills. It is now the chosen row's own line, read out as it changes.", "The answer and what it does are read together, and nothing jumps under the list."),
      ("The cross of the opening on the welcome", "The app-icon tile was the one boxed mark in the walk. The first question already wears the lit cross.", "The welcome and the first question open the same way."),
      ("Every question's heading in one place", "The second question began a third of the way down an empty screen. Each question now starts at the same height, centred, as a chapter opens in the app.", "The eye stays where it was when the step changes."),
      ("The last question keeps its pictures", "It asks for as many answers as fit, not one, so it is a different job and keeps its own form. Only the stars are new under it.", "The strongest step is left alone."),
    ])}
    <p>This replaces your pick of 28 October for the first question, the pills that answer. Its night, its cross and its line are kept; the pills become rows, and Prefer not to say is the last of them. No word is new: every line is one the app already has in all 21 languages.</p>
    <div class="duo">{one("q1-ar", "The first question proposed, in Arabic: the rows read from the right and the tick stands at the left.", "In Arabic")}</div>
    <div class="k-note"><p>Yes or no: the questions on one night, with every answer as rows in one tray?</p></div>
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d2">
    {decision(2, "Prayers", "On the tab bar. Every reader who prays with the app.")}
    <p>Seven sections stood in seven forms, and the same doors stood up to three times. The first button was Make your rule, a setup task, before any prayer was offered. Now the hour's prayer leads with the one Begin, and every door stands once.</p>
    {pair("prayers-before", "prayers-after", "Prayers today: the Pantocrator, then Your rule with a Make your rule button, then a row of prayer pictures.", "Prayers proposed: the Pantocrator, then Now, Morning prayers and one Begin, then Pray now as rows in one tray.")}
    {pair("prayers-whole-before", "prayers-whole-after", "The whole Prayers page today, four screens long.", "The whole Prayers page proposed, under three screens long.", tall=True)}
    {reasons([
      ("The hour's prayer leads, with the screen's one white button", "The Pantocrator and the verse are your pick and stay. Under them stand the same parts as Today's lead in round 1: Now, the prayer's name, Begin. A reader who has made a rule keeps the checklist exactly as it is.", "A prayer is offered before anything is asked."),
      ("Pray now as rows in one tray", "It was a boxed list with a typed arrow and a chip. It is round 1's row now: a name, one line, the chevron. The hour's prayer and the Jesus Prayer are not named again in it.", "What else fits this hour, read at a glance."),
      ("The Jesus Prayer on the page, without a box", "Words to pray are not a card, as Today's verse was set in round 1. One way on under them: the lesson that teaches the prayer.", "The page has one quiet place that is only prayer."),
      ("The prayer book, once", "Morning prayers, the Hours and the akathists each stood three times. The book, your pick of 31 October, already holds every prayer, the Hours and the akathists, so the row of pictures and the picture tiles that repeated them go.", "One list to learn, and nothing to wonder about twice."),
      ("Your rule, Learn to pray and Chants as rows under the book", "They are what the book does not hold. Each keeps the line it already wears.", "The page is under three screens where it was four."),
    ])}
    <p>This retires two earlier picks of yours: the All prayers row of pictures (build 89, note 10) and the Practices picture tiles (pick A of 31 October). Every door they held is still on the page, once. No word is new.</p>
    <div class="k-note"><p>Yes or no: Prayers opens on the hour's prayer, and every door stands once?</p></div>
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="d3">
    {decision(3, "Discover", "On the tab bar. The way to everything that is not prayer or Scripture.")}
    <p>Twelve bands of one height stood in one column and nothing led. Start here was eleventh. Now the first door leads at a larger scale, and a reader who said they are new is given Start here first.</p>
    {pair("discover-before", "discover-after", "Discover today: a search field and bands of one height.", "Discover proposed: the first band, Saints, stands nearly twice as tall with its name at a title's size; the rest are as they were.")}
    <div class="duo">{one("discover-new", "Discover proposed for a reader who said they are new: New here? Start here leads, Find a parish is second, then Saints.", "For a reader who said they are new")}</div>
    {reasons([
      ("The first door leads, at a larger scale", "It is the same band, taller, its picture given room and its name the size of a title. It leads by its place alone, so whichever door a reader puts first with your hold to move wears it.", "The screen has a head, and the reader chooses it."),
      ("Start here and Find a parish first for a reader who said they are new", "The questions already ask. A reader who answered that they are exploring or learning gets the two doors made for a newcomer first. Once a reader moves a door, their own order holds.", "The newcomer's door is the first thing seen, not the eleventh."),
      ("One list, with no group headings", "The ranking suggested grouping the doors. Your hold to move, asked the same morning, makes the order the reader's own, and a heading would fence a door into a group it could not leave. The first order still reads as it did: people, the Church's record, the year, the ways in.", "Nothing stands between a reader and the order they want."),
      ("Everything else as it is", "The bands are your pick of 27 October. Their pictures, their lines, the search field and its transition are untouched; hold to move and Arrange sections are taken in as that chat built them.", "Nothing a reader knows has moved, but the head."),
    ])}
    <div class="duo">{one("discover-ar", "Discover proposed, in Arabic: the lead band mirrors with the rest.", "In Arabic")}</div>
    <div class="k-note"><p>Yes or no: the first door leads, and a new reader is given Start here first?</p></div>
  </section>

  <hr class="k-rule">

  <section class="k-section" aria-labelledby="s-build">
    <h2 id="s-build">For the chat that builds a yes</h2>
    <ul class="plain">
      <li>Discover: hold to move measures each band's height, and the first is now taller. Its walk has to be run again with the lead, and the lead changes hands when a door is dropped first.</li>
      <li>Discover: on the website the order drawn before the page wakes is the library's own; a new reader's first order needs the same early draw.</li>
      <li>The questions: a priest's or deacon's own steps, the account step and the reminders step take the night with the rest and were not redrawn. Their lists should become the same rows.</li>
      <li>Prayers: the pictures that travelled from a tile into its page no longer have a tile to leave from.</li>
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-check">
    <h2 id="s-check">Checked</h2>
    <p>{CHECKED}</p>
    {FOUND}
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Why this page looks as it does</h2>
    <ul class="why">
      <li><span class="why-what">The design kit's page, as round 1 used it</span><span class="why-line">It is the look you approved, so the proposals are read on the standard they are held to, and the five rounds read as one set.</span></li>
      <li><span class="why-what">The proposed screen first, the present one after it</span><span class="why-line">On a phone each still is shown near its real size, and the one you are judging comes first.</span></li>
      <li><span class="why-what">One question at the end of each screen</span><span class="why-line">You answer yes or no three times, and each answer stands alone.</span></li>
    </ul>
  </section>

  <footer class="k-foot">
    <p>The fifteen screens, for Edgar</p>
    <p class="k-meta">Round 2 of 5. Next: the Bible's opening, You and Plus.</p>
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


head = '''<title>Launch, Prayers, Discover</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap">
'''
page = head + "<style>\n" + kit + "\n</style>\n<style>" + local + "</style>\n" + body
assert "—" not in body and "—" not in local, "an em dash in the words"
open(f"{S}/round2/index.html", "w").write(page)
print(len(page), "bytes")
