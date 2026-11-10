# Build 89 on his phone (notes)

Android build 89, from `4ab8e9cc` on `ccr-07896cf2-bo0afd` (the first build
that says 1.9), installed from the `android-release` page on 2026-11-10.
Brainstorm mode is on (his word: "Okay, so brainstorm mode on. I'm going over
the app right now. I'm gonna send you a bunch of things to fix or revise."):
each note says what he saw, then the cause found in the code and the fix
planned. Nothing here is built until he says start.

What build 89 cannot show, so not bugs (the build talks to the live 1.8
website and database until release day): the five Bibles' downloads, journal
sharing and Stop sharing, readers' things on Psalms 113 to 115 before the
release-day SQL, the new sync slices, the 1.9 counts. It also predates 85, 10,
80, the covers pack, 79, 88, 8 and the 1.9 tour.

## His notes

### 1. No side stripes (2026-11-10)

What he saw: the grey bar down the left of the reading room's editorial summary ("Editorial summary · Summarized by the editorials, not St. Gregory Palamas's words") and of the councils' quotes under "In the council's own words" (`build-89/01-stripe-editorial-summary.png`, `build-89/01-stripe-council-words.png`). His words: "the line on the left is a vibe-coded AI slob guardrail that gets hit, and it gets detected through impeccable, which is an AI slob detector. So add this to our guardrails because it's implemented throughout certain sections, and we cannot have this." The rule is in CLAUDE.md.

Where it is (a first count by source, 2026-11-10): one-sided borders in about 21 files. Side stripes on content: the heresies page, the commentary sheet, the study rail, Plus's cross-references preview, the florilegia hub, the saints' voice band, the theology study parts and topic reader, the apologetics reader. Dividers that may be true dividers: the calendar grid, admin tabs, the shop's sub-tabs, the player sheet, press-to-copy. Quotes styled by a shared rule (a blockquote or typography style) are not in that count, so the export walk finds them by computed style.

Planned fix (on his start): every side stripe on content comes out, and the quote or note stands on its own type (indent, italic serif, the citation under it, the label above), drawn from the app's own components and checked with `checkMock` on all five palettes; a test over app/, components/ and lib/ in the shape of `lib/ui/__tests__/noRays.test.ts`, plus `checkMock`'s `stripe` on every screen of the export, with an allowlist naming each true divider and why.

### 2. The four Theology pages, revamped by Fable 5.2 (2026-11-10)

What he saw: the pages behind Theology's four buttons, Doctrine (`app/(app)/theology/doctrine/page.tsx`), Topics (`app/(app)/topics/page.tsx`), Heresies (`app/(app)/heresies/page.tsx`) and Apologetics (`app/(app)/apologetics/page.tsx`): an eyebrow, a giant headline sentence, a lede and a list under hairlines (`build-89/02-theology-*.png`). The four buttons themselves (`components/theology/TheologyLibrary.tsx`, `build-89/02-theology-the-four-buttons.png`) are the revamped look he likes. His words: "So these sections need to get revamped. I let Opus 5.5 try and revamp it, and as you can tell, it still looks like the old version, and it still looks AI like vibe coded slop ... I want you to give this to Fable, and the newest model Fable, before Fable works on it, right? Send a message to it to activate it, so I can change the effort to max ... after we confirm that I've changed the effort, then you're gonna tell Fable to revamp it using our style, what style we've been using. And I want to make it very clear that the 4 buttons that you see, those are the revamped version. So the buttons look nice. I'm talking about the pages within those buttons that it links you to."

Plan: a Fable 5.2 chat (session_01VuYTwbjdKohi9QuNXgkgAP, created at effort Max) gets its brief once he confirms the effort. It revamps the four pages in the house style, renders one still of each from the export with `checkMock` passing, and the stills go to him before the change is pushed.
