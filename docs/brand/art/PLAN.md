# Silver Night, Mist: every surface, and a prompt for each picture

His word, 2026-11-27: "make me designs for everything we will implement the photos to actually. we are going all in on design."

Every prompt is for Gemini with `ref/mist-reference.jpg` attached. The page to copy from is `prompts.html` (published as an artifact). What he has picked, and how each was checked, is `PICKED.md`; this file is written by `prompts.py`, so nothing is added to it by hand.

## Saints, yes; a specific icon, never

His words, 2026-11-27: "no recreations of holy icons by the way", then "no restrictions on making saints just no recreatings specific iconagraphy just generic depictions". Saints and the clergy may be drawn as generic, unnamed figures; no prompt copies a particular icon's composition or a named saint's likeness, and a result that does is redone.

## What stays real

The saints' icons (`public/saints/`), the history pictures (`public/history/`), the authors' and councils' covers (`public/covers/`) and the prayers' service icons stay real: they are the content, and the editorial rules forbid invented artwork for the saints and history (`docs/editorial-standards.md`). The illustrations are for the places that lead to content: doors, mastheads, cards, empty states, letters and banners.

## The order

Discover's doors, then the mastheads, onboarding's cards, Plus, the empty states, the letters, the banners; Theology's four only at his word. Each picture comes to him before it ships, and each screen it lands on passes checkMock (a title over a picture still needs 4.5 to 1).

## How they go in

Each picture is saved as `public/art/<surface>/<name>` in AVIF and WebP, like the others, and takes the place of the old one in its map (DiscoverMobile's entries, `lib/onboarding/pictures.ts`, `lib/media/sections.ts`, the Plus pages). Each is recorded in `docs/licensing/SECTION_MEDIA.md` as Purify's own, made with Gemini. Discover's doors are 4:3 tiles while Discover shows wide bands today: his call on the layout comes first.

## Section mastheads (5, 16:9)

Where: The head of Bible, Prayers, Discover, Reading and You, and Today's picture (components/mobile/SectionMasthead.tsx, lib/media/sections.ts). Made: Reading. Each is the first thing a section shows, so each names the place at a glance.

**Today**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: A monk high in an open bell tower at sunrise, seen from behind, pulling the ropes of several bells, the valley far below filled with mist and the first pale light on the horizon. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Bible**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: Two hands opening a large old book on a dark wooden table, a soft white glow rising from its pages and catching the dust floating in the air. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Prayers**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: A woman in a headscarf kneeling in prayer at the back of a dark, empty church, seen from behind, one hanging lamp glowing far ahead near the front. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Discover**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: Seen from high above: a monastery on a rocky headland wrapped in sea fog, its many domes and courtyards, a winding path down to a small harbor with one boat. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**You**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: A person seen from behind on a window seat at night, a blanket over their shoulders and a prayer rope in their hand, looking out at snow falling over a sleeping town with one church dome. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Onboarding's answer cards (3, 4:3)

Where: "What are you looking for?", the picture on each answer (lib/onboarding/pictures.ts). Saints, the Fathers, councils, history, beliefs and feasts take Discover's pictures; these five have their own. Made: Quiet, A daily rule. A reader's first look at Purify's art.

**The Gospels**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Four old leather-bound books standing upright together on a stone shelf, lit softly from one side, a small cross on each spine. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Liturgy**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Looking down the length of a church from the balcony: worshippers standing in rows as silhouettes, incense rising, and at the far end the open central doors glowing with candlelight, a priest in vestments standing there. Generic figures, not copied from any icon. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Study**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A young person seen from behind, sitting cross-legged on a wooden floor surrounded by open books and loose notes, a small lamp beside them, a tall arched window with the night behind. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Empty states (4, 1:1)

Where: What a page shows when it has nothing yet: bookmarks, the journal, search, offline, notifications. Made: Offline. Smaller and quieter than the doors: one subject and a lot of dark.

**No bookmarks yet**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A single loose ribbon bookmark lying on an empty wooden table in a soft round pool of light. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Journal, first page**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A fountain pen resting on a blank page, its nib catching a soft light. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Search found nothing**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A small rowing boat with a lantern drifting on a calm, misty lake at night, the far shore lost in fog. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**No notifications**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A small hand bell resting still on a wooden windowsill, snow falling softly outside. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Email headers (2, 2:1)

Where: The picture at the top of each letter to readers (lib/email/). Made: A new release, Where you left off. A reader sees one in their inbox before the app.

**The first week**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 2:1. Scene: Seven flat stepping stones crossing a still pond toward a small chapel on the far bank, morning mist lying on the water. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The fasting companion**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 2:1. Scene: A monastery kitchen garden at first light, a monk kneeling among the rows of vegetables, mist rising from the soil, the monastery walls behind. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Today's banners (3, 21:9)

Where: New banner looks a reader can choose on Today (public/themes/), beside the ones they have. Added as choices, never replacing a reader's own.

**Monastery Coast**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 21:9. Scene: A long rocky coastline at night, small chapels strung along the cliffs, sea mist rolling in, a few windows lit. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Snow Domes**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 21:9. Scene: A snowy town at night seen from a hill: rooftops and several church domes under snow, smoke rising from chimneys, soft lit windows. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Desert Dawn**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 21:9. Scene: A desert at first light: dunes softened by mist, a small domed chapel beside a lone palm, a line of travelers with camels far away. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Theology's subjects (3, 4:3)

Where: The four bands at the head of Theology (public/theology/subjects/). Today they are real icons. Made: The Last Judgment. These show each subject by its signs: no icon's composition is recreated.

**The Holy Trinity**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Three flames of equal height rising from a single oil lamp in a dark church, their light meeting in one soft glow. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Mystical Supper**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Close on two hands breaking a round loaf of bread above a cup on a wooden table, lit by one lamp, the room dark around them. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Triumph of Orthodoxy**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: The great doors of a cathedral thrown open at dawn, the faithful pouring out onto the steps with lit candles, bells swinging in the tower above. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
