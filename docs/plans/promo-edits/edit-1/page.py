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
     "Second design, at your word. The road at night. A light from above the frame, lying on the ground round about Saul, and his question in the dark between.",
     ["<b>What changed.</b> The round light in the sky is gone. No lamp is seen now: the light comes down from above the top of the frame and lies on the road about him as one soft pool. Saul is the same picture, as you asked.",
      "<b>Why.</b> It is what Acts 9:3 says: \"there shined round about him a light from heaven\". The light is about him and above him, and he looks up into it. The first design read as a moon in a black sky.",
      "<b>For the viewer.</b> He lies on something now, so he reads as a man thrown to the ground, not a figure floating. His question stands alone in the dark between the two lights, so it is read first. One soft light, no beams, and it grows a little, evenly."]),
    ("2-run-first", "2.22 s", "The run: a god, sharp",
     "Fourth design, at your word. Neptune, the Romans' Poseidon, from The Return of Neptune by John Singleton Copley, about 1754 (The Met).",
     ["<b>What changed.</b> Your word: recognizable pagans. The run is now the old world's gods that are known at a glance: the trident, the helmet, the hammer, the golden calf. Still paintings in colour, each filling the frame and held on the god.",
      "<b>Why.</b> A viewer has a quarter of a second for each one. A god he knows lands. One he has to work out does not.",
      "<b>The line.</b> \"there be gods many, and lords many\", 1 Corinthians 8:5, held for the whole run, in white where the picture's light falls away.",
      "<b>One thing to know.</b> Every picture here is free to use, by what its own page states, so nobody can claim the video. Each is held on the god, so the unclothed figures beside some of them stay out of the frame or in the dark."]),
    ("3-run-melt", "2.35 s", "The run: one melting into the next",
     "Neptune becoming Athena (Pallas Athene, by Gustav Klimt, 1898, Wien Museum). The middle frame of a melt of five frames.",
     ["<b>What it is.</b> The Christ edit's melt, the one you called perfect: both whole pictures laid over each other, each following the other part of the way, soft in the middle.",
      "<b>For the viewer.</b> One god turns into the next before the eye can rest on it. None of them holds."]),
    ("4-run-sharp", "2.75 s", "The run: Buddha",
     "Changed at your word: a painting, not a statue. The Great Buddha of Kamakura, painted by John La Farge in 1887 (The Met).",
     ["<b>What changed.</b> You asked for art, not statues or old drawings. Buddha is now a painting by a Western painter, held on his face like the others. The museum photograph of a bronze is gone.",
      "<b>Why this one.</b> It is one of the best known Buddhas in the world, so he is known at a glance, and it is a painting in colour, as you asked for all the pagans.",
      "<b>The other one found.</b> Odilon Redon's Buddha, a standing figure in a robe beside a tree. It is the more famous painting, but he is harder to know at a glance. Say the word and it takes this place.",
      "<b>The risk, as before.</b> His followers are living people, so this frame can get the video reported. That is the account's risk, and yours to take."]),
    ("4b-the-gods", "2.10 s to the drop", "The run's gods so far",
     "Each as it stands in the film, and each a painting. Top: Neptune (Copley) and Athena (Klimt). Middle: Buddha (La Farge) and Thor (Winge). Bottom: the golden calf (Poussin) and Jupiter (Moreau). Ingres's Jupiter closes the run, in the next still.",
     ["<b>From your list.</b> Zeus, Poseidon, Athena, Thor, the golden calf and Buddha are in, every one a painting.",
      "<b>Ra is out.</b> He was Egypt's own wall painting, which reads as an old drawing and is not Western art. No Western painting of him came up. One painting of Egypt's worship was found, Frederick Bridgman's procession of the sacred bull, but only in a small file. I would bring it in for the film from a larger one.",
      "<b>Not in yet.</b> Odin, Anubis and a Caesar. No painting of them came up.",
      "<b>Thor.</b> The hammer, the lightning and the red are what make him known at once, so he is shown to the waist and not as a face.",
      "<b>Who is not here.</b> Muhammad. A picture of him is the one thing in this that can get someone hurt, whatever is meant by it, so I will not make one. He is also a prophet to his people and not a god, so a run of gods is not his place. The belief can be said in Scripture's own words: see your calls below."], (720, 1920)),
    ("5-before-the-drop", "11.17 s", "The last frame before the drop",
     "Jupiter, from Jupiter and Thetis by Ingres, 1811 (Musée Granet, Aix-en-Provence). Scripture names Jupiter in Acts 14:12.",
     ["<b>What it is.</b> The last false god is set eye for eye on the icon that follows: the same place on the screen and the same size. Look at this still and the next one together.",
      "<b>Why.</b> On the bass the false face becomes the true one without the eyes moving. That is the edit's one big cut, and nothing flashes or shakes to make it.",
      "<b>One thing to know.</b> This file is a photograph of the painting on its wall, so it is a little softer than the others. For the film I would look for a sharper one."]),
    ("6-the-drop", "11.18 s, the drop", "Jesus Christ",
     "The Sinai Pantocrator in full colour, with the answer: \"I am Jesus\", Acts 9:5.",
     ["<b>What changed.</b> His face fills the frame, as in the Christ edit you called perfect. The first design showed the whole panel, flat. The light is pooled on His face and the edges are let fall. One slow even move toward Him.",
      "<b>Why.</b> Your word: the drop is Jesus Christ. The turn from Western oil paint to the icon, eye for eye on the bass, is the hit. The answer is the same verse as the question.",
      "<b>The line.</b> Under His beard. A word never stands on His face. No glow behind it. The icon moves only whole and nothing in it is redrawn."]),
    ("7-transfiguration", "12.32 s on", "The theophanies: the Transfiguration",
     "The Transfiguration, attributed to Theophanes the Greek, about 1403 (Tretyakov Gallery).",
     ["<b>What changed.</b> It fills the frame and is held on Christ, with the light pooled on Him. The first design was a small panel on black, which read as a slide show.",
      "<b>Why.</b> The Light has a face. This is the feast of that light.",
      "<b>One thing to know.</b> This icon has its own painted lines of light around Him. They are the icon's, and nothing in an icon is redrawn, so they stay. If you would rather have none in the film, say so and another icon of Him takes this place."]),
    ("8-light-of-the-world", "16.88 s on", "The last line",
     "The Holy Face of Novgorod, 12th century (Tretyakov Gallery), with \"I am the light of the world\", John 8:12.",
     ["<b>What changed.</b> His face fills the frame. The light falls away to dark at the foot, and the line stands there, under His beard.",
      "<b>Why.</b> It closes the circle: the film opens on a light with no name and ends with Him naming Himself as that light. This line is yours to say yes or no to.",
      "<b>Between the last still and this one.</b> The other icons of Him from the Christ edit, each on one of the reference's cuts, each filling the frame with one slow even move."]),
    ("9-the-end", "19.07 s to the end", "The end",
     "Black and Purify's mark, still. No white frame.",
     ["<b>What changed.</b> The mark is larger.",
      "<b>Why 19.07 and not 19.5.</b> It is the reference's last cut. From there the mark has nine tenths of a second to be read. From 19.5 it would have less than half a second."]),
]

MORE = ("Seven are in. The same gods will come again from other famous paintings, since Zeus, Poseidon and Athena have many, "
        "with Odin, Anubis and a Caesar added. Name any god or painting you want in it and I will look for it.")


def figure(name, when, title, caption, reasons, size=(720, 1280)):
    alt = f"Still from the storyboard: {title}."
    ps = "\n".join(f"    <p>{r}</p>" for r in reasons)
    return f"""  <section class="k-section" aria-labelledby="s-{name}">
    <h2 id="s-{name}">{title}</h2>
    <figure class="k-figure k-phone">
      <img src="stills/{name}.jpg" alt="{alt}" width="{size[0]}" height="{size[1]}">
      <figcaption>{when}. {caption}</figcaption>
    </figure>
{ps}
  </section>
"""


rows = "\n".join(
    f'          <tr><td>{p["what"]}<br>{p["held"]}</td><td class="k-num">{p["licence"]}</td></tr>' for p in PICS.values() if not p["used"].startswith("not used"))

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
    <p class="k-meta">Nine stills from the real stage. The run is made a fourth time, with Buddha as a painting, at your word. No video is made yet.</p>
  </header>

  <section class="k-section" aria-labelledby="s-shape">
    <h2 id="s-shape">The shape</h2>
    <p>A man before a light asks who it is. Then false god after false god, in the West's own paintings. On the drop, the answer: Jesus Christ, in His icon. Then the Light shown with a face.</p>
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
    <p><b>3. Scripture's false prophets in the run</b> (the prophets of Baal, Simon the sorcerer, Bar-Jesus). I recommend no. Every god in the run fills the frame, and the old pictures of these men are crowded scenes with small faces. Say yes and I will find them and show you.</p>
    <p><b>4. A line on every other way,</b> in Scripture's own words, in place of a picture of Muhammad: "no man cometh unto the Father, but by me" (John 14:6), or "many false prophets are gone out into the world" (1 John 4:1). Yes to one, or neither. I recommend John 14:6, on the drop or at the end.</p>
  </section>

  <section class="k-section" aria-labelledby="s-open">
    <h2 id="s-open">What is not done yet</h2>
    <p>The film needs about thirty pictures in the run. {MORE}</p>
    <p>No living person stands in the run. Buddha is the one figure of a living religion in it, at your word. Muhammad is not in it.</p>
    <p>The other opening that was offered (Moses at the bush) is not drawn. Saul stands, as chosen.</p>
    <p>At your yes: the film, a silent master to save, and one preview with the reference's sound for you alone, marked not for posting. A priest's yes is still yours to get before it is posted. It is for the separate edits account, not a paid ad and not the store pages.</p>
  </section>

  <section class="k-section" aria-labelledby="s-pictures">
    <h2 id="s-pictures">The pictures so far</h2>
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
for name, *_ in STILLS:  # every still, and the sheet of the run's gods
    shutil.copy(f"{HOME}/board/{name}.jpg", f"{HOME}/page/stills/{name}.jpg")
open(f"{HOME}/page/index.html", "w", encoding="utf8").write(body)
print(f"  page/index.html: {len(body) // 1024} KB")
