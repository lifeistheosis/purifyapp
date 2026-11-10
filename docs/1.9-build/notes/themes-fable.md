# New palettes: proposals for Plus, and new looks for the earned two

Proposals only, 2026-11-10. Nothing here is in the app. Edgar picks first, and
the build comes on his word through the arbiter.

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
