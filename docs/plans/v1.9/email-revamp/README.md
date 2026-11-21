# The 1.9 release email in the new look (stage 1)

One design, for the owner's yes or no. Made 2026-11-21 by one capped chat, from `BRIEF.md`. Nothing under `lib/`, `app/` or `components/` was changed, and nothing was sent.

**His page:** https://claude.ai/artifact/KFjrCn4eUBg33ptSJMhHDD (private to him). **His answer:** 2026-11-21 06:53 UTC: "sure let's just finalize this and send it out tonight".

## What is here

| File | What it is |
|---|---|
| `release-1.9.html` | The email as a mail app would get it: tables, inline styles, Dark. 15 KB. |
| `release-1.9-390.jpg` | Its picture at a phone's width (390, two pixels to the point), top to foot. |
| `release-1.9-600.jpg` | The same widened (a 680 screen, the column at 600). |
| `release-1.9-390-pictures-off.jpg` | The same with every picture blocked. |
| `img/` | The seven screens of the app (JPEG, 720 wide, 28 to 57 KB each, 304 KB together) and the app's cross. |
| `shots.mjs`, `cuts.json`, `shots.json` | How the screens were taken, which part of each is shown, and the record. |
| `make.mjs` | Writes the email and its stills; `--check` holds it to the rules. |
| `page.html` | The page he reads, made from the kit's template. |

## How the pictures were made

1. A worktree of main at `6700c2e65` (the branch head holds unreleased work), `npm ci`, then the native export cut as the store build with Plus locked: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android`, with the main web's public address and anon key read from purifyapp.net's own scripts into that one command (role checked to be `anon`; printed and written nowhere).
2. `node docs/plans/v1.9/email-revamp/shots.mjs <export>/out <raw-dir>` opens each screen as the store pictures and the cards do (the phone's shell, 412 by 846, a new reader with no Plus, Dark, 6 December 2026, a finger's taps) and cuts the part in `cuts.json`.
3. `node docs/plans/v1.9/email-revamp/make.mjs --check` writes the email and its stills and checks them.

No interface is drawn. Each picture is a part of one real screen, the whole width of the phone, with nothing laid over it.

| Picture | Screen | State |
|---|---|---|
| `today.jpg` (the hero) | `/` | Today on 6 December 2026, the one-question card dismissed with its own button. |
| `journal.jpg` | `/journal` | The journal as a new reader opens it. |
| `verse.jpg` | `/bible/john/1` | A finger held on John 1:1: its tools, open. |
| `bibles.jpg` | `/bible/john/1` | The translations list as it opens. |
| `study.jpg` | `/bible/john/1` | John 1:1 held, then Study: the sheet as a reader with no Plus meets it. |
| `plans.jpg` | `/plans` | Reading plans as it opens. |
| `creed.jpg` | `/theology/creed` | The Creed, line by line, as it opens. |

Church history on Today has no picture. I did not find that an event falls on 6 December, the day every screen is taken on, and did not stage one on another day.

## The reason for each choice

| The choice | Why | What it does for the reader |
|---|---|---|
| "Purify 1.9" at 44 px (56 wide), heavy sans, its line under it at 20 px | His direction: big clean headings. | He knows what the email is before reading a sentence. |
| All sans: `'DM Sans', Arial, Helvetica, sans-serif` | His answer: "All sans". Most mail apps load no web font, so the stills are drawn in the fallback: what most readers will see. | One clean voice from head to foot. |
| The hero is Today, the app's own screen, linked to What's New | His direction: a hero picture of the app. | The app is seen before any feature is named. |
| Each point in its own card: the app's raised card, a fine edge all round, 16 px radius | His direction: each new thing in its own card, like What's New. No side stripe, no pills. | Each new thing can be read alone. |
| A real screen at the head of six cards, the phone's whole width | His direction: a real screen beside each main point. At the column's width the screen is near life size, so its words stay readable. | He sees the thing, then reads its two lines. |
| One column at every width | Two columns break in several mail apps, and a screen beside its words at 360 is too small to read. | Nothing to pinch. |
| Plus named in the point's name; the Plus screens show the app's own Purify Plus marks | Plus is never promised to every reader. | No one is misled about what is free. |
| 16 px words on 25 px lines, 16 px between cards, 44 px above the name | His direction: more space, shorter lines. | It reads as a page, not a wall. |
| One button, white, 52 px tall, the column's width | The kit: one button, one next step. | The thumb finds it. |
| The closing line heavier, just above the button | It is the letter's promise: the library stays free. | The last thing read before the tap. |
| Dark only, colours inline | Every email is sent in the app's default colours. No parchment. | It looks like the app. |
| The foot set to the start, whole | Why it came, the company and its address, Unsubscribe (44 px), purifyapp.net. | The way out is plain. |

## What was checked and measured

`node docs/plans/v1.9/email-revamp/make.mjs --check`, 2026-11-21, passes:

- checkMock: all 15 rules at 360, 390, 412 and 1032 wide, on the five palettes (the drawing with every colour a custom property, as the kit's emails are checked).
- No sideways scroll at any of the four widths. Every link 44 px tall or more.
- The HTML is 15,248 bytes. Each picture is under 100 KB (27,692 to 57,179 bytes).
- Only Dark's own colours are in the file. No em dash. No script, no SVG, nothing fetched but pictures.
- With every picture blocked, every word of the letter is still said, and each picture has its own words.
- The words are today's: the name, the line, the opening, the seven points, the two closing lines, the button, the sign-off and the foot, as `node scripts/release.mjs email` wrote them the same day.

`node docs/brand/kit/check.mjs --page docs/plans/v1.9/email-revamp/page.html` passes: checkMock on five palettes at four widths, and no parchment.

Measured: the email is 5,452 px tall at 390 wide, about six and a half screens.

**Not checked:** any real mail app (Gmail, Apple Mail, Outlook). The kit's own `email/check.mjs` was not run on it, since that check reads the kit's own list of emails. Outlook on Windows will square the corners.

## What stage 2 would change in `lib/email`

Each at his yes; none is done.

1. `lib/email/kit.ts`: a sans opening (the name large, its line under it), a card piece (picture, name, words), a whole-width picture piece; the masthead's wordmark in the sans.
2. `lib/email/kitLetters.ts`: the release letter built from those pieces. Today each point is a paragraph and a 300 px picture under it; a point would become a card. The sign-off and the foot in the sans, set to the start.
3. `lib/email/templates/contentBodies.ts` (`releaseBody`) and `lib/whatsNew/releaseEmail.ts`: a hero picture, and a picture and its words for each point that has one.
4. `public/email/`: the seven pictures, so the main web serves them.
5. `lib/email/look.ts`: raise `READER_EMAIL_LOOK`, which arms the first-send guard: the first email in the new look goes to him alone.
6. The tests that hold the letter (`lib/email/__tests__/`), and the kit's `docs/brand/kit/email/` so the kit holds one email look.
7. Then the other emails (welcome, Sunday, account, order) in the same look.

Open for him: whether the three smaller points keep their pictures (the email is long), and whether the hero should be Today or the journal.
