# Silver Night: Purify's illustration style

**No art drawn in code** (his word, 2026-11-27: "all the designs look super vibe coded honestly"). Shapes drawn in SVG read as vibe coded, however they are styled. Purify's art is made by an image model from the prompts here, or by an illustrator; a chat writes the art direction and the prompts and judges what comes back. The code-drawn sets in this folder (`ref/`, `directions/`, `pack/`) are kept as unused, for the Vault, and are never given to a model as a reference: the reference is his own best result.

His words, 2026-11-27: "we will work on prompt generation. to feed to my image models to create artwork for purify"; Hallow's Discover shown as a distinct illustrated system; "I want one of ours but with our own unique touch and black and grayscale defined pallete"; "as clear as possible though and a reference"; "send me the 2 references to use".

## The two references

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
