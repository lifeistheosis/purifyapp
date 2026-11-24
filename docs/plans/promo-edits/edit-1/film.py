#!/usr/bin/env python3
"""Promo edit 1, the Light: the film's page, made from the design kit (docs/brand/design-kit.md).

  python3 docs/plans/promo-edits/edit-1/film.py <repo root> <work dir>     # writes <work dir>/film-page/index.html
  node docs/brand/kit/check.mjs --page <work dir>/film-page/index.html

It takes the kit's fonts and style whole, the stills `edit.py board` made (<work dir>/board) and a small copy of the
preview (<work dir>/film/page.mp4). None of those files is in git. This is the page of the second cut.
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
USED = ["1-the-light", "2-run-first", "3-run-melt", "4-whip", "4b-the-gods", "5-before-the-drop", "5b-the-change", "6-the-drop", "7-transfiguration",
        "7b-the-whip", "8-light-of-the-world", "9-the-end"]
GODS = ("Neptune (Copley), Athena (Klimt), Mars (Velázquez), Proserpine (Rossetti). Pan (Vrubel), Bellona (Rembrandt), Jupiter (Moreau), Circe (Waterhouse). "
        "Nebuchadnezzar (Blake), Hygieia (Klimt), Vulcan (Rubens), Buddha (Redon). Pharaoh (Alma-Tadema), Athena (Stuck), Bacchus (Solomon), Juno (Rembrandt). "
        "Belshazzar (Rembrandt), Cassandra (De Morgan), Mercury (Dosso Dossi), Flora (Rembrandt). Prometheus (Moreau), Minerva (Rembrandt), Nero (Styka), Venus (Botticelli). "
        "Loki (Winge), Diana (Batoni), Vertumnus (Arcimboldo), Athena (Rembrandt's workshop). Apollo (Tiepolo), a Sibyl (Phaff), Night and Sleep (De Morgan), the golden calf (Poussin). "
        "Thor (Winge), Buddha (La Farge), Jupiter (Ingres) and, last, the Demiurge (Blake).")


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
    <p class="k-lede">The film, second cut, for your yes or no.</p>
    <p class="k-meta">20 seconds, cut to the reference. Made again at your word.</p>
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

  <section class="k-section" aria-labelledby="s-changed">
    <h2 id="s-changed">What changed, at your word</h2>
    <p><b>The effects are one to one.</b> I measured every change of picture in the reference, frame by frame: when it starts, how many frames it takes, and what kind it is. Ours now makes each one the same way on the same frames: 32 melts in the run, three whips, a fade from light to dark on the drop, then fades, blurs, plain cuts and one stutter among the icons.</p>
    <p><b>Changes of picture are added.</b> The first cut had melts in the run and plain cuts everywhere else. Now a picture changes on a plain cut only where the reference's does.</p>
    <p><b>No pagan's picture comes twice.</b> The run is 36 pictures and every one is a different painting. Twenty-six are new.</p>
    <p><b>Every face is at the middle.</b> Each god or pagan is held on the face, at the same place on the screen every time, so the eye never has to look for it.</p>
  </section>

  <section class="k-section" aria-labelledby="s-light">
    <h2 id="s-light">The light</h2>
{still("1-the-light", "Still from the film: the light.", "0.00 to 2.10 s. Saul on the road, and his question: Who art thou, Lord? (Acts 9:5).")}
    <p>The road at night. A light from above the frame lies on the ground round about Saul (Acts 9:3), and his question stands in the dark between. It is one held picture, as the reference's opening is, and it gives way in a soft blur of three frames, as the reference's does.</p>
  </section>

  <section class="k-section" aria-labelledby="s-run">
    <h2 id="s-run">The run</h2>
{still("2-run-first", "Still from the film: the first god of the run.", "2.22 s. Neptune, the Romans' Poseidon (Copley).")}
{still("3-run-melt", "Still from the film: one picture melting into the next.", "2.90 s. The middle of a melt: Mars becoming Proserpine.")}
{still("4b-the-gods", "Every picture of the run, in order.", "Every picture of the run, in order, four to a row. " + GODS, (720, 2880))}
{still("4-whip", "Still from the film: a whip across.", "9.93 s. A whip across: Buddha giving way to Jupiter.")}
    <p><b>What it is.</b> 36 paintings in nine seconds, on the reference's own frames. The first 32 stand still and melt one into the next, as the reference's ink faces do. The last four move as the reference's last four shots do, two nearer and two farther, and change on its whips.</p>
    <p><b>The faces.</b> A program found the face in each painting and I chose the god's. Five were marked by hand. Where a face is near the top of its canvas, the picture is let fall to dark above it, so the face keeps its place and no edge of the canvas shows.</p>
    <p><b>The line.</b> "there be gods many, and lords many", 1 Corinthians 8:5. It stays still and sharp through every change.</p>
    <p><b>Buddha is in twice,</b> in two different paintings, Redon's and La Farge's. The run needed 36 and he is the one you asked for by name. His followers are living people, so the video can be reported for him, and that risk to the account is yours to take. Say the word and one of the two gives way. Muhammad is not in it.</p>
    <p><b>Unclothed figures.</b> Several of these paintings have them beside the god. Each is held on the face, so they stay out of the frame or in the dark at its foot.</p>
  </section>

  <section class="k-section" aria-labelledby="s-drop">
    <h2 id="s-drop">The last false god, and the drop</h2>
{still("5-before-the-drop", "Still from the film: the Demiurge before the drop.", "11.13 s. The Ancient of Days, by William Blake, 1794 (The British Museum): the false maker of his poems, measuring the world with a compass.")}
{still("5b-the-change", "Still from the film: the false light becoming His halo.", "11.28 s. The change itself: his disc of light becoming Christ's halo.")}
{still("6-the-drop", "Still from the film: Jesus Christ.", "11.53 s. The Sinai Pantocrator, with the answer: I am Jesus (Acts 9:5).")}
    <p><b>What it is.</b> Your word: the Demiurge for the last picture. He pulls back as the reference's last shot does, until his disc of light is exactly the size of Christ's halo and in its place.</p>
    <p><b>The change.</b> The bass comes in at 11.18 s. The reference does not cut there: it fades from light to dark over six frames, starting four frames later. Ours does the same on the same frames, and what fades is the false light into the halo of the true one.</p>
    <p><b>Ask your priest about this frame first.</b> Many people take this very picture for God the Father making the world, and its name, the Ancient of Days, is a name of God in Daniel 7. Shown as the last false god before Christ, it can be read as saying the Maker is false. That is what the Gnostics taught, and the Church does not. If he says no, Jupiter takes this place and the film is made again in a few minutes.</p>
  </section>

  <section class="k-section" aria-labelledby="s-after">
    <h2 id="s-after">After the drop</h2>
{still("7-transfiguration", "Still from the film: the Transfiguration.", "12.53 s. The Transfiguration, attributed to Theophanes the Greek, about 1403.")}
{still("7b-the-whip", "Still from the film: a long whip between two icons.", "12.87 s. The reference's longest change, a quarter of a second: the Transfiguration giving way to the Saviour of the Golden Hair.")}
{still("8-light-of-the-world", "Still from the film: the last line.", "17.67 s. The Holy Face of Novgorod, with the last line: I am the light of the world (John 8:12).")}
    <p><b>What it is.</b> The Light has a face. Fourteen shots of ten icons of Him, each filling the frame, held on Him, with one slow even move. They change as the reference's shots change there: three fades, a long whip, two blurs, pictures that go soft before a plain cut, plain cuts, and one stutter, where the next icon shows for two frames before it comes to stay.</p>
    <p><b>The last line.</b> It is in, as on the board. Say the word and it comes out.</p>
    <p><b>An icon is never touched.</b> A change of picture works on the whole picture, as a camera would. Nothing in an icon is redrawn.</p>
  </section>

  <section class="k-section" aria-labelledby="s-end">
    <h2 id="s-end">The end</h2>
{still("9-the-end", "Still from the film: the end.", "19.07 s on. Black and Purify's mark. It goes to black on the frames where the reference fades.")}
  </section>

  <section class="k-section" aria-labelledby="s-not">
    <h2 id="s-not">Where ours is not the reference's</h2>
    <p><b>No pull from the middle.</b> The reference draws two of its changes out from the middle of the picture. On a bright painting that makes lines of light like rays, and you have ruled rays out, so ours are whips there. Say the word and the pulls go in.</p>
    <p><b>No white frame at the end.</b> The reference goes to white and then to black. Ours goes straight to black.</p>
    <p><b>Nothing is added.</b> No flash, no shake and no glow, and the reference has none of them in these places either.</p>
  </section>

  <section class="k-section" aria-labelledby="s-open">
    <h2 id="s-open">Still open</h2>
    <p>A line on every other way, in Scripture's own words, is offered and not added: "no man cometh unto the Father, but by me" (John 14:6).</p>
    <p>Four faces are smaller or softer than the rest, because they are small in their paintings: Neptune, Apollo, Thor and the golden calf.</p>
    <p>I cannot play video, so I checked this cut on stills taken from the finished file: every picture of the run, each kind of change, and each icon. You are the first to see it move.</p>
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
print(f"  film-page/index.html: {len(body) // 1024} KB, {rows.count('<tr>')} pictures")
