#!/usr/bin/env python3
"""Promo edit 1, the Light: the storyboard page, made from the design kit (docs/brand/design-kit.md).

Takes the kit's own fonts and style whole from docs/brand/kit/artifact-template.html and writes the page's words
around the stills edit.py made. The stills are published beside the page; they are not in git.

  python3 docs/plans/promo-edits/edit-1/page.py <repo root> <work dir>     # writes <work dir>/page/index.html
  node docs/brand/kit/check.mjs --page <work dir>/page/index.html
"""
import json
import os
import re
import shutil
import sys

ROOT, HOME = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
PICS = json.load(open(os.path.join(HERE, "pictures.json")))["pictures"]
kit = open(f"{ROOT}/docs/brand/kit/artifact-template.html", encoding="utf8").read()
links = "\n".join(re.findall(r"<link [^>]+>", kit.split("<style>")[0]))
style = kit[kit.index("<style>") : kit.index("</style>") + len("</style>")]

STILLS = [
    ("1-the-light", "0.00 to 2.10 s", "The light",
     "Black, one soft pool of light, and Saul on the ground before it, asking. The light grows a little, evenly, and nothing else moves.",
     ["<b>What it is.</b> Saul alone, cut out whole from Parmigianino's painting of his conversion (Vienna, about 1527). The horse, the sky and the landscape are left out. The light is ours.",
      "<b>Why.</b> Your word: the beginning is a light, and the man asks who it is. His question is Scripture's own, Acts 9:5. The reference opens the same way: one held picture and one small line.",
      "<b>For the viewer.</b> A question with no answer yet is the hook. The pool is one soft light with no beams. His hand and face take the light and his legs fall into the dark."]),
    ("2-run-first", "2.10 s on", "The run: a face, sharp",
     "Zeus Ammon, a Roman marble at The Met. Scripture names Jupiter in Acts 14:12.",
     ["<b>What it is.</b> The museum's own photograph, cut from its ground and turned to hard black ink on white, as the reference's faces are. Nothing is drawn: the ink is the statue's own light and shade.",
      "<b>Why.</b> Your word: false god after false god until the beat. Each stands sharp for about a quarter of a second, on the reference's own cuts: 36 faces from 2.10 s to the drop.",
      "<b>The line.</b> \"there be gods many, and lords many\", 1 Corinthians 8:5, held for the whole run. Below the chin the ink is let go into the white, so the words always stand on clean white."]),
    ("3-run-melt", "2.90 s", "The run: one face melting into the next",
     "Amun of Egypt becoming a Canaanite smiting god, the kind of figure made for Baal. The middle frame of a melt of five frames.",
     ["<b>What it is.</b> The Christ edit's melt: both whole pictures laid over each other, each following the other part of the way. It stays black and white, never grey.",
      "<b>Why.</b> The reference smears each face into the next over three to six frames. Every face is set on its eyes, so the gaze holds still while the gods change.",
      "<b>For the viewer.</b> Many faces, one stare. None of them holds."]),
    ("4-run-sharp", "3.28 s", "The run: another face",
     "Serapis, a Roman silver bust at The Met.",
     ["<b>Why this still.</b> So you can judge the ink on a dark metal as well as on white marble. Every face is given the same share of ink, so bronze, silver and stone sit together in one run."]),
    ("5-before-the-drop", "11.17 s", "The last frame before the drop",
     "The emperor Augustus, a Roman marble at The Met.",
     ["<b>Why him last.</b> The run opens and closes on an emperor worshipped as a god. The last false god before Christ is a man who was called one. The next frame is God who became man.",
      "<b>Why no melt here.</b> The run ends on a plain hard cut. Nothing flashes and nothing shakes."]),
    ("6-the-drop", "11.18 s, the drop", "Jesus Christ",
     "The Sinai Pantocrator, whole, in full colour, with the answer: \"I am Jesus\", Acts 9:5.",
     ["<b>What it is.</b> The app's own icon, filling the frame, its light pooled on His face and the edges let fall. One slow even move toward Him. The icon moves only whole and nothing in it is redrawn.",
      "<b>Why.</b> Your word: the drop is Jesus Christ. The turn from white ink to colour on the bass is the whole hit. The answer is the same verse as the question.",
      "<b>The line.</b> On His breast, below His beard. A word never stands on His face. No glow behind it."]),
    ("7-transfiguration", "12.32 s on", "The theophanies: the Transfiguration",
     "The Transfiguration, attributed to Theophanes the Greek, about 1403 (Tretyakov Gallery). Whole, on black, one slow even move.",
     ["<b>Why.</b> The Light has a face. This is the feast of that light, and the brief names it first.",
      "<b>One thing to know.</b> This icon has its own painted lines of light around Him. They are the icon's, and nothing in an icon is redrawn, so they stay. If you would rather have none in the film, say so and another icon of Him takes this place."]),
    ("8-light-of-the-world", "16.88 s on", "The last line",
     "The Holy Face of Novgorod, 12th century (Tretyakov Gallery), with \"I am the light of the world\", John 8:12.",
     ["<b>What it is.</b> The one more line the brief leaves to you. It stands under the icon on the black, not on His face.",
      "<b>Why.</b> It closes the circle: the film opens on a light with no name and ends with Him naming Himself as that light.",
      "<b>Between this and the last still.</b> The other icons of Him from the Christ edit, each on one of the reference's cuts, each with one slow even move."]),
    ("9-the-end", "19.07 s to the end", "The end",
     "Black and Purify's mark, still. No white frame.",
     ["<b>Why 19.07 and not 19.5.</b> It is the reference's last cut. From there the mark has nine tenths of a second to be read. From 19.5 it would have less than half a second."]),
]

MORE = ("Found and marked CC0, to be fetched at your yes: from The Met, heads of Apollo, Athena, Dionysos and a goddess, statuettes of Jupiter, "
        "Mercury and Zeus Serapis, a second Amun, the human-headed winged lion of Assyria, a relief from Nimrud, an enthroned Canaanite god, and the "
        "emperors Caligula, Caracalla, Lucius Verus, Antoninus Pius and Trebonianus Gallus; from Cleveland, a head of Apollo, Osiris, the Apis bull, "
        "an Assyrian protective spirit, and the emperors Trajan, Balbinus and Nero recut as Vespasian.")


def figure(name, when, title, caption, reasons):
    alt = f"Still from the storyboard: {title}."
    ps = "\n".join(f"    <p>{r}</p>" for r in reasons)
    return f"""  <section class="k-section" aria-labelledby="s-{name}">
    <h2 id="s-{name}">{title}</h2>
    <figure class="k-figure k-phone">
      <img src="stills/{name}.jpg" alt="{alt}" width="720" height="1280">
      <figcaption>{when}. {caption}</figcaption>
    </figure>
{ps}
  </section>
"""


rows = "\n".join(
    f'          <tr><td>{p["what"]}<br>{p["held"]}</td><td class="k-num">{p["licence"]}</td></tr>' for p in PICS.values())

body = f"""<title>The Light storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
{links}
{style}
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">Promo edit 1</span>
    <h1>The Light</h1>
    <p class="k-lede">The storyboard, for your yes or no.</p>
    <p class="k-meta">Nine stills from the real stage. No video is made yet.</p>
  </header>

  <section class="k-section" aria-labelledby="s-shape">
    <h2 id="s-shape">The shape</h2>
    <p>A man before a light asks who it is. Then false god after false god, in black ink on white. On the drop, the answer: Jesus Christ, in full colour. Then the Light shown with a face.</p>
    <p>20 seconds, 1080 by 1920, 60 frames a second, cut on the reference's own clock. Every word on screen is Scripture, word for word, and the script checks each against the app's own Bible every time it runs. Only cuts and lines fall on the sound.</p>
  </section>

{"".join(figure(*s) for s in STILLS)}
  <section class="k-section" aria-labelledby="s-measure">
    <h2 id="s-measure">What I measured</h2>
    <p>I measured the reference again, frame by frame. Three things differ from the notes I was given.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <caption>The reference: 1,199 frames at 60 a second.</caption>
        <thead><tr><th scope="col">What</th><th scope="col" class="k-num">Measured</th></tr></thead>
        <tbody>
          <tr><td>The bass comes in (the notes said about 11.10 s)</td><td class="k-num">11.18 s</td></tr>
          <tr><td>The reference's own cut there, six frames after the bass</td><td class="k-num">11.28 s</td></tr>
          <tr><td>Changes of face in the run (the notes found 21)</td><td class="k-num">36</td></tr>
        </tbody>
      </table>
    </div>
    <p>Ours cuts to Christ on the bass itself, at 11.18 s.</p>
  </section>

  <section class="k-section" aria-labelledby="s-calls">
    <h2 id="s-calls">Your calls</h2>
    <p><b>1. The board as a whole.</b> Yes or no.</p>
    <p><b>2. The last line,</b> "I am the light of the world". Yes or no. I recommend yes.</p>
    <p><b>3. Scripture's false prophets in the run</b> (the prophets of Baal, Simon the sorcerer, Bar-Jesus). I recommend no. The run works because every face fills the frame and sits on its eyes. The old pictures of these men are crowded scenes with small faces, so they would break the stare. Say yes and I will find them and show you.</p>
  </section>

  <section class="k-section" aria-labelledby="s-open">
    <h2 id="s-open">What is not done yet</h2>
    <p>The stills show five of the run's faces. The film needs about thirty. {MORE}</p>
    <p>Not found as open museum photographs: Diana (Acts 19:28), and the north's Odin and Thor. I would leave them out before using a picture that asks for a credit.</p>
    <p>No living religion and no living person stands in the run, and none will.</p>
    <p>The other opening that was offered (Moses at the bush) is not drawn. Saul stands, as chosen.</p>
    <p>At your yes: the film, a silent master to save, and one preview with the reference's sound for you alone, marked not for posting. A priest's yes is still yours to get before it is posted. It is for the separate edits account, not a paid ad and not the store pages.</p>
  </section>

  <section class="k-section" aria-labelledby="s-pictures">
    <h2 id="s-pictures">The pictures in these stills</h2>
    <div class="k-table-wrap">
      <table class="k-table">
        <caption>Each licence is what the picture's own page states. None is held in Greece or Italy. No picture is made by a machine. The pages are listed in the repository, in the edit's pictures.json.</caption>
        <thead><tr><th scope="col">Picture, and where it is held</th><th scope="col" class="k-num">Licence</th></tr></thead>
        <tbody>
{rows}
        </tbody>
      </table>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">purifyapp.net</p>
  </footer>
</main>
"""
assert "—" not in body.replace(style, ""), "an em dash in the page's words"
os.makedirs(f"{HOME}/page/stills", exist_ok=True)
for name, *_ in STILLS:
    shutil.copy(f"{HOME}/board/{name}.jpg", f"{HOME}/page/stills/{name}.jpg")
open(f"{HOME}/page/index.html", "w", encoding="utf8").write(body)
print(f"  page/index.html: {len(body) // 1024} KB")
