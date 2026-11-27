# Silver Night: Purify's illustration style

**The page to copy from:** https://claude.ai/artifact/7LsSMiwAobQMRvpoDYL7Lm (private; built from `prompts.py`, which writes `PLAN.md` and `prompts.html`).

**Saints, yes; a specific icon, never** (his words, 2026-11-27: "no recreations of holy icons by the way", then "no restrictions on making saints just no recreatings specific iconagraphy just generic depictions"). Saints may be drawn as generic, unnamed figures; no prompt copies a particular icon. No prompt asks for an icon, an iconostasis's images or a holy figure; a result that shows one is redone. Round 1's Saints drew faint icon figures behind the candles, so it is redone in `PLAN.md`. The app's real icons stay as they are (`docs/editorial-standards.md`: no invented artwork).

**No art drawn in code** (his word, 2026-11-27: "all the designs look super vibe coded honestly"). Shapes drawn in SVG read as vibe coded, however they are styled. Purify's art is made by an image model from the prompts here, or by an illustrator; a chat writes the art direction and the prompts and judges what comes back. The code-drawn sets in this folder (`ref/`, `directions/`, `pack/`) are kept as unused, for the Vault, and are never given to a model as a reference: the reference is his own best result.

His words, 2026-11-27: "we will work on prompt generation. to feed to my image models to create artwork for purify"; Hallow's Discover shown as a distinct illustrated system; "I want one of ours but with our own unique touch and black and grayscale defined pallete"; "as clear as possible though and a reference"; "send me the 2 references to use".

## The style, chosen: C, Mist (2026-11-27)

His word, with the first result from Gemini: "the last prompt looks insane on Gemini let's stick to that style". The reference for the whole set is that image, `ref/mist-reference.jpg` (Gemini, 2400 by 1792): attach it to every prompt below. Each prompt also says the style in words, so it holds without the image.

**The style in one line:** a 4:3 cinematic illustration in black and grayscale, soft airbrushed gradients like a modern animated film's background; near-black silhouettes against pure white light with soft halos; layered mist for depth; gentle grain.

**Seen in the first result, and held in the prompts:** the windows' light came out a little warm, so every prompt asks for pure neutral white. The dome came out as an onion dome; the other doors vary the architecture, so the set is not one country's.

**Format:** 4:3 tiles, like Hallow's. Discover today shows wide bands (`components/ui/GalleryBand.tsx`), so using these as tiles is a change of layout, his to say yes or no to.

## The twelve doors, one prompt each (Gemini, with the reference attached)
**Find a parish**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: The reference itself: a small Orthodox church in silhouette on a misty hill under a full moon, its windows glowing. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Saints**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Inside a dark Orthodox church, a tall stand of thin beeswax candles burning in rows, their flames the only light, a soft haze of incense in the air, the faint silhouettes of icon frames on an arched wall behind. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Reading**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A monk's quiet cell at night, an open old book on a wooden lectern lit by a small oil lamp hanging above it, a narrow arched window behind it showing the full moon, dust and haze floating in the lamplight. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Orthodox History**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A great Byzantine city on a hill across the water at night, its huge central dome and smaller domes in silhouette against a full moon, no minarets, mist lying on the water, one sailing ship in silhouette in the foreground. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Councils**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A vast domed hall at night, a half circle of robed bishops seen from behind as dark silhouettes, seated facing an open book on a stand in the center that glows softly in a pool of light, incense haze in the air. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Theology**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Looking straight up into the dome of a dark Orthodox church, a ring of arched windows glowing white around it, the center softly lit, a thin veil of incense haze drifting across. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Chants**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: An open chant book with old musical notation on a tall wooden stand in a dark church, a single candle beside it, two chanters standing at the stand seen from behind as silhouettes, faint glowing windows far behind. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Calendar**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A monastery on a mountain ridge in silhouette, mist filling the valley below, and across the night sky a gentle arc of the moon's phases from a thin crescent to full. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Walkthroughs**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A lone pilgrim with a walking staff, seen from behind as a silhouette, on a winding path through misty hills toward a small distant chapel with one glowing window, under a full moon. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Shop**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: An open wooden box on a dark table, soft white light glowing up from inside it, a little haze in the air around it, a dark room behind. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Chat**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A long wooden table in a monastery refectory at night, candles along its length, people seated together on both sides as soft silhouettes, leaning in to talk, haze in the candlelight. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```
**Start here**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: The arched wooden door of a small Orthodox church at night, slightly open, soft white light spilling out over the stone steps and into the mist, a path leading up to it. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no light rays or beams, no sparkles, no text, no faces.
```

## The two references (code-drawn, unused)

Attach both to every generation. Drawn in code to the exact palette (`references.mjs`), so the model learns the look from two kinds of subject:

- `ref/silver-night-1-church.png`: a night scene outdoors.
- `ref/silver-night-2-candle.png`: an object indoors.

## The look

- **Palette:** five grays only: `#0B0B0C`, `#26262A`, `#4E4E54`, `#8E8E95`, `#D9D9DD` (the app's silver). No color.
- **Technique:** flat layered shapes; fine engraved hatching only in the shadows; subtle film grain; crisp edges.
- **Light:** one soft pool of silver light, never rays. Outdoors, a faint glow along the horizon and tiny dot stars, never sparkles.
- **Subject:** one clear subject; simple faceless figures; plenty of dark space. Calm, premium, modern, timeless.

## Every prompt starts with

> Match the two attached style references exactly: their five grays, flat layered shapes, engraved hatching in the shadows, soft pool of light and grain. Give this image more detail and finish than the references.

## Never

Color, gold, sepia, cream or paper texture, light rays or sunbursts, sparkles or four-point glints, photorealism, a 3D render look, text or letters, busy detail.

## Format

Waiting on his word: tiles two across (4:3, like Hallow's), or the gallery's wide bands (about 4:1, the subject on the right, the left kept dark for the title).

## Round 1 from Gemini, rated (2026-11-27)

His eight results are in `mist/round-1/`. His word: "rate all of the images it made from the promps". Rated on four things: the style held, the door read at a glance, the house's rules, and the Church got right.

| Door | Score | What works | What to fix in the prompt |
|---|---|---|---|
| Find a parish (the reference) | 9 | The silhouette, the moon, the mist | The windows came out warm: pure white |
| Saints | 9 | Candles before icons in incense: Orthodox at a glance | Nothing needed |
| Reading | 7.5 | Clear and calm | The lamp is a genie lamp and the lectern a podium: a hanging glass lampada, a slanted wooden analogion |
| Councils | 7.5 | The half circle, the book in its light | Modern chairs, and a faint shaft of light from above: wooden benches, no shaft |
| Chants | 6.5 | Strong figures | Modern five-line sheet music, and a second lectern like Reading's: Byzantine neumes over Greek text, or another scene |
| Start here | 6.5 | The door's light | Reads as a crypt in fog, with no dome or cross: a small domed church, a cross over the door, candles inside |
| Orthodox History | 6 | The skyline and the ship | Minarets, despite the prompt: Ottoman Istanbul, wrong for the door. Name the Hagia Sophia of 537 with no towers at all |
| Shop | 5 | The glow | A treasure chest any app could have: an open box holding a small icon in a frame and a prayer rope |

Not yet made: Theology, Calendar, Walkthroughs, Chat. The set as a whole: about 7, and above 8 with the four fixes.

## Round 2: the re-prompts for the six to fix (2026-11-27)

His word: "make reprompts for the ones that need fixing". Each describes only what should be there: round 1 drew minarets when the prompt named them.
**Orthodox History**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Constantinople in the year 537 across calm water at night. At its heart the Great Church of Hagia Sophia exactly as it was first built: one vast, low, wide dome resting on a ring of small arched windows, with nothing rising around it, and every dome in the city crowned with a small cross. Long sea walls with square towers run along the shore, a few windows glow, and a Byzantine ship with one square sail rests on the water in the foreground, mist lying on the sea, a full moon behind the great dome. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
**Shop**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: An open wooden box resting on a dark wooden table, its lid tilted back. Inside, on a folded soft cloth, lie a knotted prayer rope with a small cross and tassel, a small carved wooden cross, and one beeswax candle. Soft white light glows up from inside the box onto the cloth, a little mist drifts around it, and a dark room is softly blurred behind. A gift, quiet and precious. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
**Start here**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A small Orthodox church at night with a round dome and a three-bar cross, seen close from the front. Its arched wooden door stands half open, and inside, through the door, rows of thin candles glow softly, their light spilling white over three stone steps and onto a short path. A small carved cross above the door. Low mist on the ground, a calm night sky. Peaceful, welcoming and safe, like coming home. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
**Chants**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A close-up of an old open chant book on a wooden stand inside a dark church. Its pages hold lines of Greek letters, with small curling Byzantine neume marks written above the words, in black ink. One beeswax candle stands beside the book, its flame lighting the pages with a soft white glow. Behind, softly blurred, the dark church with a few glowing candles and a curve of the dome. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
**Councils**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A vast round hall with a dome, at night. Robed bishops in tall headdresses sit on long wooden benches along the curved wall, seen from behind and the side as dark silhouettes, all turned toward an open book on a carved wooden stand in the center. Tall candle stands on either side of the book give it a soft round pool of white light; the dome above stays dark. Incense haze hangs in the air. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
**Reading**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A monk's quiet stone cell at night. In the center a tall Orthodox reading stand: a narrow wooden stand with a sloping top, draped in a dark embroidered cloth, holding an open old book. Above it a small glass oil lamp hangs from a thin chain, its single flame glowing softly. Behind, a narrow arched window shows the full moon, and haze drifts in the lamplight. Keep the subject large in the center and the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
