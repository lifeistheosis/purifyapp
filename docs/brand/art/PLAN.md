# Silver Night, Mist: every surface, and a prompt for each picture

**The page to copy from:** https://claude.ai/artifact/7LsSMiwAobQMRvpoDYL7Lm (private; built from `prompts.py`, which writes `PLAN.md` and `prompts.html`).

His word, 2026-11-27: "make me designs for everything we will implement the photos to actually. we are going all in on design."

Every prompt is for Gemini with `ref/mist-reference.jpg` attached. The page to copy from is `prompts.html` (published as an artifact).

## No recreated icons

His word, 2026-11-27: "no recreations of holy icons by the way". No prompt asks for an icon, an iconostasis's images, or a holy figure, and a result that shows one is redone. Scenes that would invite icons describe the panels as shadow or leave them out.

## What stays real

The saints' icons (`public/saints/`), the history pictures (`public/history/`), the authors' and councils' covers (`public/covers/`) and the prayers' service icons stay real: they are the content, and the editorial rules forbid invented artwork for the saints and history (`docs/editorial-standards.md`). The illustrations are for the places that lead to content: doors, mastheads, cards, empty states, letters and banners.

## The order

Discover's doors, then the mastheads, onboarding's cards, Plus, the empty states, the letters, the banners; Theology's four only at his word. Each picture comes to him before it ships, and each screen it lands on passes checkMock (a title over a picture still needs 4.5 to 1).

## How they go in

Each picture is saved as `public/art/<surface>/<name>` in AVIF and WebP, like the others, and takes the place of the old one in its map (DiscoverMobile's entries, `lib/onboarding/pictures.ts`, `lib/media/sections.ts`, the Plus pages). Each is recorded in `docs/licensing/SECTION_MEDIA.md` as Purify's own, made with Gemini. Discover's doors are 4:3 tiles while Discover shows wide bands today: his call on the layout comes first.

## Discover's doors (5, 4:3)

Where: Discover, each door's picture (components/mobile/DiscoverMobile.tsx). Six of them also stand on onboarding's answer cards (lib/onboarding/pictures.ts shares them). Round 1 made eight; round 2 re-prompts six (the README). Saints is redone here because round 1 drew icon figures behind the candles; the other four are still to make.

**Saints (redo: no icon figures)**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Inside a dark Orthodox church, a tall stand of thin beeswax candles burning in rows, their flames the only light, a soft haze of incense, the walls behind lost in deep shadow with only the curves of arches showing. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Theology**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Looking straight up into the dome of a dark Orthodox church, a ring of arched windows glowing white around it, the center softly lit, a thin veil of incense haze drifting across. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Calendar**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A monastery on a mountain ridge in silhouette, mist filling the valley below, and across the night sky a gentle arc of the moon's phases from a thin crescent to full. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Walkthroughs**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A lone pilgrim with a walking staff, seen from behind as a silhouette, on a winding path through misty hills toward a small distant chapel with one glowing window, under a full moon. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Chat**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A long wooden table in a monastery refectory at night, candles along its length, people seated together on both sides as soft silhouettes, leaning in to talk, haze in the candlelight. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Section mastheads (6, 16:9)

Where: The head of Bible, Prayers, Discover, Reading and You, and Today's picture (components/mobile/SectionMasthead.tsx, lib/media/sections.ts). Each is the first thing a section shows, so each names the place at a glance.

**Today**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: First light over a sea of mist: a small monastery bell tower rising through it on a hill, a thin pale glow along the horizon, a fading crescent moon still in the sky. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Bible**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: An open Gospel book on a tall wooden stand in a dark church, its pages glowing softly, one beeswax candle beside it, incense haze drifting. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Prayers**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: A hand holding a single lit beeswax candle in a dark church, rows of candles softly blurred behind it, the flame's glow on the fingers. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Discover**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: The long nave of a great dark church seen from its entrance, arches receding into mist, pools of light under hanging lamps, open doorways on either side. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Reading**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: Towering shelves of old books in a monastery library at night, a wooden ladder leaning against them, one reading lamp glowing on a long table. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**You**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: One person seen from behind, standing on a hill at night in a long coat, looking toward a distant church with glowing windows, a few stars above. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Onboarding's answer cards (5, 4:3)

Where: "What are you looking for?", the picture on each answer (lib/onboarding/pictures.ts). Saints, the Fathers, councils, history, beliefs and feasts take Discover's pictures; these five have their own. A reader's first look at Purify's art.

**The Gospels**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A Gospel book with a cross on its cover, resting closed on a cloth-covered holy table in a dark church, one candle beside it. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Liturgy**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: Inside an Orthodox church during the Liturgy, seen from the back: the carved wooden screen at the front glowing softly with candlelight, its panels in deep shadow, its central doors open to a soft light, a few worshippers standing as silhouettes, incense haze. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**A daily rule**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A quiet corner of a home at night: a hanging glass oil lamp glowing over a small wooden shelf that holds a prayer rope, a candle and a closed prayer book, the wall behind in shadow. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Quiet**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A monk in silhouette sitting on a rock at the edge of a cliff above a sea of mist before dawn, a prayer rope in his hand, the sky still dark. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Study**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A writing desk at night with stacked old books, an open manuscript, a quill and an inkwell, one candle burning, a window with the moon behind. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Purify Plus (1, 16:9)

Where: The head of the Plus page and the kept-items sheet (components/premium/PlanScreen.tsx, components/billing/KeptPaywall.tsx). Plus is the whole library: depth, not a lock.

**The whole library**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 16:9. Scene: A vast monastery library seen through an arched doorway, tall shelves rising into the dark, soft white light, a reading desk with an open book in the center. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Empty states (5, 1:1)

Where: What a page shows when it has nothing yet: bookmarks, the journal, search, offline, notifications. Smaller and quieter than the doors: one subject and a lot of dark.

**No bookmarks yet**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A closed old book with a ribbon marker resting on a dark table in a soft round pool of light. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Journal, first page**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: An open blank notebook with a pen lying across it on a dark table, one candle beside it. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Search found nothing**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A hand holding a lantern out over a misty path at night, the path fading into fog. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Offline**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A small monastery on a cliff high above the clouds at night, far from everything, a few stars. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**No notifications**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 1:1. Scene: A still bell hanging in a quiet belfry arch at night under the moon. Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Email headers (4, 2:1)

Where: The picture at the top of each letter to readers (lib/email/). A reader sees one in their inbox before the app.

**A new release**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 2:1. Scene: Dawn breaking over a wide sea of mist, the domes and crosses of a monastery rising through it, the first pale light along the horizon. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The first week**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 2:1. Scene: Stone steps leading up through mist to the open door of a small church, soft light inside. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Where you left off**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 2:1. Scene: An open book left on a stone windowsill at night, a ribbon marker across its page, the moon outside. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The fasting companion**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 2:1. Scene: A simple wooden table by a window at dusk with bread, olives and a cup of water, one candle burning. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Today's banners (3, 21:9)

Where: New banner looks a reader can choose on Today (public/themes/), beside the ones they have. Added as choices, never replacing a reader's own.

**Night Mist**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 21:9. Scene: A long horizon of misty hills with distant domes and crosses, a full moon low over them. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Monastery Ridge**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 21:9. Scene: A monastery strung along a cliff ridge above a sea of mist at night. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**Candle Row**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 21:9. Scene: A long row of thin candles burning on a stand in a dark church, seen low and wide, incense haze. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

## Theology's subjects (his call) (4, 4:3)

Where: The four bands at the head of Theology (public/theology/subjects/). Today they are real icons. His call: keep the real icons, or these, which show each subject by its signs alone: no icon is recreated, and Christ, the Trinity and the saints are never drawn.

**The Holy Trinity**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A bishop's three-branched candlestick with three crossed candles burning, raised in a dark church, incense haze around the flames. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Mystical Supper**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A long table spread with white cloth in a dark upper room, a loaf of bread and a chalice at its center under one hanging lamp, the benches empty. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Last Judgment**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: The end of night: a great cross standing on a dark hill against the first light of dawn breaking along the horizon, mist below. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```

**The Triumph of Orthodoxy**

```
Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. 4:3. Scene: A procession at night seen from behind: the faithful as silhouettes carrying lit candles and a tall processional cross, walking toward a great church with glowing windows. Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions.
```
