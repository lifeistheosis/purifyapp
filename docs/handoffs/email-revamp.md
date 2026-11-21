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

- 2026-11-21 06:53 UTC, after the page and "Yes or no?": "sure let's just finalize this and send it out tonight"
- 2026-11-21 13:40 UTC, after this chat asked (1) "Do you lift my cap so I build stage 2 here now? Or should the arbiter take it?" and (2) "If it is built and checked tonight, do I have your word to push to main so you can send the test to yourself?": "do that now"

The second is read by this chat as: lift the cap and build stage 2 here now. It is NOT read as his word to push to main: that is asked again, alone, when the work is checked.

The first is read by this chat as his yes to the design and his ask to start stage 2 and send tonight. Stage 2 was not started here: this chat is at its cap, and a send needs code in `lib/email`, the pictures on the main web (a push to main, which deploys) and the first-send guard. This chat asked him whether to lift the cap.

## The count

About 32 tool calls of the 60. I cannot read my tokens; my own estimate is near the 150,000 cap, so I stopped here. One native export was built (about 5 minutes on this machine). No other chats, no subagents, no scheduled tasks.

## What stage 2 needs

His yes on this design first. Then, each at his word: the pieces in `lib/email/kit.ts` and the release letter in `lib/email/kitLetters.ts`, the pictures in `public/email/`, `READER_EMAIL_LOOK` raised (the first email in the new look goes to him alone), the tests, the kit's email folder, and the other emails. The list is in the README, "What stage 2 would change".

## Stage 2, built on the branch (2026-11-21, after his "do that now")

Not on main. Nothing deployed, nothing sent.

**What changed**

- `lib/email/kit.ts`: the sans letter's pieces (`openingSans`, `hero`, `pointCard`, `paraSans`, `closingLine`, `buttonSans`, `signOffSans`) and `shell`'s `sans` option. With `sans` off, every older letter is drawn byte for byte as before (the kit's own test still holds them to the builder).
- `lib/email/kitLetters.ts`: a release letter with points is drawn as the design (`releaseLetter`). The Sunday email, the monthly note and the shop email are untouched.
- `lib/whatsNew/releaseEmail.ts`: 1.9's hero and six screens, with their words.
- `public/whats-new/1.9/email-*.jpg`: the seven pictures (the website's alone; the apps' export prunes them by name).
- `lib/email/look.ts`: `READER_EMAIL_LOOK` is "3".
- Tests: `lib/email/__tests__/kitLetters.test.ts` (four new, for look 3) and `campaignBodies.test.ts` (one brought to the new markup).

**What was checked**

- `npm run typecheck`: 0 errors. `npx vitest run lib/email lib/whatsNew lib/admin`: 166 files, all pass. eslint on the changed files: clean.
- `node scripts/release.mjs email` writes the new letter (15.8 KB). Drawn at 390 wide it is the design he saw, 2 px shorter: the sender keeps the kit's own Unsubscribe button (13 px words), where the design drew 14 px.
- The website's production build (`npm run build`) on the stage 2 code: exit 0.
- Not checked: any real mail app. The kit's own email folder (`docs/brand/kit/email/`) does not hold look 3 yet.

**What he must know before a send**

1. **A send he presses in Admin is not held by the first-send guard** (`lib/email/look.ts`): the release email goes to every account that has not said stop. The panel has no "send to me only" for a release. So nothing in the code shows him the new letter in his own inbox first.
2. **Raising the look to "3" holds the next automatic email instead.** That is the Sunday email of 22 November: it would go to him alone, and readers wait until he says on the desk that he has seen it. The Sunday email itself did not change.
3. **Every list send refuses without `EMAIL_POSTAL_ADDRESS` on the server** (`lib/email/consent.ts`). I cannot read whether it is set on the main web.
4. The pictures are on the main web only after a push to main.
