# The Purify design kit

His word, 2026-11-12 (`docs/1.9-build/BRAINSTORM.md`): "I want it to be the standard for everything we do, right? We're gonna be using Purify type of designs. And I really want the design to be a massive factor, because it's what keeps us apart from everyone else."

So everything a chat makes for people to look at starts from this kit, never from a generic template: artifacts, reports, briefs, drop kits, plans shown as pages, and emails. The kit is the app's own look, taken from its source. Nothing in it is new.

## Rule one: phone first

His word, 2026-11-13: "the design must be optimized for mobile." Everything is designed at phone width first (360 to 412), then widened. Most of what we make is opened on a phone, his first of all.

- Headings take the app's phone sizes: a title at 28px (`text-title`) and a section at 22px (`text-title-sm`), rising with clamp() to 48px and 28px on wide screens.
- No orphan and no empty half-row at any width. Figures are one card of rows on a phone and one row of tiles from 640px; cards stack on a phone and stand in one row from 640px, three at most.
- A chart fits 360 wide with every label and value whole, and room above its highest mark.
- An email is one column, 100% wide up to 600px, body text 16px or more, every tap target 44px or more.
- The check renders every template at 360, 390, 412 and 1032, and fails on a sideways scroll. Look at a still at 390 yourself before sending.

## Rule two: never parchment

His word, 2026-11-13: "and also stop using parchment for designs. (important because you always do this)". No design stands on the parchment ground (`#f1e8d4`, the app's Light palette) or on any aged-paper, cream or sepia look.

- A design opens on the app's dark ground.
- Its light, when one is needed (the email's light mode, `data-theme="light"`), is a clean neutral: white (`--color-paper`) carrying the app's ink (`--color-ink`, `#49424e`), with the admin panel's neutral grey for a card.
- `tokens.css` still lists Parchment, marked "app only, never a design ground", for mockups of the app's own Light palette. No piece reads it, and in the kit the app's Light attribute draws the clean neutral.
- `check.mjs` fails a design with a parchment, cream or sepia ground, however it is worn (as it opens, light, a light system, each palette), and proves that measure with its own self-test first.

## What is in `docs/brand/kit/`

| File | What it is |
|---|---|
| `tokens.css` | The tokens: the five palettes (Dark, the clean neutral Light, Black, Candlelight, Monastery; Parchment listed for app mockups only), the ink's shares, type, space, radius, motion, the Church's red and money's three hues. Each names its line in `app/globals.css` or `app/admin/admin-theme.css`. |
| `pieces.css` | The pieces: title, section, figures, table, chart, figure, note, card, button, footer. Built only from the tokens. |
| `artifact-template.html` | One self-contained HTML page holding the tokens and pieces, with every piece shown once. Start an artifact or a report from a copy of it. |
| `email-template.html` | The email: tables, inline styles, no scripts, no SVG. Light in the clean neutral (white, the app's ink), dark in the app's Dark palette. Start every email from a copy of it. |
| `check.mjs` | Renders both templates at 360, 390, 412 and 1032 and holds them to checkMock on the five palettes at each width, and to no sideways scroll. `--write` refreshes the artifact template from the two CSS files. |

## On claude.ai

The kit is also a claude.ai design system, so decks and designs start from Purify's look: https://claude.ai/artifact/PJnQQWqgVybxZKzy2H3tt5 (the five palettes as its themes, the type, space and radius, the brand book with the guardrails, and the pieces with live previews). It is the owner's and private until he shares it. When `tokens.css` changes, change the design system's `tokens.json` to match.

## When to use it

- **Always**, for anything made for the owner, a reader or the public to look at: an artifact, a report, a brief, a drop kit page, a release email, a chart.
- **Not** for app code. The app is the source; the kit follows it. Nothing under `app/`, `components/` or `lib/` imports the kit.
- **Not** for pictures of the app (store pictures, cards, promo stills): those are real screens from the export (CLAUDE.md, "Mockups"). The kit is for the page around them.
- **Fable** designs on top of the kit only where taste decides (the email layout, the seasonal looks), and adds to it rather than replacing it.

## How to use it

1. Copy the template you need into your own folder. Keep its `<style>` block whole; delete the pieces you do not use from the body, never from the style.
2. Write the words in the house voice (`docs/brand/voice.md`): sentence-case headings, no em dashes, plain sample words, figures that say "not read" when they were not read.
3. Use the pieces as they are. A new need is a new piece in `pieces.css`, built from tokens, added here and passed by the check, not a one-off style in your page.
4. Check it: at 360, 390, 412 and 1032 on all five palettes with checkMock (the way `check.mjs` does), and look at a still at 390. Then send it.
5. For an artifact on claude.ai, publish the copied page. It opens on Dark; `data-theme="light"` gives the clean neutral light, and `data-reading-mode` on `<html>` wears the app's other palettes.

## The pieces, in one line each

- **Title:** the cross mark in the accent, an eyebrow, the serif title (Lora 700, 28px on a phone to 48px wide), one lede, the date.
- **Section:** a serif heading (22px on a phone to 28px wide), body in DM Sans at 17px, a 68-character line. A hairline between sections, never down an edge.
- **Figures:** on a phone, one card of rows (the label and its change at the start, the number at the end); from 640px, one row of tiles, three at most. One number needs no chart. In email, three compact tiles in one row at every width.
- **Table:** eyebrow headings, hairlines between rows, numbers to the end and in tabular figures, a caption.
- **Chart:** the app's own method (`components/admin/charts.tsx`): one ink, a recessive grid, the period before as a dashed line, a legend for two series or more, the figures in a table beside it, a title in every bar for hover. Hues only on money's chart: the shop, Purify Plus and the EIKON Box, as `admin-theme.css` sets them, checked with the dataviz validator. In email, columns are table cells: one series, its heading as its name.
- **Figure:** a picture from the app on the well, rounded, with a caption that names where it comes from.
- **Note:** a label and the serif in italic, set in from the line. It stands on its own type: no rule beside it, no box.
- **Card:** the app's card (`rounded-lg border-paper/10 bg-night-soft`): a serif title and one line. Stacked on a phone, one row of three at most from 640px.
- **Button:** the app's primary (a pill in the ink, the ground's colour for its words) and a quiet one in a hairline. At least 44px. One primary at most.

## The rules it keeps

Every guardrail in CLAUDE.md holds for anything made from the kit:

- No light rays, no side stripes, no sparkle star (the `Sparkle` icon or the glyphs), no gold, yellow or amber (`lib/ui/goldTone.ts`).
- Pills only for a button or a small choice on the screen, never a list of places to go.
- Contrast at 4.5:1 on all five palettes; every control 44px; logical sides (start and end) so Arabic mirrors.
- No em dashes in any word. No reading of Scripture or of a Father written for a sample. Plus never promised to every reader.
- An icon is one from `components/ui/icons`, never a typed character.

The accent the app calls "gold" (`--color-gold`) is a glowing white on the dark palettes and an ink grey on Light, by his rule of 2026-10-28. The kit calls it `--k-accent` so nobody reads the name as a colour to use.

## Checking

```
node docs/brand/kit/check.mjs                # both templates, five palettes, 360 390 412 1032
node docs/brand/kit/check.mjs --write        # after a change to tokens.css or pieces.css
node docs/brand/kit/check.mjs --shots <dir>  # and a still of each palette at 390
```

It needs Playwright (`npm ci`, or the session's own). It fails when either template fails a checkMock rule, scrolls sideways, or stands on parchment, and when the artifact template no longer holds the two CSS files as written. The money key's two hues are allowed by name: they are the same on both themes in the app's admin too.

When the app changes a token (a palette, the type, the curve), change `tokens.css` to match, naming the line, run `--write` and the check, and say so in your report.

## Emails, in particular

Email clients run no scripts and many draw no SVG, so the email template does layout with tables and colour with inline styles, Light first. Its light is the clean neutral, never parchment. Its `<style>` block carries the Dark palette under `prefers-color-scheme: dark` (and Outlook's own dark marks); the rules under `html[data-reading-mode]` exist only so the check and an in-app preview can wear the other palettes. Before a send, see it in Gmail, Apple Mail and Outlook, light and dark (`docs/plans/owner-desk.md`, section 3).
