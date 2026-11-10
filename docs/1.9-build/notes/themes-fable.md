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
