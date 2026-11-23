#!/usr/bin/env python3
"""Promo edit 2, the Church: the storyboard's page, from the design kit.

  python3 -I -B docs/plans/promo-edits/edit-2/page.py . .promo/promo-edits/edit-2

Writes <work>/page/storyboard.html: the kit's own head and style, whole, and
this page's words. The stills are published beside it (stills/<name>.jpg),
so the page stays light. The pictures' list is read from pictures.json.
"""
import html, json, re, sys

ROOT, WORK = sys.argv[1], sys.argv[2]
HERE = f"{ROOT}/docs/plans/promo-edits/edit-2"
kit = open(f"{ROOT}/docs/brand/kit/artifact-template.html", encoding="utf8").read()
fonts = "\n".join(re.findall(r"<link[^>]+>", kit))
style = re.search(r"<style>.*?</style>", kit, re.S).group(0)
pics = json.load(open(f"{HERE}/pictures.json", encoding="utf8"))
e = html.escape

# name, time, what it is, the reference's shot, why
SHOTS = [
    ("01-candle-hand", "0.00 to 0.25", "A hand sets a lit taper among the others", "hands on a cross, close",
     "The reference opens on hands and a holy thing, for a quarter of a second. Ours is the first thing a person does on entering an Orthodox church."),
    ("02-church", "0.25 to 2.00", "A church within: the icon screen of a wooden church", "a man bowed in a room, a cross on the wall",
     "The longest shot of the opening, so it is the widest and the stillest: one slow move toward the royal doors. No one stands in it yet. That is the first of my two questions."),
    ("03-hand", "2.00 to 2.92", "The blessing hand, cut whole to the cuff from an icon of Christ, with the entry beside it", "a hand with a rosary on black, two small entries",
     "The reference's signature: a subject alone on pure black and tiny words set like a dictionary's entry. Ours has one entry, and its words are Scripture's own: the Church named by the Apostle."),
    ("04-figure", "2.92 to 3.71", "He whose hand it is, whole with His halo, and the invocation; A M E N across", "a fighter on black, the sign of the cross in words",
     "The hand, then the One who blesses. The words are the Lord's own in Matthew 28, set left and right as the reference sets them. No word stands on His face."),
    ("05-candles", "3.79 to 4.71", "Candles", "the first of seven shots, one every 0.92 s",
     "After two frames of blur the Church begins, on the clock the reference keeps. Beeswax tapers, already slow, with deep black around them."),
    ("06-censer", "4.71 to 5.62", "The censer", "second of seven",
     "The Church's own vessel, close, with one slow move down its chains. It is a photograph, so no smoke rises in it. See what is missing, below."),
    ("07-dome", "5.62 to 6.54", "A dome from below", "third of seven",
     "The one look upward in the film: a painted dome of 1850 with daylight in it, over the chandelier and the icon screen. The light is the photograph's own."),
    ("08-book", "6.54 to 7.42", "The service book in a priest's hands", "fourth of seven; the reference sets a small name on some shots",
     "Hands and vestment only, no face. Where the reference sets a name, ours sets the app's own label for what is shown: Prayers."),
    ("09-gospel", "7.42 to 8.33", "The Gospel open in His hand, from a Pantocrator of the 1390s", "fifth of seven",
     "The Gospel book, as the brief asks, from an icon and not from stock: the letters are the icon painter's own. The shot pulls back slowly; nothing in the icon is redrawn."),
    ("10-face", "8.33 to 9.21", "An icon's face: the Sinai Pantocrator", "sixth of seven; the reference's one bright frame falls here",
     "The oldest icon of Christ there is, and the app's own icon. The reference flashes white on this cut; ours does not, by your standing word. It is a plain cut."),
    ("11-app", "9.21 to 10.12", "The app: its real Today, on a plain phone on black", "seventh of seven",
     "The turn from the Church to Purify, once. A real screen of the export of main, a new reader with no Plus, Dark. The label is the app's own: Today."),
    ("12-end", "10.12 to 11.92", "The end card", "the maker's signature, a verse's name, the verse, a small cross",
     "The reference's own ending, with Purify's name where the signature stands and Purify's cross as the cross. One cross on the card, not two. It ends on the reference's cut at 11.92, before the fights."),
]

WORDS = [
    ("The entry", "CHURCH. the pillar and ground of the truth", "1 Timothy 3:15"),
    ("The invocation", "in the name of the Father, and of the Son, and of the Holy Ghost", "Matthew 28:19"),
    ("Across the frame", "A M E N", "Matthew 28:20, its last word"),
    ("The end card", "upon this rock I will build my church; and the gates of hell shall not prevail against it", "Matthew 16:18"),
    ("On the book shot", "Prayers", "the app's own label (nav.prayers)"),
    ("On the app shot", "Today", "the app's own label (nav.today)"),
    ("At the head, all through", "Purify", "the app's name"),
]

CHOICES = [
    ("The picture stands 1080 by 1440 in a 1080 by 1920 frame",
     "The reference is a wide band on a phone. Ours is taller, so it fills more of the screen, and the black above and below is the cut-outs' own black, so the hand and the figure seem to step out of the frame's edge. It also keeps every word clear of TikTok's own buttons and caption."),
    ("24 frames a second, not the house's 60",
     "The clips were filmed at 24 and 25. At 24 each frame of the film is a frame somebody shot. At 60 the frames between would have to be made up by a machine, and nothing in this film is. The reference's clock is also counted in 24ths: a cut every 22 frames."),
    ("Black and white with grain, and pure black behind the cut-outs",
     "The reference's whole look. The grain follows the light, so it never touches pure black. It also makes one family of an icon of 1390, a photograph of 2009 and a clip."),
    ("Small, exact type in DM Sans",
     "Your standing word: the app's sans, never the display serif. Slanted bold for the small lines and upright capitals for the word, as the reference sets them. Every line stays for its whole shot."),
    ("Nothing answers the sound but the cuts",
     "No bright frame at 8.33, no one-frame glitch at 2.00, no shake. The two frames of blur at 3.71 are kept, since they are a transition and not an effect on a beat. Tell me if you want those gone too."),
    ("One label on two shots only",
     "The reference names some shots and not others. A label on every shot would be a caption track."),
]

FOUND = [
    "The opening quarter second is two shots, not one: hands on a cross (three frames), then a stone carved with a cross (three frames).",
    "The long opening shot is a man sitting bowed on a bed's edge under a cross on a wall. It is a room, not a church.",
    "There is one frame of block glitch at 2.00, between the room and the hand.",
    "The run from 3.79 keeps a clock of 22 frames (0.92 s), not 0.90. The first four of its shots are one scene cut four ways.",
    "A second flicker of two frames falls at 9.12, and one extra cut at 10.42.",
    "From 8.33 a tiny line runs along the foot: the maker's name, FAITH and 2026.",
    "Every frame is grey to the last pixel: no colour was found in any of the 396.",
]

MISSING = [
    ("Someone at prayer before the icons, seen from behind", "No clip or photograph I could clear shows it. Pexels and Pixabay refuse to be read from here, and what Coverr and Mixkit hold is Catholic. The wooden church stands empty in its place."),
    ("Incense rising", "The censer is a photograph. Smoke cannot be added: that would be a picture made by a machine."),
    ("A bow or a blessing, and a prayer rope in the hand", "None found that is clean. A public domain photograph of a prayer rope exists on Wikimedia Commons, which would not serve it to me today."),
]

rows = lambda items, f: "\n".join(f(*i) for i in items)
shot = lambda n, t, what, ref, why: f"""    <figure class="k-figure k-phone">
      <img src="stills/{n}.jpg" width="540" height="960" alt="{e(what)}">
      <figcaption><strong>{int(n[:2])}. {e(what)}.</strong> {t} s. In the reference: {e(ref)}. {e(why)}</figcaption>
    </figure>"""
pic_rows = "\n".join(
    f'          <tr><td><a href="{e(p["page"])}">{e(p["what"])}</a><br><small>{e(p["used"])}</small></td><td>{e(p["licence"])}</td></tr>'
    for p in pics["pictures"].values())

page = f"""<title>The Church storyboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
{style}
<style>
.k-page {{ padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
.k-figure.k-phone img {{ height: auto; }}
.k-page .k-figure figcaption strong {{ color: var(--k-ink); font-weight: 600; }}
.k-page .e2-list {{ margin: var(--k-space-4) 0 0; padding-inline-start: 1.2em; max-width: var(--k-measure); }}
.k-page .e2-list li {{ margin-block-end: var(--k-space-3); line-height: 1.55; }}
.k-page .e2-list li strong {{ display: block; font-family: var(--k-font-sans); font-size: var(--k-text-ui); font-weight: 600; }}
.k-page .k-table small {{ color: var(--k-ink-3); font-family: var(--k-font-sans); font-size: var(--k-text-caption); }}
</style>
<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">Promo edit 2, the storyboard</span>
    <h1>The Church</h1>
    <p class="k-lede">Twelve stills, one for each shot, for your yes or no.</p>
    <p class="k-meta">11.92 seconds, black and white, silent. Nothing is filmed yet. 23 November 2026.</p>
  </header>

  <section class="k-section" aria-labelledby="s-ask">
    <h2 id="s-ask">Two questions for you</h2>
    <ol class="e2-list">
      <li><strong>Have you clips of your own?</strong> Your parish, candles, icons, a censer, the app in your hand. Three shots below are stills because I found no clean clip: the church, the censer, and someone at prayer. Yours would take their place.</li>
      <li><strong>Is 11.92 seconds before the talking?</strong> The film ends on the reference's cut at 11.92, where the fights begin. You hear where the voices come in and I cannot.</li>
    </ol>
    <p>Then yes or no to the storyboard as a whole, and anything you want changed. At your yes I make the film.</p>
  </section>

  <section class="k-section" aria-labelledby="s-shots">
    <h2 id="s-shots">The shots</h2>
    <p>Each still is made from the real picture in the real look. Under each: its time, what stands there in the reference, and why ours is what it is.</p>
{rows(SHOTS, shot)}
    <div class="k-note">
      <span class="k-eyebrow">Between 4 and 5</span>
      <p>Two frames of blur, 3.71 to 3.79, carry the figure into the candles, as the reference does.</p>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-words">
    <h2 id="s-words">The words</h2>
    <p>None is written for the film. The script holds each line of Scripture to the app's own Bible, word for word, every time it runs, and reads the labels from the app.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <caption>Capitals are how a line is set, never a change to its words.</caption>
        <thead><tr><th scope="col">Where</th><th scope="col">The words</th><th scope="col">From</th></tr></thead>
        <tbody>
{rows(WORDS, lambda a, b, c: f"          <tr><td>{e(a)}</td><td>{e(b)}</td><td>{e(c)}</td></tr>")}
        </tbody>
      </table>
    </div>
    <div class="k-note">
      <span class="k-eyebrow">A priest's yes</span>
      <p>Scripture set beside pictures is framing. Before this is posted, a priest's yes is still yours to get.</p>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">The choices, and why</h2>
    <ul class="e2-list">
{rows(CHOICES, lambda a, b: f"      <li><strong>{e(a)}</strong>{e(b)}</li>")}
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-missing">
    <h2 id="s-missing">What is missing</h2>
    <p>The brief asked for these and I could not get them clean. Your own clips would fill all three.</p>
    <ul class="e2-list">
{rows(MISSING, lambda a, b: f"      <li><strong>{e(a)}</strong>{e(b)}</li>")}
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-ref">
    <h2 id="s-ref">The reference, measured again</h2>
    <p>I fetched it and read all 396 frames. The promo chat's reading held, but for these:</p>
    <ul class="e2-list">
{rows([(f,) for f in FOUND], lambda a: f"      <li>{e(a)}</li>")}
    </ul>
    <p>The sound was not measured and not heard. The film is a silent master: you add the sound inside TikTok from the reference itself.</p>
  </section>

  <section class="k-section" aria-labelledby="s-pics">
    <h2 id="s-pics">Pictures and clips</h2>
    <p>Each licence is as its own page states it, read on 23 November 2026. None asks for a credit; for the Mixkit clip that is what is known of its licence, whose full text I could not open today, so read it once before posting. No living face is in any of them. No icon is held in Greece or Italy. Nothing was made by a machine.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th scope="col">What, and where it is used</th><th scope="col">Licence</th></tr></thead>
        <tbody>
{pic_rows}
        </tbody>
      </table>
    </div>
    <div class="k-note">
      <span class="k-eyebrow">Checked by eye, not by a machine</span>
      <p>No rays, no glow, no four-point star, no side stripe, no parchment. The dome's light is the photograph's own daylight. The icon of the 1800s is by an unnamed painter; Wikimedia marks it public domain, and that is all I claim for it.</p>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">The record is docs/plans/promo-edits/edit-2/RECORD.md</p>
  </footer>
</main>
"""
assert "—" not in page.split("</style>")[-1], "an em dash in the page's words"
import os
os.makedirs(f"{WORK}/page", exist_ok=True)
open(f"{WORK}/page/storyboard.html", "w", encoding="utf8").write(page)
print(f"{WORK}/page/storyboard.html", len(page) // 1024, "KB")
