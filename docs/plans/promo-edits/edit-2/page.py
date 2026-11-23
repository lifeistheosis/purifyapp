#!/usr/bin/env python3
"""Promo edit 2, the Church: the storyboard's page, from the design kit.

  python3 -I -B docs/plans/promo-edits/edit-2/page.py . .promo/promo-edits/edit-2

Writes <work>/page/storyboard.html and <work>/page/film.html: the kit's own head and style, whole, and
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
MOVES = [
    ("0.00", "A hand sets a lit taper", "the clip at half speed; a plain cut out"),
    ("0.25", "The wooden church", "a slow move toward the royal doors; it sinks into black"),
    ("2.00", "The blessing hand, and the entry", "comes up out of the black; then draws back to its place in the figure"),
    ("2.92", "The figure, the invocation", "stands up about the hand; A M E N opens across the frame"),
    ("3.71", "Blur into the Church", "the reference's own: the figure thrown upward, the candles arriving"),
    ("3.79", "Candles", "the clip at half speed; dissolves into the censer"),
    ("4.71", "The censer", "down its chains, then thrown up into the dome"),
    ("5.62", "The dome", "in toward the dome; a plain cut out"),
    ("6.54", "The service book, Prayers", "the clip at half speed; book dissolves into book"),
    ("7.42", "The Gospel in His hand", "pulling back; a plain cut out"),
    ("8.33", "The face of the Sinai Pantocrator", "in toward His eyes; dissolves into the app"),
    ("9.21", "The app's Today", "the phone coming nearer; it sinks into black"),
    ("10.12", "The end card", "still; the film closes to black over its last three frames"),
]
ADDED = [
    ("Slow motion", "The three clips now run at half speed, as the reference's do. Every second frame is a frame as it was filmed, and the one between is the mean of its two neighbours, the way an optical printer slows a film. I told you on the first cut that slowing needed frames made by a machine. That was wrong: this needs none."),
    ("The hand draws back into the figure", "The hand's last six frames carry it, blurred by its own speed, to the exact place and size it has in the whole icon. On the cut the figure stands up about it. The one transition that says something: the hand, then He whose hand it is."),
    ("Through black", "The church sinks into the black the hand stands on, and the hand comes up out of it. The phone sinks into the end card's black. The cut-outs' black is now a place the film goes into and comes out of."),
    ("Like into like", "Three short dissolves, four frames each with the cut in their middle: candle flames into the censer, the priest's book into the Gospel, His face into the app."),
    ("One more blur", "The reference's own blur is kept at 3.71, and used once more where the camera, going down the censer's chains, is thrown up into the dome. The move carries on through the cut."),
    ("Three plain cuts are left", "At 0.25, 6.54 and 8.33. A film where every cut is dressed has no clock left to hear."),
    ("Film in the gate", "The picture weaves by about a pixel as film does in a projector, the lamp is never quite steady, and one soft pool of light falls toward the corners of the window. All three run on their own slow waves, never on the sound."),
    ("The words open", "Every line still stands from its shot's first frame to its last. A M E N starts as one word and opens across the frame, and CHURCH, Prayers and Today widen slowly as their shots run."),
]
LEFT_OUT = [
    ("Glow, a bright frame, a shake, a punch in on the beat", "Your standing words on the last three films. Say the word and any of them goes in."),
    ("A glitch frame, light leaks, dust and scratches laid over", "Each is a stock effect laid on top, which is what reads as made by a machine."),
    ("Depth in the photographs (a 2.5D move)", "It needs parts of the picture painted in behind what moves, and nothing here is made up."),
]
FILM_CHOICES = CHOICES + [
    ("One slow, even move in each shot",
     "No move speeds up or slows down, and none answers the sound. An icon moves only whole: it is drawn in or let back, never bent, and nothing in it is redrawn."),
    ("The hand ends at its cuff and falls into the black",
     "In the icon the wrist goes into the sleeve. The cut-out ends there over a short fall into black, as into shadow, so no hard line stands across the wrist."),
    ("The end card has no grain",
     "Pure black and clean white, so the verse is as sharp as type can be on a phone."),
]
film = f"""<title>The Church film</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
{style}
<style>
.k-page {{ padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
.k-figure.k-phone :is(img, video) {{ height: auto; max-width: 390px; width: 100%; margin-inline: auto; display: block; }}
.k-page .k-figure figcaption strong {{ color: var(--k-ink); font-weight: 600; }}
.k-page .e2-list {{ margin: var(--k-space-4) 0 0; padding-inline-start: 1.2em; max-width: var(--k-measure); }}
.k-page .e2-list li {{ margin-block-end: var(--k-space-3); line-height: 1.55; }}
.k-page .e2-list li strong {{ display: block; font-family: var(--k-font-sans); font-size: var(--k-text-ui); font-weight: 600; }}
.k-page .k-table small {{ color: var(--k-ink-3); font-family: var(--k-font-sans); font-size: var(--k-text-caption); }}
</style>
<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">Promo edit 2, the film</span>
    <h1>The Church</h1>
    <p class="k-lede">The second cut: slow motion, film in the gate, and transitions that mean something.</p>
    <p class="k-meta">1080 by 1920, 24 frames a second, 286 frames, 11.92 seconds. 23 November 2026.</p>
  </header>

  <section class="k-section" aria-labelledby="s-prev">
    <h2 id="s-prev">The preview, with the sound</h2>
    <figure class="k-figure k-phone">
      <video src="film/preview.mp4" poster="film/poster.jpg" width="720" height="1280" controls playsinline preload="metadata"></video>
      <figcaption><strong>Not for posting.</strong> The reference's first 11.92 seconds of sound are under it so you can judge the timing. That sound is not cleared, so this file is for you alone.</figcaption>
    </figure>
  </section>

  <section class="k-section" aria-labelledby="s-master">
    <h2 id="s-master">The silent master</h2>
    <figure class="k-figure k-phone">
      <video src="film/silent.mp4" poster="film/poster.jpg" width="720" height="1280" controls muted playsinline preload="metadata"></video>
      <figcaption><strong>This is what is posted.</strong> A lighter copy plays here. The full file, purify-the-church.mp4 (1080 by 1920, 62 MB), is in the chat for you to save. Add the sound inside TikTok from the reference itself.</figcaption>
    </figure>
  </section>

  <section class="k-section" aria-labelledby="s-added">
    <h2 id="s-added">What the second cut adds</h2>
    <p>You asked for more effects and transitions, and for it to be better. Each thing added is here with its reason. Nothing is laid on top: every one comes out of the pictures themselves.</p>
    <ul class="e2-list">
{rows(ADDED, lambda a, b: f"      <li><strong>{e(a)}</strong>{e(b)}</li>")}
    </ul>
    <h3>Left out, and why</h3>
    <ul class="e2-list">
{rows(LEFT_OUT, lambda a, b: f"      <li><strong>{e(a)}</strong>{e(b)}</li>")}
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-before">
    <h2 id="s-before">Before it is posted</h2>
    <ul class="e2-list">
      <li><strong>A priest's yes</strong>Scripture set beside pictures is framing. That yes is yours to get.</li>
      <li><strong>Is 11.92 before the talking?</strong>The film ends where the fights begin in the reference. You hear where the voices come in and I cannot. If they come in sooner, tell me the second and I cut it there.</li>
      <li><strong>One licence to read</strong>The Mixkit clip (the priest's hands) is free for commercial use by its page. Its licence's full text would not open for me; read it once.</li>
      <li><strong>Your own clips</strong>The church, the censer and the dome are photographs with a slow move, and no one is at prayer in the film. Clips of your own would take their place.</li>
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-shots">
    <h2 id="s-shots">The shots</h2>
    <p>Measured on the finished file: 286 frames, every change of shot on the reference's own frame, no colour in any frame, and no frame brighter than a quarter of white.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th scope="col" class="k-num">From</th><th scope="col">The shot</th><th scope="col">Its move, and how it leaves</th></tr></thead>
        <tbody>
{rows(MOVES, lambda a, b, c: f'          <tr><td class="k-num">{a}</td><td>{e(b)}</td><td>{e(c)}</td></tr>')}
        </tbody>
      </table>
    </div>
    <figure class="k-figure k-phone">
      <img src="stills/03-hand.jpg" width="540" height="960" alt="The blessing hand on black with the entry beside it">
      <figcaption>The third shot, at 2.00 s: the blessing hand, and the Church named by the Apostle.</figcaption>
    </figure>
  </section>

  <section class="k-section" aria-labelledby="s-words">
    <h2 id="s-words">The words</h2>
    <p>None is written for the film. The script holds each line of Scripture to the app's own Bible, word for word, every time the film is made. Each line stands from its shot's first frame to its last.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th scope="col">Where</th><th scope="col">The words</th><th scope="col">From</th></tr></thead>
        <tbody>
{rows(WORDS, lambda a, b, c: f"          <tr><td>{e(a)}</td><td>{e(b)}</td><td>{e(c)}</td></tr>")}
        </tbody>
      </table>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">The choices, and why</h2>
    <ul class="e2-list">
{rows(FILM_CHOICES, lambda a, b: f"      <li><strong>{e(a)}</strong>{e(b)}</li>")}
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-pics">
    <h2 id="s-pics">Pictures and clips</h2>
    <p>Each licence is as its own page states it, read on 23 November 2026. No living face is in any of them. No icon is held in Greece or Italy. Nothing was made by a machine.</p>
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
      <p>No rays, no glow, no bright frame, no shake, no four-point star, no side stripe, no parchment. The pool of light is one soft pool. The dome's light is the photograph's own daylight.</p>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">The record is docs/plans/promo-edits/edit-2/RECORD.md</p>
  </footer>
</main>
"""
import os
os.makedirs(f"{WORK}/page", exist_ok=True)
for name, text in (("storyboard", page), ("film", film)):
    assert "—" not in text.split("</style>")[-1], "an em dash in the page's words"
    open(f"{WORK}/page/{name}.html", "w", encoding="utf8").write(text)
    print(f"{WORK}/page/{name}.html", len(text) // 1024, "KB")
