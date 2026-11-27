# Silver Night: Purify's illustration style

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
