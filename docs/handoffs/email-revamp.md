# Hand-over: the email revamp, stage 1

2026-11-21. One capped worker chat, started by the arbiter at the owner's choice ("One fresh chat, capped").

## What was made

One design of the 1.9 release email in the new look, in `docs/plans/v1.9/email-revamp/`: the email's HTML, its stills, the seven screens of the app it shows, the scripts that made them, and a README with the reason for each choice. Nothing under `lib/`, `app/`, `components/`, `android/`, `ios/` or `supabase/` was changed. Nothing was sent to anyone.

**His page:** https://claude.ai/artifact/KFjrCn4eUBg33ptSJMhHDD (private to him). It waits for his yes or no.

## What was checked

- `node docs/plans/v1.9/email-revamp/make.mjs --check` passes: checkMock's 15 rules at 360, 390, 412 and 1032 on five palettes, no sideways scroll, every link 44 px or more, the HTML 15 KB, each picture under 100 KB, only Dark's colours, no em dash, and every word still said with pictures off.
- `node docs/brand/kit/check.mjs --page` passes on his page.
- Not checked: any real mail app. Not run: the unit tests, since no code they read was touched.

## Faults and oddities found, not mended

1. `docs/plans/v1.9/store/cards/cards.mjs` cannot open the translations list on the export of main `6700c2e65`: `getByRole("button", { name: /KJV/ }).first().click()` opens nothing there (the first match is hidden and the list opens to a touch), and the list's dialog is named "John 1", not "Translation". `shots.mjs` here taps the visible button instead. The Bibles card would fail if it were made again from that export.
2. The email says "Seven more Bibles" (with the World English Bible); the social card says "Six more Bibles". Each follows its own source. He may want them to agree.
3. In a container `node scripts/release.mjs email` writes its links to `purifyapp.onrender.com`. I did not check what the main web's sender writes.
4. The email's plain-text part leads each point with an emoji; the HTML has none. The design has none.

## His words

None yet. If he writes in this chat, his words go here verbatim with the time.

## The count

About 32 tool calls of the 60. I cannot read my tokens; my own estimate is near the 150,000 cap, so I stopped here. One native export was built (about 5 minutes on this machine). No other chats, no subagents, no scheduled tasks.

## What stage 2 needs

His yes on this design first. Then, each at his word: the pieces in `lib/email/kit.ts` and the release letter in `lib/email/kitLetters.ts`, the pictures in `public/email/`, `READER_EMAIL_LOOK` raised (the first email in the new look goes to him alone), the tests, the kit's email folder, and the other emails. The list is in the README, "What stage 2 would change".
