#!/usr/bin/env python3
"""Promo edit 1, the Light: the film's page, made from the design kit (docs/brand/design-kit.md).

  python3 docs/plans/promo-edits/edit-1/film.py <repo root> <work dir>     # writes <work dir>/film-page/index.html
  node docs/brand/kit/check.mjs --page <work dir>/film-page/index.html

It takes the kit's fonts and style whole, the stills `edit.py board` made (<work dir>/board) and a small copy of the
preview (<work dir>/film/page.mp4). None of those files is in git.
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
USED = ["1-the-light", "2-run-first", "3-run-melt", "4b-the-gods", "5-before-the-drop", "6-the-drop", "7-transfiguration", "8-light-of-the-world", "9-the-end"]


def still(name, alt, caption, size=(720, 1280)):
    assert name in USED
    return f'''    <figure class="k-figure k-phone">
      <img src="stills/{name}.jpg" alt="{alt}" width="{size[0]}" height="{size[1]}">
      <figcaption>{caption}</figcaption>
    </figure>
'''


rows = "\n".join(f'          <tr><td>{p["what"]}<br>{p["held"]}</td><td class="k-num">{p["licence"]}</td></tr>'
                 for p in PICS.values() if not p["used"].startswith("not used"))

body = f"""<title>The Light film</title>
<meta name="claude:viewport-fit-sides" content="cover">
{links}
{style}
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">Promo edit 1</span>
    <h1>The Light</h1>
    <p class="k-lede">The film, for your yes or no.</p>
    <p class="k-meta">20 seconds, cut to the reference. Made at your word.</p>
  </header>

  <section class="k-section" aria-labelledby="s-watch">
    <h2 id="s-watch">Watch it</h2>
    <figure class="k-figure k-phone">
      <video controls playsinline preload="metadata" poster="stills/6-the-drop.jpg" width="720" height="1280" src="film.mp4"></video>
      <figcaption>The preview: the film with the reference's own sound under it, so you can judge the timing. Not for posting, since that sound is not cleared.</figcaption>
    </figure>
    <p>Two files are sent to you in the chat. The silent master is the one to post: add the sound inside TikTok, from the reference itself. The preview with sound is for you alone.</p>
    <p><b>Before it is posted.</b> A priest's yes is still yours to get. It is for the separate edits account, not a paid ad and not the store pages.</p>
  </section>

  <section class="k-section" aria-labelledby="s-shape">
    <h2 id="s-shape">What it is</h2>
    <p>A man before a light asks who it is. Then god after god, in the West's own paintings. Last comes the false maker in his disc of light, and on the drop that light becomes the halo of Jesus Christ. Then the Light is shown with a face.</p>
    <p>1,199 frames, 19.98 seconds, 1080 by 1920 at 60 frames a second: the reference's own length, to the frame. Every cut is the reference's. Every word on screen is Scripture, word for word, and the script checks each against the app's own Bible every time it runs. Only cuts and lines fall on the sound. Nothing flashes, shakes or glows.</p>
  </section>

  <section class="k-section" aria-labelledby="s-light">
    <h2 id="s-light">The light</h2>
{still("1-the-light", "Still from the film: the light.", "0.00 to 2.10 s. Saul on the road, and his question: Who art thou, Lord? (Acts 9:5).")}
    <p><b>What it is.</b> The road at night. A light from above the frame lies on the ground round about Saul (Acts 9:3), and his question stands in the dark between. Saul is cut whole from Parmigianino's painting. The light is ours, one soft pool with no beams, and it grows a little, evenly.</p>
    <p><b>Why.</b> Your word: the beginning is a light, and the man asks who it is. A question with no answer yet is the hook.</p>
  </section>

  <section class="k-section" aria-labelledby="s-run">
    <h2 id="s-run">The run</h2>
{still("2-run-first", "Still from the film: the first god of the run.", "2.22 s. Neptune, the Romans' Poseidon (Copley).")}
{still("3-run-melt", "Still from the film: one god melting into the next.", "2.35 s. The middle of a melt: Neptune becoming Athena.")}
{still("4b-the-gods", "The run's gods, each as it first stands in the film.", "The run's gods, each as it first stands. Neptune (Copley) and Athena (Klimt). Buddha (La Farge) and Thor (Winge). The golden calf (Poussin) and Jupiter (Moreau). Pan (Vrubel) and Mars (Velázquez). Jupiter (Ingres) and, last, the Demiurge (Blake).", (720, 3200))}
    <p><b>What it is.</b> 36 pictures in nine seconds, on the reference's own cuts. Nine gods known at a glance come round four times, framed another way each time, and each melts into the next as the faces do in the Christ edit. Every one is a painting in colour, held on the god, with the light pooled there.</p>
    <p><b>New since the board.</b> Pan and Mars joined, so no god comes too often. Ingres's Jupiter stays in the run, and the Demiurge takes the last place, as you asked.</p>
    <p><b>The line.</b> "there be gods many, and lords many", 1 Corinthians 8:5, held for the whole run.</p>
    <p><b>Buddha is in at your word.</b> His followers are living people, so the video can be reported for him. That risk to the account is yours to take. Muhammad is not in it.</p>
    <p><b>Unclothed figures.</b> Several of these paintings have them beside the god. Every framing keeps them out of the frame or in the dark at its foot.</p>
  </section>

  <section class="k-section" aria-labelledby="s-drop">
    <h2 id="s-drop">The last false god, and the drop</h2>
{still("5-before-the-drop", "Still from the film: the last frame before the drop.", "11.17 s, the last frame before the drop. The Ancient of Days, by William Blake, 1794 (The British Museum): the false maker of his poems, measuring the world with a compass.")}
{still("6-the-drop", "Still from the film: the drop.", "11.18 s, the drop. The Sinai Pantocrator, with the answer: I am Jesus (Acts 9:5).")}
    <p><b>What it is.</b> Your word: the Demiurge, or something of Freemasonry or Gnosticism, for the last picture. This is both: the best known picture of the false maker in Western art, holding a compass, the sign of the Great Architect in Freemasonry.</p>
    <p><b>The cut.</b> His disc of light is set on Christ's halo, the same middle and the same size. On the bass the false light becomes the halo of the true one. Look at the two stills together.</p>
    <p><b>Ask your priest about this frame first.</b> Many people take this very picture for God the Father making the world, and its name, the Ancient of Days, is a name of God in Daniel 7. Shown as the last false god before Christ, it can be read as saying the Maker is false. That is what the Gnostics taught, and the Church does not. If he says no, Jupiter goes back in this place and the film is made again in a few minutes.</p>
    <p><b>The answer.</b> The same verse as the question, under His beard. A word never stands on His face.</p>
  </section>

  <section class="k-section" aria-labelledby="s-after">
    <h2 id="s-after">After the drop</h2>
{still("7-transfiguration", "Still from the film: the Transfiguration.", "12.32 s on. The Transfiguration, attributed to Theophanes the Greek, about 1403.")}
{still("8-light-of-the-world", "Still from the film: the last line.", "16.88 s on. The Holy Face of Novgorod, with the last line: I am the light of the world (John 8:12).")}
    <p><b>What it is.</b> The Light has a face. Ten icons of Him on the reference's own cuts, each filling the frame, held on Him, with one slow even move: the Sinai Pantocrator, the Transfiguration, the Saviour of the Golden Hair, Ushakov's Holy Face, Rublev's Saviour, the Vysotsky Pantocrator, the Saviour of the Fiery Eye, two later Pantocrators, and the Holy Face of Novgorod.</p>
    <p><b>The last line.</b> It is in, as on the board. It closes the circle: the film opens on a light with no name and ends with Him naming Himself as that light. Say the word and it comes out.</p>
    <p><b>Lines of light.</b> The Transfiguration and Blake's picture each have their own painted lines of light. They are the pictures' own. Nothing is added to any picture, and nothing in an icon is redrawn.</p>
  </section>

  <section class="k-section" aria-labelledby="s-end">
    <h2 id="s-end">The end</h2>
{still("9-the-end", "Still from the film: the end.", "19.07 s to the end. Black and Purify's mark, still. No white frame.")}
  </section>

  <section class="k-section" aria-labelledby="s-open">
    <h2 id="s-open">Still open</h2>
    <p>A line on every other way, in Scripture's own words, is offered and not added: "no man cometh unto the Father, but by me" (John 14:6). Say yes and it goes on the drop or at the end.</p>
    <p>Not in the run: Egypt's gods, Odin and a Caesar. No painting of them came up in a size that fills a phone.</p>
    <p>Two of the paintings come from softer files than the rest: Ingres's Jupiter and Velázquez's Mars.</p>
  </section>

  <section class="k-section" aria-labelledby="s-pictures">
    <h2 id="s-pictures">The pictures</h2>
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
os.makedirs(f"{HOME}/film-page/stills", exist_ok=True)
for name in USED:
    shutil.copy(f"{HOME}/board/{name}.jpg", f"{HOME}/film-page/stills/{name}.jpg")
shutil.copy(f"{HOME}/film/page.mp4", f"{HOME}/film-page/film.mp4")
open(f"{HOME}/film-page/index.html", "w", encoding="utf8").write(body)
print(f"  film-page/index.html: {len(body) // 1024} KB")
