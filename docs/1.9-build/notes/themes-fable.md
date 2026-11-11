# New palettes: proposals for Plus, and new looks for the earned two

Proposals only, 2026-11-10. Nothing here is in the app. Edgar picks first, and
the build comes on his word through the arbiter.

**Later the same day** he asked for a new and larger set ("make a lot more
designs", "I want clean and unique"). Of sections 1 to 8, only Night sky goes
forward. The set now proposed, eighteen Plus themes in four families with the
picker for Settings, starts at "The third set" further down, and its pictures
are at https://claude.ai/artifact/ALDy4Fz1XPGyHfQ7vcVZwD.

**And then it was built**, on his word of about 04:48 UTC ("finalize all of
this and let's get going"). What is in the app, how it differs from what was
drawn, what was measured and what still waits for him are at "Built", the
last part of this file (sections 19 to 26). The same page now shows the real
build. Candlelight through the Church's year, built after them, is section 27,
and the words about Plus, as he approved them, section 28. The look in the
Plus preview is section 29, and two small mends found beside it section 30.

His words, the same day: "I also want you to cook up better themes ... I don't
like the themes we have now, except that light mode, parchment, and the dark
one, and the one we have now for the default. Everything else, honestly, can
look better. And yeah, pretty much users without premium will have generic
colors, but users with premium will have more unique designs. For example,
right, we, in our ads, we use that Galaxy Stars one. That should be one,
that's part of plus users, and add a bunch more plus designs."

**The pictures:** https://claude.ai/artifact/2mi1aMGzWknkGEQ3Srp46n (his private page). Every palette on the same two
screens, the Bible on John 1 and Today, taken from the native export of
`028a02d2` at 390 wide. The free three come first, as they are, and the four
palettes that would change are shown beside what they are today.

Contents:

1. The set
2. What makes a Plus palette a design and not a tint
3. The palettes, one by one, each with its CSS
4. The shared CSS and the three pictures
5. How the stills were made, and what was measured
6. What building them would take
7. For Edgar to decide
8. Seen on the way: the app's own, on any palette

---

## 1. The set

| Palette | id | For | In a line | Ground |
|---|---|---|---|---|
| Dark | `default` | everyone | as it is today | dark |
| Light | `parchment` | everyone | as it is today | light |
| True black | `black` | everyone | as it is today | dark |
| Candlelight | `candlelight` | Plus | A candle's room: warm white on the dark | dark |
| Monastery | `monastery` | Plus | Cypress green, stone and a window's light | dark |
| Night sky | `nightsky` | Plus | A still night, small stars, the star above | dark |
| Vigil lamp | `lampada` | Plus | The red lamp before the icons | dark |
| Incense | `incense` | Plus | Evening smoke, the purple of the Fast | dark |
| Book of Hours | `hours` | Plus | Ivory paper, black ink, red rubrics | light |
| Island chapel | `chapel` | Plus | Whitewash, sea blue, morning light | light |
| Councils | `councils` | earned | Deep blue under the dome, ivory and silver | dark |
| Cappadocian | `cappadocian` | earned | Rock at dusk, cream and rubric red | dark |

Seven Plus palettes, five dark and two light. The three free ones are not
touched: not a token, not a rule. Night sky is his "Galaxy Stars". The last
two are the earned palettes: only their look is proposed here. How a reader
earns them is item 79's, built since these pictures were taken
(`82b2b7e0`), and nothing here touches it.

One version of each, by his word of 2026-11-09 on spending only what was
asked.

## 2. What makes a Plus palette a design and not a tint

Why today's paid palettes read as Dark with a cast: each is six colours. The
page takes a tint and everything else stays as Dark draws it. The surfaces
the app paints with a gradient of its own greys (the hub tiles and the
feature band of `components/mobile/SoftTiles.tsx`, the graphite cards: the
`lm-*` surfaces) are typed in, so they stay graphite on a tinted page. True
black and Light re-ink those surfaces. The four tinted palettes never did.

So each proposal is four things, and the first is the smallest:

1. **Its tokens.** The page, the card, the well, the ink, the accent, and
   where it has one the feast mark and the rubric.
2. **Its own cards.** The `lm-*` surfaces re-inked in the palette's hue, lit
   from the same corner as the graphite they replace.
3. **Its room.** One still layer under the page: a pool of light where a
   lamp, a window, a dome or the dusk would put it, and for Night sky the
   small stars. One layer, nothing blended, nothing moving, so it costs one
   paint and reduced motion has nothing to stop. The foot of every room is
   the plain page colour, so the app's own fades under its bars meet it with
   no seam.
4. **Its faint text.** The share of ink its captions and counts are drawn at,
   solved for that palette as the others are.

The house's rules, and how each proposal keeps them:

- **No gold, yellow or amber.** Every colour written in these blocks, 130
  of them, the pictures' included, was put through `lib/ui/goldTone.ts`
  (the measure `noGold.test.ts` uses). None is gold by it, and none comes
  near its line. Candlelight's warmth is the white of beeswax: its light is
  `rgb(255 240 222)`, chroma 0.03, half of the 0.06 where that measure begins
  to call a colour gold.
- **No light rays.** Every light is one or two soft pools. There is no conic
  gradient in any block.
- **No side stripes, no pills added, nothing drawn by hand.** No block adds a
  border, a bar or a control. The one picture in the set is the app's own:
  Night sky's star over the horizon is the Nativity card's star, halo and lit
  edge (`components/today/NativityStarCard.tsx`), and its small stars follow
  that card's arithmetic (`lib/reading/nativityStar.ts`).
- **The words sit on a calm surface.** A room is held under one line: its
  lightest point is still dark enough (or on a light palette, light enough)
  that the red commentary numbers and the palette's faint text hold 4.5:1 on
  it. Section 5 has the measure.
- **Tokens, not fixed colours.** A room and a card are literals inside the
  palette's own block, as True black's and Light's are. No component is
  restyled by hand; the one thing a build asks of the pages is in section 6.
- **Arabic.** A room that leans to one side has its mirror for
  `dir="rtl"`. The checker's mirror pass found nothing a palette moved.

## 3. The palettes

Each block below is the text as it would go into `app/globals.css`. The
three pictures are named (`--room-grain`, `--sky-stars`, `--sky-horizon`)
and written out once in section 4.

### Night sky (Plus)

His "Galaxy Stars". The night of the promo and of Today's Nativity card,
carried across the whole app: a blue-black sky, darker overhead, with small
still stars thinning toward the foot of the screen. The star itself stands
over the horizon at the head of each chapter, in the place of the short rule
under "Chapter 1", and leaves with the heading as the reader scrolls. It
never lies behind words, which is why it is there and not fixed to the
screen: on a phone the words run edge to edge, so anything bright that stays
put ends up behind a line of Scripture.

An Orthodox night, not a galaxy: one colour, no cloud, no haze of purple, no
flare. The accent is the star's own white. Chips swatch: page `#05070d`, ink `#f3f5f9`.

Why it suits Purify: it is the picture the ads already use and the card he
picked for the Nativity Fast (round 9, pick C), so what a reader saw in an
ad is what the app looks like. It is also the palette of the season now
beginning.

```css
html[data-reading-mode="nightsky"] {
 --color-night: #05070d;
 --color-night-soft: #0f1420;
 --color-night-deep: #020308;
 --color-paper: #edf0f6;
 --color-gold: #f3f5f9;
 --color-gold-soft: #c5cddb;
 --color-gold-pale: #fbfcfe;
 --color-festal: #f3f5f9;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #141a2a 0%, #0d1220 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #1a2236 0%, #111827 100%);
 --room:
  var(--sky-stars) center top / cover no-repeat,
  radial-gradient(140% 52% at 50% 112%, rgb(72 100 168 / 0.2), rgb(72 100 168 / 0) 66%),
  linear-gradient(180deg, #03050a 0%, #05070d 40%, #070b14 100%);
}

/* The star over the horizon, in the place of the short rule at a chapter's
   head: the Nativity card's own star, halo and lit edge. It leaves with the
   heading as the chapter scrolls, so no word ever lies over it. */
html[data-reading-mode="nightsky"] .page-open-rule {
 width: min(300px, 88%);
 height: 64px;
 margin-top: 2px;
 background: var(--sky-horizon) center / 100% 100% no-repeat;
}
html[data-reading-mode="nightsky"][dir="rtl"] .page-open-rule {
 transform: scaleX(-1);
}

html[data-reading-mode="nightsky"] .lit-surface {
 --lit-muted: rgb(237 240 246 / 0.6);
 --lit-line: rgb(237 240 246 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="nightsky"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 60%, transparent);
 }
 :where(html[data-reading-mode="nightsky"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 60%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="nightsky"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 60%, transparent);
 }
}
```

### Candlelight (Plus), a new look

His pick of 2026-11-06 stays whole: in the Bible the line being read is lit,
the others step back, a soft light rests where the eye does and the edges
fall away. What changes is the colour. It went from amber to black and zinc
grey on 2026-09-25 and has read as a dimmer Dark since. Here the ink, the
accent and the light move from grey to the white of beeswax, on a warm
black, with warm charcoal cards. It reads as a candle again, and there is no
yellow in it.

Outside the Bible the same light rests on every page as the room. In the
Bible the reader's own veil is the candle, so the room steps aside for it.
The id does not change, so Night reading in one tap and Candlelight at
Vespers keep working as built. Chips swatch: page `#060504`, ink `#e0d8cb`.

```css
html[data-reading-mode="candlelight"] {
 --color-night: #060504;
 --color-night-soft: #171411;
 --color-night-deep: #000000;
 --color-paper: #e0d8cb;
 --color-gold: #ece5d9;
 --color-gold-soft: #a59d91;
 --color-gold-pale: #f3ede3;
 --color-festal: #ece5d9;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #1c1814 0%, #141210 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #231e19 0%, #181512 100%);
 --room:
  radial-gradient(ellipse 110% 42% at 50% 40%, rgb(255 240 222 / 0.075), rgb(255 240 222 / 0) 72%);
}

/* In the Bible the candle is the reader's own veil, as he picked it (the
   line being read lit, the edges falling away), so the room steps aside for
   it there. Its light is warmed from white to the white of beeswax. No
   yellow: its chroma is 0.03. */
html[data-reading-mode="candlelight"]:has(.candle-veil) body::before {
 background: none;
}
html[data-reading-mode="candlelight"] .candle-veil {
 background:
  radial-gradient(ellipse 90% 34% at 50% 40%, rgb(255 240 222 / 0.05), rgb(255 240 222 / 0) 72%),
  radial-gradient(130% 105% at 50% 42%, rgb(0 0 0 / 0) 56%, rgb(0 0 0 / 0.55) 100%);
}

html[data-reading-mode="candlelight"] .lit-surface {
 --lit-muted: rgb(224 216 203 / 0.6);
 --lit-line: rgb(224 216 203 / 0.44);
}

@layer utilities {
 :where(html[data-reading-mode="candlelight"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 66%, transparent);
 }
 :where(html[data-reading-mode="candlelight"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 66%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="candlelight"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 66%, transparent);
 }
}
```

### Vigil lamp (Plus)

The red lamp that burns before the icons through the night. A pool of ruby
light hangs high on the page, where the lamp would, and the page falls away
to a wine black around it. The ink is a warm white. The feast marks and the
calendar's rubrics take the lamp's red. The commentary numbers stay red, a
shade lighter, so they stand off a red ground.

Why it suits Purify: nothing says an Orthodox home or church at night faster
than that lamp, and no other reading app has it. It is the one palette here
with a strong colour, and it is the calmest to read in: the light is above
the words, not behind them. Chips swatch: page `#0a0506`, ink `#e9828a`.

```css
html[data-reading-mode="lampada"] {
 --color-night: #0a0506;
 --color-night-soft: #1c0f13;
 --color-night-deep: #050203;
 --color-paper: #eee3df;
 --color-gold: #f4e9e6;
 --color-gold-soft: #cfa9a8;
 --color-gold-pale: #fbf2ef;
 --color-festal: #e9828a;
 --ink-rubric: 236 112 118;
 --color-comment: #ff8a7e;
 --color-comment-hover: #ffa398;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #22131a 0%, #170c10 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #2a171e 0%, #1c0f13 100%);
 --room:
  radial-gradient(ellipse 78% 36% at 50% 21%, rgb(176 24 42 / 0.26), rgb(176 24 42 / 0.09) 50%, rgb(176 24 42 / 0) 78%),
  radial-gradient(130% 100% at 50% 30%, rgb(0 0 0 / 0) 55%, rgb(0 0 0 / 0.5) 100%);
}

html[data-reading-mode="lampada"] .lit-surface {
 --lit-muted: rgb(238 227 223 / 0.6);
 --lit-line: rgb(238 227 223 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="lampada"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
 :where(html[data-reading-mode="lampada"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="lampada"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
}
```

### Monastery (Plus), a new look

Today's is "cool stone and quiet indigo", a blue-grey cast. The proposal
turns it green: the deep green of cypress on a stone ground, with the light
of a small window falling from the top of the page on the side reading
starts from, and shadow in the far corner. The accent is a pale sage, of the
family the app already uses for its sage marks. A fine grain keeps the stone
from being flat.

Why it suits Purify: the set had no green, and green is the colour a
monastery garden and its cypresses give. (In Russian custom green is also
the colour worn on the days of monastic saints. That is background for the
choice, not copy for readers.) One thing to weigh, in section 7: a reader
wearing Monastery today would wake to green where there was blue.
Chips swatch: page `#0a100d`, ink `#b7d1c1`.

```css
html[data-reading-mode="monastery"] {
 --color-night: #0a100d;
 --color-night-soft: #141c17;
 --color-night-deep: #060a08;
 --color-paper: #e6e8df;
 --color-gold: #b7d1c1;
 --color-gold-soft: #8fab9b;
 --color-gold-pale: #dcebe2;
 --color-festal: #b7d1c1;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #18221c 0%, #111813 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #1e2a23 0%, #141c17 100%);
 --room:
  var(--room-grain),
  radial-gradient(ellipse 92% 60% at 6% 10%, rgb(96 168 128 / 0.15), rgb(96 168 128 / 0.055) 52%, rgb(96 168 128 / 0) 78%),
  radial-gradient(ellipse 110% 80% at 104% 100%, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0) 72%);
}

html[data-reading-mode="monastery"][dir="rtl"] {
 --room:
  var(--room-grain),
  radial-gradient(ellipse 92% 60% at 94% 10%, rgb(96 168 128 / 0.15), rgb(96 168 128 / 0.055) 52%, rgb(96 168 128 / 0) 78%),
  radial-gradient(ellipse 110% 80% at -4% 100%, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0) 72%);
}

html[data-reading-mode="monastery"] .lit-surface {
 --lit-muted: rgb(230 232 223 / 0.6);
 --lit-line: rgb(230 232 223 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="monastery"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 63%, transparent);
 }
 :where(html[data-reading-mode="monastery"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 63%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="monastery"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 63%, transparent);
 }
}
```

### Incense (Plus)

Evening smoke. A violet-grey ground with two soft drifts of haze, one high
and one lower to the side, as smoke hangs in a church after the censing. The
accent is a pale wisteria. It is kept grey on purpose: a muted, smoky violet
and not the bright purple-to-blue wash that marks a machine-made design.

Why it suits Purify: it gives the set its purple, the colour widely worn in
Great Lent, without naming a season, so it can be worn all year. If palettes
ever follow the Church's year (section 7), this is the one for the Fast.
Chips swatch: page `#0d0a13`, ink `#dccff0`.

```css
html[data-reading-mode="incense"] {
 --color-night: #0d0a13;
 --color-night-soft: #1a1523;
 --color-night-deep: #070509;
 --color-paper: #ece6f0;
 --color-gold: #dccff0;
 --color-gold-soft: #b5a4d0;
 --color-gold-pale: #eee6f8;
 --color-festal: #cfbdea;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #201a2b 0%, #16111e 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #282036 0%, #1a1523 100%);
 --room:
  radial-gradient(ellipse 72% 32% at 42% 24%, rgb(150 128 196 / 0.2), rgb(150 128 196 / 0.07) 52%, rgb(150 128 196 / 0) 78%),
  radial-gradient(ellipse 60% 30% at 68% 56%, rgb(150 128 196 / 0.13), rgb(150 128 196 / 0) 74%),
  radial-gradient(130% 100% at 50% 40%, rgb(0 0 0 / 0) 58%, rgb(0 0 0 / 0.45) 100%);
}

html[data-reading-mode="incense"] .lit-surface {
 --lit-muted: rgb(236 230 240 / 0.6);
 --lit-line: rgb(236 230 240 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="incense"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
 :where(html[data-reading-mode="incense"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="incense"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
}
```

### Book of Hours (Plus), light

The look of the Church's printed service books: black words on ivory, and
red for the rubrics. The line under a book's name ("Chapter 1") and the
short rule beneath it are red. The feast marks and the feast names on the
calendar are red. The commentary numbers are red already. Everything a
reader reads stays black. The paper is a shade whiter than Light's, with a
fine grain and a soft shade toward the edges of the page.

Why it suits Purify: it is the one light design a Plus reader gets for
daylight, and it is unmistakably the Church's own typography. Light stays
free and is not changed. Chips swatch: page `#f5efe2`, ink `#a3261c`.

```css
html[data-reading-mode="hours"] {
 --color-night: #f5efe2;
 --color-night-soft: #ebe3d2;
 --color-night-deep: #e9e0cc;
 --color-paper: #1c1713;
 --color-gold: #2a2622;
 --color-gold-soft: #4a443d;
 --color-gold-pale: #1c1713;
 --color-festal: #a3261c;
 --ink-rubric: 163 38 28;
 color-scheme: light;
 --room:
  var(--room-grain),
  radial-gradient(130% 100% at 50% 38%, rgb(70 52 20 / 0) 58%, rgb(70 52 20 / 0.13) 100%);
}

/* The rubrics: the line under a book's name and the rule beneath it are red,
   as a service book prints them. The words themselves stay black. */
html[data-reading-mode="hours"] .page-open-sub {
 color: rgb(var(--ink-rubric));
}
html[data-reading-mode="hours"] .page-open-rule {
 background-color: rgb(var(--ink-rubric) / 0.7);
}

html[data-reading-mode="hours"] .lit-surface {
 --lit-feast: #18181b;
 --lit-on-feast: #cfcfd3;
 --lit-fast: #f0e9ff;
 --lit-on-fast: #1c1713;
 --lit-fast-accent: #4a2e80;
 --lit-fast-border: rgb(74 46 128 / 0.75);
 --lit-muted: rgb(28 23 19 / 0.7);
 --lit-line: rgb(28 23 19 / 0.55);
}

@layer utilities {
 :where(html[data-reading-mode="hours"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 72%, transparent);
 }
 :where(html[data-reading-mode="hours"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 72%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="hours"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 72%, transparent);
 }
}
```

### Island chapel (Plus), light

Whitewash and sea blue. A cool white page with a wash of morning sky across
its top, deep navy ink, and the blue of a chapel's dome as the accent: the
buttons, the active tab, the feast marks. The rubric stays red, as on Light.

Why it suits Purify: it is the cool counterpart to the warm paper of Light
and Book of Hours, for readers who find cream too yellow, and the picture is
one most people already carry of the Greek islands' chapels.
Chips swatch: page `#f3f4f1`, ink `#1d4a86`.

```css
html[data-reading-mode="chapel"] {
 --color-night: #f3f4f1;
 --color-night-soft: #e6e9e8;
 --color-night-deep: #e3e7e7;
 --color-paper: #152033;
 --color-gold: #1d4a86;
 --color-gold-soft: #3a5f93;
 --color-gold-pale: #16376a;
 --color-festal: #1d4a86;
 --ink-rubric: 150 40 32;
 color-scheme: light;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.7) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #fbfcfb 0%, #f2f4f3 60%, #eaedec 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.6) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #e4e9ec 0%, #dce2e6 60%, #d4dbe0 100%);
 --room:
  var(--room-grain),
  radial-gradient(130% 46% at 50% -6%, rgb(46 104 178 / 0.16), rgb(46 104 178 / 0) 72%);
}

html[data-reading-mode="chapel"] .lit-surface {
 --lit-feast: #18181b;
 --lit-on-feast: #cfcfd3;
 --lit-fast: #f0e9ff;
 --lit-on-fast: #152033;
 --lit-fast-accent: #4a2e80;
 --lit-fast-border: rgb(74 46 128 / 0.75);
 --lit-muted: rgb(21 32 51 / 0.7);
 --lit-line: rgb(21 32 51 / 0.55);
}

@layer utilities {
 :where(html[data-reading-mode="chapel"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 72%, transparent);
 }
 :where(html[data-reading-mode="chapel"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 72%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="chapel"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 72%, transparent);
 }
}
```

### Councils (earned), a new look

Deep blue under a dome. Today's is navy with cream ink and little else. The
proposal keeps the navy, the ivory ink and the silver accent (no gold), and
adds what the place would have: a pool of blue light from above, as under
the dome of a great church, with the page deepening toward its foot. The
cards take the same blue.

```css
html[data-reading-mode="councils"] {
 --color-night: #080d1c;
 --color-night-soft: #121a30;
 --color-night-deep: #050814;
 --color-paper: #f0e9d9;
 --color-gold: #eceef2;
 --color-gold-soft: #c3c9d6;
 --color-gold-pale: #f6f7fa;
 --color-festal: #eceef2;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #172038 0%, #0f162a 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #1d2844 0%, #131b32 100%);
 --room:
  radial-gradient(ellipse 88% 46% at 50% 8%, rgb(86 118 214 / 0.2), rgb(86 118 214 / 0.07) 50%, rgb(86 118 214 / 0) 76%),
  linear-gradient(180deg, rgb(0 0 0 / 0) 45%, rgb(0 0 0 / 0.35) 100%);
}

html[data-reading-mode="councils"] .lit-surface {
 --lit-muted: rgb(240 233 217 / 0.6);
 --lit-line: rgb(240 233 217 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="councils"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 64%, transparent);
 }
 :where(html[data-reading-mode="councils"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 64%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="councils"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 64%, transparent);
 }
}
```

### Cappadocian (earned), a new look

Rock at dusk. Its line already says "warm dusk, cream and rubric red"; the
page did not show it. The proposal gives it the earth of the rock churches:
a brown-black ground, the last clay light low on the page, cream ink, and
the rubric red for feast marks and names. The commentary numbers are lifted
a shade, as on Vigil lamp. It was moved toward brown on purpose, so it and
Vigil lamp are not two reds.

```css
html[data-reading-mode="cappadocian"] {
 --color-night: #14100d;
 --color-night-soft: #221b17;
 --color-night-deep: #0c0907;
 --color-paper: #f2e7d6;
 --color-gold: #f0e4dc;
 --color-gold-soft: #cdb3a6;
 --color-gold-pale: #f8efe8;
 --color-festal: #e86a56;
 --ink-rubric: 232 106 86;
 --color-comment: #ff8a7e;
 --color-comment-hover: #ffa398;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #28201b 0%, #1d1713 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #312721 0%, #221b17 100%);
 --room:
  radial-gradient(ellipse 130% 46% at 50% 82%, rgb(190 96 70 / 0.2), rgb(190 96 70 / 0.07) 55%, rgb(190 96 70 / 0) 80%),
  linear-gradient(180deg, rgb(0 0 0 / 0.35) 0%, rgb(0 0 0 / 0) 46%);
}

html[data-reading-mode="cappadocian"] .lit-surface {
 --lit-muted: rgb(242 231 214 / 0.6);
 --lit-line: rgb(242 231 214 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="cappadocian"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 64%, transparent);
 }
 :where(html[data-reading-mode="cappadocian"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 64%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="cappadocian"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 64%, transparent);
 }
}
```

## 4. The shared CSS and the three pictures

Said once for every palette above. The lists name the palettes that have a
room and the palettes that re-ink their cards.

```css
/* The three pictures a room may use, each named once. The grain is the
   calendar's own (.menaion-surface) with its colour taken out. The small
   stars and the star over the horizon are the Nativity card's
   (components/today/NativityStarCard.tsx, lib/reading/nativityStar.ts). */
:root {
 --room-grain: url("data:image/svg+xml,<the grain, below>");
 --sky-stars: url("data:image/svg+xml,<the small stars, below>");
 --sky-horizon: url("data:image/svg+xml,<the star over the horizon, below>");
}

/* A palette with a room: one still layer under the page. Nothing in it
   moves and nothing is blended, so it costs one paint. The html element
   paints the page colour, so the body steps aside for the layer. The first
   layer brings the foot back to the plain page colour, so the app's own
   fades under its bars meet the room with no seam. */
html[data-reading-mode="nightsky"] body,
html[data-reading-mode="candlelight"] body,
html[data-reading-mode="lampada"] body,
html[data-reading-mode="monastery"] body,
html[data-reading-mode="incense"] body,
html[data-reading-mode="hours"] body,
html[data-reading-mode="chapel"] body,
html[data-reading-mode="councils"] body,
html[data-reading-mode="cappadocian"] body {
 background-color: transparent;
}
html[data-reading-mode="nightsky"] body::before,
html[data-reading-mode="candlelight"] body::before,
html[data-reading-mode="lampada"] body::before,
html[data-reading-mode="monastery"] body::before,
html[data-reading-mode="incense"] body::before,
html[data-reading-mode="hours"] body::before,
html[data-reading-mode="chapel"] body::before,
html[data-reading-mode="councils"] body::before,
html[data-reading-mode="cappadocian"] body::before {
 content: "";
 position: fixed;
 inset: 0;
 z-index: -1;
 pointer-events: none;
 background: linear-gradient(180deg, transparent 76%, var(--color-night) 89%), var(--room);
}

/* The cards and bands the app draws with a literal (the lm-* classes, as
   True black and Light re-ink them): each palette's own. */
html[data-reading-mode="nightsky"] .lm-card,
html[data-reading-mode="candlelight"] .lm-card,
html[data-reading-mode="lampada"] .lm-card,
html[data-reading-mode="monastery"] .lm-card,
html[data-reading-mode="incense"] .lm-card,
html[data-reading-mode="chapel"] .lm-card,
html[data-reading-mode="councils"] .lm-card,
html[data-reading-mode="cappadocian"] .lm-card,
html[data-reading-mode="nightsky"] .lm-violet,
html[data-reading-mode="candlelight"] .lm-violet,
html[data-reading-mode="lampada"] .lm-violet,
html[data-reading-mode="monastery"] .lm-violet,
html[data-reading-mode="incense"] .lm-violet,
html[data-reading-mode="chapel"] .lm-violet,
html[data-reading-mode="councils"] .lm-violet,
html[data-reading-mode="cappadocian"] .lm-violet,
html[data-reading-mode="nightsky"] .lm-gold,
html[data-reading-mode="candlelight"] .lm-gold,
html[data-reading-mode="lampada"] .lm-gold,
html[data-reading-mode="monastery"] .lm-gold,
html[data-reading-mode="incense"] .lm-gold,
html[data-reading-mode="chapel"] .lm-gold,
html[data-reading-mode="councils"] .lm-gold,
html[data-reading-mode="cappadocian"] .lm-gold {
 background: var(--surface-card) !important;
}
html[data-reading-mode="nightsky"] .lm-feature,
html[data-reading-mode="candlelight"] .lm-feature,
html[data-reading-mode="lampada"] .lm-feature,
html[data-reading-mode="monastery"] .lm-feature,
html[data-reading-mode="incense"] .lm-feature,
html[data-reading-mode="chapel"] .lm-feature,
html[data-reading-mode="councils"] .lm-feature,
html[data-reading-mode="cappadocian"] .lm-feature,
html[data-reading-mode="nightsky"] .lm-avatar,
html[data-reading-mode="candlelight"] .lm-avatar,
html[data-reading-mode="lampada"] .lm-avatar,
html[data-reading-mode="monastery"] .lm-avatar,
html[data-reading-mode="incense"] .lm-avatar,
html[data-reading-mode="chapel"] .lm-avatar,
html[data-reading-mode="councils"] .lm-avatar,
html[data-reading-mode="cappadocian"] .lm-avatar {
 background: var(--surface-band) !important;
}
html[data-reading-mode="nightsky"] .lm-hero,
html[data-reading-mode="candlelight"] .lm-hero,
html[data-reading-mode="lampada"] .lm-hero,
html[data-reading-mode="monastery"] .lm-hero,
html[data-reading-mode="incense"] .lm-hero,
html[data-reading-mode="chapel"] .lm-hero,
html[data-reading-mode="councils"] .lm-hero,
html[data-reading-mode="cappadocian"] .lm-hero {
 background: transparent !important;
}
```

**The grain** is the calendar's own noise (`.menaion-surface`) with its
colour taken out, at 6 percent:

```html
<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='220' height='220' filter='url(#n)' opacity='0.06'/></svg>
```

**The star over the horizon** is the Nativity card's own drawing: its two
star paths, its halo, and its lit edge, brightest under the star. In Arabic
it is turned, as the card is.

```html
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 64'>
<defs>
<linearGradient id='e' x1='0' x2='300' y1='0' y2='0' gradientUnits='userSpaceOnUse'>
<stop offset='0' stop-color='#fff' stop-opacity='0.10'/><stop offset='0.72' stop-color='#fff' stop-opacity='0.95'/><stop offset='1' stop-color='#fff' stop-opacity='0.18'/>
</linearGradient>
<radialGradient id='h'><stop offset='0' stop-color='#fff' stop-opacity='0.5'/><stop offset='0.35' stop-color='#fff' stop-opacity='0.15'/><stop offset='0.7' stop-color='#fff' stop-opacity='0'/></radialGradient>
<radialGradient id='d'><stop offset='0' stop-color='#fff' stop-opacity='0.16'/><stop offset='0.6' stop-color='#fff' stop-opacity='0.05'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></radialGradient>
</defs>
<ellipse cx='210' cy='50' rx='86' ry='13' fill='url(#d)'/>
<path d='M0 54 Q 150 38 300 54' fill='none' stroke='url(#e)' stroke-width='1.1'/>
<circle cx='216' cy='24' r='24' fill='url(#h)'/>
<g transform='translate(207 15) scale(0.75)'>
<path d='M12 1.5 L13.3 10.7 L22.5 12 L13.3 13.3 L12 22.5 L10.7 13.3 L1.5 12 L10.7 10.7 Z' fill='#fff'/>
<path d='M12 6.5 L12.8 11.2 L17.5 12 L12.8 12.8 L12 17.5 L11.2 12.8 L6.5 12 L11.2 11.2 Z' fill='#fff' opacity='0.8' transform='rotate(45 12 12)'/>
</g>
</svg>
```

**The small stars** are placed by the card's arithmetic (each star's place,
size and brightness from its number alone), carried over a whole screen and
thinned toward the foot. This prints the picture, 110 points, the same every
time:

```js
function stars() {
  const W = 400, H = 900;
  const out = [];
  for (let i = 0; i < 110; i++) {
    const x = ((i * 71 + (i % 7) * 13) % (W - 12)) + 6;
    // Squared, so most stand in the upper sky.
    const t = ((i * 37 + (i % 5) * 29) % 100) / 100;
    const y = 8 + t * t * (H - 120) * 0.92 + (i % 3) * 7;
    const r = i % 11 === 0 ? 1.2 : i % 4 === 0 ? 0.9 : 0.65;
    const o = (0.2 + (i % 5) * 0.085) * (1 - 0.45 * (y / H));
    out.push(`<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${r}' fill='#fff' opacity='${o.toFixed(2)}'/>`);
  }
  return (`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMin slice'>${out.join("")}</svg>`);
}
```

No star moves. If he wants them to twinkle as the card's do, that is two
layers and an opacity change, and it is a separate decision.

## 5. How the stills were made, and what was measured

**Made from the app, not drawn.** `npm run build:android` on `028a02d2`,
with the placeholder settings and the shop stub that
`scripts/promo/README.md` gives for a machine with no `.env.local` (the
stub was put back before anything was committed). The export is opened the
way the phones open it (`scripts/lib/shell-server.mjs`), at 390 by 844,
motion off. Each screen is the app's own: its components, its words, its
icons, the day's real saint and verse. A proposed palette is worn by adding
the CSS above and setting `data-reading-mode`; nothing else is touched.
Candlelight is opened as the app opens it, so the lit line is the app's own
code. The two light proposals ride on Light (the attribute stays
`parchment`, with the proposal's tokens over it), because Light's rules are
written for that one id today; section 6 says what that means for a build.

Two things in a still are not in the CSS above and belong to the build: the
page's root lets the room through (today each page paints the page colour
itself, over the body), and a light palette inherits Light's rules. One
thing in the CSS above is not in a still: each block's `.lit-surface`
lines were written after the pictures were taken. Neither screen has such a
surface, so the pictures are as they would be.

**Held to `scripts/mock-check.mjs`.** Each still was checked on the whole
screen, on the five palettes the app has and on the proposed one. Run that
way the checker finds things in the app's own two screens that are there on
every palette, Dark included (section 8). So each proposal was read against
the app as it is: what it must not do is fail a word of its own, or add
anything.

**And to the pixels.** The checker measures a word against the colours of
the boxes it sits in, which cannot see a pool of light or a star. So each
still was also taken twice, with its words and without, and every word's
colour was held to what is really drawn behind it: the lightest hundredth of
its own box, less the outermost one percent (a star is a point or two,
thinner than a letter's stroke). Words under a bar, and words the app itself
is fading out at the foot of the screen, are left out, as they are not on
the screen.

| Palette | Words short on the palette (checker) | Added to the app's own findings | Words measured by pixel | Lowest | Under 4.5:1 |
|---|---|---|---|---|---|
| Night sky | 0 | 0 | 79 | 5.10:1 | 0 |
| Candlelight | 0 | 0 | 89 | 4.66:1 | 0 |
| Vigil lamp | 0 | 0 | 89 | 5.08:1 | 0 |
| Monastery | 0 | 0 | 89 | 4.86:1 | 0 |
| Incense | 0 | 0 | 89 | 4.98:1 | 0 |
| Book of Hours | 0 | 0 | 89 | 5.51:1 | 0 |
| Island chapel | 0 | 0 | 89 | 5.57:1 | 0 |
| Councils | 0 | 0 | 89 | 5.03:1 | 0 |
| Cappadocian | 0 | 0 | 89 | 4.97:1 | 0 |

Every word on every proposed palette holds 4.5:1 (3:1 for large text) by
both measures, on both screens. None adds a finding. No gold, no ray, no
stripe, no em dash, no glyph standing in for an icon.

One line of the checker's output needs a word. On Candlelight's Bible screen
it reports verse numbers under the line on Dark and on Light (4.48:1 down to
4.15:1). That is the checker trying those palettes' colours while the reader
is still in Candlelight's stepped-back state, which never happens in the
app. On Candlelight itself every word holds: the lowest is
4.66:1 by pixel.

**The arithmetic the unit tests will ask for.** For each palette: ink on the
page and on a card at 7:1 or more; the accent, the feast mark and the rubric
at 4.5:1 or more on both; the red commentary number, the link and the status
colours at 4.5:1 or more on the page, on a card and on the room's lightest
point; all eighteen `.lit-surface` pairs of `litPalette.test.ts`, with the
lines each block gives them; and the faint share. All hold. The faint shares are set a few points above the least that
passes, so a card's lit corner and the Verse card's own glow are covered:

| Palette | Least share that holds | Drawn at |
|---|---|---|
| Night sky | 50% | 60% |
| Candlelight | 54% | 66% |
| Vigil lamp | 53% | 62% |
| Monastery | 53% | 63% |
| Incense | 53% | 62% |
| Book of Hours | 64% | 72% |
| Island chapel | 65% | 72% |
| Councils | 52% | 64% |
| Cappadocian | 53% | 64% |

On these palettes the 40 percent share is lifted with the rest. On today's
palettes it is left at 40 (kept for marks that are decorative or disabled),
and two things on Today that are neither wear it (section 8).

## 6. What building them would take

Not started. In the order I would do it:

1. **The page lets a room through.** A room sits under the page, and today
   each page's root paints the page colour over it (57 page and layout
   files carry the `bg-night` class; the html element already paints the
   same colour). Either those roots drop the class or they take one name a room
   can clear. Sticky bars and fades keep theirs. This is the one change to
   components, it is the same for every palette, and the export walk should
   cover it on each.
2. **The dark palettes.** For each: its block and its lines in the shared
   block; its id in `lib/reader/readingModes.ts`, in
   `lib/reader/prepaint.ts`, in the chips' swatches and in the Settings
   pages (`.set-mode-page[data-palette]`); its `.lit-surface` lines; its
   place in the lists of `litPalette.test.ts`, `faintText.test.ts` and
   `scripts/mock-check.mjs`. Candlelight and Monastery keep their ids, so
   nothing moves for a reader who wears them but the look.
3. **The two light palettes cost more.** 207 lines of
   `app/globals.css` name `parchment`, and so does
   `components/reading/room.module.css`: everything that makes Light work.
   A second light palette needs those rules to answer a light palette and
   not that one id (one attribute beside the mode, set by the controller and
   the pre-paint script). Book of Hours can then use Light's warm surfaces
   as they are. Island chapel needs its own cool ones, of which the two this
   note's screens show are written; the rest (Settings, the shop, Community)
   would be found by the light audit the 38 pages had on 2026-09-25.
4. **The picker.** Settings shows the palettes as small pages side by side,
   five in a row, with the two earned ones under them as goals (since
   `82b2b7e0`). Ten will not fit a row. It needs a form of its own: my
   suggestion is rows with their own headings, the free three, then the Plus
   seven, then the earned two as now, each still a small page of John 1 in
   its palette. Not pills.
5. **Words.** Five new names and seven one-liners (two of them changed), in
   21 languages. The earned two have their names and lines in every language
   since `82b2b7e0`; Councils' line still reads "Deep navy and gold", and
   the palette has had no gold since 1.8, so that line wants changing
   whatever is picked here. The paywall's row names two palettes
   (`plus.palettes.title`, `plus.palettes.body`) and its Try it shows two;
   both would say and show seven.
6. **Small things.** The Android status bar is night-coloured on every
   palette but True black (`components/native/NativeBridge.tsx`); on the
   light palettes it would follow Light's choice, and on the dark ones it
   could take each palette's own page colour. A unit test to hold every
   room under its line (the arithmetic of section 5), so a later nudge to a
   pool of light cannot push a word under 4.5:1.
7. **On a phone.** A fixed layer under a scrolling page is cheap, but it
   should be walked on a slow Android before it ships, since this
   stylesheet has been burned by fixed layers before (its own note on
   `.menaion-surface`).

## 7. For Edgar to decide

1. **Which of the seven.** My recommendation: all seven. If fewer, Island
   chapel goes first: it costs the most to build and is the least
   particular to the Church.
2. **The names.** Night sky (his "Galaxy Stars"), Vigil lamp, Incense, Book
   of Hours, Island chapel. Plain words; each can change.
3. **Monastery from blue to green.** A reader wearing it today would open
   the app to a different colour. Recommendation: yes, and say so in the
   release's note. Readers who liked the blue have Night sky, and Councils
   once earned.
4. **The star at the head of a chapter** on Night sky. It is the only place
   a palette changes what a heading shows. Recommendation: yes; it is the
   ads' own picture and it is never behind words.
5. **The 40 percent share lifted** on the new palettes, so every word on
   them holds 4.5:1. Recommendation: yes, and lift it on the old palettes
   too (section 8).
6. **Palettes by the Church's year** (the sheet's 49, "the themes in itself
   will need a very specific type of talk"). These seven would serve it:
   Night sky from the Nativity Fast to Theophany, Incense in Great Lent,
   Book of Hours at Pascha, Monastery at Pentecost, Island chapel for the
   feasts of the Mother of God. Recommendation: not in this build. First
   the palettes; then one switch, off by default, if he wants it.
7. **The two earned looks.** Whether Councils and Cappadocian are right as
   drawn, apart from how they are earned.

## 8. Seen on the way: the app's own, on any palette

Found by running the checker on the two whole screens as they are. None of
it comes from a palette, and none of it is changed here. For Updates, if he
wants them looked at:

- **Today, two faint lines under 4.5:1 on every palette.** The week's day
  letters under the streak (M T W T F S S) and the translation's name after
  the Verse of the Day's reference (", King James Version") are
  `text-paper/40`: 3.8:1 on Dark and on True black, 2.3:1 on Light, 2.9:1
  on today's Candlelight, 3.3:1 on today's Monastery. The 40 percent share
  was left out of the faint-text fix as decorative or disabled; these two
  are neither.
- **The Bible, small targets.** The checker reads the 44 "Open commentary on
  verse N" buttons of John 1 as about 14 by 5 pixels, the chapter links
  "Previous: Luke 24" and "Next: John 2" as 42.5, and the links to the
  neighbouring books as 41 by 19. On Today, "See all" is 51 by 19. Some may
  reach 44 another way than the class the checker knows (`hit-44`).
- **The Bible, a colour typed in.** The commentary dot is the same red on
  Dark and on Light. That is his pick (the marks stay red), so it wants an
  allowance in the checker, not a change.
- **Today, 48 one-pixel marks that do not mirror in Arabic** (`<i>`
  elements placed from the left).

---

# The third set: 18 Plus themes in four families, and the picker

Proposals only, 2026-11-10, later the same day. Nothing here is in the app.

What happened between the first set and this one, in his words as the
arbiter passed them on and as `docs/1.9-build/BRAINSTORM.md` records them:

- After the first set: "can we do a new set of designs?", and "ok to all" to
  a brand new set of Plus themes that keeps Night sky.
- Then: "make a lot more designs I want this expanded in v1.9 and a nice
  scrollable theme system in the settings when picking a theme".
- Then, on all of it: "I want clean and unique".

So of sections 1 to 8 above, **only Night sky goes forward**, as it is. The
other six Plus palettes of section 3 and the two new looks for the earned
palettes stay here as the record and are not proposed any more. A second set
of six, his own quote-picture looks carried to the whole app, was being drawn
when the brief widened; those six are in this set and were never sent alone.

**The pictures:** https://claude.ai/artifact/ALDy4Fz1XPGyHfQ7vcVZwD (his private page). The free three, then the
18 Plus themes by family, each on the Bible at John 1 and on Today, then
the picker in five stills, then the questions of section 16. Taken from the
native export of `86969792` at 390 wide.

Contents of this part:

9. The set, and what a theme is now
10. The families and their themes
11. Every colour
12. The CSS: what is shared, one theme whole, and each theme's own rules
13. The pictures: the drawings' code and the painted ones' code
14. The picker
15. How the stills were made, and what was measured
16. For Edgar to decide
17. What building it would take
18. Tried and dropped on the way

## 9. The set, and what a theme is now

The first set failed in one way: six of its seven were the same page in
another colour with a faint light on it. This set starts from the one he
kept. Night sky is a picture you could name with your eyes shut (stars), so
every theme here is one too, and "clean and unique" is held as two rules:

- **Clean.** A theme is one calm page and one sign. The sign is a still
  picture at the foot of the screen, or the rule at the head of a page. There
  is no grain, no texture laid over the page, no glow for its own sake, and
  nothing moves. Where bold and clean pulled apart, clean won: the embers of
  Fire stop half way up the page, the flowers stand only in the two corners
  of the foot, and the ideas that were busier were dropped (section 18).
- **Unique.** No two signs are the same kind of thing: stars, a sunrise,
  flames, smoke, a peak, firs, dunes, rings on water, a far shore, a sea
  behind a wall, a bloom, three different plants, tesserae, a wall, a weave,
  stitches. The colours follow the sign, not the other way round, so no two
  could be taken for each other and none is a recolour of another.

Six of the seventeen new ones are the looks he already picked for the quote
pictures on 2026-10-30 ("dark, light, pink ... flowers, freaking fire ... the
space one"): Fire, Dawn, Blush, Roses, Lavender and Olive, each painted by the
same code that paints the quote picture, so a reader's theme and the picture
they share are the same thing. Their names are already in the catalogs in 21
languages (`picture.look.*`).

18, not 20. I stopped where the next idea would have been one of these
in another colour.

## 10. The families and their themes

Four families, with names a reader feels, so a catalog this size reads as a
shelf and not a pile:

- **Night.** The hours of the dark, and what lights them.
- **Land and sea.** The places the Church has prayed in.
- **Garden.** Paper and flowers.
- **Sanctuary.** What the hands of the Church have made.

| Theme | Family | | Its sign | Where the picture comes from | Lowest contrast measured |
|---|---|---|---|---|---|
| Night sky | Night | dark | Small stars, and the star over the horizon at a chapter's head | kept from the first set (section 3) | 5.10:1 |
| Dawn | Night | dark | The sunrise at the foot of the page | painted by the app's quote-picture code | 5.06:1 |
| Fire | Night | dark | The fire at the foot of the page | painted by the app's quote-picture code | 5.45:1 |
| Incense | Night | dark | One plume of smoke rising from the foot of the page | an SVG drawing, 1.6 KB | 4.77:1 |
| Holy Mountain | Land and sea | dark | The mountain at the foot of the page | an SVG drawing, 1.5 KB | 4.78:1 |
| Forest | Land and sea | dark | A line of firs at the foot of the page | an SVG drawing, 10.0 KB | 4.84:1 |
| Desert | Land and sea | light | Three dunes at the foot of the page | an SVG drawing, 1.2 KB | 5.92:1 |
| Jordan | Land and sea | light | Rings on the water at the foot of the page | an SVG drawing, 1.1 KB | 5.56:1 |
| Galilee | Land and sea | dark | The far hills and the light on the water at the foot of the page | an SVG drawing, 1.4 KB | 4.68:1 |
| Patmos | Land and sea | light | The sea at the foot of the page | an SVG drawing, 1.0 KB | 6.09:1 |
| Blush | Garden | light | A soft bloom of rose in the paper | painted by the app's quote-picture code | 5.31:1 |
| Roses | Garden | light | Roses at the chapter's head and the foot's corners | painted by the app's quote-picture code | 5.46:1 |
| Lavender | Garden | light | Lavender at the chapter's head and the foot's corners | painted by the app's quote-picture code | 5.26:1 |
| Olive | Garden | light | An olive branch at the chapter's head and the foot's corners | painted by the app's quote-picture code | 5.29:1 |
| Mosaic | Sanctuary | dark | Tesserae at the foot of the page and in the chapter's rule | an SVG drawing, 23.0 KB | 4.69:1 |
| Stone | Sanctuary | light | A wall's blocks at the foot of the page | an SVG drawing, 5.1 KB | 5.69:1 |
| Damask | Sanctuary | dark | A woven ground of rings at the foot of the page | an SVG drawing, 1.0 KB | 5.16:1 |
| Linen | Sanctuary | light | A line of cross stitch under every page's head | two small SVG rules | 5.89:1 |

9 of the new ones are light and 8 are dark. With Night sky that is 9 dark and 9 light.

Where the sign stands:

- **At the foot of every screen** (sixteen of the new seventeen). The picture
  is held to the foot of the screen under the page, and the page's last lines
  go quiet into it a little above the tab bar, the way they already go quiet
  under the Bible's dock. In the Bible the dock stands in the picture; on
  Today the tab bar does.
- **At a chapter's head** as well, in the place of the short rule, on six:
  Fire (one ember), the three plants (their plates), Mosaic (a row of
  tesserae) and Linen (a stitched diamond). It scrolls away with the heading,
  so no word ever lies over it.
- **Linen alone has no picture at the foot.** Its sign is its rule: the
  hairline under every page's bar becomes a row of cross stitches.

## 11. Every colour

The tokens each theme sets, as in section 3. `rubric` is `--ink-rubric`.
`faint` is the share its faint text is drawn at (the shape of the
stylesheet's own "Faint text on every palette"). `foot` is where the foot
is fully the picture and where it is fully the page, in px from the foot of
the screen.

| id | night | night-soft | night-deep | paper | gold | gold-soft | gold-pale | festal | rubric | faint % | foot |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `dawn` | #080a1e | #151938 | #05061a | #f2eff8 | #f7f3fc | #cbc2df | #fcfaff | #f6c5cc | 244 170 180 | 62 | 104 / 240 |
| `fire` | #040301 | #1a110c | #000000 | #fff1e4 | #fff6ea | #dcc3b2 | #fffaf3 | #ffd9c2 | 255 150 120 | 60 | 104 / 240 |
| `incense` | #17141d | #221e2a | #0f0d14 | #f1eef7 | #f8f5fd | #c4bcd8 | #fdfcff | #e3d9f7 | 255 160 150 | 62 | 104 / 240 |
| `athos` | #0e1420 | #182031 | #090d16 | #edf1f8 | #f6f8fd | #b8c3dc | #fcfdff | #d6e0f8 | 255 165 150 | 62 | 104 / 240 |
| `forest` | #0b1711 | #14231b | #060f0b | #edf5ef | #f5faf6 | #b4cbbd | #fbfefc | #cfe9d9 | 255 165 150 | 62 | 104 / 240 |
| `desert` | #efe2d9 | #ead9ce | #e2cdbf | #3a2119 | #6f2c16 | #864630 | #5e2410 | #6f2c16 | 150 40 32 | 80 | 104 / 240 |
| `jordan` | #e4efed | #d6e6e3 | #cbdfdc | #14323a | #13525a | #2a5a62 | #0e464f | #13525a | 150 40 32 | 78 | 104 / 240 |
| `galilee` | #06181d | #0c2228 | #031014 | #eaf6f6 | #f4fbfb | #a9cdd0 | #fbffff | #c5eef0 | 255 165 150 | 62 | 134 / 244 |
| `patmos` | #f7f7f5 | #ecedf0 | #e3e5ea | #18202e | #1c4aa6 | #2f4f8f | #153a85 | #1c4aa6 | 150 40 32 | 74 | 134 / 244 |
| `blush` | #efe8e8 | #f0d9dd | #ecd5d9 | #4c2836 | #842544 | #96385f | #6f1c3a | #842544 | 150 40 32 | 78 | 104 / 240 |
| `rose` | #eceae4 | #e8dfcf | #e5dccb | #3e262a | #91213e | #8a2a40 | #7a1c36 | #91213e | 150 40 32 | 76 | 104 / 240 |
| `lavender` | #e9e6eb | #e1d9ed | #dad0e8 | #302642 | #523982 | #5b4683 | #432e6e | #523982 | 150 40 32 | 76 | 104 / 240 |
| `olive` | #e7e6df | #dddcc9 | #d8d7c2 | #2c3220 | #3e4a1e | #48511f | #343d17 | #3e4a1e | 150 40 32 | 78 | 104 / 240 |
| `mosaic` | #0d1c40 | #182b58 | #08142f | #eef3fd | #f7f9ff | #b7c7ea | #fcfdff | #cfe0ff | 255 175 160 | 66 | 146 / 246 |
| `stone` | #e3e0d9 | #d8d4cb | #cfcbc1 | #25231f | #3a3833 | #55524a | #2a2824 | #3a3833 | 150 40 32 | 78 | 104 / 240 |
| `damask` | #240b14 | #351523 | #17060c | #f9eef1 | #fdf6f8 | #dcbcc6 | #fffafb | #f6cfd9 | 255 175 155 | 64 | 104 / 240 |
| `linen` | #f6f4ef | #ebe8e1 | #e3dfd6 | #1f1b1a | #a31c29 | #8f2a33 | #8c1522 | #a31c29 | 150 40 32 | 72 | none |

No token here is gold, yellow or amber by `lib/ui/goldTone.ts`. On a dark
theme the accent is the page's own light, a white a breath towards the
theme's colour. On a light theme it is a deep colour of the theme, dark
enough to hold 4.5:1 where the app draws it at 85 percent on a 3 percent box
("Continue reading").

What a theme sets beyond those:

- `incense`: `--color-comment: #ff8a7d`, `--color-comment-hover: #ffa89c`
- `athos`: `--color-comment: #ff8a7d`, `--color-comment-hover: #ffa89c`
- `forest`: `--color-comment: #ff8a7d`, `--color-comment-hover: #ffa89c`
- `desert`: `--color-comment: #a3202a`, `--color-comment-hover: #861824`
- `galilee`: `--color-comment: #ff8a7d`, `--color-comment-hover: #ffa89c`
- `blush`: `--color-comment: #a3202a`, `--color-comment-hover: #861824`, `--lit-muted at 0.74`, `--lit-line at 0.58`
- `rose`: `--color-comment: #a3202a`, `--color-comment-hover: #861824`
- `olive`: `--lit-muted at 0.74`, `--lit-line at 0.58`
- `mosaic`: `--color-comment: #ff8a7d`, `--color-comment-hover: #ffa89c`, `--color-streak: #ff7a70`, `--lit-fast-accent: #a996e6`, `--lit-fast-border: rgb(169 150 230 / 0.85)`
- `stone`: `--color-comment: #a3202a`, `--color-comment-hover: #861824`, `--color-streak: #a01f18`, `--color-sage-soft: #285a4a`
- `damask`: `--color-comment: #ff8a7d`, `--color-comment-hover: #ffa89c`

The lighter commentary red on six dark themes is there because their scenes
lie under the last lines of a page, and the app's red (`#f2594e`) does not
hold 4.5:1 on a peak or a line of firs. It is still red, a step lighter.

The cards and bands the app draws with a literal (the `lm-*` classes), as
two stops each of the same two gradients section 3 uses:

| id | card, from and to | band, from and to |
|---|---|---|
| `dawn` | #1a1f42 to #10142e | #21274f to #151938 |
| `fire` | #1f140e to #140c08 | #281a12 to #1a110c |
| `incense` | #2a2534 to #1c1924 | #322c3e to #24202d |
| `athos` | #1f283c to #141b2b | #273147 to #1a2233 |
| `forest` | #1b2d23 to #122019 | #22372b to #16261d |
| `desert` | #fbf5f0 to #f5e9e1 to #eedbd0 | #e9d5c8 to #e0c7b8 |
| `jordan` | #f8fcfb to #eef6f4 to #e2efec | #d9e9e6 to #cde1dd |
| `galilee` | #143037 to #0c2228 | #1a3a42 to #10292f |
| `patmos` | #ffffff to #f8f9fb to #eff1f5 | #e9ecf2 to #dfe3ec |
| `blush` | #fffafa to #fbeff1 to #f6e4e8 | #f3dde1 to #ecd0d6 |
| `rose` | #fdfaf4 to #f8f2e7 to #f2eadc | #ebe2d2 to #e3d8c5 |
| `lavender` | #fbf9fd to #f3eef8 to #ebe3f3 | #e1d8ee to #d8cde8 |
| `olive` | #fafaf3 to #f2f1e6 to #eae9d9 | #e0dfcc to #d6d5bf |
| `mosaic` | #1d3263 to #13244c | #243b70 to #182b58 |
| `stone` | #f4f2ee to #ebe9e3 to #e2dfd8 | #dbd8d0 to #d1cdc3 |
| `damask` | #3c1a29 to #2a101c | #462031 to #361624 |
| `linen` | #ffffff to #faf8f4 to #f1eee8 | #ebe7df to #e2ddd3 |

## 12. The CSS

### What is shared

Said once for every theme with a room. In the stylesheet each selector list
names every such theme; here the first and the last stand for the list.

```css
/* A room: one still picture under the page, held to the foot of the screen.
   The html element paints the page colour, so the body steps aside for it. */
html[data-reading-mode="dawn"] body,
/* ... one line for each theme with a room ... */
html[data-reading-mode="damask"] body {
 background-color: transparent;
}
html[data-reading-mode="dawn"] body::before,
/* ... */
html[data-reading-mode="damask"] body::before {
 content: "";
 position: fixed;
 inset: 0;
 z-index: -1;
 pointer-events: none;
 background: var(--room);
}

/* A foot: the same picture once more, over the page's last lines and under
   the bars, so the words go quiet into the scene the way they go quiet under
   the reader's dock today. It is measured from the foot of the screen, so it
   keeps its place under the bars on any phone, and it comes in by an eased
   share. The dock's own fade steps aside for it. */
html[data-reading-mode="dawn"] body::after,
/* ... */
html[data-reading-mode="damask"] body::after {
 --foot-rise: calc(var(--foot-clear) - var(--foot-solid));
 content: "";
 position: fixed;
 inset: 0;
 z-index: 35;
 pointer-events: none;
 background: var(--room);
 mask-image: linear-gradient(to top, #000 var(--foot-solid), rgb(0 0 0 / 0.56) calc(var(--foot-solid) + var(--foot-rise) * 0.25), rgb(0 0 0 / 0.25) calc(var(--foot-solid) + var(--foot-rise) * 0.5), rgb(0 0 0 / 0.06) calc(var(--foot-solid) + var(--foot-rise) * 0.75), transparent var(--foot-clear));
}
html[data-reading-mode="dawn"] .pill-fade,
/* ... */
html[data-reading-mode="damask"] .pill-fade {
 background-image: none;
}

/* The cards and bands the app draws with a literal: each palette's own. */
html[data-reading-mode="dawn"] :is(.lm-card, .lm-violet, .lm-gold) {
 background: var(--surface-card) !important;
}
html[data-reading-mode="dawn"] :is(.lm-feature, .lm-avatar) {
 background: var(--surface-band) !important;
}
html[data-reading-mode="dawn"] .lm-hero {
 background: transparent !important;
}
```

The foot's numbers: the tab bar is 83px high on the phone the stills were
taken on, and the Bible's dock stands from 98 to 158px above the foot of the
screen. The app's own fade under that dock starts 272px above the foot. The
foot is all picture up to 104px, and gone by 240px. Three themes
whose picture has a hard line near the bar hold it a little higher: Galilee
and Patmos at 134 and 244, Mosaic at 146 and 246. In a build the two lengths
would add `env(safe-area-inset-bottom)`, and `-webkit-mask-image` goes
beside `mask-image`.

### One theme whole

Every theme's block has this shape. Its tokens are the table's; its
`.lit-surface` lines are the theme's ink at 60 and 40 percent (70 and 55
on a light theme, Light's inverted set with them); its faint text is drawn at
the table's share. A theme painted by the app's code has
`--room: var(--room-<id>) center bottom / cover no-repeat` in the place of
the drawing.

```css
html[data-reading-mode="athos"] {
 --color-night: #0e1420;
 --color-night-soft: #182031;
 --color-night-deep: #090d16;
 --color-paper: #edf1f8;
 --color-gold: #f6f8fd;
 --color-gold-soft: #b8c3dc;
 --color-gold-pale: #fcfdff;
 --color-festal: #d6e0f8;
 --ink-rubric: 255 165 150;
 --color-comment: #ff8a7d;
 --color-comment-hover: #ffa89c;
 --surface-card: radial-gradient(115% 90% at 88% 8%, rgb(255 255 255 / 0.05) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(155deg, #1f283c 0%, #141b2b 100%);
 --surface-band: radial-gradient(115% 90% at 88% 12%, rgb(255 255 255 / 0.06) 0%, rgb(255 255 255 / 0) 55%),
  linear-gradient(150deg, #273147 0%, #1a2233 100%);
 --room: var(--scene-athos) center bottom / 100% auto no-repeat, #0e1420;
 --foot-solid: 104px;
 --foot-clear: 240px;
}

html[data-reading-mode="athos"] .lit-surface {
 --lit-muted: rgb(237 241 248 / 0.6);
 --lit-line: rgb(237 241 248 / 0.4);
}

@layer utilities {
 :where(html[data-reading-mode="athos"]) :is(.text-paper\/40, .text-paper\/45, .text-paper\/50, .text-paper\/55, .text-paper\/60) {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
 :where(html[data-reading-mode="athos"]) .placeholder\:text-paper\/55::placeholder {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
}
@layer base {
 :where(html[data-reading-mode="athos"]) ::placeholder {
  color: color-mix(in oklab, var(--color-paper) 62%, transparent);
 }
}
```

A light theme also sets `color-scheme: light`, and draws its 65 and 70
percent text at the same floor as its faint text, since its ink is a colour
and not Light's near-black.

### Each theme's own rules

```css
/* The rule at a chapter's head is an ember: a hairline of the flame's own
   light with a soft glow round it. A pool, not a ray. */
html[data-reading-mode="fire"] .page-open-rule {
 width: 132px;
 background: linear-gradient(90deg, rgb(255 150 100 / 0), rgb(255 190 150 / 0.9) 50%, rgb(255 150 100 / 0));
 box-shadow: 0 0 16px 1px rgb(255 110 50 / 0.45);
}

/* The flower's plate at the head of a chapter, in the place of the short rule
   (docs/licensing/SHARE_FLOWERS.md), its white paper taken out. It leaves
   with the heading as the chapter scrolls, so no word lies over it. */
html[data-reading-mode="rose"] .page-open-rule {
 width: 100%;
 max-width: 348px;
 height: 132px;
 margin-top: 6px;
 background: var(--head-rose) center / contain no-repeat;
}

/* The flower's plate at the head of a chapter, in the place of the short rule
   (docs/licensing/SHARE_FLOWERS.md), its white paper taken out. It leaves
   with the heading as the chapter scrolls, so no word lies over it. */
html[data-reading-mode="lavender"] .page-open-rule {
 width: 100%;
 max-width: 348px;
 height: 132px;
 margin-top: 6px;
 background: var(--head-lavender) center / contain no-repeat;
}

/* The flower's plate at the head of a chapter, in the place of the short rule
   (docs/licensing/SHARE_FLOWERS.md), its white paper taken out. It leaves
   with the heading as the chapter scrolls, so no word lies over it. */
html[data-reading-mode="olive"] .page-open-rule {
 width: 100%;
 max-width: 348px;
 height: 132px;
 margin-top: 6px;
 background: var(--head-olive) center / contain no-repeat;
}

/* The rule at a chapter's head is a row of the same tesserae. */
html[data-reading-mode="mosaic"] .page-open-rule {
 width: 112px;
 height: 10px;
 background: var(--rule-mosaic) center / 112px 10px no-repeat;
}

/* Linen's sign is its rule. Under a page's bar the hairline is a row of cross
   stitches, and at a chapter's head the short rule is a stitched diamond. */
html[data-reading-mode="linen"] .tab-topbar {
 border-bottom-color: transparent;
}
html[data-reading-mode="linen"] .tab-topbar::after {
 content: "";
 position: absolute;
 inset-inline: 0;
 bottom: -4px;
 height: 7px;
 pointer-events: none;
 background: var(--rule-linen) center / 8px 7px repeat-x;
}
html[data-reading-mode="linen"] .page-open-rule {
 width: 168px;
 height: 52px;
 margin-top: 14px;
 background: var(--head-linen) center / 168px 52px no-repeat;
}
```

## 13. The pictures

### The drawings

Ten scenes and three rules, each an SVG written by this one file. Together
the ten scenes are 47 KB. A drawing is 390 wide, the width of the phone,
and is laid at the foot at the page's width (`100% auto`), so it scales
with the screen. Kept whole here, because it exists nowhere else:

```js
// The scenes of the third set, each one small still drawing held to the foot
// of the screen (or, for two, to a rule at a page's head). Every one is an
// SVG a few hundred bytes to a few kilobytes long: no photograph, no grain,
// nothing that moves. They are drawn 390 wide, the width of the phone the
// stills are taken at, and the CSS lays them at the foot at the page's width.
//
// A scene is text-safe by its colours where words can still lie over it (the
// dark ones are the page's own colour a few steps lighter or darker), and
// where it is not, it stands under the foot's cover (css3.mjs).

const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const n1 = (v) => Math.round(v * 10) / 10;
const svg = (w, h, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
export const uri = (s) => `url("data:image/svg+xml,${encodeURIComponent(s).replace(/%20/g, " ").replace(/%3D/g, "=").replace(/%3A/g, ":").replace(/%2F/g, "/").replace(/%2C/g, ",")}")`;
const vgrad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;

/** The Holy Mountain: Athos's peak over the sea at dusk, the water still. */
export function athos() {
  const H = 300;
  const defs =
    vgrad("sky", [[0, "#93a8de", 0], [0.55, "#93a8de", 0.05], [1, "#a9b6e2", 0.26]]) +
    vgrad("sea", [[0, "#1d2946"], [0.5, "#111a2e"], [1, "#0e1420"]]) +
    vgrad("mist", [[0, "#c9d6f5", 0], [0.7, "#c9d6f5", 0.13], [1, "#c9d6f5", 0.04]]);
  const body =
    `<rect width="390" height="189" fill="url(#sky)"/>` +
    // The long shoulder of the peninsula, then the peak.
    `<path d="M-10,189 L-10,173.7 C30,167.2 70,165.9 112,169.8 C150,173.7 178,169.8 205,154.2 C232,137.3 248,102.2 262,84 C268,77.5 273,78.8 278,86.6 C292,110 306,138.6 330,156.8 C352,172.4 376,177.6 400,180.2 L400,189 Z" fill="#2c3a5e"/>` +
    `<path d="M262,84 C268,77.5 273,78.8 278,86.6 C286,102.2 292,117.8 302,133.4 C290,123 280,112.6 270,107.4 C262,112.6 250,128.2 238,138.6 C248,120.4 254,99.6 262,84 Z" fill="#3a4a74" opacity="0.3"/>` +
    `<rect y="150" width="390" height="39" fill="url(#mist)"/>` +
    `<rect y="188" width="390" height="112" fill="url(#sea)"/>` +
    `<path d="M0,188.5 H390" stroke="#b9c8f0" stroke-opacity="0.3" stroke-width="1"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

function fir(x, base, h, w, r) {
  const n = Math.max(4, Math.round(h / 13));
  const left = [];
  const right = [];
  for (let i = 1; i <= n; i++) {
    const y = base - h + (h * i) / n;
    const hw = w * Math.pow(i / n, 0.9) * (0.88 + r() * 0.24);
    left.push([x - hw, y], [x - hw * 0.46, y - 1.2]);
    right.push([x + hw, y], [x + hw * 0.46, y - 1.2]);
  }
  let d = `M${n1(x)},${n1(base - h)}`;
  for (let i = 0; i < left.length - 1; i++) d += `L${n1(left[i][0])},${n1(left[i][1])}`;
  d += `L${n1(x - w * 0.12)},${n1(base)}L${n1(x - w * 0.12)},${n1(base + 40)}L${n1(x + w * 0.12)},${n1(base + 40)}L${n1(x + w * 0.12)},${n1(base)}`;
  for (let i = right.length - 2; i >= 0; i--) d += `L${n1(right[i][0])},${n1(right[i][1])}`;
  return d + "Z";
}

/** The forest of the north: two lines of firs, mist between them, the last light behind. */
export function forest() {
  const H = 300;
  const r = rng(41);
  const defs =
    vgrad("sky", [[0, "#8fd0b0", 0], [0.5, "#8fd0b0", 0.04], [1, "#a6dcc0", 0.2]]) +
    vgrad("mist", [[0, "#cfeadd", 0], [0.6, "#cfeadd", 0.1], [1, "#cfeadd", 0]]) +
    vgrad("floor", [[0, "#0a1510"], [1, "#070f0b"]]);
  let far = "";
  for (let x = -6; x < 400; x += 15 + r() * 13) far += fir(x, 176 + r() * 6, 34 + r() * 46, 8 + r() * 5, r);
  let near = "";
  for (let x = -14; x < 410; x += 30 + r() * 30) near += fir(x, 232 + r() * 8, 78 + r() * 74, 15 + r() * 8, r);
  const body =
    `<rect width="390" height="182" fill="url(#sky)"/>` +
    `<path d="${far}" fill="#1b3528"/>` +
    `<rect y="176" width="390" height="124" fill="#1b3528"/>` +
    `<rect y="140" width="390" height="70" fill="url(#mist)"/>` +
    `<path d="${near}" fill="#08120d"/>` +
    `<rect y="236" width="390" height="64" fill="url(#floor)"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The desert: three dunes, one behind another, each a step deeper, in the last light. */
export function desert() {
  const H = 270;
  const defs =
    vgrad("sky", [[0, "#d9977a", 0], [1, "#d9977a", 0.18]]) +
    vgrad("d1", [[0, "#ecd6c9"], [1, "#e6cab9"]]) +
    vgrad("d2", [[0, "#e3c4b1"], [1, "#dab49e"]]) +
    vgrad("d3", [[0, "#d7ad96"], [1, "#cb9a80"]]);
  const body =
    `<rect width="390" height="120" fill="url(#sky)"/>` +
    `<path d="M-10,118 C40,96 96,74 150,70 C196,68 226,86 262,100 C304,116 352,118 400,102 L400,270 L-10,270 Z" fill="url(#d1)"/>` +
    `<path d="M-10,164 C30,160 70,142 112,126 C140,116 160,116 184,126 C240,150 318,170 400,162 L400,270 L-10,270 Z" fill="url(#d2)"/>` +
    `<path d="M-10,214 C60,210 150,194 230,172 C268,162 296,158 322,162 C352,167 378,178 400,190 L400,270 L-10,270 Z" fill="url(#d3)"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The Jordan: the water, and the rings that go out over it from one place. */
export function jordan() {
  const H = 280;
  const defs = vgrad("water", [[0, "#9fc9c7", 0], [0.5, "#9fc9c7", 0.2], [1, "#8fbfbe", 0.42]]);
  const rings = [
    [30, 0.95],
    [72, 0.8],
    [124, 0.62],
    [186, 0.46],
    [258, 0.32],
    [340, 0.2],
  ];
  const body =
    `<rect width="390" height="${H}" fill="url(#water)"/>` +
    rings.map(([rx, a]) => `<ellipse cx="195" cy="178" rx="${rx}" ry="${n1(rx * 0.3)}" fill="none" stroke="#3f8f95" stroke-opacity="${a}" stroke-width="1.1"/>`).join("") +
    `<ellipse cx="195" cy="178" rx="5" ry="1.6" fill="#3f8f95" opacity="0.55"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The Sea of Galilee by night: the far hills, the water's edge, and the light lying on the water. */
export function galilee() {
  const H = 300;
  const defs =
    vgrad("sky", [[0, "#7fd0d6", 0], [0.6, "#7fd0d6", 0.05], [1, "#9fe0e2", 0.24]]) +
    vgrad("water", [[0, "#103740"], [0.5, "#0a252c"], [1, "#06181d"]]) +
    `<filter id="soft" filterUnits="userSpaceOnUse" x="0" y="140" width="390" height="120"><feGaussianBlur stdDeviation="9"/></filter>`;
  const body =
    `<rect width="390" height="168" fill="url(#sky)"/>` +
    `<path d="M-10,168 L-10,141 C30,129 76,123 120,133 C160,142 190,139 230,125 C280,109 340,113 400,129 L400,168 Z" fill="#0d2f37"/>` +
    `<rect y="167" width="390" height="133" fill="url(#water)"/>` +
    `<ellipse cx="150" cy="188" rx="118" ry="13" fill="#bff3f2" opacity="0.2" filter="url(#soft)"/>` +
    `<path d="M0,167.5 H390" stroke="#a9eef0" stroke-opacity="0.34" stroke-width="1"/>` +
    // Three long glints on the water, each quieter than the last.
    `<path d="M92,176 H212" stroke="#dffbfa" stroke-opacity="0.4" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M178,186 H306" stroke="#dffbfa" stroke-opacity="0.26" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M54,195 H150" stroke="#dffbfa" stroke-opacity="0.17" stroke-width="1" stroke-linecap="round"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** Patmos: the white wall, and the sea beyond it. Two fields of colour and the line between them. */
export function patmos() {
  const H = 220;
  const defs = vgrad("haze", [[0, "#7fa6ea", 0], [1, "#7fa6ea", 0.2]]) + vgrad("sea", [[0, "#2f63c8"], [0.4, "#2453b2"], [1, "#1b4296"]]);
  const body =
    `<rect width="390" height="88" fill="url(#haze)"/>` +
    `<rect y="88" width="390" height="132" fill="url(#sea)"/>` +
    `<path d="M0,88.5 H390" stroke="#a9c6f7" stroke-opacity="0.9" stroke-width="1"/>` +
    // Three long glints, each quieter than the last.
    `<path d="M214,101 H318" stroke="#ffffff" stroke-opacity="0.34" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M40,113 H126" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M252,124 H352" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1" stroke-linecap="round"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The mosaic: a band of tesserae along the foot of the wall, hand-set, with a pale row to close it. */
export function mosaic() {
  const H = 150;
  const r = rng(7);
  const cell = 13;
  const cols = 30;
  const rows = 11;
  const deep = ["#15306b", "#1a3a7e", "#122a5c", "#1e4491", "#173672", "#1b4a86", "#12335f", "#183f7a"];
  const bright = ["#2d63b4", "#3a7fb8", "#5f93d6", "#9fbde9"];
  const edge = ["#9fbde9", "#d7e3f6", "#5f93d6", "#c3d5f1"];
  let tiles = "";
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const top = row === rows - 1;
      const color = top ? edge[Math.floor(r() * edge.length)] : row === rows - 2 ? deep[Math.floor(r() * 3)] : r() < 0.1 ? bright[Math.min(bright.length - 1, Math.floor(Math.pow(r(), 1.8) * bright.length))] : deep[Math.floor(r() * deep.length)];
      const x = c * cell + 0.9;
      const y = H - (row + 1) * cell + 0.9;
      const s = cell - 1.8;
      const j = () => (r() - 0.5) * 1.7;
      const pts = [
        [x + j(), y + j()],
        [x + s + j(), y + j()],
        [x + s + j(), y + s + j()],
        [x + j(), y + s + j()],
      ];
      tiles += `<path d="M${pts.map((q) => `${n1(q[0])},${n1(q[1])}`).join("L")}Z" fill="${color}"/>`;
    }
  }
  return { svg: svg(390, H, tiles), height: H };
}

/** A row of tesserae for the rule at a page's head. */
export function mosaicRule() {
  const colors = ["#2d63b4", "#1e4491", "#5f93d6", "#1a3a7e", "#d7e3f6", "#1b4a86", "#3a7fb8", "#15306b", "#9fbde9", "#1e4491", "#2d63b4"];
  const tiles = colors.map((c, i) => `<rect x="${n1(i * 10.2 + 0.6)}" y="0.6" width="8.6" height="8.6" rx="1.1" fill="${c}" transform="rotate(${[-3, 2, -1, 3, 0, -2, 2, -3, 1, 2, -2][i]} ${n1(i * 10.2 + 4.9)} 4.9)"/>`).join("");
  return { svg: svg(112, 10, tiles), width: 112, height: 10 };
}

/** Stone: the foot of a monastery wall, its blocks of two heights, each a breath lighter or darker than the next. */
export function stone() {
  const H = 200;
  const r = rng(23);
  const courses = [40, 27, 36, 25, 32, 24];
  let out = "";
  let y = H;
  courses.forEach((h, i) => {
    y -= h;
    const a = Math.max(0, 1 - i / 5.4);
    let x = -((i * 43) % 67) - 24;
    while (x < 390) {
      const w = (h > 30 ? 74 : 54) + r() * 52;
      const tone = r();
      out += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${h}" fill="${tone < 0.55 ? "#4f483b" : "#ffffff"}" opacity="${n1((tone < 0.55 ? 0.03 + r() * 0.08 : 0.12 + r() * 0.2) * a)}"/>`;
      x += w;
      if (x > 0 && x < 390) out += `<path d="M${n1(x + 0.5)},${n1(y + 1)} V${n1(y + h)}" stroke="#7d7669" stroke-opacity="${n1(0.6 * a)}" stroke-width="1"/>`;
    }
    out += `<path d="M0,${n1(y + 0.5)} H390" stroke="#7d7669" stroke-opacity="${n1(0.66 * a)}" stroke-width="1"/>`;
  });
  return { svg: svg(390, H, out), height: H };
}

/** Damask: a woven ground of rings and small flowers, the cloth's own colour a step lighter. */
export function damask() {
  const H = 300;
  const defs =
    `<pattern id="p" width="46" height="46" patternUnits="userSpaceOnUse">` +
    `<g fill="none" stroke="#6a2740" stroke-width="1.1">` +
    `<circle cx="23" cy="23" r="17.5"/><circle cx="23" cy="23" r="12"/>` +
    `<path d="M23,15 C26,19 26,27 23,31 C20,27 20,19 23,15 Z M15,23 C19,20 27,20 31,23 C27,26 19,26 15,23 Z"/>` +
    `<path d="M0,-4.6 L4.6,0 L0,4.6 L-4.6,0 Z M46,-4.6 L50.6,0 L46,4.6 L41.4,0 Z M0,41.4 L4.6,46 L0,50.6 L-4.6,46 Z M46,41.4 L50.6,46 L46,50.6 L41.4,46 Z"/>` +
    `</g><circle cx="23" cy="23" r="1.7" fill="#6a2740"/></pattern>` +
    vgrad("fade", [[0, "#ffffff", 0], [0.42, "#ffffff", 0.3], [1, "#ffffff", 1]]) +
    `<mask id="m"><rect width="390" height="${H}" fill="url(#fade)"/></mask>`;
  const body = `<rect width="390" height="${H}" fill="url(#p)" mask="url(#m)" transform="translate(-3 -1)"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** Incense: the smoke of the censer at the foot of the page, slow curves seen only as their softness. */
export function incense() {
  const H = 350;
  const blur = (id, d) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="-40" width="390" height="${H + 80}"><feGaussianBlur stdDeviation="${d}"/></filter>`;
  const defs =
    blur("b1", 11) +
    blur("b2", 5) +
    blur("b3", 1.8) +
    vgrad("fade", [[0, "#ffffff", 0], [0.28, "#ffffff", 0.7], [0.75, "#ffffff", 1], [1, "#ffffff", 0.6]]) +
    `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="390" height="${H}"><rect width="390" height="${H}" fill="url(#fade)"/></mask>`;
  const body =
    `<g mask="url(#m)" fill="none" stroke-linecap="round">` +
    `<path d="M300,318 C278,270 326,238 304,196 C284,158 238,148 252,102 C260,76 288,60 282,22" stroke="#b9aede" stroke-opacity="0.3" stroke-width="34" filter="url(#b1)"/>` +
    `<path d="M302,320 C284,274 320,242 302,200 C286,164 246,150 258,106 C266,82 286,64 282,28" stroke="#cdc4ea" stroke-opacity="0.34" stroke-width="12" filter="url(#b2)"/>` +
    `<path d="M304,322 C290,278 314,246 300,204 C288,170 254,152 264,110 C270,88 284,68 282,34" stroke="#e6e0f6" stroke-opacity="0.34" stroke-width="2.6" filter="url(#b3)"/>` +
    `<path d="M298,318 C262,286 306,236 274,200 C254,178 262,150 276,128" stroke="#cdc4ea" stroke-opacity="0.2" stroke-width="8" filter="url(#b2)"/>` +
    `</g>`;
  return { svg: svg(390, H, body, defs), height: H };
}

const X = (x, y, s, color, w) => `<path d="M${n1(x)},${n1(y)} l${s},${s} M${n1(x + s)},${n1(y)} l${-s},${s}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Linen's rule under a page's bar: one row of cross stitches, a pattern that repeats along the line. */
export function stitchLine(color = "#b21f2d") {
  const cell = 8;
  const body = X(2.3, 1.8, 3.4, color, 1.15);
  return { svg: svg(cell, 7, body), width: cell, height: 7 };
}

/** Linen's ornament at a chapter's head: a stitched diamond with a star in it, and a short row of stitches each side. */
export function stitchHead(color = "#b21f2d", dark = "#2a2320") {
  const cell = 4;
  const N = 13;
  const W = 168;
  const Hh = N * cell;
  const x0 = (W - N * cell) / 2;
  let out = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.abs(x - 6) + Math.abs(y - 6);
      const star = (x === 6 && Math.abs(y - 6) <= 2) || (y === 6 && Math.abs(x - 6) <= 2) || (Math.abs(x - 6) === 1 && Math.abs(y - 6) === 1);
      if (d === 6 || star) out += X(x0 + x * cell + 0.8, y * cell + 0.8, cell - 1.6, d === 6 ? color : dark, 1.15);
      else if (d === 4 && (x + y) % 2 === 0) out += X(x0 + x * cell + 0.8, y * cell + 0.8, cell - 1.6, color, 1.15);
    }
  }
  const mid = 6 * cell;
  for (let i = 0; i < 6; i++) {
    out += X(x0 - 12 - i * 8 + 0.8, mid + 0.8, cell - 1.6, i % 2 ? dark : color, 1.15);
    out += X(x0 + N * cell + 8 + i * 8 + 0.8, mid + 0.8, cell - 1.6, i % 2 ? dark : color, 1.15);
  }
  return { svg: svg(W, Hh, out), width: W, height: Hh };
}

export const SCENES = { athos, forest, desert, jordan, galilee, patmos, mosaic, stone, damask, incense };
```

### The painted ones

Dawn, Fire, Blush and the three plants are painted by the app's own
`lib/share/drawVerseCard.ts` and `lib/share/verseCard.ts`, turned to
plain JavaScript and nothing else (`ts.transpileModule`, ES2022), loaded
in a page of the export and run on a canvas the shape of a phone. The plates
are the public-domain ones of `public/share/flowers/`
(`docs/licensing/SHARE_FLOWERS.md`): Redouté's roses, Köhler's lavender and
olive. What this file adds is only where on a phone each picture stands: the
fire in the lower seven tenths with its embers going quiet upward, the
sunrise in the lowest third under the night, the flowers at six tenths of
their size in the two corners above the tab bar.

| File | What | Size |
|---|---|---|
| `dawn-room.webp` | Dawn's room | 179 KB |
| `fire-room.webp` | Fire's room | 208 KB |
| `blush-room.webp` | Blush's room | 97 KB |
| `rose-room.webp` | Roses' room | 107 KB |
| `rose-head.webp` | Roses' plate at a chapter's head | 163 KB |
| `lavender-room.webp` | Lavender's room | 96 KB |
| `lavender-head.webp` | Lavender's plate | 80 KB |
| `olive-room.webp` | Olive's room | 102 KB |
| `olive-head.webp` | Olive's plate | 186 KB |

1.2 MB in all, at 1080 by 2337. They would ship in the apps as files.

```js
// The second set's pictures, painted by the app's own share-picture code.
//
// lib/share/drawVerseCard.ts paints the grounds of the quote looks he picked
// on 2026-10-30 (Fire, Dawn, Blush, Roses, Lavender, Olive), and
// lib/share/verseCard.ts says where a look's flowers grow. Both are loaded
// here unchanged (turned to plain JavaScript, nothing else) and run in a page
// of the native export, on a canvas the shape of a phone. What this file adds
// is only where on a phone's screen each picture stands.
//
// Run from the repository's root: node <this>
import fs from "node:fs";
import path from "node:path";
import { openPhone } from "/home/user/purifyapp/scripts/mock-check.mjs";
import { go } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "pictures");
const PAINT = path.join(HERE, "..", "r2", "paint");
fs.mkdirSync(OUT, { recursive: true });

const { browser, ctx, page } = await openPhone({ scale: 1, set: { "purify.motion": "off" } });
await ctx.route("**/__paint/*.js", (route) => {
  const name = path.basename(new URL(route.request().url()).pathname);
  route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(PAINT, name)) });
});
page.on("pageerror", (e) => console.log("page error:", String(e).slice(0, 200)));
await go(page, "/");
await page.waitForTimeout(2500);

const made = await page.evaluate(async () => {
  const draw = await import("/__paint/drawVerseCard.js");
  const verse = await import("/__paint/verseCard.js");
  const W = 1080;
  const H = Math.round((W * innerHeight) / innerWidth);
  const mk = (w, h) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true }) };
  };
  const load = (src) =>
    new Promise((done, fail) => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => fail(new Error(`could not load ${src}`));
      img.src = src;
    });
  // The picture's grain, as drawVerseCard.ts lays it: noise 240 square, by a soft light.
  let noise = null;
  const grain = (c, w, h, amount) => {
    if (!amount) return;
    if (!noise) {
      const layer = mk(240, 240);
      const data = layer.ctx.createImageData(240, 240);
      let s = 11;
      for (let i = 0; i < data.data.length; i += 4) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        const v = s >>> 24;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
        data.data[i + 3] = 255;
      }
      layer.ctx.putImageData(data, 0, 0);
      noise = layer.canvas;
    }
    c.save();
    c.globalAlpha = amount;
    c.globalCompositeOperation = "soft-light";
    c.fillStyle = c.createPattern(noise, "repeat");
    c.fillRect(0, 0, w, h);
    c.restore();
  };
  const plates = {};
  for (const [name, p] of Object.entries(verse.FLOWER_PLATES)) plates[name] = await load(p.src);
  const hex = (d) => "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
  const at = (c, x, y) => hex(c.getImageData(Math.round(x), Math.round(y), 1, 1).data);
  // The tab bar's own height on this screen, in the picture's pixels: a look's flowers are planted on it, not under it.
  const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
  const lift = Math.round((((bar ? innerHeight - bar.top : 83) + 0) * W) / innerWidth);

  const out = {};
  const keep = (id, name, canvas, quality = 0.92) => ((out[id] ??= {})[name] = canvas.toDataURL("image/webp", quality));
  const sample = (id, values) => ((out[id] ??= {}).sample = values);

  // Fire: the look's own ground, standing in the lower seven tenths of the screen, the dark of its own top above it.
  {
    const look = verse.quoteLookOf("fire");
    const Hf = Math.round(H * 0.7);
    const f = mk(W, Hf);
    draw.paintQuoteGround(f.ctx, look, W, Hf, "portrait", 1);
    const room = mk(W, H);
    room.ctx.fillStyle = at(f.ctx, W / 2, 2);
    room.ctx.fillRect(0, 0, W, H);
    // The embers go quiet as they rise: the fire's own picture comes in from nothing over its upper half.
    f.ctx.globalCompositeOperation = "destination-in";
    const fm = f.ctx.createLinearGradient(0, 0, 0, Hf);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      fm.addColorStop(0.12 + t * 0.5, `rgba(0, 0, 0, ${(t * t * (3 - 2 * t)).toFixed(3)})`);
    }
    fm.addColorStop(0, "rgba(0, 0, 0, 0)");
    fm.addColorStop(1, "rgba(0, 0, 0, 1)");
    f.ctx.fillStyle = fm;
    f.ctx.fillRect(0, 0, W, Hf);
    f.ctx.globalCompositeOperation = "source-over";
    room.ctx.drawImage(f.canvas, 0, H - Hf);
    grain(room.ctx, W, H, look.grain);
    keep("fire", "room", room.canvas);
    sample("fire", { top: at(room.ctx, W / 2, 180), mid: at(room.ctx, W / 2, H * 0.5), low: at(room.ctx, W / 2, H * 0.72), ink: look.ink, lit: look.lit });
  }

  // Dawn: the night above, and the look's own sky before sunrise coming up under it.
  {
    const look = verse.quoteLookOf("dawn");
    const room = mk(W, H);
    const g = room.ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#070919");
    g.addColorStop(0.5, "#0b0e26");
    g.addColorStop(1, "#11143a");
    room.ctx.fillStyle = g;
    room.ctx.fillRect(0, 0, W, H);
    const Hd = Math.round(H * 0.32);
    const d = mk(W, Hd);
    draw.paintQuoteGround(d.ctx, look, W, Hd, "portrait", 1);
    d.ctx.globalCompositeOperation = "destination-in";
    const m = d.ctx.createLinearGradient(0, 0, 0, Hd);
    // The sunrise comes in by an eased share, so the night gives way with no line.
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      m.addColorStop(t * 0.7, `rgba(0, 0, 0, ${(t * t * (3 - 2 * t)).toFixed(3)})`);
    }
    m.addColorStop(1, "rgba(0, 0, 0, 1)");
    d.ctx.fillStyle = m;
    d.ctx.fillRect(0, 0, W, Hd);
    room.ctx.drawImage(d.canvas, 0, H - Hd);
    grain(room.ctx, W, H, look.grain);
    keep("dawn", "room", room.canvas);
    sample("dawn", { top: at(room.ctx, W / 2, 180), mid: at(room.ctx, W / 2, H * 0.5), low: at(room.ctx, W / 2, H * 0.72), foot: at(room.ctx, W / 2, H * 0.95) });
  }

  // The papers: Blush alone, and Roses, Lavender and Olive with their flowers growing from the tab bar's corners.
  for (const id of ["blush", "rose", "lavender", "olive"]) {
    const look = verse.quoteLookOf(id);
    const room = mk(W, H);
    draw.paintQuoteGround(room.ctx, look, W, H, "portrait", 1);
    const floor = H - lift;
    const k = 0.62;
    for (const f of verse.flowerBeds(look, W, floor, "both").flowers) {
      const cx = f.cx < W / 2 ? f.cx * k : W - (W - f.cx) * k;
      const cy = floor - (floor - f.cy) * k;
      room.ctx.save();
      room.ctx.globalCompositeOperation = "multiply";
      room.ctx.translate(cx, cy);
      room.ctx.rotate(f.rotate);
      room.ctx.drawImage(plates[f.plate], (-f.width * k) / 2, (-f.height * k) / 2, f.width * k, f.height * k);
      room.ctx.restore();
    }
    grain(room.ctx, W, H, look.grain);
    keep(id, "room", room.canvas);
    sample(id, { top: at(room.ctx, W / 2, 180), mid: at(room.ctx, W / 2, H * 0.5), low: at(room.ctx, W / 2, H * 0.72), corner: at(room.ctx, 30, H * 0.3), ink: look.ink, lit: look.lit, cross: look.cross, paper: look.paper });
  }

  // A plate with its white paper taken out, so it stands on any light page with no blend.
  const cut = (img) => {
    const c = mk(img.naturalWidth, img.naturalHeight);
    c.ctx.drawImage(img, 0, 0);
    const d = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const [r, g, b] = [d.data[i], d.data[i + 1], d.data[i + 2]];
      const a = 255 - Math.min(r, g, b);
      if (a === 0) {
        d.data[i + 3] = 0;
        continue;
      }
      d.data[i] = Math.max(0, Math.round(((r - (255 - a)) * 255) / a));
      d.data[i + 1] = Math.max(0, Math.round(((g - (255 - a)) * 255) / a));
      d.data[i + 2] = Math.max(0, Math.round(((b - (255 - a)) * 255) / a));
      d.data[i + 3] = a;
    }
    c.ctx.putImageData(d, 0, 0);
    return c.canvas;
  };
  const clear = {};
  for (const [name, img] of Object.entries(plates)) clear[name] = cut(img);

  // The flowers at the head of a chapter, in the place of the short rule: 348 by 132, three times over.
  const head = (id, place) => {
    const S = 3, w = 348, h = 132;
    const c = mk(w * S, h * S);
    c.ctx.scale(S, S);
    for (const p of place) {
      const img = clear[p.plate];
      const part = p.keep ?? 1;
      const ph = p.height;
      const pw = (ph * img.width) / (img.height * part);
      c.ctx.save();
      c.ctx.translate(p.x, p.y);
      c.ctx.rotate(p.rotate ?? 0);
      if (p.flip) c.ctx.scale(-1, 1);
      c.ctx.drawImage(img, 0, 0, img.width, img.height * part, -pw / 2, -ph / 2, pw, ph);
      c.ctx.restore();
    }
    // A plate cut at its foot goes soft there, so the cut is never a line.
    if (place.some((p) => p.keep)) {
      c.ctx.globalCompositeOperation = "destination-in";
      const g = c.ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(0, 0, 0, 1)");
      g.addColorStop(0.78, "rgba(0, 0, 0, 1)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.ctx.fillStyle = g;
      c.ctx.fillRect(0, 0, w, h);
      c.ctx.globalCompositeOperation = "source-over";
    }
    keep(id, "head", c.canvas, 0.9);
  };
  head("rose", [
    { plate: "rose-centifolia", x: 128, y: 70, height: 128, rotate: -0.16 },
    { plate: "rose-regalis", x: 222, y: 68, height: 132, rotate: 0.14 },
  ]);
  head("lavender", [{ plate: "lavender", x: 174, y: 66, height: 128, keep: 0.8 }]);
  head("olive", [{ plate: "olive", x: 174, y: 66, height: 190, rotate: -1.12 }]);

  // Each look's swatch as the app paints it in its own sheet.
  for (const id of ["fire", "dawn", "blush", "rose", "lavender", "olive", "space"]) {
    const look = verse.quoteLookOf(id);
    const s = mk(96, 96);
    const plate = draw.swatchPlate(look);
    draw.paintQuoteSwatch(s.ctx, look, 48, 2, plate ? { source: plates[plate], width: plates[plate].naturalWidth, height: plates[plate].naturalHeight } : null);
    keep(id, "swatch", s.canvas, 0.9);
  }
  return { W, H, lift, out };
});

console.log(`pictures ${made.W} by ${made.H}; the tab bar is ${made.lift} of them high`);
const samples = {};
for (const [id, set] of Object.entries(made.out)) {
  for (const [name, value] of Object.entries(set)) {
    if (name === "sample") {
      samples[id] = value;
      continue;
    }
    const file = path.join(OUT, `${id}-${name}.webp`);
    fs.writeFileSync(file, Buffer.from(value.split(",")[1], "base64"));
    console.log(`  ${path.basename(file)} ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
}
fs.writeFileSync(path.join(OUT, "samples.json"), JSON.stringify(samples, null, 1));
console.log(JSON.stringify(samples));
await browser.close();
```

## 14. The picker

His words: "a nice scrollable theme system in the settings when picking a
theme". Built in the export's own Settings screen from that screen's own
parts, with nothing drawn by hand.

**In Settings** the Reading mode row keeps the three every reader has, one
tap each, under the same five columns as today, and the one applied if it is
another. The row's head becomes the way in: it says which mode is on, in the
row's own small line, and carries the chevron every link row here has. The
earned two leave this row for the page's last shelf.

**The page** (its bar says Reading mode, the row's own words):

- First the screen's own line ("These apply everywhere ...") and the free
  three.
- Then a shelf for each family, under the family's name and its one line. A
  shelf is Settings' own picture row, the one First focus uses
  (`.set-focus`): it runs to the screen's edges and is swept sideways,
  with the next page cut off at the edge so a reader sees there is more. On a
  computer it wraps, as that row does.
- Each theme is the screen's own small lit page (`ModePage`), the Bible's
  page in that theme with John 1 on it, made taller so the sign at its foot
  is in it, and with the chapter rule's ornament where the theme has one. At
  0.62 of its drawing size a page is 104 by 186, so every one is far over 44
  across.
- A family that needs Plus says so once, by its name, in the app's own
  words and class for it (`set-mode-plus`, "Purify Plus"), and only where
  the gate has said no, as today. The free three carry no mark, so Plus is
  never promised to every reader. A tap by a reader without Plus opens the
  same sheet it opens today.
- Last, "Earned by reading" (the row's own name today): Councils and
  Cappadocian as goals, dashed, with "0 of 19" and "0 of 3" as they have
  now. Their rules are untouched.

A tap applies a theme the way the row does today: the palette's own
transition (`.set-root[data-live] .set-mode-page`), still under
`data-motion="reduce"`, and the row's own check on the one chosen. No
haptic is added: the app ticks on its bars, its search, the bell and the
streak (`haptic()` of `lib/ui/motion.ts`), not on a choice in Settings,
and the picker keeps to that. Because a theme is the whole app's, the page
itself is the preview:
the fifth still shows it after a reader with Plus has tapped Holy Mountain.
Opening the page from the row is a page switch, so it moves in the house's
motion, and the applied theme's small page is the picture it carries in.

Everything is placed with start and end, so it mirrors in Arabic (the
checker's own measure passes). The page is 1,982px long at 390 wide.

What it adds to the stylesheet, under "Settings: lit panels":

```css
/* The reading modes on their own page (1.9): a shelf for each family, the
   free ones first. A shelf is Settings' own picture row (.set-focus): it runs
   to the screen's edges and is swept sideways, its first page under the
   family's name. Each page is the Bible's page in its palette, as before,
   taller now so the palette's sign at the foot is in it. */
.set-fam-head {
 display: flex;
 align-items: baseline;
 justify-content: space-between;
 gap: 12px;
}
.set-fam-head .set-mode-plus {
 margin: 0;
 padding-inline-end: 6px;
 font-size: 10px;
}
.set-shelf {
 --mp-k: 0.62;
 display: flex;
 gap: 12px;
 margin-inline: -16px;
 padding-block: 14px 4px;
 padding-inline: 22px 0;
 overflow-x: auto;
 overscroll-behavior-x: contain;
 scroll-snap-type: x proximity;
 scroll-padding-inline: 22px;
 scrollbar-width: none;
}
.set-shelf::-webkit-scrollbar {
 display: none;
}
.set-shelf::after {
 content: "";
 flex: none;
 width: 10px;
}
.set-shelf > .set-mode {
 flex: none;
 scroll-snap-align: start;
}
@media (min-width: 768px) {
 .set-shelf {
  flex-wrap: wrap;
  margin-inline: 0;
  padding-inline: 6px 0;
  overflow: visible;
 }
}
.set-shelf .set-mode-page {
 height: calc(300px * var(--mp-k));
 border-radius: 12px;
 background: var(--mp-back, var(--mp-ground));
}
.set-shelf .set-mode-canvas {
 height: 300px;
}
/* The page's last lines go quiet into its foot, as the real page's do. */
.set-shelf .set-mode-page::before {
 content: "";
 position: absolute;
 inset-inline: 0;
 bottom: 0;
 z-index: 1;
 height: 46%;
 background: inherit;
 -webkit-mask-image: linear-gradient(to top, #000 34%, transparent);
 mask-image: linear-gradient(to top, #000 34%, transparent);
}
.set-shelf .set-mode-name {
 max-width: none;
 margin-top: 10px;
 font-size: 12px;
 /* On the page's own ground, not a panel's: the share that holds 4.5:1 on Light. */
 color: color-mix(in srgb, var(--color-paper) 75%, transparent);
}
.set-shelf .set-mode[aria-pressed="true"] .set-mode-name {
 color: var(--color-paper);
}
.set-shelf .set-mode-check {
 top: calc(300px * var(--mp-k) - 14px);
}
.set-shelf .set-mode-progress {
 font-size: 10px;
}

/* In Settings the row keeps the three every reader has (and the one applied),
   under the same five columns as before, and its head is the way in. */
.set-modes-few {
 justify-content: flex-start;
 gap: calc((100% - 5 * 168px * var(--mp-k)) / 4);
}
a.set-lab.set-link {
 min-height: 44px;
 margin: -6px -8px;
 padding: 6px 8px;
 border-radius: 14px;
}
```

and for each theme one rule giving its small page its ground, ink and accent
(the table's `night`, `paper` and the accent) and its picture, of this
shape:

```css
.set-mode-page[data-palette="athos"] {
 --mp-ground: #0e1420;
 --mp-ink: #edf1f8;
 --mp-accent: #b8c3dc;
 --mp-back: var(--scene-athos) center bottom calc(-35.75px * var(--mp-k)) / 100% auto no-repeat, var(--mp-ground);
}
```

The `-35.75px` is the tab bar's 83px at the small page's scale: a small
page has no bar, so its picture is set down by that much.

## 15. How the stills were made, and what was measured

As in section 5: the native export, opened as a phone opens it at 390 by 844,
the app's own two screens, and a theme worn as the CSS it would add. A light
theme rides on Light for the still (`data-reading-mode="parchment"` and a
second attribute), for the reason section 6 gives. Then two measures on every
still, and four on the colours:

- **The app's mockup checker** (`checkMock` on the whole screen, with a
  dark proposal added to its list of palettes). On this export the app's own
  two screens give it nothing to report on any palette, so there is no
  baseline to subtract this time: 0 findings on 42 stills of 21 palettes (the
  free three, Night sky and the seventeen). It could not measure one thing on
  each Today still, on every palette: the app's own Plus chip, which is a
  gradient.
- **The pixels behind every word** (section 5's audit): 1,712 words, 0 under
  4.5:1 (3:1 for large type), the lowest 4.68:1. Words inside the foot are
  left out, as words under the dock's fade were: they are going quiet on
  purpose.
- **The picker**: the row in Settings and the page each pass all ten of the
  checker's measures (contrast, placeholder, target, glyph, palette, gold,
  stripe, mirror, em dash, rays). Two things are said plainly beside that.
  The small pages are allowed by name for contrast and palette (25
  allowances), because a palette's small page is drawn in that palette's own
  colours, which is what the app's own Settings fails the checker on today.
  And the checker could not measure the 175 words that stand on a small
  page's picture; they are the picture of a page, hidden from a screen
  reader as they are today.
- **The arithmetic** of section 5 on every token: no pair short.
- **The 18 pairs** of `litPalette.test.ts` on each of the seventeen: all
  hold.
- **Gold**: 311 colours are written in the CSS, the drawings and the picker,
  and none is gold by the house's measure. The nearest are a dune
  (`#e3c4b1`, hue 53) and the ember's light (`rgb(255 190 150)`, hue 53),
  both under the line at 60. The one gold in the set is inside Fire's
  painted picture: the flames are a flame's colours (section 16, 1).
- No conic gradient, no one-sided border, nothing placed by left or right,
  no em dash.

By eye: every part of the picker is the app's own (the small pages, the
headings, the line, the chevron, the tick, the mark for Plus); no icon is
new; the sample words are the row's own John 1; Plus is marked and never
promised; the words that exist are used first (Reading mode, the line under
it, Earned by reading, Purify Plus, the progress).

## 16. For Edgar to decide

1. **Fire's flames.** They are a flame's own colours, painted by the code of
   the quote picture he approved. `noGold.test.ts` lets that file through
   by his word that gold is only ever a flame's own colour. In the app that
   would be the only gold on any theme. Yes for the app too, or Fire keeps
   its embers and its glow and loses the yellow.
2. **The foot.** On a theme with a scene, a page's last lines go quiet into
   the picture from 240px above the foot of the screen, on every screen. In
   the Bible they go quiet from 272px today, under the dock. On Today and the rest it is
   new, and it takes about a finger's height of page above the tab bar. It
   is what lets the sign be seen everywhere. Yes or no; if no, the sign
   shows only where no card covers it.
3. **Candlelight and Monastery.** This set replaces them. A reader wearing
   one needs a home: Fire for Candlelight and Holy Mountain for Monastery are
   the nearest, and the two ids can simply take those looks, so nothing is
   lost on a device. "Candlelight at Vespers" would then light Fire at
   sunset, or the theme he names, or go.
4. **Which of the eighteen**, and whether he wants more in any family.
5. **The names.** Six exist in 21 languages. New: Night sky, Incense, Holy
   Mountain, Forest, Desert, Jordan, Galilee, Patmos, Mosaic, Stone, Damask,
   Linen, the four family names and their four lines.
6. **The earned two** move from the Settings row to the page's last shelf.
   Their rules and looks stay as they are.

## 17. What building it would take

Not started, and not to be started before his picks. Section 6 still holds
for the room (57 page roots step aside), for a theme's ids and tests, and for
the phone walk. What this set adds or changes:

1. **Nine light themes, not two.** Section 6, point 3, is now most of the
   work: the 207 lines that name `parchment` have to answer any light
   theme. One attribute beside the mode, set by the controller and the
   pre-paint script.
2. **The foot is a fixed layer at z-index 35**, above the page and under the
   dock (40) and the tab bar (50). Sheets and the sticky bars sit above or
   beside it today; the walk has to prove nothing else sits between. Its two
   lengths add the safe area at the foot.
3. **Pictures as files.** 1.2 MB of painted pictures in `public/`,
   shipped in the apps, made by a script from the app's own painter so they
   can be made again. The drawings stay in the stylesheet or beside it.
4. **Wide screens.** A drawing is laid at the page's width, right for a
   phone. On a tablet or the website it needs a height of its own, or to sit
   in the reading column.
5. **Fire and `noGold.test.ts`**: a picture is not read by that test, so
   nothing fails, which is why question 1 is asked and not assumed.
6. **The picker** is a new page under Settings in the static export
   (`/settings/reading-mode/`), a server shell and a client child like its
   neighbours, with the row's own component drawing each small page.
   `lib/settings/__tests__/litPanels.test.ts` holds each small page's
   colours to its theme's tokens and would take the seventeen.
7. **The gate.** `lib/reader/readingModes.ts` (the union, the list, the
   free three unchanged), `lib/reader/prepaint.ts`, the chips in the
   Bible's own settings, and `lib/reader/themeWrite.ts` on the server.
8. **Words** in 21 languages (question 5), and the paywall's lines that name
   two palettes (`plus.palettes.title`, `plus.palettes.body`).
9. **The moves of question 3**, if he says yes: two ids keep their place in
   storage and change their look, and the release's note says so.

## 18. Tried and dropped on the way

Kept here so nobody draws them twice.

- **Moonlight**: a pool of pale light in a corner and a moon at a chapter's
  head. Dropped: the light on Galilee's water says it better, and a glow in a
  corner is what a generic app theme looks like.
- **A vigil lamp**: a ruby pool on black. The same kind of sign as the above
  in another colour.
- **Vespers**: a whole page of evening sky. A purple gradient is the mark of
  a made-by-machine app; left out.
- **Mosaic as scattered tiles** thinning upward: read as pixels dissolving.
  It is a set band now, hand-laid, closed by a pale row.
- **Stone as an arcade** of four arches: at this size four round heads read
  as gravestones. It is the foot of a wall now.
- **Galilee's light as a ladder of short strokes**: read as a menu icon
  where only four showed. It is a soft pool and three long glints now.
- **Tall flowers** to a quarter of the screen: words ran into the leaves.
  They stand at six tenths of that, in the corners.
- **A seasons family** (Lent, Pascha, Pentecost): each would have been one of
  these in a feast's colour. If he wants the app to follow the Church's
  year, these themes can serve it, as section 7, point 6, said of the first.
- **An icon-and-gold family**, one of the arbiter's examples: the house has
  no gold, so it was not drawn. It would need his word first.

# Built: the looks and the reading modes' page

Built on 2026-11-10, on his word of about 04:48 UTC the same day ("finalize
all of this and let's get going"): design and build in one pass, pushed when
the gates pass, his to change after. What sections 9 to 18 proposed is in the
app now, on `ccr-07896cf2-bo0afd`, with the differences section 21 lists.
Nothing is on main.

## 19. What is in the app

- **Eighteen looks**, all Purify Plus, in the four families of section 10:
  Night (Night sky, Dawn, Fire, Incense), Land and sea (Holy Mountain,
  Forest, Desert, Jordan, Galilee, Patmos), Garden (Blush, Roses, Lavender,
  Olive), Sanctuary (Mosaic, Stone, Damask, Linen). Nine are worn over Dark
  and nine over Light.
- **Candlelight and Monastery stay**, as they are, and stay Plus: twenty
  Plus reading modes in all. Nobody's chosen palette moves. Dark, Light and
  True black are free, unchanged.
- **The reading modes' own page**, `/settings/reading-mode/`: the free three
  first, then a shelf for each family swept sideways, then the two earned by
  reading as goals with how far the reader is. Settings' Reading mode row
  opens it from its head, which names the palette that is on; the Bible's
  own sheet has the same way in under its chips.
- **A tap applies a palette as a cross-fade** of the whole screen on the
  house curve; with motion off it lands at once.
- **The words** in all 21 languages: 12 new names, 18 one-line descriptions,
  4 family names and their 4 lines.

Where it lives:

| What | Where |
| --- | --- |
| The registry: ids, families, which palette a look is worn over | `lib/reader/readingModes.ts` |
| The look before first paint | `lib/reader/prepaint.ts` |
| The look on the page, the gate, the cross-fade | `components/theme/AppThemeController.tsx` |
| Every look's colours, room, foot and signs | `app/globals.css`, "The looks (1.9)" |
| The page and its shelves | `app/(app)/settings/reading-mode/page.tsx`, `components/settings/ReadingModeGallery.tsx`, and "The reading modes' own page (1.9)" in the stylesheet |
| The row's head, the sixth page, the chips' way in | `components/settings/LitPanel.tsx`, `SettingsClient.tsx`, `ReadingModePages.tsx`, `components/reader/ReadingModeChips.tsx` |
| The pictures, the script that makes them, their record | `public/themes/`, `scripts/theme-pictures.mjs`, `docs/licensing/THEME_PICTURES.md` |

## 20. How a look is worn

A look is one attribute on the page's root element, `data-look="<id>"`. A
dark look stands on Dark, with no reading mode beside it. A light look keeps
`data-reading-mode="parchment"` beside it, so every one of Light's own rules
(about 210) answers a light look unchanged, and the looks' section of the
stylesheet only says what a look changes. That section is last in the file on
purpose: where one of its rules meets one of Light's at the same weight, the
later wins. `themeAttributes(theme)` in the registry is the one place that
says which two attributes a stored choice becomes, and the pre-paint script
and the controller both follow it (a test runs the script against a stand-in
for the phone's storage and holds its answer to the registry's for all 25
palettes).

The stored choice is the look's id under the same key as before
(`purify.reader.theme`). No table holds a theme's id, so there is no
migration. The server's rule for a written palette (`lib/reader/themeWrite.ts`)
reads the registry, so it knows the new ids and holds them to Plus as it
holds Candlelight. The account's sync carries the id as it carries any
other; a phone still on 1.8 that receives one reads Dark, as it does for any
id it does not know.

A room is one still picture under the page (`body::before`), and the page's
own sections step aside for it by one rule. A foot is the same picture once
more over the page's last lines (`body::after`, masked), under the bars.
Nothing moves and nothing is blended.

## 21. What changed between the drawing and the build

1. **Settings' row is still the five.** The stills showed the row cut to the
   free three, with the rest on the new page. That was drawn while
   Candlelight and Monastery were to be replaced. They stay, so the row a
   reader knows stays: Dark, Light, True black, Candlelight, Monastery, and
   under them the two earned by reading. What is new in the row is its head,
   which opens the page and names the palette that is on, and a sixth small
   page while a look is the one applied, so it can be seen and put down from
   Settings.
2. **The earned two are in both places**: on the row as before, and on the
   page's last shelf.
3. **A light look's ink is a shade darker than drawn**, so that Light's own
   rules, which write some lines at 70 percent of the ink, hold 4.5:1 on a
   look's page, cards and boxes with no second copy of those rules.
4. **Every text share the app writes is named for every look.** The app
   writes its quiet text at many shares of the ink, not only the four the
   palettes' rules name (42, 48, 52, 56 and 58 beside 45, 50, 55 and 60; and
   62, 65, 66 and 68 above them). On the real screens the checker found
   65 percent a hair under on eight light looks (4.37:1 to 4.45:1). Each
   look's rule now names every share from 40 up, and a test reads the shares
   from the source, so one written tomorrow is held the day it is written.
5. **A light look's accent words are drawn at 85 percent.** A look's accent
   is a colour (the wine of Roses, the green of Olive), lighter than the
   graphite Light keeps in its place, and the app writes accent words as low
   as 65 percent. One rule lifts those for every light look.
6. **A grid ruled by its own ground keeps its cells.** The rule that lets the
   page's sections stand clear for the room also cleared the two cells of a
   heresy's "claim and answer" block, whose dividing line is its own ground
   showing between them. The walk of every screen found it; the cells keep
   their fill.
7. **On a wide screen a look is its colours and the sign at a chapter's
   head.** The scenes at the foot are drawn for a phone's width and stand
   down from 768 pixels; Night sky's stars fill any screen. A tablet and the
   website on a computer are in this case.
8. **The pictures are files**, 24 of them, 840 KB together, not text inside
   the stylesheet: a look that is not worn fetches nothing.
9. **No haptic was added.** The brief asked for a tick "where the app
   already ticks". The app ticks on its bars, in search, on the bell and on
   the streak, and not on a choice in Settings, so a palette is chosen
   silently, as every other setting is.

## 22. What was measured

On the export of this build (`npm run build:android`), opened the way a phone
opens it, 390 wide. A look is worn the reader's own way throughout: the
stored choice, and the app putting it on.

| Check | What it read | Result |
| --- | --- | --- |
| The stills | 23 palettes (the five and the eighteen) on the Bible at John 1 and on Today: `checkMock` on each, then the pixels behind every word | 46 stills, no finding; 1,884 words, none under 4.5:1; lowest on a look 4.68:1 (Galilee and Mosaic, on Today) |
| Whole screens | 11 screens (Today, John 1, Prayers, Discover, You, Settings, the reading modes' page, the calendar, Theology, the reading room, Saints), `checkMock` on all 23 palettes | Nothing on a look that the five do not also have (section 25 lists what the five have) |
| The reading modes' page | `checkMock` on all 23 palettes, with its small pages named as pictures | No finding |
| The room | `scripts/room-walk.mjs`: every screen of the export (121), in Holy Mountain and in Roses | 242 screens, no section covering the room and nothing cut out of a card; two blocks cover it by design and are named |
| The pictures | `scripts/scene-check.mjs`: each look's picture alone, against its faintest text and its full ink, anywhere above its foot | All 18 hold; the tightest are Dawn and Holy Mountain at 4.67:1 for faint text |
| The walk | The row in Settings, the page, a tap, the same tap again, the way back, the sixth page, Dark again, motion off, the Bible's sheet, Arabic | 36 steps, all as they should be |
| A reader without Plus | The same page on a build with the gate on | A look kept in storage is put down and the page is Dark; each family says Purify Plus once by its name and no tile repeats it; a tap opens the Plus sheet and changes nothing; Light still applies; `checkMock` passes on the page |
| Wide | The page and a chapter at 820 wide | The shelves wrap, the scenes stand down, nothing runs off the side |

The gates: `npm run typecheck` 0; `npm run test:unit` 855 files and 10,409 tests pass; `npm run
lint` 0 errors (its 8 warnings are in files this build does not touch);
`npm run build:android` and `npm run build:ios` clean, about 226.5 MB on disk
of a ceiling of 240 and 72 MB packed of 85; `npm run build` (the website)
clean, with `/settings/reading-mode` among its routes.

Two things the measuring changed, beyond section 21:

- **Dawn and Incense were repainted.** The stills passed on both, because
  no faint line happened to lie where their pictures were light. The scene
  check asks the question of the picture itself, and found Dawn's sunrise
  reaching the lines still being read and Incense's plume at seven tenths of
  its strength behind them (faint text 2.7:1 and 2.8:1). The sunrise now
  keeps to a little over a quarter of the screen. The plume is a wisp where
  words are read and comes into its strength at the foot. Both are quieter
  than the stills he first saw.
- **Theology's picture plates** throw a black shadow that darkened the name
  under each on three light looks (4.2:1 to 4.5:1). On a light look the
  plate throws its shadow in the look's own ink.

## 23. Held for his word

Nothing in this build changes what Purify Plus includes in words, a price or
a trial. Three lines still name two palettes where there are now twenty, and
they wait for him:

| Where | Today | Draft |
| --- | --- | --- |
| The sheet a reader without Plus meets, its title (`plus.palettes.title`) | Candlelight and Monastery are part of Purify Plus | Twenty reading modes are part of Purify Plus |
| The same sheet, its body (`plus.palettes.body`) | Two reading palettes built for long hours in the Scriptures and the Fathers, easier on the eyes than either default. | Candlelight, Monastery and eighteen looks in four families, each one calm page with a sign of its own, built for long hours in the Scriptures and the Fathers. |
| "Your plan", the Reading modes line (`lib/premium/plans.ts`) | Candlelight and Monastery reading, in the Scriptures and the writings of the Fathers | Twenty reading modes, from Candlelight to the Holy Mountain, in the Scriptures and the writings of the Fathers |

Until he says, a reader without Plus who taps a look meets the sheet as it
is today, which names Candlelight and Monastery and not the look they
tapped. It says nothing untrue; it says less than it could.

He said yes the same morning, and the lines are in: section 28.

Also his:

- **Fire's flames.** They keep a flame's own colours, in the picture at the
  foot of the page. That is the one place gold appears on any look, under his
  own exception ("gold is only ever a flame's own colour").
- **Any look to drop or change.** Each is one id in the registry, one block
  in the stylesheet and its pictures; a look taken out leaves the others
  untouched, and a reader who had chosen it reads Dark.

## 24. Limits, said plainly

- **Wide screens**: a look is its colours and its sign at a chapter's head;
  the scene at the foot stands down (section 21, point 7). A panorama for
  each scene would be new drawing.
- **The status bar on Android 14 and older** is an opaque strip, and it stays
  the app's night colour on every look, as it does on Candlelight and
  Monastery today (`components/native/NativeBridge.tsx`, `barColor`). On
  Night sky, whose page is nearly black, that strip is a shade lighter than
  the page. Not changed here: it is native behaviour, and it wants a phone
  to be seen on.
- **A phone has not seen any of this.** Everything was measured in the
  export, in a browser the size of a phone. The foot's place over the bars,
  the cross-fade on a tap and the pictures' weight on an older phone belong
  on the next phone walk.
- **The five everyday palettes are still named in English** in most
  languages ("Dark", "Light", "True black", "Candlelight", "Monastery";
  Russian has its own). The looks' names beside them are translated, so a
  Greek or Arabic reader sees both on one page. Those five are older words,
  not touched here.
  Done the same day (Updates 2, at the arbiter's word of 07:43 UTC): the
  five are in each language's own words in the 16 catalogs that had them in
  English (Bulgarian, Hungarian, Russian and Ukrainian had theirs), and so
  are the lines that name them in those 16: "Candlelight at Vespers", the
  night reading line and "Dark, Light and True black stay free, always",
  with the Plus row's name where it called a palette by another word, and
  section 27's "Candlelight keeps the season", which came in with the
  English name in the same 16 and which the new test caught on the rebase.
  "Candlelight and Monastery are part of Purify Plus" is left as it was, at
  the arbiter's word: the new words for it drafted above wait on the
  owner's yes, and it is translated with them. Each word was taken from the
  catalog's own word for the thing where it had one (its monastery, its
  candle, its dark palette), and measured on the export in all 21 languages
  at 390 and 360px where the names are drawn: Settings' small pages (66px
  wide, and a word cannot break), the reading mode page, the Plus
  preview's switch (it cuts a long name short) and the Bible's reader
  sheet. Six first choices were too wide and gave way to shorter words of
  the same catalog (Greek Light, and Candlelight in Filipino, Italian,
  Georgian, Nepali and Urdu). `lib/i18n/__tests__/paletteNames.test.ts`
  holds every palette's, look's and family's name to differ from the
  English in every catalog, and no line of another catalog to name a
  palette in English, unless named as a deliberate exception with its
  reason: Jordan and Patmos, places the language spells as English does;
  Roses in French; Linen in Indonesian; and the Plus title until its new
  words come. Stills: `build-89/palette-names-*.png` (Settings in Greek,
  the reading mode page in Georgian, the Plus preview in Filipino, all at
  360px).
  Then, at his "all recs" of about 08:25 UTC, the three Plus lines drafted
  above (`plus.palettes.title`, `plus.palettes.body`, `plus.active.modes`)
  in all 20 catalogs with these names (Updates 2, `47309a23`). Measured on
  an export built with the Plus gate on for both stores, as a reader
  without Plus, in all 21 languages at 390 and 360px: the sheet a tap on a
  look opens and its lit row (title, body, the free three's line), the
  row's name in the sheet, and the preview's head (two lines at most).
  Every word whole, but for three hyphenated ones broken at their own
  hyphen as type breaks them (French dix-huit, Indonesian masing-masing
  and berjam-jam), and Ukrainian's name, cut in the head at both widths:
  the head's word beside it was two long words, so it is one now,
  "Перегляд" (`12a84a1b`), and the name is whole. The palette earned by
  the Cappadocians agrees with the five in Russian, Bulgarian and
  Ukrainian (`d862e24b`). Stills: `build-89/palette-names-plus-lit-el-360.png`
  and `palette-names-cappadocian-ru-360.png`.
- **The new words were written by the chat**, 38 in each of 20 languages,
  and not read by a reader of each language. Places and things of the
  Church were given the Church's own names (Άγιον Όρος, Святая Гора).
- **A reader without Plus** is shown by the page's own test and on a build
  with the gate switched on; the gate's own behaviour (the store, a
  purchase) is not part of this build.

## 25. Seen on the way: the app's own, on the palettes it already has

The checks that held the looks read whole screens, so they also met things
that are not the looks'. None is changed here; each is another chat's
screen. Each was measured on the palettes named, from the export of this
build.

- **Light, accent words under 85 percent.** Light's accent is a graphite
  (`#45454b`), and words written at `text-gold/65` to `/80` or
  `text-gold-pale/70` are 3.0:1 to 4.2:1 on its page (34 places; the Saints'
  Greek line at 3.32:1 is one). The looks have a rule for this; the same
  rule without `[data-look]` in its selector would mend Light.
- **Light, the odd text shares.** The palettes' rules name 45, 50, 55 and 60
  percent. The app also writes 42, 48, 52, 56 and 58 (about twenty places),
  which Light draws as written and which fall short there (Theology's "7
  citations from the Fathers", at 52, is 2.93:1 on Light, 4.10:1 on
  Candlelight, 4.43:1 on Monastery).
- **Settings, the size preview's caption** ("John 1"): 3.82:1 on Dark, 2.31:1
  on Light, 3.66:1 on True black, 2.86:1 on Candlelight, 3.39:1 on Monastery.
- **Settings, First focus on Light**: the caption's first line lies where the
  paper wash over the picture is still thin, 1.94:1 to 3.54:1 by the pixels.
  The same on any light look.
- **Words over pictures**, by the pixels behind them, on the palettes the app
  has: Prayers' verse at its head ("Pray without ceasing.", 1.93:1 on Light),
  You's "Private on this device" (1.40:1 to 2.38:1 on all five), Discover's
  card lines (3.07:1 to 4.49:1), the reading room's "22 min" line on Light
  (3.63:1), and the Plus pill on Candlelight and Monastery (3.59:1, 4.02:1).
  The mock checker calls these "not measured, look", which is right for a
  checker of colours; a picture needs the pixels.
- **Light, Theology's picture plates**: a plate throws a black shadow made
  for the dark, and the numeral under it is 4.32:1 on Light by the pixels.
  The looks throw it in their own ink (section 22).
- **True black, Prayers**: the arrows at 3.21:1 and the Roman numerals at
  3.83:1.

**Mended the same day, by Updates** (added 2026-11-10 by this chat, which
had not recorded it and told the arbiter the list was still open): every
item above was built as PLAN 13h and 13j, a commit and a test for each
kind. The odd shares and Light's cards `14aa6ce8`; Light's accent words
`eb72e554`; Settings' size preview and First focus `389cc3b5`; words over
pictures `af15d22c`; Theology's plates `b65c84b7`; True black's arrows and
numerals in Prayers `f0333363`. PLAN.md's record: on the export, by the
pixels on all five palettes, every place passes, the lowest 4.74:1. The
finds routed with the Plus words are done too: the Plus pages' Terms and
Privacy links `84b85224`, the EIKON Box note `d17c470f`, and the admin's
label for the palettes lock reads "Reading modes".

**Measured again that evening**, on the export of section 32, with the
house's own measure for words on a ground that is not flat
(`scripts/words-on-pictures.mjs`: the ground is taken where the letters
are, and a halo drawn for reading counts as ground), on the five palettes
and the two earned ones, which 13h did not walk. The eight places 13h named
pass on all seven. This chat's own audit still read some of them low, and
it was wrong to: it takes a word's shadow off before it looks, so it cannot
see the halo those words now wear. Four small groups that nobody had named
are under 4.5:1, each in another chat's file, and each has gone to its
owner with the arbiter:

- **Settings, the names under the text size slider** ("Small", "Medium",
  "Extra large"; 10.5px, the ink at 50 percent, `.set-slider-names`): Light
  2.97:1, Candlelight 3.87, Monastery 4.42, Councils and Cappadocian 4.35.
  Dark and True black hold (5.09, 5.22). At the share a track's unchosen
  choices already have (62, Light 72, Candlelight 64) every palette holds:
  5.54:1 at the lowest (Candlelight).
- **Theology's hub** (`components/theology/TheologyHub.tsx`): "1 of 9" on
  Light 4.26:1; "7 citations from the Fathers" on Monastery 4.49, Councils
  and Cappadocian 4.38.
- **The Plus page** (`app/(app)/premium/page.tsx`): "Entirely optional. Give
  once, or not at all.", the ink at 40 percent: 3.82:1 on Dark, Light and
  True black, 2.97 on Candlelight, 3.40 on Monastery, 3.32 on Councils and
  Cappadocian; and "Yearly saves 40% and begins with 7 days free" on
  Candlelight, 4.46.
- **The reading room's covers on Light** (`components/covers/WorkCover.tsx`):
  the author's name on a cover, white at 80 percent over the shade Light
  gives a cover, 3.70 to 4.10:1 ("St. John Cassian", ten covers); a title,
  3.78 to 3.84 ("Hymns on the Nativity"); and "2 h 38 min", 4.49.

## 26. What is left in the repository to hold it

- `scripts/theme-pictures.mjs` makes every picture again, and a test holds
  each drawing on disk to what the script draws, to the letter.
- `scripts/room-walk.mjs` walks every screen of the export in a look for a
  section that covers the room or a patch cut out of a card.
- `scripts/scene-check.mjs` measures each look's picture against its own
  faintest text.
- `scripts/mock-check.mjs` can wear a look: `--looks` on the command line,
  or `checkMock(page, selector, { palettes: [...PALETTES, ...LOOKS] })`. Its
  default is still the five, as CLAUDE.md says a mockup is held.
- Tests: the registry and the pre-paint script against each other
  (`lib/reader/__tests__/readingModes.test.ts`, `prepaint.test.ts`); every
  look's liturgical pairs, its faint text at every share the app writes, its
  accent words and its placeholders, by arithmetic from the stylesheet
  (`lib/ui/__tests__/litPalette.test.ts`, `faintText.test.ts`,
  `placeholderContrast.test.ts`); the pictures against the stylesheet, the
  script and their licensing record
  (`lib/reader/__tests__/themePictures.test.ts`); the page as it is drawn
  (`lib/settings/__tests__/readingModeGallery.test.ts`, `litPanels.test.ts`);
  the cross-fade's rules (`lib/reader/__tests__/themeDissolve.test.ts`); the
  words in 21 languages (`lib/i18n/__tests__/smallLabels.test.ts`).

## 27. Candlelight keeps the season

Built the same day, after the looks, on the arbiter's word ("Candlelight
through the Church year ... fold it into your design ... and build it with
the rest"; PLAN 15, "palettes of the season"; ideas.json s2-03, whose note
recommended this shape: "Candlelight's soft light takes the season's colour,
the page unchanged").

**What a reader sees.** In Candlelight, in the Bible, the soft light that
rests where the eye does takes the colour of the Church's three long fasts:

| When (the app's own calendar, in the reader's reckoning) | The light |
| --- | --- |
| Clean Monday to Holy Saturday (Great Lent and Holy Week) | Violet, the calendar's Holy Week violet |
| The Nativity Fast, 15 November to 24 December | A deep blue, the calendar's Nativity indigo |
| The Dormition Fast, 1 to 14 August | The Mother of God's blue, the calendar's own |
| Every other day: Pascha and its season, the Twelve Days, Palm Sunday, ordinary time | The candle's own white, as it is today |

The page, its black and its ink do not change. One switch, "Candlelight
keeps the season", under Candlelight at Vespers in Settings and in the
Bible's own settings, on until a reader turns it off.

**How.** `lib/reader/candleSeason.ts` asks the calendar which season a day
is in (`currentSeason`) and holds the three lights, each the calendar's own
tone (`lib/calendar/tone.ts`) and a share. `components/reader/CandleVeil.tsx`
is the veil both readers draw; while it is up in a season it says which on
the page's root (`data-candle-season`), only once the device's own day is
known, and takes it away when the reader leaves. In the stylesheet the
season's light is Candlelight's room, laid under the page by the same three
rules that lay a look's picture, and the veil keeps only its dark edges.

**Why behind the words.** The white light lies over the words and can: it
adds to the ink as much as to the ground. A colour laid over light-grey
words takes them down with it, and the stepped-back commentary numbers,
which decided how far Candlelight may step a verse back, fall under 4.5:1 at
once. So a season's light lies behind the words, and is only as full as
leaves every word on the page at 4.5:1 or more where it is fullest.

**What that costs, said plainly.** Two things differ from what was first
put to him:

- **No green at Pentecost.** A green that keeps the words at 4.5:1 on this
  black adds too little to be seen as a colour (at its fullest the ground
  goes from `rgb(5, 5, 5)` to about `rgb(10, 14, 10)`). The same is true of
  the calendar's olive for the Apostles' Fast. Rather than ship a light
  nobody can see, those days keep the white. Violet and the blues carry,
  because the eye gives blue little brightness for its colour.
- **Seasons, not single days.** The Mother of God's blue is for her fast,
  not for each of her feasts: the light follows the seasons the calendar
  already names, and a single day is not one of them.

And one thing is more than was first said: the Nativity Fast has its blue,
which the first proposal left white. It is the calendar's own tone for the
fast, and it is the fast a reader will be in when 1.9 reaches them.

**Measured**, on the export, with the phone's clock set to a day in each
season (25 March 2027, 1 December 2026, 5 August 2027), to an ordinary day
and to Pascha:

- The page says the right season, or none, on each of the five days.
- The ground at the light's centre is `rgb(17, 10, 22)` in Lent,
  `rgb(10, 11, 20)` in the Nativity Fast and `rgb(9, 12, 17)` in the
  Dormition Fast, against `rgb(16, 16, 16)` for the candle's own white and
  `rgb(5, 5, 5)` for the page.
- Every word on John 1, against the pixels behind it, is 4.68:1 or more in
  a season. On the white it is 4.66:1, as it is today.
- `checkMock` passes on the page in Candlelight.
- The season goes when the reader leaves the page (Today in Lent has none),
  the switch turns it off and on from Settings and from the Bible's own
  settings, and a reader on another palette never has one.

41 steps, all as they should be: 34 for the season and 7 for the mend
below. The gates: on the season's commit, typecheck 0, the unit suite 861
files and 10,546 tests, lint 0 errors, and both native exports clean. On
the pushed head, which has the mend and another chat's commit under it,
typecheck 0, the unit suite 861 files and 10,548 tests, lint 0 errors,
and the Android export clean (229.1 MB of 240 on disk, 72.3 MB packed of
85). The iOS export was last run on the season's commit and not again for
the mend, by the arbiter's word on spend ("one build, the checks that
matter, a few stills"). On that last export the looks' own checks were run
again: the room walk (122 screens in two looks, 244 measured, no fault),
the scene check (all 18) and the 36 steps of the looks' walk. No server
code changed, so the website build was not run again.

**Seen on the way, not the season's:**

- **Candlelight at Vespers wore the palette but not the candle's room.**
  Mended the same day, in its own commit: see "The Vespers mend" below.
- **The Bible's progress line grows from the left in Arabic too**
  (`checkMock`, mirror), on every palette, once a chapter is scrolled.

**The Vespers mend.** Found while walking the season: with the Vespers
switch on and Dark the stored palette, at night the page is in Candlelight,
and the Bible's reader drew no lit verse, no soft light and no dark edges
(measured on the export with the clock at 23:30: the root said
`candlelight`, and there was no veil and no reading state). The two readers
asked which palette is stored (`const candle = theme === "candlelight"`),
not which is worn. So a reader who has Candlelight only by Vespers got none
of the candle his picks A and B describe, and no season. The same question
served a second reader wrong the other way: one the Plus gate has refused,
with Candlelight still stored, wears Dark, and the reader still stepped the
verses back as if by candle.

The arbiter's word (2026-11-10, 07:59 UTC): "Yes, mend it, as its own small
commit after the season's push, with a still or two: Candlelight at Vespers
should wear the whole candle his picks A and B describe, and a refused
reader should not get the dimming on Dark."

Both readers now ask what the page is wearing.
`components/theme/useWornPalette.ts` reads and watches the root's
`data-reading-mode`, the attribute the controller and the pre-paint script
set, so the candle comes at sunset, goes in the morning, and follows the
gate's answer, with no reload. Nothing is said on the server, so the export
bakes no candle in. `lib/reader/__tests__/candleSeason.test.ts` holds both
readers to it.

Measured on the export, the phone's clock at 25 March 2027:

- 23:30, Vespers on, Dark stored: the veil, the stepped-back verses and one
  lit verse are there, the light is Lent's violet, and every word is 4.69:1
  or more. The still is byte for byte the still of Candlelight chosen
  outright on the same page.
- 13:00, the same reader: Dark, no candle, no season.
- Candlelight stored and the palette taken off the root: no veil, no
  stepped-back verses, no season. That is the refused reader's state reached
  by hand. The gate itself needs a gate-on build, which was not made for
  this; the controller's own line is what puts that reader on Dark
  (`allows(wanted) ? wanted : allows(stored) ? stored : "default"`).

**Limits.** The light is in the Bible's reader, where Candlelight's own
light is; the rest of the app in Candlelight is unchanged. Candlelight at
Vespers and this switch are independent: one says when Candlelight is worn,
the other what its light is. The two lines of words are in 21 languages,
with each language's own names for the three fasts taken from its catalog,
written by the chat and not read by a reader of each.

## 28. The words about Plus, as he approved them

His word, 2026-11-10, about 08:25 UTC, in `docs/1.9-build/BRAINSTORM.md`:
"all recs". The arbiter gave it to this chat as yes to the three lines of
section 23 as drafted, and yes to the six questions as recommended (Fire's
flames keep a flame's colours; the foot; Candlelight and Monastery kept; all
18 looks; the new words; the earned two on the picker's last shelf). None of
the six changes what is built. The arbiter added the row's own short name
the same morning ("the same approved words in its own short form"), so four
lines changed, in one commit:

| Where a reader meets it | Key or file | Now |
| --- | --- | --- |
| The sheet a reader without Plus meets: the lit row's title | `plus.palettes.title` | Twenty reading modes are part of Purify Plus |
| The same row's body, and the row's line in Your plan | `plus.palettes.body` | Candlelight, Monastery and eighteen looks in four families, each one calm page with a sign of its own, built for long hours in the Scriptures and the Fathers. |
| The row's short name: Your plan, the paywall's list, a preview's head, "Purify Plus is active" | `plus.active.modes` | Twenty reading modes |
| The plan's page, the Reading modes row | `lib/premium/plans.ts`, English | Twenty reading modes, from Candlelight to the Holy Mountain, in the Scriptures and the writings of the Fathers |
| The same row in German | `lib/premium/plans.ts`, German | Zwanzig Lesemodi, von Kerzenlicht bis zum Heiligen Berg, in den Schriften und den Werken der Väter |

**The count is held to the registry.** Twenty is Candlelight, Monastery and
the eighteen looks. The two palettes earned by reading are not in it: Plus
alone does not open them. `lib/premium/__tests__/plans.test.ts` counts the
registry and fails the day a look is added or dropped, and says why the
words then wait: they say what Plus includes, which is his to say.

**The other languages.** The three catalog keys changed in English only.
The other twenty catalogs keep their old words until the Updates 2 chat
translates them in its pass on the palettes' names (the arbiter's routing;
the keys went to that chat). Until then a reader in those languages sees the
sheet name Candlelight and Monastery, which is less than is true and
nothing untrue. The plan's page has only English and German, and both are
in. The German row is drawn by the website alone, by the reader's language
on the server, so it was not seen on the export: the unit test holds it
letter for letter.

**Not touched.** The admin's own label for this lock
(`lib/analytics/lockCounting.ts`, "Candlelight and Monastery") is the
Admin chat's, and is told to the arbiter. The try screen under the row
still shows Candlelight with Dark and Monastery beside it: a preview, not a
count.

**Measured**, on an export built with the gate on for both stores, as a
reader without Plus (2026-11-10):

- A tap on a look opens the sheet, and its lit row has the new title on two
  lines and the new body on four, both whole, with "Dark, Light and True
  black stay free, always." under them. None of the old words is left on
  the sheet.
- The preview's head says "Twenty reading modes", on one line.
- The plan's page has the new Reading modes row, whole, on three lines. The
  app's checker passes on the Plus card and on the row.
- The earlier walk of a reader without Plus passes again: a stored look is
  put down, each family says Plus once, a tap changes nothing, Light still
  applies.
- Typecheck 0, the unit suite 862 files and 10,554 tests, lint 0 errors,
  and the Android export clean with the gate on. The export and lint were
  run before the last rebase, which brought three other chats' commits
  under this one; typecheck and the unit suite were run again after it.

**Not seen.** Your plan draws the rows by their short names only for a
subscriber, whose plan it reads from the account, so a walk with no account
cannot reach it; the two keys it draws are the ones seen on the sheet and
at the preview's head. The German row is the website's. The iOS export and
the website build were not run for four lines of words.

**Seen on the way, the sheet's own and older than these words.** The app's
checker does not pass on the whole sheet, so no still of the sheet was
sent:

- Three names in the sheet's list of supporters are 4.45:1 on Light; the
  floor is 4.5:1.
- The Terms and Privacy links at the sheet's foot are 34 and 41px wide (47
  tall); the floor is 44 by 44.
- The checker counts each row's Try it as 48 by 20px. That one is the
  checker's misreading: the button's `::after` covers the whole row (348 by
  190px on the lit row), and a tap in the row's corner lands on the button.
  Either the checker learns that shape or the button says so by name.
- On the plan's page, the Pro card's note "The EIKON Box is claimed, not
  sent automatically" is 2.31:1 to 3.82:1 across the palettes.

All four went to the arbiter.

**A thought, built the same morning.** The preview under the row is headed
"Twenty reading modes" and let a reader try three palettes: Dark,
Candlelight and Monastery. It promised nothing false, and it shows the
looks better with one of them in it: section 29.

## 29. The Plus preview shows a look

The arbiter's word, 2026-11-10, 08:56 UTC, on the thought at the end of
section 28: "let the preview under 'Twenty reading modes' show one of the
looks beside Dark, Candlelight and Monastery (Night sky, or the one that
reads best there), one small commit, a still at the push."

**What a reader sees.** In the sheet a reader without Plus meets, the
reading modes row ends in Try it, and its preview is John 1 in a window.
Under the window stood one carved switch of three: Dark, Candlelight,
Monastery. Four small pages stand there now, Settings' own (`ModeTile`):
Dark, Candlelight, Monastery and Night sky. A tap repaints the window and
nothing else. In Night sky the window has what a reader's screen has: the
sky behind the page, and the star over the horizon in the place of the
short rule at the chapter's head.

**Why Night sky.** Tried on the export by restyling the built preview. Its
sky lies behind the whole page and its sign is at the chapter's head, so
both are seen in a window that has no bar and no foot, and every word stays
at 4.5:1 or more. The Holy Mountain, which the plan's line names, was tried
too: its picture is at the foot, where a reader's screen fades the page's
last lines and a window does not, and verse numbers over it fell to 3.09:1.

**Why not the switch.** Four names do not fit one carved switch. Measured
on the export in the 21 languages at the switch's own type, with segments
as wide as their names: a name is cut at 390px in 5 languages and at 360px
in 14. With equal segments it is cut in English too. Settings' small pages
carry a name of any length under them and are what a reader picks from once
they have Plus. They add 34px to the preview's height.

**How.** `lib/premium/plusTry.ts` gains Night sky's four colours
(`TRY_PALETTES`, held to `html[data-look="nightsky"]` by the test) and
names it the look (`TRY_LOOK`). `components/billing/plusTry/TryReadingModes.tsx`
draws the row with `ModeTile` and marks the window's wrapper
`data-try-look` while the look is shown. The stylesheet gives that window
the small page's own sky (the test holds the two layer for layer) and puts
the star over the horizon on the page's short rule (`.try-page-rule`,
`TryBible.tsx`), mirrored in Arabic as the reader's is. The row keeps one
scale on every screen (`.set-modes.plus-try-modes`).

**Mended in passing.** The chapter line of that page ("Chapter 1") was
`text-paper/55`. In Candlelight, which the preview opens in, it measured
4.48:1 under the window's glow. It is 60 now, on every preview that draws
the page.

**Measured**, on an export built with the gate on, as a reader without Plus
(42 steps, all as they should be):

- Four small pages under the window, by name. It opens in Candlelight, lit,
  and no page is marked as locked. Each is a target of 48 by 86px.
- A tap on each repaints the window alone: the reader's own palette, and
  what is stored, never change. Only Night sky wears a look.
- In Night sky the sky is behind the page and the star over the horizon
  stands at the chapter's head (274 by 64px). On the other three the page
  keeps its short rule.
- Every word against its pixels, in the window and around it: 4.51:1 at
  the lowest in Candlelight (a verse number), 5.36:1 in Dark and in Night
  sky, 5.34:1 in Monastery, and 5.23:1 for a reader on Light.
- `checkMock` passes on the preview and on its head, for a reader on Dark
  and for a reader on Light.
- The line under the row and Next stand clear of the Join bar on a 390 by
  844 screen, with 59px to spare.
- Greek at 360px, the longest names: four names whole, two of them on two
  lines, inside the sheet, and the sheet does not scroll sideways.
- Arabic: the four run from the right, and the star over the horizon is
  mirrored.
- The words' walk of section 28 and the walk of a reader without Plus pass
  again on the same export.
- Typecheck 0, the unit suite 866 files and 10,618 tests, lint 0 errors,
  and the Android export clean with the gate on (229.1 MB of 240 on disk,
  72.3 MB packed of 85). The export and lint were run before the last
  rebase onto other chats' commits; typecheck and the unit suite again
  after it.

**Found by the walk before the push, and mended.** The names under the
small pages were 3.73:1 for a reader on Light. Settings draws them at 60 on
a panel, and the sheet's ground is not a panel's. Here they take 75, the
share the reading modes' own page uses.

**Not done.** No iOS export and no website build. No phone has seen it.

**Seen on the way, not this change's.**

- Settings' own row draws those names at 60 for every reader. Measured the
  same morning on the export, for a reader on Light: 3.81 to 3.90:1 by
  their pixels. It is the row as 1.8 built it. Told to the arbiter.
- In Arabic the previews' English verses are laid out right to left, so a
  line's full stop stands at its start (".was God"). The app's small page
  marks its sample verses as English, left to right; the previews' page
  does not. Told to the arbiter.

## 30. Two small mends found beside the preview

The arbiter's word, 2026-11-10, 09:34 UTC, on the two finds at the end of
section 29: "Yes to both of your finds, from you, each one line with its
test: (1) .set-mode-name to the share that holds 4.5:1 for every reader
(Light included); (2) lang="en" dir="ltr" on the previews' sample verses
... as Settings' small page has. One small commit, a still at the push."

**The names under Settings' small pages.** 1.8 drew them at 60 percent of
the palette's ink. Measured on the export against their pixels, on all 25
palettes: a name was under 4.5:1 for a reader on Light (3.81:1) and on ten
more palettes, 3.67:1 at the lowest (Jordan), and 4.46:1 on Candlelight's
lit panel. By share, the lowest name anywhere:

| Share | Lowest name, by its pixels | Palettes under 4.5:1 |
| --- | --- | --- |
| 60 (as it was) | 3.67:1 | 11 |
| 64 | 4.13:1 | 9 |
| 66 | 4.32:1 | 5 |
| 68 | 4.57:1 | none |
| 70 | 4.88:1 | none |

It is 70 now: 68 is the least that holds, and 70 leaves room. One number
in `.set-mode-name`. The reading modes' own page and the Plus preview set
their own share (75) and keep it. The app's checker cannot see this one:
the panel's ground is a picture, so it measures nothing there. The test
does the arithmetic on every palette's own ground with a floor of 4.7,
since the pixels read up to 0.17 under the arithmetic, and so fails at 66
and passes from 68 (`lib/settings/__tests__/litPanels.test.ts`).

**The previews' verses in Arabic.** The page of Scripture two previews
draw (the reading modes and Ambience; `JohnPage`,
`components/billing/plusTry/TryBible.tsx`) holds the app's own English
text. In a sheet that runs from the right the verses ran with it, and a
line's full stop stood at its start (".was God"). The verses now say what
they are, `lang="en" dir="ltr"`, as Settings' small page does; the book's
name and the chapter's line stay in the reader's language and direction
(`lib/premium/__tests__/plusTryScreens.test.ts`).

**Measured**, on the export, with the gate on:

- The names as the export draws them: the ink at 70 percent.
- Every name under a small page in Settings, against its pixels, on all 25
  palettes: 4.88:1 at the lowest (Roses). For a reader on Light they are
  5.05 to 5.20:1, where they were 3.81 to 3.90:1.
- In Arabic the preview's sheet and the page's head run from the right. The
  verses say they are English and run left to right, each line from the
  window's left edge with the verse's number before its words. Every word
  there is 4.51:1 or more.
- The preview's walk of section 29 (42 steps), the words' walk of section
  28 and the walk of a reader without Plus pass again on the same export.
- Typecheck 0, the unit suite 868 files and 10,662 tests, lint 0 errors,
  and the Android export clean with the gate on. The export and lint were
  run before the last rebase onto other chats' commits; typecheck and the
  unit suite again after it. The export is 203.2 MB on disk and 64.6 MB
  packed now: another chat's commit of the same morning prunes router files
  the apps never read, and none of the drop is this change's.

**Not done.** No iOS export and no website build. No phone has seen it.

**Left as they are.** Four other previews draw one English verse in their
own markup (`johnVerse()`: Your mark, cross-references, Remember a verse,
the Florilegium). They were not looked at in Arabic here. Told to the
arbiter.

## 31. The prayer page wears the theme (build 90, note 8)

His note on build 90, 2026-11-10: "I mean, overall, let's change the
background design also. Like, make it more, like, fit the theme the user
picked." The plan is note 8 of `notes/build-90.md`; his word on it, about
13:50 UTC, "All recommendations. Start.", with yes to its three calls. The
code is `1d2deb67`.

**What it was.** Every prayer prayed line by line is one component
(`components/prayers/PrayerRuleReader.tsx`). Behind its words it drew the
page's own icon, large, blurred and grey, at 22 percent, with a white
breath over it: one neutral light, the same on every palette and laid over
it. True black was rgb(18, 18, 18) at the screen's edge, a look's colour
went grey where the prayer is read, and paper took an even grey shade.

**What it is.** The ground is the palette's own, whole, and the light
behind the prayer is the palette's own, a soft pool or nothing
(`components/prayers/service/PrayerLight.tsx`; `app/globals.css`, "While
you pray"):

| Palettes | The light | Its share of the ink |
| --- | --- | --- |
| Dark, True black, Candlelight | A pool where the prayer is read, two fifths down, and a slow breath over it while motion is on | 6 percent and 3 |
| Monastery | The same | 5 and 2 |
| Councils, Cappadocian | The same | 3.5 and 1.5 |
| The nine dark looks | Nothing: the look's picture is its sign, and nothing moves on a look | |
| Light and the nine light looks | Nothing: light cannot glow on paper | |
| Candlelight in one of the three long fasts | The fast's light in the room, as in the Bible (section 27), and neither pool nor breath over it | |

Each share is the most that leaves every word on the page 4.5:1 or more
with the pool and the breath at their fullest behind it; the prayers' notes
decide it on Monastery, Councils and Cappadocian. The lit line's glow is
the palette's ink at 35 percent, where a white was typed in.

**A look's steps back.** While a prayer is prayed the prayers before and
after it step back (`--prayer-rest`), and its own other lines a little less
(`--prayer-unlit`). A look took Dark's steps or Light's and its picture was
never asked. Asked now, of the picture alone, anywhere above the place the
look's foot begins: the closing line (the ink at 85 percent) may step back
to between 57 and 61 percent on the nine dark looks and to between 73 and
82 on the light ones. So the dark looks step back as far as Monastery (62
and 74), Light's steps (80 and 86) hold on the light looks, and Blush steps
back to 83 and 89.

**The season.** `useCandleSeason(active)` is the veil's own effect as a
hook (`components/reader/CandleVeil.tsx`): the veil always says the season,
the prayer page while Candlelight is the palette worn
(`useCandlelightWorn`, section 27's mend). Two pages say it now, so each
takes away only its own word when it is left.

**The measure, corrected.** The walk found three faults in how a word is
held to its pixels. They are mended in `scripts/lib/pixel-audit.mjs`, which
is the scratch audit of sections 22 to 30 brought into the repository:

1. A line that has gone part way under the bar at the head of the screen,
   or has the rim of something floating over the page across its last rows
   (the prayer page's "Pray with chant"), was held to that rim. A prayer's
   name read 4.48:1 where it stands at 5.25:1. The covered rows are left
   out now.
2. A word still fading in was measured part way ("Pray with chant" at
   1.76:1 a fifth of the way in; the chant's question as it rose). A word
   inside something whose strength is changing at that moment, once, is
   measured where it rests.
3. **A look's foot was counted from the wrong place.** The foot is the
   look's picture drawn over the page's last lines by an eased share: none
   at `--foot-clear` (240px on most looks) from the screen's foot, a
   quarter by 72 percent of that. The audit left a line out only below the
   quarter. But it holds a word's own colour to the pixels behind it and
   cannot see a veil over the ink, so in that first quarter it overstated
   every line; and even overstated, Dawn's faint instruction read 4.46:1
   there. A line in the foot that the page can still bring up clear of it
   is left out now, from where the foot begins; a line that rests in the
   first quarter at a page's end is still held.

What that means for what this file said before: section 22's "1,884 words,
none under 4.5:1" on the Bible and Today, and the pictures' counts after
it, were measured with the old line. They are sure above where the foot
begins. For a line in the foot's first quarter they say more than the
measure knows: such a line is up to a quarter veiled, by the foot he
settled in section 16 ("a page's last lines go quiet into the picture from
240px above the foot"). `scripts/scene-check.mjs` still holds each
picture, alone, to carry the look's faint text down to the quarter, which
asks more of the picture than the foot leaves a reader to see.

**Note 8's own claim, corrected.** The plan said every word on the prayer
page was 4.5:1 or more on all 25 palettes as it stood. That came from one
resting place. With the old light put back on the build exactly as its
stylesheet had it at `75051aec`, and each word held to its pixels at 21
places down The First Hour: the prayers' notes and instructions were under
4.5:1 on Monastery, Councils and Cappadocian (4.49, 4.38, 4.36), and a
caption on Blush (4.49). The note is corrected where it said so.

**Measured**, on the Android export built from `8c90dad9` with this
change on it, opened the way a phone opens it, 390 wide:

- `node scripts/prayer-ground-walk.mjs`: 256 checks, all passing.
  - **Words.** The First Hour (21 places down the page), the morning rule
    (16), the Akathist (3) and a reader's own rule (13), each from its head
    to its end on all 25 palettes, and The First Hour again with the app in
    Arabic: 43,421 words held to their pixels, none under its floor, with
    the pool and the breath held at their fullest behind every word on the
    six palettes that have them. The places measured cover each page from
    its first line to its last, and no page's last line rests inside a
    look's foot. The lowest small word on each palette, and the lowest of a
    prayer's names, which are large type and step back:

    | Palette | Lowest small word | Lowest name |
    | --- | --- | --- |
    | Dark | 4.95:1 | 5.25:1 |
    | Light | 4.71:1 | 5.01:1 |
    | True black | 5.31:1 | 5.66:1 |
    | Candlelight | 5.07:1 | 5.29:1 |
    | Monastery | 5.06:1 | 5.20:1 |
    | Night sky | 5.59:1 | 5.74:1 |
    | Dawn | 4.62:1 | 5.66:1 |
    | Fire | 6.05:1 | 5.83:1 |
    | Incense | 5.49:1 | 5.08:1 |
    | Holy Mountain | 4.65:1 | 5.64:1 |
    | Forest | 5.59:1 | 5.69:1 |
    | Desert | 5.14:1 | 5.40:1 |
    | Jordan | 5.03:1 | 5.34:1 |
    | Galilee | 6.36:1 | 5.67:1 |
    | Patmos | 5.94:1 | 6.30:1 |
    | Blush | 4.89:1 | 5.50:1 |
    | Roses | 5.10:1 | 5.30:1 |
    | Lavender | 4.96:1 | 5.25:1 |
    | Olive | 5.07:1 | 5.32:1 |
    | Mosaic | 6.24:1 | 5.51:1 |
    | Stone | 5.07:1 | 5.42:1 |
    | Damask | 6.60:1 | 5.57:1 |
    | Linen | 5.88:1 | 5.82:1 |
    | Councils | 5.00:1 | 5.22:1 |
    | Cappadocian | 5.04:1 | 5.19:1 |

  - **The ground**, mid-prayer on The First Hour with the words taken out.
    On the six plain dark palettes the screen's edges are the palette's own
    colour (True black rgb(0, 0, 0), where it was rgb(18, 18, 18); Dark
    rgb(16, 16, 19), where it was rgb(30, 30, 33)), the pool is there where
    the prayer is read (rgb(22, 22, 22) and rgb(36, 36, 39), where the old
    light stood at rgb(30, 30, 30) and rgb(43, 43, 45)), and it lies between
    138px and 536px of the screen's 844. On the 18 looks and on Light the
    page is pixel for pixel what it is with no light at all, and Light's
    paper is rgb(241, 232, 212) at the edges and where the prayer is read.
    The lit line glows in the palette's own ink on all 15 dark palettes.
  - **Still.** On the 18 looks and on Light two pictures of the screen a
    moment apart are one picture. The breath drifts on the six plain dark
    palettes while motion is on. With the app's motion off it is still on
    all six, the screen does not change, and every line and every prayer's
    name of the Hour, 56 of them, stands at full strength.
  - **The fasts**, the phone's clock set to a day of each, Candlelight
    stored. An ordinary day: no season, the candle's own pool and breath.
    Great Lent, the Nativity Fast and the Dormition Fast: the root says
    the fast, its light is in the room, neither pool nor breath is drawn,
    and every word of the Hour is 5.07:1 or more with the fast's light at
    its fullest behind it. From the prayer to a chapter of the Bible the
    season is still said, by the veil; back on the prayer it is still said;
    on Today it is gone. With the switch off, or in Dark, none is said. In
    Dark with Candlelight at Vespers on, after sunset, Candlelight is worn
    and the season said.
- `checkMock` on The First Hour and the morning rule, at the head and
  mid-prayer, on all 25 palettes: every check passes. One allowance, said
  on the thing itself: the breath drifts from side to side and back, the
  same in every language, so it does not mirror in Arabic (the breath
  before it drifted the same way).
- `scripts/scene-check.mjs`: all 18 pictures carry their faint text down
  to the foot's quarter as before, and a prayer's closing line stepped back
  above where the foot begins; the tightest are Lavender 4.60:1, Roses and
  Olive 4.63:1, Incense 4.67:1 and Jordan 4.69:1.
- `scripts/room-walk.mjs`: 246 screens, nothing covers a look's room.
- The stills, four themes on the morning rule mid-prayer (Dark, Candlelight
  in the Nativity Fast, Night sky, Patmos), each worn as a reader chooses
  it and each passing `checkMock`: the page's section "The prayer page
  wears the theme".
- Typecheck 0. The unit suite: 900 files and 11,154 tests pass and one
  fails that is not this change's, `lib/bible/__tests__/commentaryPlaces.test.ts`
  (seven places in Luke 13's commentary; it fails on the branch's head with
  this change taken out, and has gone to the arbiter). Lint 0 errors; its
  12 warnings are in files this does not touch. The Android export is
  clean, 195.2 MB on disk and 68.0 MB packed. The export, the walks and
  lint were run on `8c90dad9` with this change on it; typecheck and the
  unit suite again after the rebase onto `b271f345`.
- Those last two ran on packages a pull had since changed (`814f8ea0` took
  the SQLCipher plugin and 14 packages out; the arbiter's word of 16:19
  UTC, read after the push). Run again after `npm ci`, on `5e8057e7`:
  typecheck 0, and the unit suite 901 files and 11,155 tests, all passing,
  the Luke 13 test mended by its own chat (`5db4bf33`). The export that was
  walked was built before that change and still held the plugin's files;
  nothing on a prayer page reads them, and the next export will not have
  them.

**Not done.** No iOS export and no website build (no server code changed).
No phone has seen it: True black on an OLED screen, a long Hour scrolled
on an older Android, and Candlelight on the phone's own date in a fast are
on the phone walk.

**Left as they are, and told to the arbiter.** The looks' faint text is
held to the foot's quarter, as it was built. No walk says where each
page's last words rest on a look (the prayer pages' last lines rest clear
of the foot); a page whose last words rest inside a foot would keep them
part veiled.

## 32. After note 8: a page's end on a look, the strip above the page, and the two other builds

The arbiter's order of 2026-11-10, 17:12 UTC, under his "I want everything
in version 1.9" (BRAINSTORM.md): of the list this chat sent with note 8's
report, build 2 (the status bar on Android 14 and older), 5 (the last-words
walk, with its margins) and 8 (the iOS export and the website build) now.
Items 1, 3 and 4 went to him with the arbiter's recommendations. Item 10,
the contrast sweep, had been built that morning by Updates (section 25's
addendum, above): nothing of it was built twice.

**A page ends above its foot (item 5, `fa1f1a1f`).** The prayer page's walk asked where
a prayer's last line rests on a look, and nothing asked it of any other
page. Asked of every route of the export, in Olive: on 88 of 123 screens the
page's last words rested inside the foot, on 68 of them below its quarter.
The foot is the look's picture drawn over the last 240px of the screen, and
the app's frame leaves room under a page for the bars alone, 86px, so the
last row of a page had nowhere higher to go. Settings' last row, "About",
stood half taken by Olive's sprigs; on the sign-in page "Continue with
Google" was washed out and the line at its foot, "Glory to God for all
things.", was under the picture altogether. (He had sent this kind of note
before, of the mini player, on 2026-10-29: "it hides the bottom, the very
bottom of the screen".)

Now, on a look with a foot, at the widths the foot is drawn at:

- the frame leaves the foot's own height under the page (`--foot-clear`), or
  the bars' height where they stand taller (a mini player over the tab
  bar): `.safe-pb` and the reader's `.safe-pb-reader`, each as the larger of
  the frame's own sum and the foot;
- the sign-in pages, which stand outside the frame, end above the foot the
  same way (the shell under `body` with no frame inside it).

Three rules in `app/globals.css` ("The page ends above its foot"), in the
looks' own block; no component is touched. A reader on a look scrolls about
154px further at a page's end and sees the look's picture whole under the
last words. Two screens made to fit between the bars exactly (the saints'
web, a chant's screen) now scroll by that much on a look, which is what
lets their last lines come up clear too.

Held by `lib/ui/__tests__/lookFootRoom.test.ts` (the room is the foot's own
length, on exactly the looks that have a foot, only at phone widths, and it
is written against the frame's own sum so the two cannot drift) and by a new
walk, `node scripts/last-words-walk.mjs`: one page of every route, at its
end, the lowest word or control of the page's own flow against where the
foot begins. The routes come from `scripts/lib/screens.mjs` now, which
`scripts/room-walk.mjs` reads too.

**The strip above the page (item 2, `0ef3741a`).** On Android 14 and older the status
bar is an opaque strip the app paints. It was the app's night colour on
every palette but True black, so it was a grey band over Candlelight's and
Night sky's black and a neutral one over Mosaic's lapis and Damask's wine
(section 24's limit). It is now the page colour of the palette the app is
WEARING, for every dark palette: the nine dark looks, and Candlelight,
Monastery, Councils and Cappadocian, which had the same band. What is worn
and not what is stored, so a look the gate has put down, or Candlelight at
Vespers over a reader's own palette, paints the right strip; the bridge
watches the root's two attributes and repaints when they change.
`lib/reader/statusBarColor.ts` is the rule, pure and tested;
`components/native/NativeBridge.tsx` reads the page and paints.

Light and the light looks keep the dark strip Light has always had. Whether
Light's strip should be its own paper with dark marks is his call, put to
him by the arbiter with two stills
(`notes/decisions/themes-1-light-today.png` and `themes-2-light-matched.png`):
it would change how the free palette looks on those phones, so it is not
done without his word.

No screen here shows that strip: only a phone on Android 14 or older does.
`lib/reader/__tests__/statusBarPalette.test.ts` holds what can be held: the
colour for each of the 25 palettes, in the form the status bar takes; that
every strip is dark enough for the light marks drawn on it; and that the
bridge paints what is worn and repaints when it changes.

**The two other builds (item 8).** On `18f61f63`: `npm run build:ios`
clean, 177.8 MB on disk in 6,747 files and 62.6 MB packed; `npm run build`
(the website, a build only, nothing deployed) clean, 6,123 pages. Both had
gone unrun since the looks (sections 28 to 31 say so each time).

**Measured**, on the Android export built from `83378eab` with these on it
(177.9 MB on disk, 62.7 MB packed):

- `node scripts/last-words-walk.mjs`. Before, on the iOS export of
  `18f61f63`, in Olive: the last words of 88 of 123 screens rested inside
  the foot, 68 of them below its quarter. After, in four looks, one of each
  height of foot and one more (Mosaic 246px, Patmos 244, Olive and the Holy
  Mountain 240): 492 screens, every one rests clear; the lowest rests 1px
  above where the foot begins (a council's canons, whose last link ends the
  page with no margin of its own).
- `scripts/room-walk.mjs`, through the shared list: 246 screens, nothing
  covers a look's room.
- The prayer pages again, since their end changed: `prayer-ground-walk.mjs
  --part words` on eight palettes (Dark, Light, Dawn, the Holy Mountain,
  Jordan, Patmos, Olive, Mosaic), four pages head to end, 9,437 words, none
  under its floor. One run read "Choose" at 1.24:1: the chant's question had
  put itself away between the audit's two pictures. The audit asks each
  word's place again after the second picture now
  (`scripts/lib/pixel-audit.mjs`, `02cf9235`), and the page passes.
- The house's export walk, whole (`PW_CHROMIUM=/opt/pw-browsers/chromium
  node scripts/export-walk.mjs`): 1,596 checks pass and 26 fail, none in
  what changed here. 23 are in sections 58 and 59, which were added to the
  walk after this export was built, so they say nothing of it. Three are in
  older sections: 1 (the commentary's file is asked for where the check
  expects none), 12 (a tap on a page at rest selects the verse) and 35 (a
  read-aloud cover ships inside the app). They read like checks that have
  fallen behind the day's changes; they have gone to the arbiter.
- Typecheck 0, the unit suite 915 files and 11,379 tests, lint 0 errors, on
  `447e7860` with these on it; typecheck again on the pushed head, after a
  rebase that brought another chat's commit under them.

**Not done, and his on a phone.** The strip on an Android 14 or older phone.
The end of a page on a look, with a thumb: whether the extra room at the end
feels right. Both are in the handoff's phone-walk lines.

**Left as it is.** The website at a phone's width is not the apps' export
and was not walked: a Plus reader wearing a look there has the site's last
lines in the foot as before. At a tablet's width the Bible's last lines show
again under the reader's dock and beside the tab bar, on any palette (seen
in `notes/decisions/themes-3-wide.png`); told to the arbiter for Updates.

## 33. Fire comes out of the looks (his word, 2026-11-10)

**His word**, about 17:20 UTC (BRAINSTORM): "also I don't really like the
fire theme", then, of the two ways put to him (remove it, or redesign it):
"remove fire". The arbiter's order: out of the picker and out of the Plus
lists and counts in every language; a device that has it set falls back to
the nearest plain dark palette, held by a test; the code and the drawing
kept, out of reach; the share picture's own Fire style left as it is. The
looks had not been released, so no reader ever had Fire.

This reached me late. The arbiter sent it at 17:14 UTC and it sat unread in
my queue while the walks of section 32 ran, so Fire came out after items 8,
2 and 5 and not before them, as ordered. Nothing was built on the wrong
order. The queue is read at every break in long work now.

**What changed.** There are seventeen looks, eight over Dark and nine over
Light, and 24 palettes in all.

- `lib/reader/readingModes.ts`: Fire is out of the registry, so the picker,
  the Bible's chips, the gate and the server's write no longer know it.
  `RETIRED_THEMES` says what a stored `fire` reads as, and
  `coerceReadingTheme` applies it for every reader of a stored palette.
- `lib/reader/prepaint.ts`: out of the pre-paint list, and the same stand-in
  written into the script, so a device that stored Fire opens in its
  stand-in from the first paint and not in Dark for a frame.
- `app/globals.css`: its rules are gone (the look, its lit surface, its faint
  text, the ember at a chapter's head, its small page in the picker), and
  `public/themes/fire-room.webp` no longer ships (104 KB).
- The 21 catalogs: `settings.paletteFireHint` is gone from each.
- The counts, in words, in 21 languages: twenty reading modes became
  nineteen and eighteen looks became seventeen, in `plus.palettes.title`,
  `plus.palettes.body`, `plus.active.modes` and
  `premium.plus.readingModes.sub`, and in the plan's row in
  `lib/premium/plans.ts` (English and German). These are his approved lines
  of section 28 with the number changed and nothing else: the arbiter's
  word, "the plain consequence of his remove fire, not new copy".
  `lib/premium/__tests__/plans.test.ts` reads the English and German against
  the registry, and `planWords.test.ts` holds each language's row to its own
  count word.

**The stand-in is Candlelight.** "The nearest plain dark palette" was mine
to name, and the arbiter agreed it. Fire's page was near black (#040301)
with warm ink; Candlelight's is #050505 with a warm grey ink, it is a
palette of its own with no picture, it sits in the same family (Night), and
it is Plus as Fire was, so the same reader is entitled to it and nobody
gains or loses a palette by the change. Dark would have been the other
choice; it is plainer still, but it is a different page (#101013, a blue
grey) and free, which reads as "your choice was thrown away".

**Nothing made is deleted.** What Fire was is in
`docs/1.9-build/kept/fire-look/`, where the apps and the website do not
reach: its rules as they stood (`fire.css`), its picture (`fire-room.webp`),
its line in 21 languages (`words.json`), one still of John 1 in it
(`fire-look-2026-11-10.png`, taken from the export before the change, the
checker run on it), and a note that says what it is, its date, why it is
there and the five steps that would bring it back. The code that paints its
picture is still in `scripts/theme-pictures.mjs` and runs only with
`--kept`, into that folder. `docs/licensing/THEME_PICTURES.md` records the
picture as kept, not shipped. The still and its date have gone to the SSM
chat for the Vault.

The share picture's Fire style (`picture.look.fire`, his pick of
2026-10-30) is a different thing: untouched, and a test says so.

**What holds it.** `lib/reader/__tests__/retiredThemes.test.ts`, 12 tests: a
stored `fire` reads as Candlelight and nothing else changes for any other
stored value (names that only look like one, `constructor` among them, are
Dark as before); the pre-paint script leaves exactly what the controller
would; the server refuses `fire`; no shelf, no rule, no picture and no
catalog line of it is left in the app; the kept folder holds what it says
and nothing the apps are made of loads from it; the share picture's Fire
stays. Fourteen other tests counted the looks and follow: 18 to 17 looks,
25 to 24 palettes, 16 to 15 looks with a foot, nine to eight painted
pictures, 44 to 42 words. The Hungarian "Wi-Fire" lets go of its exception
in `paletteNames.test.ts`, since Fire is no longer a palette's English name.

**Proven on the export** (open build, of this change on `4e263ada`; the
commit is `aa0eac68` since a rebase put the day's other work under it):

- A device that stores `fire`, opened on Today and on John 1: the root's two
  attributes were recorded from before the page's own code ran. They read
  nothing, then Candlelight, and nothing else: Fire is never on the page,
  and there is no frame of Dark. The device still stores `fire`; it is read
  as Candlelight each time.
- The picker: 24 palettes, each once, on six shelves. The Night shelf is
  Night sky, Dawn, Incense, Candlelight. No tile is named Fire and the page
  says Fire nowhere. `checkMock` passes on the page on the five palettes.
  The still is `notes/decisions/themes-4-picker-without-fire.png` (the open
  build, so as a reader with Plus sees it).
- Settings' own row has no Fire.
- The Plus page's reading modes row says its catalog's own line, whole, in
  all 21 languages at 360 and 320 wide: found by its words, not cut, not
  clamped, inside the screen.
- The export itself: no file, rule or line of the look is in `out/`.
- `scripts/scene-check.mjs`: 17 of 17 looks.
- Typecheck 0; the unit suite 918 files, 11,394 tests; lint 0 errors.

**Not checked here.** The sheet a reader without Plus meets, and the
preview's head, draw the count too (`plus.palettes.title`,
`plus.active.modes`). They are only on a build with the gate on, which this
one was not. The words are a few letters longer in most languages
("Tizenkilenc" for "Húsz" is the most); they go on the gate-on build that
follows with the next change.

**One comment left stale on purpose.** `scripts/mock-campaigns.mjs` says
"the eighteen looks" twice in comments. It is the campaigns chat's file, and
its count comes from the registry, so it walks seventeen; the words are
theirs to change.

## 34. Match light: the strip and the marks suit the page, on every phone

**His word**, 2026-11-10 about 18:15 UTC, his answer to call 4 with the two
stills of section 32 in front of him: "match light". As the arbiter put it
to me: on Android 14 and older, Light and the light looks paint the status
strip in their own paper with dark marks, so the top reads as one page.

**What the code showed before anything was changed.** I read the status bar
plugin, the safe-area plugin and `MainActivity.java`. Nothing here can show
a phone's status bar, so all of this is read, not seen.

1. The colour of the clock and battery marks is one call for every phone,
   and it asked for light marks on every palette.
2. The app paints the strip only on Android 14 and older. That is the phone
   his word names.
3. On the iPhone, and on Android 15 and newer with a web view of 140 or
   later, the page itself lies under the status bar. On Light that is Light's
   paper, with light marks on it: by the code, a white clock on cream paper,
   on the free palette older readers asked for. If his own phone is Android
   15 or newer, "match light" as worded would have changed nothing he could
   see.
4. On Android 15 and newer with an older web view, the page is set below
   the bar and the app's night colour shows there on every palette. Light
   marks are right there and must stay.

**The arbiter's call: one rule for every phone.** I put two ways to the
arbiter: his words exactly (Android 14 and older only), or one rule, the
marks suit what is behind them. The arbiter chose the second, on its own
word ("it is what match light means on every phone, and white marks on
cream paper break the house's own contrast rule, so mending it needs no new
word from him"), with the guard kept exactly: night behind the marks, or the
app cannot tell, means light marks as today, so no phone ends up worse than
it was. Dark palettes do not change anywhere.

**The guard needed more than the palette.** Eight surfaces are dark on every
palette and reach the top of a Light reader's screen: the launch frame at
every start, the tour, the gift box, the councils' atlas, Now playing, the
Plus sheet, Your plan and the EIKON pages. Dark marks tied to the palette
alone would be dark on dark over those, which is worse than today. So where
the page lies under the bar, the bridge looks at what the page shows at the
bar's place and chooses the marks from that.

**What is built** (`3ff380d7`).

- `lib/reader/statusBarColor.ts`, pure. The strip is the page colour of the
  palette worn, on every palette now. Where the marks stand is one of four
  answers (`barPlace`): the strip the app painted (an Android phone gives
  back the colour it was asked for), the page itself (the page is given room
  under the bar), the window's own night (the page is set below a bar the
  app cannot paint), or unknown. The marks (`statusBarMarks`) are dark where
  dark marks stand out more than light ones on what is behind them, and
  light everywhere else and wherever it is not known. `groundOf` reads a
  stack of the page's layers at a point: a surface the house marks as dark
  on every palette (`.dark-island`) is the night; a picture, or a gradient
  with something dark in it, cannot be told; a veil of colour is laid over
  the first solid colour beneath it.
- `components/native/statusBar.ts` asks the page and the phone those
  questions and tells the phone the answer: it paints the strip, asks the
  phone what colour its strip is, and draws the marks. It paints again when
  the root's two palette attributes change, or the room under the bar does.
  Where the page lies under the bar, and only while a light palette is worn,
  it looks at the bar's place again when the page's parts come and go, when
  a slide or a fade ends, and when the app comes back to the front: at most
  four looks a second. A dark surface that lets taps through while it is
  still drawn (the launch frame for the half second it fades) is asked for
  by its box, since the browser's own stack at a point leaves it out.
- `components/native/NativeBridge.tsx` starts with light marks, as before,
  and hands the bar to the follower.

**What it costs.** A reader on a dark palette pays for none of it: the marks
are light as before and the page is never asked (the walk counted no look at
all). Neither does any phone whose strip is the app's own, which is every
Android 14 phone.

**What holds it.** `lib/reader/__tests__/statusBarPalette.test.ts`, 25
tests: every one of the 24 palettes paints the strip its own page; dark
marks on Light and the nine light looks, light on the fourteen dark, each
at 7:1 or more on its strip (light marks on Light's paper would have been
under 1.5:1); where the marks stand on each kind of phone, True black's odd
case among them; what a stack of layers shows; and the wiring.

**Walked against the app's own screens**, on a gate-on export. A browser has
no status bar, so the phone was a stand-in that records what it is told and
answers as each kind of phone would; the room under the bar was given the
way a phone gives it a moment after the page. The two modules were the
repository's own, turned to plain JavaScript.

- The iPhone, and a newer Android with a current web view: Today, John 1,
  Settings, the reading modes, Discover, the saints, the calendar, search,
  Theology and the reading room on Light all draw dark marks on a paper
  strip. Dark picked: light marks and the night strip. Candlelight: its own
  black. Roses: dark marks. Mosaic: its lapis and light marks. Light again:
  dark.
- The councils' atlas opened over a Light page turns the marks light, and
  closing it turns them dark again.
- The launch frame over a Light page reads as the night, also while it
  fades with taps passing through it: light marks until it has gone.
- Your plan on Light has the page's own paper bar at the top, with the dark
  page under it: dark marks, which is what is there.
- Android 14: the strip is the paper and the marks are dark, over a dark
  page too, and moving between screens asks the phone nothing.
- A newer Android with an old web view, and a phone that does not answer:
  the marks are never made dark.
- A reader on Dark on the iPhone: nothing is ever changed, and the page is
  never asked.

**Not proven, and his on a phone.** All of it. The walk shows the rule is
right for what the page draws; only a phone shows the bar. The line is in
the handoff for both an Android phone and an iPhone: Light on, look at the
clock and battery.

**Known limits, said plainly.** The marks follow the page at rest. A dark
picture scrolled under the bar on a screen with no bar of its own is not
looked at until the next change, so the marks can stand dark over it for a
moment. A picture at the bar's place cannot be told, so the marks are light
over it, as today. Now playing, the tour, the gift box, the Plus sheet and
the EIKON pages were not opened in the walk; each is a `.dark-island`, which
is what the rule reads.

## 35. The contrast leftovers of section 25: three mended, one withdrawn

The arbiter's word (19:29 UTC): I mend them, since I hold the measures, each
with its owner's yes so no two chats are in one file at once. All three
owners said yes. Everything below is measured on the export where the
letters are (`scripts/words-on-pictures.mjs`), on seven palettes: the five,
and the two earned.

**The Plus page's two lines** (`38b5f9c8`; Admin's page, Admin's terms: classes
only).

| Line | Change | Dark | Light | True black | Candlelight | Monastery | Councils | Cappadocian |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The trial line | `text-paper/60` to `/62` | 6.10 to 6.39 | 7.68 | 6.10 to 6.39 | 4.46 to 4.62 | 5.27 to 5.55 | 5.17 to 5.38 | 5.14 to 5.39 |
| "Entirely optional. Give once, or not at all." | `text-paper/40` to `/42` | 3.82 to 5.29 | 3.82 to 9.12 | 3.82 to 4.80 | 2.97 to 5.09 | 3.40 to 5.27 | 3.32 to 5.15 | 3.32 to 5.12 |

62 is the next share a palette's rule names that clears on Candlelight; 65
would be 4.97 there, and Admin has the number. 42 is the lowest named share
that holds on all seven; 40 is the share the house keeps for marks that are
decorative or disabled, and this is a line a reader reads.

**The names under Settings' size slider** (`b23a4bb8`; Updates' lists). The
ones not chosen were the ink at 50 percent, at 10.5px. They join Settings'
quiet words: 62 percent, and on Light, Candlelight and a dark look at that
palette's own share. The lowest of the three names, before and after: Dark
5.09 to 7.07, Light 2.97 to 5.57, True black 5.22 to 7.27, Candlelight 3.87
to 5.57, Monastery 4.42 to 6.08, Councils 4.35 to 5.93, Cappadocian 4.35 to
5.97. `faintText.test.ts` is extended as Updates asked.

**Two lines on Theology's hub** (`3702200b`; Updates' yes, the Theology chat
told first; the stylesheet only). "7 citations from the Fathers" read 4.49
on Monastery and 4.38 on Councils and Cappadocian: the three palettes' rule
names 52 now, and it is 4.79, 4.71 and 4.67. "1 of 9" on the step's card
read 4.26 on Light: faint words on a tray are drawn at 75 percent on Light
alone, and it is 4.83.

`checkMock` passes on every changed part on all seven palettes.

**The reading room's covers on Light: withdrawn.** I told Updates 2 the
covers' names read 3.70 to 4.10 on Light. They do not. My measure brought
each cover just into view at the end of its row, under the row's fading
edge, and on Light that fade goes toward the paper, so a cover half under it
reads low. With each cover brought to the middle of its row: 160 lines of
titles and authors on Light and Dark, none under its need, the lowest on
Light 9.05:1. Nothing was changed in `WorkCover.tsx`. I had named it a
leftover before checking the place it was measured at, and said so to
Updates 2 and the arbiter.

**Found on the way, and open with Admin.** The gate-on build is the only one
that draws the sheet a reader without Plus meets, so the longer count words
of section 33 were walked there: the sheet's title and body are whole in
all 21 languages at 390, 360 and 320 wide. The preview's title bar is not:
its name takes two lines before it is cut, and with "nineteen" the name is
cut at 360 wide in Greek and Georgian (both were whole with "twenty"), and
at 320 in seven languages (five were cut already; Spanish and Italian are
new). At 390 all 21 are whole. Words cannot mend it, since the short name is
the approved title's first words. The bar is Admin's
(`components/billing/PlusTry.tsx`); I put two ways to Admin with the
numbers and a recommendation (the name over "Preview", so it has the bar's
whole width) and touched nothing.

## 36. After 1.9: the roadmap, as he answered call 5

His word, 2026-11-10 about 18:15 UTC ("all recs", to call 5 on his decisions
page, with `notes/decisions/themes-3-wide.png` in front of him):

- **Picture themes on tablets and the website come after 1.9.** Today a
  look on a wide screen is its colours and its sign at a chapter's head;
  the scene at the foot stands down from 768px (section 21, point 7), and
  so does the room a page leaves for it (section 32). A panorama for each
  scene is new drawing. On the website at a phone's width a Plus reader's
  look still has the site's last lines in its foot: the end room of section
  32 is the apps' frame only. Both belong to this item.
- **The season themes (Lent, Pascha, Pentecost) come after 1.9.** Candlelight
  already keeps the fasts by its own light (section 27); a theme a season
  puts on is a different thing and waits.
- **No gold theme**, by his own rule: gold is only ever a flame's own colour.
  With Fire out of the looks (section 33), no look carries any.

Also waiting, from this chat's own notes: the tablet's last lines under the
reader's dock (with Updates, who holds the tablet dock); and the preview's
title bar in the longer languages (section 35, with Admin).

## 37. The closing gates for 1.9 (2026-11-10, evening)

His word, about 19:22 UTC: "finalize all the builds, and then send me the
version 1.9 update." Everything of this chat's that is 1.9 is on the branch:
Fire out (`aa0eac68`), match light (`3ff380d7`), the three contrast mends
(`38b5f9c8`, `b23a4bb8`, `3702200b`) and their record (`e7eaf148`).

**The three builds, on `e7eaf148`**, one after the other in one checkout:

- `npm run build:android`: clean, 210 MB on disk in 6,945 files.
- `npm run build:ios`: clean, the same export for the iPhone.
- `npm run build` (the website; a build only, nothing deployed): clean,
  6,239 pages.

The tree was clean after them, and the local shop stubs the exports need
were taken out again (none left in `app/`, `components/` or `lib/`).

**The gates on that tree**: typecheck 0; the unit suite 921 files and
11,450 tests; lint 0 errors.

**One more export with the gate on**, as the release is cut, from the
branch's head an hour later (`c24163bb`, with the other chats' work on it),
for what only a reader without Plus meets:

- The reading modes' page for that reader: each of the four families says
  Purify Plus once by its name and no tile repeats it; the free three carry
  no mark; a tap on a look opens the sheet and changes nothing; Light still
  applies with one tap; no page error; `checkMock` passes on the page.
- The sheet says "Nineteen reading modes are part of Purify Plus" and
  "seventeen looks in four families", and says twenty, eighteen and Fire
  nowhere. `checkMock` passes on it.
- A device that stored Fire, for a reader without Plus: Fire is never on
  the page. The first paint puts Candlelight on, as it does for any stored
  Plus palette, and the gate then puts it down to Dark. That is what
  happened to a stored Candlelight before today; nothing new.

**His stills page** (private, the same link, version 10) is brought up to
date: 17 themes, Fire's two stills gone, the picker's stills retaken without
Fire (the locked one too), the plan's row and the preview's head retaken
with "Nineteen", the sheet pictured for the first time, a section for
Light's top of the screen with the two decision stills (their strip is
drawn, and the page says so), and the roadmap in its own words.

**Still open, and not this chat's to change**: the Plus preview's title bar
in the longer languages (section 35), with Admin.

**Still unproven**: everything a phone has to show. Match light above all:
the rule is tested and the walk against the app's own screens is clean, but
no phone has seen it.

## 38. The Plus preview's title bar: the name over "Preview" (Admin's pick A)

Section 35 left one thing open with Admin: with "nineteen" for "twenty", the
preview's title bar cut the Reading modes row's name at 360 wide in Greek and
in Georgian, and at 320 in seven languages. Admin chose A and asked me to
make it, and the arbiter asked for it before the cut (`04aca14b`).

**Admin's terms, and what is built.** In `PlusTryHead`
(`components/billing/PlusTry.tsx`) the name stands over "Preview" in one
block that has the bar's whole width between the way back and the close.
The name keeps its two-line clamp. The way back and the close are 44px and
keep to the bar's middle however tall the name makes it. "Preview" stood
beside the name before and did not give way, which left the name 120 to
130px on a 360-wide phone.

**Walked on a gate-on export**, in all 21 languages at 390, 360 and 320
wide, in the sheet and on the apps' screen (the bar with no close): 126
title bars.

- The Reading modes name is whole in every one: on one line everywhere at
  390 and 360, on two lines in 14 of the 42 bars at 320.
- Every other Plus row's name, put in the name's place: 2,394 names, each
  whole on two lines at most.
- "Preview" stands under the name, whole, on the name's own edge.
- The way back and the close are 2.75rem square (44px at a 16px root; the
  app's root is 17px, so 46.75px) and keep to the bar's middle. The bar is
  55px tall with a one-line name, as it was before, and 61px at most.
- The bar runs with the page: in Arabic and Urdu the way back is at the
  right and the close at the left.
- `checkMock` passes on the bar in all 126.

**"Preview" on seven palettes** (`text-paper/50`), measured where its
letters are: Dark 5.36, Light 5.23 in the sheet and 9.46 on the apps' screen
(which is dark on every palette), True black 5.32, Candlelight 5.26,
Monastery 5.36, Councils 5.22, Cappadocian 5.21. It holds, so its class
stays.

**Two things about the walk itself, said plainly.**

- The checker's mirror measure takes the page as left to right and then
  turns it. On a page that already runs right to left nothing moves, so in
  Arabic and Urdu it flagged every part of the bar, and said nothing true.
  Those lines are left out for those two languages only; the bar's direction
  is held there by its own geometry, and by the checker's own turn in the
  other nineteen. This is how the checker has always worked and it is worth
  knowing for anyone who runs it on an Arabic page.
- The apps' screen needs the phone's store before it shows its features,
  and a browser has none: it says nothing is sold. The walk answers the one
  question the app asks Capacitor, which phone it is, and the app then shows
  what a signed-out reader's phone shows, the features to try among them.
  Nothing else is told to it. The apps' ready screen, with the store's
  plans at its foot, draws the same bar and was not reached.

**Gates**: typecheck 0; the unit suite 929 files, 11,533 tests; lint 0
errors. `lib/premium/__tests__/plusTryScreens.test.ts` holds the bar's
shape.

## 39. Build 93 note 3: a tap on a look always changes something

His words, 2026-11-11, on You, Reading mode: "So this screen actually doesn't
do anything. When I click on the stuff, it doesn't change anything." Dawn
carried the check and the app stayed in Dark
(`build-93/03-reading-mode-dawn-not-applied.png`).

**The cause.** Every part that asked "may this reader wear a Plus palette?"
asked once, when it first appeared, and kept its answer. The part that
dresses the whole app lives as long as the app is open, so its answer was
from the moment the app opened; a page asked when it was opened. He opened
the app signed out and signed in afterwards, and the sign-in form steps on
without loading the app again. The page, asked after the sign-in, said yes,
kept his tap and drew the check. The dresser, asked before it, still said
no. Only a purchase told anything to ask again.

Found by reading, then reproduced on the gate-on export with those same
steps: the palette kept was dawn, Dawn carried the check, the app was in
Dark. The same fault is in the live 1.8 app for Candlelight and Monastery,
since Plus was locked.

**The mend** (`bc279916`, and `82ace459` for the last two lines).

- One answer for the whole app (`lib/reader/plusModesGate.ts`), read by the
  dresser and by every picker and switch through `usePlusReadingModes`. Two
  parts cannot disagree, because there is nothing for them to disagree
  with.
- It is asked again when it can have changed: a sign-in or a sign-out, the
  signal coming back, the app coming back to the front, a purchase as
  before, and a part appearing. Only the newest asking's answer is taken.
- The check stands on the palette the app is in, read off the page itself
  (`useThemeWorn`), on Settings' row, the Reading mode page and the reader's
  own settings, and the name under Settings' row is that palette's. A kept
  look the gate refuses leaves the app in Dark, and Dark carries the check.
- One tap rule (`lib/reader/pickPalette.ts`), handed to all three pickers by
  one hook (`components/reader/usePalettePick.ts`): worn at once, or the
  Purify Plus sheet for a reader the gate has said no to.
- A tap made while the gate is still asking is not lost. It waits for the
  answer and is carried out when it comes.

**A second fault beside it, measured on the export.** A reader WITH Plus
opened the app to their look, then Dark while the account server was asked,
then their look again: Dark from 306 to 529 ms after opening on a fast
answer, and from 278 to 7,033 ms when each answer took 400 ms (Linen: light,
dark, light). The device now keeps what it last heard
(`purify.reader.plusModes`), and a reader it last knew to have Plus keeps
their palette while it asks. What it last heard never draws a lock and
never outlives the answer.

**Walked on a gate-on export built from this change**, with a stand-in for
the account server (the export is built against a placeholder address
nobody answers). 50 checks, all passing:

- His note: opened signed out, signed in with Plus, Reading mode, a tap on
  Dawn: worn at once, Dawn alone checked. A tap on Linen: worn, light.
  Settings' row names the palette the app is in.
- Without Plus, signed out and signed in: each Plus family says Purify
  Plus, a tap on Dawn opens the sheet, nothing is kept, no check moves, and
  Light is worn at once.
- A subscriber opening the app, in Dawn and in Linen, on a fast answer and a
  slow one: their look from the first paint, never Dark in between, no lock
  drawn.
- Signing out with a look on: the look is put down, the page says Purify
  Plus, the check is on Dark, and the pick is still kept for the next
  sign-in.
- A tap while the gate is asking (an account server a second and a half
  away): Dawn is worn when the answer comes, with no second tap; the sheet
  opens when the answer is no.

Tests: `lib/reader/__tests__/plusModesGate.test.ts` (the gate and how the
app is wired to it), `pickPalette.test.ts`.

## 40. Candlelight at Vespers: the reader's tap wins for that night

The same thing could happen in one more place, found while reading for note
3 and put to the arbiter: with that switch on, after sunset the app wore
Candlelight whatever was picked, so a tap on a palette moved the check and
changed nothing until morning. The arbiter's word, 2026-11-11: "the
reader's tap wins for that night and Candlelight returns at the next
sunset." The switch's own chat is archived, so its files were taken on the
arbiter's word (`bc279916`).

- A palette picked after sunset is given the rest of that night: what is
  kept is the night's own sunrise (`purify.reader.vespers.pass`,
  `lib/reader/vespers.ts`). The next sunset is past it, so Candlelight comes
  back by itself with the switch never touched.
- Only a tap gives it. A palette arriving from the reader's account does
  not.
- The switch turned off takes it back, so on again that night means
  Candlelight now.
- The check stands on Candlelight while the app is in it, and a tap on that
  Candlelight changes nothing kept (it would otherwise have become the
  reader's palette by day).
- The pre-paint script opens the app the same way, from the first paint.

Walked with the phone's clock at 21:00 UTC (12 checks, in the 50): Candlelight
with the check on it; a tap on Dawn worn at once, the night theirs until
06:52 the next morning; opened again that night in Dawn, never Candlelight;
the switch off and on again, Candlelight; and on a second phone, Dawn at
the next day's noon and Candlelight back the next evening.
`lib/reader/__tests__/vespersPass.test.ts` holds it.

## 41. A subscriber with no signal keeps their palette

His word, 2026-11-11: "No, not 1.9.1. Again, all of it is going into
version 1.9" (CLAUDE.md, "A release ships finished"). So what section 39
had left for later came in, on the arbiter's word: "a palette is cosmetic
and on the phone, so a device that last knew its reader to have Plus keeps
their palette with no signal until the server answers otherwise; nothing
that the server grants (sync, downloads, voices) is ever opened that way."

- The entitlement lookup now says whether the account server was reached
  (`askClientEntitlements` in `lib/entitlements/client.ts`, with Admin's
  yes). `getClientEntitlements` answers its seven other callers exactly as
  before, FREE on a failed reach.
- The palettes' gate alone reads it. When the server cannot be asked, a
  reader the device last knew to have Plus keeps their palette; any other
  reader's Plus palettes stay shut, and a tap still opens the sheet.
  Nothing is kept from an asking that reached nobody.

Walked with the signal off (9 checks, in the 50): last heard yes, the app
opens in Dawn and stays, a tap on Linen is worn; the signal back with Plus
ended, the look is put down and the lock drawn; last heard no, Dark and the
sheet; the signal back with Plus, Dawn worn without the app being opened
again. `lib/entitlements/__tests__/askClientEntitlements.test.ts` holds the
lookup.

## 42. Build 93 note 4: the reader's Reading mode section

His words: "Refine this section and refine the design also."
(`build-93/04-reading-mode-chips.png`: a grid of radio-dot chips, the two
earned palettes in dashed boxes with a count, Cappadocian alone on its row,
"See all" under it.) His standing rules for it: minimal, photos over words,
no dashed placeholder boxes, no orphan on a row, floating pills only where
they belong, 44px to the touch, the house's motion.

**What it is now** (`82ace459`, `components/reader/ReadingModeChips.tsx`;
after: `build-93/04b-reading-mode-shelf-after.png`, and
`04c-reading-mode-shelf-without-plus.png` for a reader without Plus).

- Each mode is shown as itself: the small page Settings draws, the Bible's
  page in that palette, on one shelf. In the phone's sheet it is swept
  sideways and runs to the sheet's edges, the next page cut off so a reader
  sees there is more. In the computer's popover, where nothing sweeps, it is
  four columns: seven or eight pages, so never one alone.
- The way to every mode is the head's own link, a finger tall, not a row
  under the shelf.
- The two earned by reading stand unlit, with how far the reader is, until
  they are earned. No dashed edge, here or on Settings' row or the Reading
  mode page, since it is one tile (Updates' yes, on its condition that only
  the page's picture is dimmed: the name and the count hold 4.5:1 on five
  palettes in all three places).
- The shelf opens with the checked page in sight (a look is the sixth page)
  and brings a tapped page whole into view, sideways only, to a place the
  shelf rests at. The first try moved it anywhere and the shelf's own snap
  pulled it back, leaving the page cut off; the walk caught it.
- A sweep along the shelf is the shelf's, never the sheet's own pull.
- No colour is copied into the section by hand any more: a small page takes
  its ground and ink from the stylesheet.

**Walked on the same export.**

- 36 checks as a reader with Plus and as one without: one shelf, seven
  pages (eight with a look), every page 67 by 120, the link 72 by 47,
  nothing dashed, the check on the palette the app is in; a tap on
  Monastery, cut off at the edge, worn at once and brought whole into view;
  the earned palettes' line under the shelf, with the Plus note for a
  reader without it; a tap on Candlelight without Plus opens the sheet over
  the reader; See all opens the reading modes' own page; the Fathers'
  reader opens the same shelf; in Arabic it runs from the right.
- `checkMock` passes on the section on the five palettes: with Plus and a
  goal's line open, with a light look worn, and without Plus.
- The sweep, with real touch points: at the sheet's half height with the
  finger drifting up 34px, and at its full height drifting down, the shelf
  moves 174px and the sheet stays; the same finger beside the shelf does
  pull the sheet (472 to 356, and 177 to 293), so the measure can see one
  move.
- Names in 21 languages at 390, 360 and 320 wide, with Plus and a look worn
  and without Plus: 126 sheets, every name whole, on two lines at most,
  clear of its neighbour and of the shelf's edge at both ends.

`lib/reader/__tests__/readerShelf.test.ts` holds its shape.

## 43. Night sky's star (build 93 note 7)

His rule of 2026-11-11, "No sparkle star". Admin's shape check found the
four-point star drawn twice in the Night sky mode's picture, the star over
the horizon at a chapter's head. It is the Octogram's two squares now, the
star of Bethlehem's eight points, as Today's Nativity card wears since the
same sweep; its light is the soft pool it was (`2d3bac13`,
`scripts/theme-pictures.mjs`, `public/themes/nightsky-horizon.svg`; after:
`build-93/07c-night-sky-star-after.png`). The other fourteen drawings came
out byte for byte as they were, and `noSparkle.test.ts`'s waiting list is
empty again.

## 44. What is not proven, and what was found on the way

- **Nothing here has been seen on a phone.** Every walk is a browser on the
  export. The lines for the next test build's walk are in HANDOFF.
- **The account server in the walks is a stand-in.** It answers a sign-in,
  "who am I" and the entitlements row, with Plus or without, with a delay or
  with no signal. The real one may answer in ways it does not.
- **The computer's popover was walked on the dev server, not on a built
  website.** The apps' export draws no Reader pill. There: four to a row,
  the names whole in 21 languages, `checkMock` passing. One long name
  (Cappadocian in Russian) turns inside itself there, with no hyphen: the
  house keeps one hyphenation rule, for headings, and this did not add a
  second.
- **The "before" still of the section is his own screenshot.** The export it
  could have been taken from was gone by the time the stills were, and a
  build for one picture is not what was asked.
- **On a slow signal the page logs an error nobody catches**: "Lock broken
  by another request with the 'steal' option", from the account library's
  lock when a call waits five seconds behind another. It is not from the
  palettes' gate, whose asking handles a failure, and nothing visible broke
  in the walks; it is there before this change. For whoever owns sign-in.
- **A sign-in tells no other Plus gate to ask again.** The others ask per
  page, so they mend themselves on the next page, except
  `usePlusFeatures`, whose shared answer lives a minute. Told to Admin, with
  the one place that would mend them all.
- **Two tests were red at the branch's head from other chats' work** while
  this was gated, neither in these files: a page with no screen name
  (mended by its owner the same hour) and the app build's set-aside list
  (its owner told).


## 45. The chant at hand: a button in the bar, no pill over the prayer (fresh eyes L1)

Fresh eyes L1: on an Hour, "Pray with chant" floated mid-screen across a line
of the Trisagion. His rule of 2026-11-10 (CLAUDE.md, "Floating pills only
where they belong") keeps such a pill out, and his 1.8 pick B wanted the
chant one tap away at any line. The pill was his own pick by the code's
note, so the arbiter was asked, and its word of 2026-11-11 03:22 UTC was to
build the recommendation: a button in the prayer page's bar beside search,
shown at the moment the pill showed. It keeps what he chose the pill for and
removes a fault, so it needed no call from him.

What was built (`5ac031d0`):

- The pill is gone from Pray with (`components/player/PrayWith.tsx`) and its
  styles with it. Pray with says when its chant is at hand (it has gone up
  off the screen, nothing sounds, no question is up, the picker is shut) and
  how to open the picker, through a small store
  (`lib/player/chantAtHand.ts`). A page that is leaving cannot take the
  next page's offer away.
- The bar's button (`components/player/ChantInBar.tsx`): the house's 44px
  plate and the two beamed notes at the bar's one weight, named "Pray with
  chant" (an existing line, in every language). It opens the same picker.
- Its place is kept whether it shows or not: it is always in the bar and
  hidden with `visibility`, so its coming moves nothing. Hidden, it takes no
  tap and no focus and is not read out. It comes and goes on the house's
  curve; with motion off it is simply there.
- `MobileTopBar` gains one optional slot before search (`beforeSearch`), for
  a button that comes and goes; `trailing` stays for what a page always
  shows. The six pages that show the prayer reader hand it the chant.

Walked on the export (20 of 20):

- At the head of an Hour the button is in the bar and hidden, its place 47
  by 47, and a finger on that place does not reach it.
- The page's name comes into the bar first. With Pray with gone up off the
  screen the button comes. Back, the name and search stand where they stood:
  search at 334.8px before and after, "The First Hour" 93.2px wide before
  and after. A long name is cut no differently ("Akathist to the Most Holy
  Theotokos", 222.1px, cut both times).
- Nothing fixed to the screen offers the chant. A touch on the button opens
  the picker; while it is open the button steps back, its place kept; the
  picker put away, it is back; at the head of the page it has gone.
- With motion on it has arrived whole a moment later.
- In Arabic the bar turns round: the button from 286 to 333 becomes 57 to
  104, search from 334.8 becomes 8.5.
- A tablet in the app (820 wide) has the bar and the button.
- `checkMock` passes on the bar on five palettes, and in Arabic.

Stills: `fresh-eyes/L1-hours-chant-pill-before.png`,
`fresh-eyes/L1-hours-chant-in-bar-after.png`,
`fresh-eyes/L1-hours-chant-in-bar-arabic-after.png`.

`lib/player/__tests__/chantAtHand.test.ts` holds it and fails on the old
pill (five of its cases).

**Where it is not:** a computer's browser. The page has no bar of its own
there (the website's header stands in its place), so the chant is at the
head of the page, in Pray with, and no longer follows the reader down. If it
should, the website's header is its place, and that is its owner's file.

## 46. The fasting tracker (fresh eyes M5, the gate's first run, the tap walk)

Three lists met in one file, `components/fasting/FastingTrackerClient.tsx`
(`8a5c3cf7`):

- **Nothing moves when a day is marked.** The streak card's line changed
  wording on the first mark, the card grew with it, and Kept, In part and
  Broke dropped 19px under the finger. Both wordings of each card's line
  stand in one place now and one is seen, so a card keeps the taller one's
  height. Walked: every mark moves 0px when a day is marked Kept, In part
  or Broke, on Dark and on Light.
- **"1 days kept in all."** The second card's line was one string, written
  for many days, in every language. It is counted with the number over it
  now, and the 21 catalogs carry its forms: one and other everywhere, few in
  Russian, Ukrainian, Polish, Serbian and Romanian, many in Arabic, as the
  app's other counts do. Each catalog's own words for many days are kept
  word for word (the script that wrote them refused to run otherwise). The
  line that adds the days kept in part is counted the same way, and the
  streak's line gains the form for 2 to 4 in the four Slavic catalogs, where
  it read "2 постных дней подряд". Walked: "1 fasting day kept in a row."
  and "1 day kept in all.", then "2 days kept in all, 1 in part."; in
  Russian one, two and five days each take their own form on both cards.
- **A finger's 44px.** Thirty pills 29px tall. They reach 44px by the
  house's helper and are drawn as they were; drawn 44px tall they would have
  made every day's row a wall of buttons. Walked: a finger 6px outside a
  small mark lands on it, and the rows stand 74px apart, so one day's reach
  never lies over the next day's.
- **A mark that is on.** Kept was a fixed emerald, the one colour on the
  page that followed no palette. It wears the palette's own soft green now,
  and Broke the soft red: each palette sets those tones to be read on it.
  The walk with marks on found what a walk at rest cannot see: Broke's word
  was 2.3:1 on Dark and 3.2:1 on Light, and Kept's green on Light 4.25:1
  over its own fill. Broke is the soft red on a tenth of itself. Kept has an
  edge and no fill: on Light its green is 4.58:1 on a card with nothing
  under it and 4.45:1 over a fill of 5 percent. `checkMock` passes on the
  page with all three kinds of mark on, on five palettes.
- **The line about where the marks are kept** is 45, a share each palette
  draws at its own safe strength: at 40 it was 2.31:1 on Light.

Kept could have been drawn another way that also passes: the word in the
palette's ink on a green fill. The soft green word was chosen by eye,
because it keeps the three marks apart by their words' colours, as they
were. It is the one choice here that is taste, and it is his to turn.

Stills: `fresh-eyes/M5-fasting-before.png`,
`fresh-eyes/M5-fasting-marked-after.png`,
`fresh-eyes/M5-fasting-marked-after-light.png`,
`fresh-eyes/M5-fasting-note-before-light.png`,
`fresh-eyes/M5-fasting-note-after-light.png`.

`lib/fasting/__tests__/keptInAll.test.ts` holds the counted line (all five
cases fail on the old one); the rest is in `lib/ui/__tests__/gateRunOne.test.ts`.

## 47. The pre-build gate's first run: this chat's list

`notes/gate-run-1.md`, "Who has each", with fresh eyes L5 (`94e49e90`).

Before, on these eleven screens (`scripts/guardrail-walk.mjs`, reading the
main web as a phone does): two passed. 41 findings under 44px, 14 of
contrast, 2 of mirroring, 2 empty round frames, 1 star in a reader's post.
After, on the export built from this work: 18 screens of 18 pass (the
eleven, with an Hour, the morning and evening rules, an akathist, the Bible
tab and the journal).

- **A finger's 44px.** The export page's two downloads stood 22 and 24px
  tall: each shared the row down a column and gave up its own height.
  Community: Sign in and the feed's Try again are 44px tall; the writer's
  picture on a post, the day's link, the replies' Try again and a waiting
  reply's two buttons reach 44px by the house's helper, as their neighbours
  do; the "All" word over the feed (18px wide) does too, and its lit rule
  moved to `::before`, since `::after` is the helper's. Prayers: "Chants"
  was a pixel short of 44 wide, and the four quiet links were bare lines of
  20px.
- **Under 44px by name.** A post's name, as a reply's already was by the
  arbiter's yes of 2026-11-10: a reach there would cover the post's first
  line, and the picture beside it and the menu's View profile are the 44px
  ways to the profile. A name inside a reader's sentence: a link in a line,
  drawn as a button, so the walk's own leave for a link in a line did not
  reach it.
- **Words a reader can read.** The arbiter asked whether the 2.31:1 lines
  wear one class, to mend them at its source. They do, and it is not a
  fault of the class: 40 and 35 percent are the shares the house keeps for
  marks that are decorative or disabled (`app/globals.css`, "Faint text on
  every palette"), and naming them would lift some seventy places across
  the app, icons and dividers among them. So each line of words moves to a share
  every palette draws at its own safe strength: the council document's
  "Source:" line (45, as the same line under a Father's work), Start here's
  step numbers and the first-liturgy guide's (50), Community's house rules
  (45), the export page's waiting line (45). The chant's closed tabs on
  Light take the palette's own 70 percent, 4.95:1 on the strip's deeper
  ground, where the strip's 62 was 3.92:1.
- **A play mark in Arabic.** On a chant's page and in the player it was
  nudged a pixel or two to the right, which stayed on the right in Arabic.
  It is the house's Play drawn centred on its own box, as Prayers' already
  were (`lib/prayers/__tests__/prayersMirror.test.ts`): a play mark points
  right in every language and is not turned.
- **The two round frames, by eye.** Community's 38px frame is a reader's
  disc with its letter in it; the walk could not read the letter in a post
  the feed had not drawn yet. The disc says on itself that it is never
  empty, and its letter can no longer come up blank: a name that began with
  a space drew nothing, and one that began with an emoji drew half of it
  (`lib/community/discInitial.ts`). A Georgian letter stays as written.
  Prayers' 51px frame is the Chants card's play mark on its disc, whole as
  it is, and it says so on itself.
- **A reader's own words.** A post's title and words, a reply's words and
  the names readers chose say on themselves that they are the reader's.

Stills: `fresh-eyes/L5-start-numbers-before-light.png`,
`fresh-eyes/L5-start-numbers-after-light.png`,
`fresh-eyes/L5-community-rules-after-light.png`.

`lib/ui/__tests__/gateRunOne.test.ts` holds each mend; fifteen of its
sixteen cases fail on the code the gate walked.

## 48. A tapped search field is quiet

His word of 2026-11-10 (CLAUDE.md, "No box around a tapped field") names
search outright. The one search field had kept a way of its own under that
rule, his pick in build 80: a 58 percent white edge, a 3px ring and a 24px
glow round the pill. The campaigns chat met it on the journal's verse
finder, and the arbiter's word of 2026-11-11 03:56 UTC was that every search
field shows it is active the house's quiet way (`f7afab6f`).

- With a finger on it: its own fill, a fine edge in the palette's ink at 32
  percent (the share every other tapped field wears), the glass a step
  brighter, and the caret. Nothing round the pill. Light's own rule for the
  lit field is gone: the token turns with the palette.
- A keyboard reaching it still gets the keyboard's ring, round the pill as
  a whole. Typing in the field does not bring it.
- One rule (`.search-field`), so every place that uses the field follows.

Measured on the export with a finger on each, Dark and Light, before and
after: the Bible's search (the search screen opened from the Bible tab) and
the journal's verse finder had a 1px edge at 58 percent (66 on Light), the
3px ring and, on Dark, the 24px glow; both now have the 1px edge at 32
percent and the well's own inner shade, and nothing else. After Tab away
and back: the ring, 2px at 70 percent, 2px off the pill. `checkMock` passes
on both fields on five palettes.

Stills: `build-93/search-field-bible-before.png`,
`build-93/search-field-bible-after.png`,
`build-93/search-field-verse-finder-before.png`,
`build-93/search-field-verse-finder-after.png`.

`lib/search/__tests__/oneField.test.ts` and
`lib/ui/__tests__/fieldFocus.test.ts` hold it; three of their cases fail on
the old stylesheet.

## 49. What is not proven, and what was found on the way (sections 45 to 48)

- **Nothing here has been seen on a phone.** Every walk is a browser on the
  export. The lines for the next test build's walk are in HANDOFF.
- **The 21 languages' new lines were written here, not by a native reader.**
  Each is built from words its own catalog already had (its streak line for
  the singular, its old line for many days). The Arabic form for 11 to 99
  and the Serbian form for 2 to 4 are the ones most worth a native eye.
- **Community's line has no "before" still.** It stands at the foot of the
  feed and the "before" still was of the head; the export it could have
  come from was built over. The gate's own measure, 2.31:1 on Light, is its
  before.
- **Words at 40 and 35 percent elsewhere.** A reading of the source (a
  heuristic: an element wearing one of the two shares, followed by words)
  finds sixteen more places. The gate's walk of every screen at rest did not
  name them, so each either shows only after a tap or is not what the
  reading takes it for: they want a look, not a claim. For the arbiter to
  route: `app/error.tsx:44`, `components/bible/BookSwitcher.tsx:152` and
  `:176`, `components/bible/StudyRail.tsx:260`,
  `components/bible/VerseContextMenu.tsx:144`,
  `components/community/ComposePage.tsx:573`,
  `components/community/profile/ProfileEditor.tsx:469`,
  `components/eikonBox/DropProgress.tsx:71`,
  `components/eikonBox/EikonBoxClient.tsx:301`,
  `components/profile/ProfileDanger.tsx:80`,
  `components/saints/WorkContents.tsx:215`,
  `components/search/CommandPalette.tsx:754`,
  `components/search/SearchRows.tsx:115`,
  `components/shop/CategoryChips.tsx:92`,
  `components/streak/StreakSheet.tsx:88`,
  `components/walkthrough/Synthesis.tsx:211`.
- **A blind spot in the walk**, told to Admin: for a card the feed has not
  drawn yet (`content-visibility`), a control's words read empty while its
  boxes still measure. That is why the first run listed Community's names
  as nameless buttons 18px tall ("the reactions") and a disc with its letter
  as an empty frame.
- **The suite was red at the branch's head by one test** while this was
  gated (the 1.9 release email one word over its limit, from a copy change);
  its owner was told and it was green again by the last run here.

## 50. The sixteen places: words at the two shares kept for marks

The arbiter's word, 2026-11-11 05:00 UTC, on section 49's list: open each in
the state that shows it, measure, and lift only the words that fail
(`e8422db1`).

**The measure.** On the export, as words on five palettes, on the page and on
a card:

| | Dark | Light | Black | Candlelight | Monastery |
| --- | --- | --- | --- | --- | --- |
| 40 percent | 3.82:1 | 2.31:1 | 3.66:1 | 2.86:1 | 3.39:1 |
| 35 percent | 3.19:1 | 2.05:1 | 3.00:1 | 2.42:1 | 2.86:1 |
| 45 percent | passes | passes | passes | passes | passes |

So a line of words wearing either fails wherever it is drawn, and the
question at each place was only whether it is words a reader reads.

**Opened.** Today's streak sheet is the one of them a phone reaches without
an account: its four later steps ("7 days", "40 days", "100 days", "365
days") were 3.22:1 on Dark and 2.03:1 on Light, twenty findings on five
palettes, and none after (`checkMock` on the open sheet). The calendar's foot
and the search screen with something found were opened too and show nothing
at either share on a phone: the calendar's disclaimer is on the wide
calendar only, and the search's count is on a group a phone's results did
not draw. The rest stand behind an account, a purchase, a computer's
keyboard or an error, and were judged by the measure above and by reading
what each is.

**Lifted to 45**, twenty-one lines in eighteen files: the error page's
reference; the Bible's book switcher (the groups' names, the other books'
chapter counts, its two key hints); the study rail's "no commentary"; a verse
menu's hint; the composer's "N more in your Florilegium"; the profile
editor's letters left; the EIKON box's steps not yet reached and "From your
last EIKON order"; the danger zone's summary; a part a work's edition leaves
out (its name and its note); the search's group count and "esc"; the streak
sheet's later steps; the calendar's fasting disclaimer; a notification's
time and a moderator's log's time; the seller's earnings' row numbers; and
the shop's category counts (55, on a chip's lighter ground). Fifteen are of
the sixteen. Six more came from reading every use, not only those a first
reading took for words.

**Left, by name** (each in the test with its reason): a wrong answer already
tried in a chapter's walk, the sixteenth (a disabled button); three send
buttons while they cannot be pressed; three prices and amounts struck
through beside the value that holds; one arrow and one step mark; a shell no
page uses. And thirty-one icons, which are what the two shares are for.

`lib/ui/__tests__/faintWords.test.ts` reads every screen's source: anything
wearing 40 or 35 percent that holds more than an icon is named with its
reason, or fails. On the code before this it names exactly these twenty-one.

Still: `fresh-eyes/streak-sheet-later-steps-after.png`. There is no "before"
still of it: the measure was taken before the lift and the picture was not.

## 51. Nothing moves under the finger: a reading plan, Saints, a reading path, and Chants by the root's hold

His note 16 kind ("a page that jumps under the finger"), which is the
pre-build gate's first rule for a tap. Three came to this chat from Updates'
list by the arbiter's word (fresh eyes M4, L3, L7; 2026-11-11 05:00 UTC), and
a fourth from the gate's tap walk (a reading path, 05:30 UTC). Each was
measured on the export with real touch at 360, 390 and 820 wide before it
was touched, and after (`dc3fe29d`).

| | before | after |
| --- | --- | --- |
| M4, Chants: a tradition chosen | 64px at 360, 93px at 390, 128px at 820 | 0px |
| L7, Saints: a kind chosen, the pinned card in sight | 436px at 820 | 0px |
| L7, Saints: "All" chosen again | 792px at 360, 732px at 390 | 0px |
| L7, Saints: any choice ("Clear" coming into the row) | 3px | 0px |
| L3, a plan: the first day marked | 41px | 0px |
| L3, a plan: the card turning to the next day | up to 48px | 0px |
| A reading path: "Mark as read" turning to "Read" | its middle 24px sideways (the pill 114px to 66px) | 0px (one width) |

A page does this in two ways, and each has one answer in the app.

**It gets shorter below the finger** (Chants; the list under Saints'
filters; a plan's "Start over" going from its foot). This is Fable
Theology's mend at the root, for every page at once: after any tap the page
keeps the length the reader is looking at (`2fd048f3`,
`lib/ui/keepLength.ts`). This chat had first made a hold of its own for the
three pages (a least height on the list at the tap), measured at 0px and
never pushed. It came out when the root's landed, so there is one hold in
the app and `ChantsHome.tsx` is as it was. M4 is closed by Theology's mend;
what is recorded here for it is this chat's own measure of it on its own
export: 0px for every tradition and "All" at 360, 390 and 820, with the
browser's scroll anchoring on and off (at 360 the page shortened from 1627px
to 1557px and the scroll stayed where it was).

**It changes above the finger** (a plan). The root's hold lets go of that
case by design, the moment it sees the pressed thing has moved in the page.
`lib/ui/useHeldPlace.ts` answers it:

- `useHeldPlace`: the pressed circle's place on the screen is kept, and for
  600ms after the tap, each time the page is drawn, the page is scrolled by
  whatever the circle has moved, before it is seen. When the line of days in
  a row comes in over the days, the page goes up by the line and the circle
  stays where it is. The reader's next touch ends the hold at once, so a
  scroll begun straight after a tap is theirs (walked: a 260px drag begun
  60ms after the tap is kept).
- `useNoShrink`: at the tap the part over the days is told to stay as tall
  as it is, since scrolling cannot answer a part that shrinks at the very
  top of a page. What it gains in the moment after, it gains by whole
  pixels, which a scroll can answer exactly.
- A day that has been in the window of days stays in it while the page is
  open: marking a third day used to drop the first off the window's head,
  and every row under it went up one.

A page can always answer what grows over the finger, because it grows by as
much as it must scroll, so long as it could scroll at all. A plan's page can
scroll 137px or more at every size walked, and at 1024 by 1366 and 1366 by
1024.

**And where it can be, the page is made not to change.**

- Saints. Nothing over the filters changes: the pinned card stays pinned
  while a filter is on (a saint it shows is in the list below as well where
  the filter is hers), and "Clear" is always in the label's row, unseen and
  out of reach until there is something to clear, placed by end. Where the
  row had stayed still before, only the browser's scroll anchoring held it;
  now there is nothing to anchor. Walked again with anchoring switched off,
  as a browser without it behaves: 0px over thirty taps, as
  with it on.
- A reading path. The gate's walk read "Mark as read" as moving 24px on
  seventeen days. Measured, the page does not move: the pill was as wide as
  its words, and its middle went sideways as it narrowed. In a language
  whose first line is longer the finger was left off the pill for the tap
  that takes the mark back. Both lines stand in the one cell now, the one
  not in use unseen, so the pill is one width: 114.5px in both
  states at all three sizes, thirty taps at 0px, and a second touch at the
  same place takes the mark back.

**Three tries at the part over a plan's days**, each found by a walk:

1. Its room kept from the start, the line's too. It set every plan's days
   41px lower at rest, and on the Gospel of John that put a day on the
   screen's foot, half risen, which the guardrail walk read as 2.46:1.
2. A least height written as the page was drawn, rounded up to a whole
   pixel. Under a pixel, and enough to do the same to the next day down
   (1.15:1). Admin has since taught the walk to measure a rising row as it
   ends (`5a075e97`), so where a row falls no longer flips a screen.
3. Nothing written until the part had grown. Then a part that got SHORTER at
   the first tap, John's card turning to a shorter day, was held by nothing,
   and the circle went up 6.9px at 390 and 820.

So: nothing is written on the page at rest, and at the tap the part is told
to stay as tall as it is. The plan's walk on the last export: 60 of 60
taps at 0px, and 60 of 60 again with scroll anchoring switched off.

The walks. Chants: every tradition and "All". Saints: two kinds, "All"
again, a century and Clear, with the kinds mid-screen and near its top. A
plan, as a reader with Plus (its days are Plus; the stand-in account server
of section 44): five days marked one after another and taken back, the
Nativity plan and the Gospel of John. A path: five days marked and taken
back with a second touch at the same place. All at 360, 390 and 820 wide,
with real touch.

The gate's own tap walk on the last export (Admin's, as of `2f3a6397`),
forty controls a screen. On the path, Saints and two plans
(`/reading/paths/nativity/`, `/saints/`, `/plans/acts/`, `/plans/john/`):
120 controls tapped, none failed. On Chants: 24 tapped, and two failed as "a
tap that changed nothing", "All" while it is already chosen and a chant's
"English" while it is already chosen. That is the walk's newest measure
reading a choice already made as a dead control; neither is this work's, and
Admin has been told.

The guardrail walk on the fourteen screens this work touched or walked:
twelve pass, `/plans/john/` among them, and the two that do not (Saints, the
reading room) fail only on names cut short, a rule that came in today
(section 54).

Stills, at 390 wide: the moment before the tap, and the moment after it on
the old export and on the new. `fresh-eyes/M4-chants-filter-1-before-tap.png`,
`M4-chants-filter-2-old.png`, `M4-chants-filter-2-new.png`;
`L3-plan-1-before-tap.png`, `L3-plan-2-old.png`, `L3-plan-2-new.png`;
`L7-saints-filter-1-before-tap.png`, `L7-saints-filter-2-old.png`,
`L7-saints-filter-2-new.png`; `path-pill-old.png` (the gate's own still of
it, with the walk's ring round the pill) and `path-pill-new.png`.

`lib/ui/__tests__/underTheFinger.test.ts` holds the arithmetic and each page
to its mend, and fails a page of these that keeps a list of its own. With
the helper in place and the pages as they were, six of its nine cases fail.

## 52. The gate's tap walk on Community and the reading room: measured before touched

The arbiter's 05:30 list gave this chat Community's "Read more" and "N
replies" ("name what each opens") and the reading room's featured cover ("a
finger meets the line drawn over it"). Each was walked on this chat's own
export first, reading the main web with GET only.

- **"Read more" was the walk's.** Both controls already named what they
  open (`77d3f09e`, before the gate's run). The page does follow: 386px,
  until the place the thumb was stands at the top bar. The walk judged the
  control's own top, and this control sits under the words it opened, so it
  read a pass as a fail. Admin mended the measure (`1c54edff`).
- **The featured cover was the walk's.** A touch on the cover's middle meets
  the cover's own link and opens the work. What the walk named is the
  heading's link, which on a phone is there for a screen reader only: 1px,
  clipped, where no finger reaches. Admin set such controls aside
  (`1c54edff`). No change to the page.
- **"N replies" is real, and not a naming fault.** The part opens with its
  waiting rows, the opening helper stops watching once the part is still
  (about 0.4s), and the replies arrive from the main web after that and end
  under the tab bar (939px, the bar at 761px, on a thread of three). The
  part already says it is busy while it waits (`aria-busy`). The mend is one
  rule in the helper: what says it is busy is followed until it has arrived.
  The helper is Fable Theology's, which is adding the rule itself; nothing
  of it is in this push. **Open until Theology's rule is pushed and
  Community's threads are walked online with it.**

One thing found on the way is mended here (`b748d4da`): a thread waited
with two grey rows whatever the post's count, so a thread with no replies
opened 254px tall and folded back to 67px a moment later. It waits with as
many rows as the post says it has replies, three at most: walked on
twelve threads at three sizes. One with no replies opens 16px tall and stays
so. One with three opens 302px tall and is 469px when the replies have come.
Where the replies came late (the first three threads walked) the thread
still ended under the bar, by 23 to 167px, which is the open item above;
where they came at once (the other nine) the page followed and the thread's
end stood clear.

No still of Community is kept: the feed is readers' own names and words.

## 53. Community's five small controls (the touch count's padded heights)

The arbiter's 05:21 word: the touch count now reads a height made of padding
and a line of words (Updates, `0258a5320`) and lists five in Community. Each
looked at, in the same commit (`b748d4da`):

| where | was | now |
| --- | --- | --- |
| a muted reply's folded row in a thread | 35px, a dashed edge on four sides, words placed by left | 44 tall, a fine whole edge, words placed by start |
| the moderators' page: Try again | 38px | 44 tall |
| the moderators' page: the way back | 38px | 44 tall |
| the moderators' page: its two tabs | 32px inside their own pill | their look kept, 44 to the touch (`.hit-44`) |
| a profile that did not load: Try again | 38px | 44 tall |

Updates took its own share to 44 the same morning (`3e59ccfa`, 43 to 5) and
left these five, so the ceiling is none now: 5 to 0. The dashed edge went
with the first because the gate's own rule fails a dashed box as a
placeholder (build 93 note 4) and no walk reaches this one: only a reader
who has muted someone sees it. `lib/community/__tests__/threadOpens.test.ts`
holds it and the thread's rows; both of its cases fail on the code before.

## 54. What is not proven (sections 50 to 53)

- **Nothing here has been seen on a phone.** A browser's touch is a real
  touch event, not a thumb: the next test build's walk has the lines.
- **Most of the twenty-one lines were not opened**, for the reasons in
  section 50. They rest on the measure of the two shares and on the house's
  own arithmetic for 45 (`lib/ui/__tests__/faintText.test.ts`).
- **The pinned card on Saints now shows while a filter is on.** That is a
  change a reader can see, made so nothing moves; it is his to turn.
- **"N replies"** is open, as section 52 says. (Closed the same day:
  section 55.)
- **None of the five small controls was opened**: a muted reply, the
  moderators' page and a profile that fails to load each need an account or
  a failure this chat's walk does not make. They rest on the classes and the
  count.
- **Saints fails the guardrail walk on a rule that came in today** and is
  not this work's: twenty-nine cards' epithets cut at one line (Admin's
  `93a87a88`, "no control's name cut short"; `components/saints/SaintCard.tsx`),
  and one cover's title on the reading room. Told to the arbiter.
- **Other dashed edges a walk does not reach**, seen while reading for the
  one above and left for their owners: the profile editor's two round
  frames (`components/community/profile/ProfileEditor.tsx`), an order's row
  in the shop (`components/shop/OrdersClient.tsx`).
- **Found on the way, for their owners** (told to the arbiter): under
  "Greek" on Chants, a chant sung in more than one tradition shows its first
  version's line ("Psalm 135, Arabic") in the Greek list; and the tap walk's
  newest measure fails a filter that is already chosen and tapped again.
- **The two Saints stills show different counts** ("All 248" on the old
  export, "All 270" on the new): January's saints came onto the branch
  between the two builds. The filters and the card are what the stills are
  for.

## 55. Community's threads end in sight ("N replies", closed)

Section 52 left one item open: a thread whose replies came late ended under
the tab bar, because the opening helper stopped watching before they
arrived. Fable Theology added the rule in its own file (`5c300b36`,
`lib/ui/showOpened.ts`): while what opened says `aria-busy`, the watch does
not end on "still", and what arrives is followed as anything that opens is.
With this chat's `b748d4da` (the thread waits with as many rows as the post
has replies), walked on one export, reading the main web with GET only, at
360, 390 and 820 wide, twelve threads:

| a thread of | opens | ends | the page followed by | its end |
| --- | --- | --- | --- | --- |
| no replies | 16px | 16px | 0px | in sight |
| one, the reply late (360) | 103px | 250px | 23px | 12px clear of the bar |
| three, late (360) | 302px | 469px | 192px | 12px clear |
| four, late (360) | 302px | 459px | 184px | 12px clear |
| the other eight, the replies there at once | 150 to 449px | the same | 0 to 87px | in sight |

None of the twelve ends under the bar; three did that morning (by 23 to
167px). The gate's tap walk on `/community/`: forty controls, none failed,
where it had failed two. No still: the feed is readers' own names and words.

## 56. A saint's card says its first words whole

The arbiter's words of 07:13, 07:23 and 11:54 UTC, 2026-11-11, on the gate's
rule for a name cut short and then on a still of two ways (`ff901d0f`).

**The gold line over the name** was cut at one line. It is the first thing
a card says, and for a card of several saints it is their names ("Daniel,
Ananias, Azarias and Mi..."). With every card drawn it was cut on 56 of 269
cards at 360 wide, 29 at 390, 17 at 820 and 68 at 1024. It shows whole now,
balanced, on two lines where it needs them. It is not held to two: three
cards need three at 1024.

**The grey line under the name** was every title the saint has, joined by
dots and cut at one line: cut on 212 of 269 cards at 390 wide, and on 180 to
229 at every width. (This record first called it "rank and years". It holds
no years.) Two ways were drawn side by side from the app's own cards,
`build-93/saints-grey-line-two-ways.png`, beside the cards as they stood,
`saints-grey-line-as-it-is.png` (`963aee61`):

| at 390 wide | still cut | cards with a second line | the mean card |
| --- | --- | --- | --- |
| as it was | 212 | 0 | 270px |
| two lines allowed | 60 | 212 | 288px |
| the first title only, whole | 0 | 36 (and 2 on three lines, 1 on five) | 276px |

The arbiter took the second, this chat's pick: the line is the saint's first
title, whole, which is what his own page already shows under his name
(`lib/saints/page.ts`, `heroTitle`), so card and page say the same; no dot
is left hanging at a line's start, and the card stops repeating what its
gold line and its name already say. What is given up is the later titles on
the card. The one card on five lines is the ten martyrs of Crete, whose
first title is their ten names.

**What it costs**, every card drawn, on the export as built, against the
export before:

| wide | columns | the median card | the mean card |
| --- | --- | --- | --- |
| 320 | 1 | 282 to 321px | 290 to 314px |
| 360 | 1 | 282, unchanged | 276 to 287px |
| 375 | 1 | 282, unchanged | 274 to 282px |
| 390 | 1 | 282, unchanged | 270 to 276px |
| 412 | 1 | 258, unchanged | 264 to 267px |
| 430 | 1 | 258, unchanged | 259 to 261px |
| 600 | 1 | 258, unchanged | 250, unchanged |
| 768 | 2 | 282, unchanged | 279 to 290px |
| 820 | 2 | 282, unchanged | 272 to 277px |
| 912 | 2 | 258, unchanged | 262 to 264px |
| 1024 | 3 | 282 to 302px | 288 to 310px |
| 1080 | 3 | 282 to 302px | 285 to 301px |
| 1180 | 3 | 282, unchanged | 278 to 286px |
| 1280 and up | 3 | 282, unchanged | 270 to 274px |

Nothing is cut on any card at 360, 390, 820 or 1024, and every row of the
grid is one height at each (the grid stretches a row to its tallest card,
and the card fills its cell). The saints' filters still measure 0px under
the finger with the taller cards (thirty taps, section 51's walk).

**The grid's 280px for a card not yet drawn** (`app/globals.css`,
`.cv-card`) is left as it is. It was up to 30px from the mean card before
(250px at 600 wide) and is up to 34px from it now (314px at 320 wide, 310px
at 1024). The arbiter kept it for the gold line; the title's share of this
was measured after its word and is told to it with this table. Making the
lines under the name give the height back cannot be done in a stylesheet,
and measuring 269 cards in script would undo what the 280 is for.

**The reading room's "cut title"** in the same finding was not a title a
reader sees: it was the cover link's screen-reader line, 1px and clipped,
whose inner span the rule measured. Admin mended the rule (`9b0bbc73`); no
change to the page.

Still: `build-93/saints-cards-as-built.png`, the same four cards from the
export as built. `lib/saints/__tests__/cardName.test.ts`; two of its five
cases fail on the code before.

## 57. No dashed box where no walk reaches

His rule of build 93 note 4, which the gate's walk holds wherever it can
open a screen. The arbiter gave this chat three that stand where it cannot
(07:13 UTC); reading the source for them found two more (`617d37a7`).

| where | who can see it | now |
| --- | --- | --- |
| the profile editor's two "no colour" swatches | a reader with an account | an empty ring in the house's quiet one, whole, 1.5px |
| an order's row for a checkout not finished | a reader with such an order | a fine whole edge |
| the Discord card with nothing playing | a computer's Settings; the Plus preview | a whole edge, the card darker than when something plays |
| a muted reply's row in a thread | a reader who has muted someone | a whole edge (section 53, `b748d4da`) |
| the shop's 12px mark for a checkout not finished | a reader with such an order | **stays dashed**, by the arbiter's word |

The last is one of the marks the owner chose for an order's life (Orders B,
r3-16): a sign with a meaning, not an empty box. It says so on itself for
the gate's walk (`data-mock-allow="dashed"`, with its reason) and is the one
name on the test's list.

`lib/ui/__tests__/noDashedBoxes.test.ts` reads every page, every component
and the house's stylesheets a reader meets (not the admin panel, whose own
theme uses a dashed line for a warning). A dashed or dotted edge on a box
fails there before a walk is run, unless it is named with its reason; a
line on one side (the dotted line under a glossed word) is a line and
passes, as in the walk. Three of its five cases fail on the code before.

## 58. Two names never cross: the tab bar over You's and Prayers' pictures

The arbiter's word of 07:25 UTC on a finding of the Prayer campaigns chat:
on You, scrolled a little, the tab's name in the bar and the reader's name
on the picture pass over each other (`08126129`).

**Measured first**, on the export before the mend, the page scrolled a step
at a time. The You tab's bar is clear over the Ladder and stayed clear until
the picture's foot had gone up under it; the reader stands on that picture.
Signed in, from 140px of scroll the reader's picture, name and "Your
profile" stood inside the clear bar's band, over "You", and the picture's
foot was not due for another 130px. On a short page, which cannot scroll the
picture away, they were left crossed at the page's end.

**Its twin**, found by measuring Prayers the same way: from 130px "Pray
without ceasing." stood in the clear bar's band over "Prayers", then its
source, then "Your rule" and its line, until the picture's foot had gone
230px later. Twelve of eighteen steps crossed at 360 and 390 wide.

**The mend.** The bar is solid again as soon as the words standing on the
picture reach its foot, twelve pixels before they do, picture or no
(`components/mobile/barOverPicture.ts`: the hook takes the words as well as
the picture; one observer still, speaking at two edges, nothing done while
scrolling). It turns as it always has: its own 200ms with Purify's motion
on, at once with it off. So nothing new moves, and what follows the words up
(You's prayer rope and week, Prayers' rule) meets a solid bar too. The
arbiter had named two ways, the hero's words fading as they reach the bar or
the bar's name waiting; it took this third in their place, since it holds
with motion off and needs no fade tied to the scroll, which older iPhones
would not run. Prayers' two lines went in with the arbiter's word and the
yes of Updates, who last held that file.

**Walked on the export as built**, a step at a time:

| | steps with the hero's words in a clear bar |
| --- | --- |
| You, signed in, at 320, 360, 390 | 0 |
| You, signed out, at 320, 360, 390 | 0 |
| You, signed in, Purify's motion off | 0 |
| You on a screen too tall for the page to scroll (390 by 1500) | 0, and the bar stays clear, as it should |
| Prayers, at 320, 360, 390 | 0 |
| the old look, the bar held clear on the same export: You | 10 |
| the old look: Prayers | 12 |

Back at the top the bar is clear again each time. At 820 the bar is solid
from the start, as it was. Also run, at Updates' asking: the export walk's
own section for the two bars (46, which learns the rule here: solid when
the picture has passed or the words have reached the bar), every check
passed; the page-transition walk, all 34 as they should be, Prayers left by
its rule's link and come back to among them (36px down as it was left, the
link 330px from the top as it was); and the words-on-pictures measure,
which found the next thing.

**Found by that measure, and mended** (`9a8b6489`): signed out, the line
under "Sign in" is "Optional" since the sign-in lines were rewritten
(`8aebf359`). It stands on a lighter part of the Ladder than the line it
replaced, and at nine tenths of the ink it measured 4.40:1 on Candlelight,
where 4.5:1 is needed. At the ink itself: Dark 6.60, Light 7.57, Black 7.60,
Candlelight 4.99, Monastery 5.54. The line wears the ink now, signed out and
signed in.

Stills: `build-93/you-names-before-390.png`, the old export at 390 wide at
the page's end, the reader's name pressed up under the clear bar's;
`you-names-old-look-360.png` and `you-names-after-360.png`, the same place
(360 wide, 170px down) with the bar held clear as it used to be and as it is
now; `prayers-names-old-look-390.png` and `prayers-names-after-390.png`, the
same for Prayers at 160px. `lib/you/__tests__/barNames.test.ts`; four of its
five cases fail on the code before.

## 59. What is not proven (sections 55 to 58), and what was found on the way

- **Nothing here has been seen on a phone.** The next test build's walk has
  the lines.
- **There is no true "before" picture of the two names crossing.** The
  crossing was measured on the old export; the build then replaced it. The
  two "old look" stills are the new export with the bar held clear, which is
  what the page was wherever the picture had not yet gone. They are labelled
  so. `you-names-before-390.png` is the old export itself.
- **The bar's 200ms turn under a fast fling** is not measured. Scrolled a
  step at a time nothing crosses; a hard fling can carry the words under the
  bar while it is still turning, as it could carry the picture's foot under
  it before. With Purify's motion off the turn is at once.
- **"Optional" at the ink** was measured on the export with the line's one
  class changed in the page, not from a build with the change in it.
- **None of the dashed boxes mended was opened.** Each needs an account with
  a profile, an order, or a computer, which this chat's walk does not have.
  They rest on the classes and the test.
- **The 280px for an undrawn saint's card** is up to 34px from the mean card
  now where it was up to 30px (section 56). Left, and told.
- **`scripts/route-motion.mjs` cannot finish on an export cut with Plus
  enforced**, which is how the gate cuts its own: the Florilegium is behind
  Plus there, its starter never appears, the walk throws, and every other
  walk's verdict is lost with it. It was run here from a copy that walks as
  a reader with Plus. Told to Fable Theology, whose script it is.
- **Chants' line under a tradition** was this chat's by the arbiter's word
  for some minutes; Updates had already pushed it (`e378fedb`), so this
  chat's copy was dropped unpushed. Read on the export as built: under
  Greek, "Psalm 135, Greek · Psalm · 8:25"; no line under any tradition
  names another.

## 60. The page-switch walk loses no verdict, and walks the locked door

`5dcec709`. The arbiter, 2026-11-11 12:44 UTC, giving `scripts/route-motion.mjs` to this
chat: "one walk's throw must never lose the others' verdicts; on the gate's
selling export the Plus walks run as a Plus reader the way Admin's walks do,
and the Florilegium's locked door is walked as a reader without Plus."

**What was wrong.** The walk was one long walk in one `try`, and its report
was handed back at the end. A tap on something that was not there waited
thirty seconds and threw, and every verdict already reached went with the
throw. That is what happened here on an export that locked the Florilegium
(section 59): of the 34 verdicts the walk then owed, the seventeen before
the Florilegium had been reached and were lost, and the seventeen from it
on were never walked.

**A correction to section 59.** It said that export was cut "with Plus
enforced, which is how the gate cuts its own". It was not cut as the gate
cuts its own. This chat's build recipe sold Plus in both stores. The gate's
sells on Android alone (`NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk`, gate-run-1.md), and a selling
export locks a page only where the page says which app it is: the walk's
phone is a page not known to be either app, which is locked only when both
stores sell (`lib/entitlements/entitlements.ts`, `native-unknown`). So on
the gate's export the Florilegium was never locked for this walk, and it
would not have thrown there. The fault that one throw loses every verdict
was real on any export, at any step.

**What it does now.**

- The walk is taken a stretch at a time (`scripts/lib/stretches.mjs`, new).
  A stretch names the verdicts it owes before it sets out. A throw is
  written against the first one it had not reached, in one line (what was
  thrown, and what it was waiting for), the rest of that stretch as "not
  walked", and the walk goes on. 32 stretches, 50 verdicts.
- After a stretch that stopped, the next has a new page of the same phone:
  the page that fell is closed with whatever it left open, and a rule or a
  reader's place a stopped walk had set for itself is taken off the phone.
  A stretch that used to begin where the one before ended (Back after
  forward, a gathering after a starter) now looks whether it is there and
  goes there if not.
- Every verdict is said as it is reached, and every run says the same 50 by
  the same names. Where a walk used to say one line for two (no saint on
  screen to tap, so no way back either), it says both.
- Nothing else of the walks changed: the same taps and waits in the same
  order. Fable Theology added four verdicts to the walk in the same hour
  (`176758a0`: a picture tile, a chapter's Back), so the change was put on
  its version by a script anchored on the walk's own lines, and
  `git diff -w` against its version shows the walks' lines as they were
  but for the names.
- **Two readers.** Every walk but one is the page as it was: not known to be
  either app, for which the gate's export locks nothing, the way Admin's two
  walks are without `SELLS_PLUS`. The locked door is walked on a second
  phone that says it is the Android shell (`scripts/lib/sells-plus.mjs`,
  Admin's): a reader with no Plus, with two gatherings on the phone as a
  reader's are whose Plus has lapsed.
- **The locked door, four verdicts.** You's row for the Florilegium wears
  the padlock and opens the page all the same, in one switch; the door
  stands on it, with no starter offered, the reader's two gatherings under
  it, the page at its top, and on no frame of the way in is the hub drawn
  first (every animation frame is read for 2.5 seconds). Back to You is one
  switch and the row is where it was. A gathering under the door opens as a
  page of its own, its lines there, nothing on it that changes it, the door
  under the lines. Back from it, and the door still stands.
- On an export that sells nothing there is no door: its four verdicts are
  said as not asked, counted apart, never as passed. `SELLS_PLUS=1` refuses
  such an export outright, as Admin's walks do. On an export that sells in
  both stores the first reader is locked too, and the Florilegium's four
  Plus stretches say so in a line each and fail, in seconds.

**Measured.**

- Build 11 (cut 12:11 UTC from `9578c864` with sections 56 to 58's work,
  Plus sold in both stores, section 59's recipe): 46 verdicts said, none
  lost, exit 1. 31 passed. Of the 15 that did not, 7 were the Plus
  walks, each saying the reader was locked, and 8 were Fable Theology's two
  newest walks (Your rule's tile, a saint's wide picture), whose code was
  pushed at 12:19, after that export was cut. The door's four passed.
- Build 12 (cut 13:15 UTC from `e6c2a49d` with this work, as the gate cuts
  its own): `SELLS_PLUS=1 node scripts/route-motion.mjs`, 50 of 50, exit 0,
  two and a quarter minutes. You's row was at 512px and came back at 512px.
- `lib/ui/__tests__/walkStretches.test.ts`, 17 cases: the keeping of
  verdicts (a throw before, between and after them; a verdict gone by; two
  stretches owing one name; a phone that will not open), and the walk held
  to it (no verdict written by a name of the walk's own, no page walked
  outside a stretch, the door on a phone that says it is the Android shell
  and only where the export sells). Seven fail on the walk as it was.

## 61. The room kept for a saint's card not yet drawn follows the width

`c154de0d`. The arbiter, 12:44 UTC: "let the undrawn card's height follow the width at
the two ends (about 310), so a card that draws in never moves the page;
prove it on the next build."

The saints' list draws only the cards near the screen and gives every other
card a height to stand in for it (`app/globals.css`, `.cv-card`). It was
280px at every width. Measured again on the export at thirty-four widths,
every card drawn, 269 saints, the mean height of a row:

| wide | columns | a row's mean | the room kept now |
| --- | --- | --- | --- |
| 320 | 1 | 314 | 310 |
| 340 | 1 | 296 | 293 |
| 360 to 390 | 1 | 287 to 276 | 280 |
| 400 to 430 | 1 | 271 to 261 | 266 |
| 480 to 767 | 1 | 255 to 249 | 252 |
| 768 | 2 | 289 | 284 |
| 820 | 2 | 276 | 272 |
| 912 to 1023 | 2 | 264 to 257 | 261 |
| 1024 to 1100 | 3 | 310 to 300 | 303 |
| 1120 to 1200 | 3 | 296 to 284 | 289 |
| 1240 and up | 3 | 278 to 274 | 276 |

A card is as tall as its lines, and its lines wrap by how wide the card is,
so the mean falls as the screen widens and steps up wherever the grid gains
a column. At 280 everywhere the list, before its cards were drawn, was
8,984px short of itself at 320 wide (ten screens), 7,870px long at 600, and
2,586px short at 1024.

**This went one step past the arbiter's words, and it is told so.** It named
the two ends, and they are about 310 as it said: 310 at 320 wide, 303 from
1024 (310 at 1024 itself, 300 by 1100). The same measure showed the middle
as far out the other way: from 450 to 767 wide a card was given 25 to 31px
too much, as it has been since 1.5.2 (section 56 had said "up to 30px"
there). The steps cover every width, on the same build. The five in the
middle (400, 450, 768, 810 and 880) come out in a line each if it wants
only the ends.

**Proved on build 12.**

- The list before its cards are drawn against the list with every card
  drawn, a phone newly opened at each width, twenty-eight widths from 320 to
  1440: within 2.6% everywhere (the worst at 1219 wide). At 320: 974px short
  where it was 8,984. At 600: 422px long where it was 7,870. At 1024: 585px
  short where it was 2,586. Build 11, with 280 everywhere, measured the same
  way: 10.0% out at 320, 4.5% at 412, 10.8% at 600, 3.0% at 768, 8.7% at
  1024.
- **The saints' filters, under the finger:** 0px on every tap, 76 taps with
  real touch at 320, 360, 390, 820 and 1024 wide, with the browser's
  anchoring on and off.
- The gate's two walks on Saints and You, as each reader: the guardrail walk
  2 of 2 with nothing failed, twice; the tap walk 55 controls, 0 failed,
  twice.
- `lib/saints/__tests__/cardRoom.test.ts`, 6 cases, holds each step to the
  measure it was taken from; five fail on the stylesheet as it was. The
  export walk's new section 76 takes the measure again on every export, at
  seven widths, and fails past 5%: the numbers are the cards' of the day,
  and a card redrawn or a hundred saints more would move them.

**What it does not do, measured.** A reader three quarters of the way down
the list scrolls up, and the cards above draw in as they near the screen.
Does what is on screen move by more than the scroll?

- With the browser's anchoring on, as on Android: no. One step in 500
  finger-sized steps moved the screen more than 2px, the same before and
  after this change. The browser holds the screen; what this change mends
  there is the list's length, so the scroll bar and a place the browser
  restores are true.
- With anchoring off, as an older iPhone behaves: the steady slip is gone,
  and single cards still move the screen. Over 18,000px scrolled up, the
  screen had slipped 1,835px at 320 wide and is at 236; 2,180px at 600 and
  is at 420; 1,823px at 1024 and is at 604. A step of 120px moved the screen
  12 to 15px beyond the scroll on average and moves it 6 to 9. But a card is not
  the mean: at 320 wide cards run from 257 to 442px. One that draws in above
  the reader still moves the screen by its own difference from the room it
  was given, up to 83px in one step at 320 (it was 133) and 103px at 1024,
  where a row is as tall as its tallest card of three. No one number for a
  width can take that away. Taking it away means every card the same
  height, or no windowing, or a room remembered card by card; none was
  asked, and each is a design or a speed question for the arbiter.

## 62. "Optional" at the ink, on a build

The arbiter, 12:44 UTC: "prove it on that build too, all five palettes."
Section 58's measure was made with the line's one class changed in the page.
On build 12, which has the change (`9a8b6489`), `node
scripts/words-on-pictures.mjs you,pill-you`: Dark 6.60, Light 7.57, Black
7.60, Candlelight 4.99, Monastery 5.54, where 4.5 is needed. The same five
numbers. The two lines beside it pass on all five as well (on Candlelight,
"Private on this device · no account needed" 4.75 and "Sign in" 9.76). The
export walk's section 46, the two bars, every check passed on the same
build. Still: `build-93/you-optional-candlelight-390.png`, You signed out on
Candlelight, from build 12; the mock checker finds nothing failed on the
picture's words and boxes.

## 63. What is not proven (sections 60 to 62)

- **Nothing here has been seen on a phone.** The next test build's walk has
  the lines.
- **"A Plus reader" in the walk is a page the gate's export locks nothing
  for**, as in Admin's two walks. It is not a signed-in subscriber: no
  account stand-in was added. When Plus is sold in both stores that page is
  locked too, and all three walks will need one. Told to the arbiter.
- **`SELLS_PLUS=1` refusing an export that does not sell** was not run: this
  chat has no such export, and one build was the budget. It is Admin's own
  check (`checkSells`), called before anything else.
- **The locked door was not filmed**, and no still of it was taken: nothing
  a reader sees there was changed.
- **The card's room is the mean row in English, for the whole list.** Under
  a filter (the 21 Apostles) the mean is another, and names in another
  language wrap otherwise. Neither was measured.
- **Scrolling up through cards not yet drawn still moves the screen where
  the browser does not hold it** (section 61). Measured, told, not mended.
- **Whether iOS holds the screen itself** is not known here: there is no
  WebKit in this session. "Anchoring off" is Chromium with its anchoring
  turned off, as before.

## 64. A saint's card says how many works only when there is one

`c6802c33`. The arbiter, 13:39 UTC: "components/saints/SaintCard.tsx line 69
always prints the works count, so every martyr with none reads "0 works"
(seen on the Fathers of Sinai and Raithu in Discover's saints). Show the
count only when there is at least one work; the feast and Read stay where
they are, the row's spacing whole either way."

The foot of a card is one row: the feast, the count, Read. The count is
drawn now only for a saint with a work. The row spreads its parts between
its two ends, so with two parts the feast keeps the start and Read the end.

Walked on the export at 390 wide with every card drawn, before (build 12)
and after (build 13): 269 cards in the list; 124 said "0 works" and none
does; the 145 with a work say the same count in the same place. On every
one of the 269 the feast's left edge, Read's right edge, the row's height,
the card's height and the row's place in the card are the same to 0.0px.
Stills: `build-93/saints-card-0-works-before.png` and
`saints-card-no-count-after.png`, the Fathers Slain at Sinai and Raithu.

The same afternoon Fable voices gave nine saints a Life from Butler
(`d38328c7`), the Fathers of Sinai and Raithu among them. On the branch as
pushed 115 saints have no work, and that card says "1 work". The stills are
of the two builds before it.

`lib/saints/__tests__/cardWorks.test.ts`, 5 cases; the first fails on the
card as it was.

Seen and left: the reading room's search prints "0 works" over its own
"nothing matches" line (`components/reading/ReadingSearch.tsx`). That is a
count of what was found, not a saint's. Told to the arbiter.

## 65. A list is windowed only where the browser anchors the screen

`b906c8c3`. The arbiter, 14:00 UTC, on section 61's last finding: "Not
left for the phone walk: a jump under the finger fails the gate, and Back
now returns readers deep into that list, where the cards above have never
been drawn. Window the cards only where the browser anchors the screen: wrap
.cv-card's content-visibility in @supports (overflow-anchor: auto), so a
browser without anchoring (Safari, as far as we know) draws every card and
nothing above can change size. Measure that stand-in (anchoring off, no
windowing) at 320 for the jump (it should be 0), the first paint and the
memory of 269 cards, and the same @supports for any other list that windows
the same way". It approved section 61's ten steps, which stay.

**Three lists window their rows**, not two: the saints' cards and History's
rows in the stylesheet, and Community's posts by a class on each post
(`components/community/CommunityClient.tsx`). Each now asks the browser
whether it anchors its scroll and draws only the rows near the screen on a
yes. The room a row is given stays outside the question, where alone it
does nothing. The built stylesheet carries all three questions.

**The jump, with a real finger.** A reader is put three quarters of the way
down the saints' list in one jump, as Back puts them, and drags the list
13,000px up, 8px at a time (`Input.dispatchTouchEvent`), the finger held
before it lifts so nothing is flung. After each move the card under the
finger is read against where the finger has taken it. A jump is a step in
that difference that is still there a move later.

| the saints' list | 320 wide | 390 wide | 1024 wide |
| --- | --- | --- | --- |
| as built, the browser anchoring (Android) | 0 of 1,380 moves | 0 | 0 |
| windowed and not anchored (an iPhone, before) | 33 moves, up to 53px, 776px in all | 31 moves, up to 46px, 634px in all | not run |
| the stylesheet's other branch, not anchored (an iPhone, now) | 0 | 0 | 0 |

The other branch is the stylesheet's own and not a rule laid over it: every
stylesheet of the export is served with the question made unanswerable, so
the rules inside it are not taken, as a browser reads it that does not know
`overflow-anchor`. In it a card's `content-visibility` reads `visible` and
none of the 269 is undrawn. No flag makes this Chromium forget the property
(four were tried), so this is the nearest thing here to such a browser.

**A correction to section 61.** It said that with anchoring on one step in
500 still moved the screen. That was the probe: it scrolled by script, and
the browser does not hold the screen through a script's scroll as it does
through a finger's. The step was found: the first card to draw in above
after the jump (St Alexander Nevsky, 280px given, 257px drawn) moved the
screen 22.6px, once. With a finger it does not happen: 0 of 1,380 moves.

**The saints' filters** hold at 0px under the finger with every card drawn
and anchoring off (28 taps at 320, 390 and 1024), as they do as built (48
taps at five sizes).

**What drawing every row costs**, on Chromium here, the list opened by a
tap from Today, three runs each, the median:

| | windowed | every row drawn |
| --- | --- | --- |
| the saints' list on the screen, full speed, 390 wide | 194ms | 298ms |
| the same, processor slowed four times, 390 wide | 747ms | 1,256ms |
| the same, slowed four times, 320 wide | 839ms | 1,244ms |
| the renderer's memory after it | 443 to 466 MB | 474 to 484 MB |
| the saints' pictures loaded | 2 to 4 of 234 | 2 to 4 of 234 (all lazy) |
| History's timeline on the screen, slowed four times | 590ms | 585ms |

About a tenth of a second at full speed and half a second on a slow
processor, and 15 to 30 MB, for the 269 saints; nothing for History's forty
rows. The browsers that will pay it are iPhones. Community's feed was not
timed: it is fetched from the main web and is as long as the day.

**Walked on build 13** (cut 14:12 UTC from `3750c39d` with this work, as the
gate cuts its own): the page-switch walk 50 of 50; the export walk's
sections 9, 22, 42, 46, 60 and 76, 137 checks, all passed; the gate's tap
walk on Saints, History and Community, 100 controls and 0 failed, as each
reader; the guardrail walk with nothing failed on Saints and Community as
each reader. History fails the guardrail walk on eight things that are its
own and no part of this: four links under 44px wide (Arius, 1054, 1204,
1453) and four era names ended by three dots in the row of eras. Told to
the arbiter.

`lib/ui/__tests__/windowedLists.test.ts`, 5 cases, reads every stylesheet,
page and component for a row windowed without the question and names the
three; four fail on the lists as they were. History's own test
(`calmHistory.test.ts`) and the card room's follow the rules' new shape.

**Found on the way, not this chat's.** History's 128px for a row not yet
drawn is far from its rows: at 390 wide the timeline is 11,484px before its
rows are drawn and 15,772px after, 4,288px short over thirty rows. Told to
the arbiter.

## 66. What is not proven (sections 64 and 65)

- **Nothing here has been seen on a phone, and none of section 65 on an
  iPhone.** There is no WebKit in this session. "A browser that does not
  anchor" is Chromium with its anchoring turned off and the stylesheet's
  question made unanswerable.
- **Whether Safari answers no to the question** is from public trackers,
  looked up 2026-11-11: caniuse's page for `overflow-anchor` and the
  web-features explorer list scroll anchoring for Chrome, Edge and Firefox
  and nothing shipped in Safari, and WebKit's bug 171099 ("Implement scroll
  anchoring") is still being worked. A Safari that learns the property
  before it holds the screen well would window again, and jump again. His
  iPhone is what says; the phone-walk line asks.
- **First paint and memory are this machine's Chromium**, slowed, not a
  phone's.
- **Community's feed with every post drawn** was not dragged: its class and
  the built rule were read, and the gate's two walks passed on it as built.
- **History with every row drawn** was timed, not dragged.

## 67. The picture's measure reads only what a reader is shown, and where it stopped

`scripts/words-on-pictures.mjs` is what the mock checker's pixels pass calls
for every word with a picture behind it (Admin, `ff5bd9ee`), so the gate's
guardrail walk stands on it. Run over every screen of build 14, it read three
things that no reader sees, and `7bd23810` mended each:

- **A clamped box, scrolled.** Bringing a word to the middle of the screen
  also scrolled a box that hides what spills from it, which no reader can
  scroll: on `/councils/` three bands' lines read 1.00:1 on every palette.
  Each such box is remembered before the scroll and put back after, and each
  line is cut to every box around it that clips.
- **A word with no letters on the screen was given a ratio** (a name under
  its own picture, a line clipped away). It is told apart now by how many
  pixels change when its fill is hidden, and left out.
- **A ground that would not hold still** (a picture still arriving) was
  photographed once. The photograph is taken twice now, a moment apart, and
  the two have to agree before it is trusted.

`lib/ui/__tests__/wordsOnPictures.test.ts` holds these in its last four
cases, "the pixel walk": the boxes put back, the cut, no ratio without
letters or on a restless ground, and the `--said` sweep on the gate walk's
own phone, reading the main web and never writing it. Four cases fail on the
file as it was.

Where the work stopped (the arbiter, 2026-11-11 17:00 UTC: the account's last
weekly allowance, so only what the test build needs goes on, and Admin's
pixels pass answers these words in the final run):

- **One whole run of the sweep**, on build 14 (cut from `c240515a`, the
  gate's selling recipe, 126 screens, the main web read): 567 words on 22
  screens, 51 under their need. Six of the 51 are the sweep's own fault: it
  found a handed-over word by its text, and on Community the count "3"
  stands six times in buttons that are off. The other 45 are in ten
  families, none in a file of mine. The arbiter routed them at 17:54 UTC:
  the councils' filmstrip is already mended by Fable Theology (`7c8c0a49`),
  and the study's head with its reader, Your rule's tile line and Your
  rule's head line are Fable Theology's too; Plans' tiles, a chant's head
  and Today's hour card are Updates'; a saint's web, the Bible hub's credit
  and the reading room's doors are Updates 2's.
- **`themes-fable-said-sweep-unfinished.patch`**, beside this file, is the
  sweep finding each word by the checker's own mark (`data-mock-look`) in
  place of its text, with the checker's reading kept beside its own. It is
  unfinished: never run whole, not wired in, kept so that nothing made is
  lost.
- **Not done:** a mend measured for any of the ten, and the sweep's count
  laid beside the pass's.
