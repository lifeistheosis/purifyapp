# Build 90 on his phone (notes)

Android build 90 (run 42782850621, from `53dbb696` on `ccr-07896cf2-bo0afd`),
the test build of 2026-11-10 morning, on his "yes to the test build". It holds
every build 89 note, the page transitions, Easy Scroll, the new Florilegium and
Theology pages, the covers, both widgets' fixes, the 18 looks and their picker,
the new onboarding behind Testers, and campaigns' phase 1 switched closed. It
predates the Candlelight season and the Vespers mend (`827a65f2`, `d793da30`),
the Plus lines for the looks (`5b22c471`), the contrast sweep's later parts,
the palette names in 21 languages (`0128431a`), and the security updates.

What build 90 cannot show, so not bugs (it talks to the live 1.8 website):
campaigns, journal sharing, the new sync, the Bibles' downloads, the 1.9
counts, the Psalms move.

Brainstorm mode is on (his word, 2026-11-10 about 09:12 UTC: "Okay, brainstorm
mode on. I'm gonna start giving you critiques."). Each note says what he saw,
in his words with his screenshots; a chat finds the cause and the plan; nothing
from these notes is built until he says start. Work he approved before (the
campaigns, the security updates, the small fixes in flight) carries on.

## His notes

### 1. The account step's "Terms" and "Privacy Policy" open nothing; show them in a sheet (2026-11-10)

What he saw: in the onboarding, on the screen that says "Carry your prayers on every device", the line "By continuing you agree with our Terms and Privacy Policy": tapping Terms or Privacy Policy does not show them. His words: "So on the section on the onboarding where it says carry your prayers on every device, when it says by continuing you agree with our terms and privacy policy, when you click on terms and privacy policy, it doesn't actually show you the terms or the privacy policy. So I want to have either a pop-up show up with the terms, which is preferred actually, and you can easily scroll to see, and the privacy policy too."

Where it is (found by the Admin chat): the line is the Google and Apple buttons' notice, `signin.byContinuingYouAgreeToOur` in `components/auth/OAuthButtons.tsx`, which the account step draws. Its Terms and Privacy Policy are plain links to `/terms` and `/privacy`.

Why nothing shows: the tap does work, underneath. The onboarding is a full-screen layer over the app (`components/onboarding/OnboardingFlow.tsx`, `fixed inset-0 z-[100]`), drawn by `components/onboarding/FirstRunGate.tsx`, which decides again only on the home screen (`if (!home && !signup) return;`) and never takes the layer down when the page changes. So the app moves to the Terms page beneath the onboarding, the onboarding stays on top, and nothing seems to happen; a reader who then finishes lands on the Terms. It is not `c9e0d1a3`: that sent three links to pages the apps do not carry (the shop's contact form, the privacy page's robots.txt and llms.txt) to the website, while `/terms` and `/privacy` are in the apps and open with no signal as pages. The same thing happens wherever such a link sits inside a layer: Purify Plus's purchase sheet (`components/billing/PlusPaywall.tsx`) moves the page beneath itself, and the other purchase sheet (`KeptPaywall.tsx`) closes first, so the reader loses their place.

Planned (brainstorm, nothing built until his start):

1. **One sheet for the legal pages:** the house's own sheet (`components/ui/Sheet.tsx`), at full height, titled "Terms of Service" or "Privacy Policy", with the whole text in its own scroll, a 44px Close, the phone's Back closing it, and the reader returned to exactly where they were (the account step, the purchase sheet, the cart), nothing reset.
2. **One text for page and sheet:** the Terms and the Privacy Policy, English and German, move out of their pages into `components/legal/`, and both the pages and the sheet draw them, so the two can never say different things. The sheet loads the text when it opens: in the apps it is a file in the app, so it opens with no signal; on the website it is one request; no page carries it as a prop. A German reader sees the German text, as on the pages.
3. **One link everywhere the app says you agree:** a `LegalLink` that is an ordinary link to `/terms` or `/privacy` (it works without script, and on the website a middle click still opens the page) and opens the sheet on a tap. It replaces the bare links in the Google and Apple notice (sign-in, sign-up, the onboarding's account step), the sign-up form's checkbox (the sign-up page and the onboarding's own form), the sign-up page's line, the checkout's agreement (the cart and the buy bar), and both purchase sheets, where Apple asks for working Terms and Privacy links beside a subscription. The checkout also names the shipping and refund policy: in a sheet of its own the same way, or as the page it opens today (his call).
4. **Over whatever opened it:** the sheet stands above the layer it was opened from: over the onboarding (above its layer of 100) and over a purchase sheet (`lib/ui/overlay.ts` already counts layers), so no reader is sent beneath again.
5. **Nothing in the words changes:** the agreement lines stay as he approved them, the checkout's required agreement (`termsAccepted`) stays, and the whole text beside the action only makes the notice stronger.
6. **Held by:** a unit test that none of those places links to `/terms` or `/privacy` bare, and that the pages and the sheet draw the same text; a walk on the app's export (the account step, Terms, to the end, Close, still on the account step; the network off, then Privacy opens); and `checkMock` on the sheet in all five palettes.

### 2. Turning on notifications in the onboarding does not work; it just says "static" (2026-11-10)

What he saw: in the onboarding, the step that turns on notifications (reminders) does not work on build 90; it shows only the word "static". His words: "turning on notifications doesn't work it just says static (on the onboarding)".

What was found (the Fable onboarding chat, 2026-11-10; code and a walk of the export, no phone):

- **The word "static" is not in the app.** No line in any of the 21 catalogs and no code on this path can print it. So his sentence is read as dictated speech, "it just stays static": he tapped, and nothing turned on. If the word itself was on the screen, a screenshot is needed, because the app has nowhere to get it from.
- **Reproduced, for a reader with no account.** Walked on the export as the Android app, the way a fresh install of build 90 meets the questions after "Continue without an account": on "A nudge to pray, morning and evening", the tap on "Turn on reminders" asks the phone nothing. No Android question appears. The heading and the text stay where they are, and the button becomes the line "Reminders reach this device through your account. Sign in, and they turn on." with "Sign in". That is by design since 2026-10-31 (a reminder is kept with an account, `lib/push/native.ts`, `enableNative`), but the button says it will turn reminders on and it cannot. To a reader that is a button that does not work.
- **Signed in, it cannot be reproduced without a phone.** The tap asks the phone's question, asks Google for the phone's address, and waits for the website to keep it. Two weak places, both real and both old: only the wait for the website has a limit (10 seconds), so if the phone's own check or Google's answer never comes, the button stays on "…" for good; and every failure but two shows one sentence ("Reminders could not be turned on just now. Please try again in a moment.") with only "Continue" under it, whatever went wrong.
- **Ruled out.** Build 90 was built with its Firebase file (the run's log: "Wrote android/app/google-services.json", and Gradle processed it). And the reminders' own code in build 90 is the same, line for line, as what 1.8 runs today (`git diff origin/main -- lib/push app/api/push` is empty but for a test): what changed is the questions around it.
- **How it fits what is known of Android** (F-21, item 89, `lib/onboarding/reminderPromise.ts`): even when the step succeeds, no Android phone has been seen receiving a reminder since 1.6. So "it turned on" and "one arrived" are two proofs, and the phone walk needs both.

One fact from him settles which of the two he met: was he signed in when he tapped?

Planned (brainstorm, nothing built until his start):

1. **No button that cannot do what it says.** A reader with no account is never shown "Turn on reminders" in the questions. The new onboarding already does this (reminders are asked there only of a signed-in reader; the others meet the account card on Today), so it is true for every reader once the new onboarding is lit at release. For as long as the older questions can still be shown, the same rule goes into them: with no account the step opens with the sign-in line and "Sign in" at once, with no tap that leads nowhere first.
2. **The button never sticks.** Each wait on the phone gets a limit of a few seconds (the phone's own notifications check, the request to Google), beside the website's 10. The phone's own question has none: it waits on the reader. When a limit passes, the step says so and offers the tap again.
3. **Each failure in the house's words, and a way to try again.** Blocked in the phone's settings and not supported are said today. To add: no connection; the phone gave no address (Google Play services missing or out of date); the website did not keep it. Existing lines are used where they fit; any new line comes to him first, then the other 20 languages. "Try again" beside "Continue", never a dead end. Never a code word on screen.
4. **For testers only, the reason in plain words.** In Testers mode a small line under the sentence says which wait failed ("the phone did not answer", "Google gave no address", "the website said no"), so his next note names the cause and nobody has to guess from here. Readers never see it.
5. **The proof, on the phone walk (row 19, Android).** Signed in: the questions' step turns reminders on and its cards appear. Then a test reminder to his devices is watched arriving as a banner. Only then does Android turn to yes in `lib/onboarding/reminderPromise.ts`, and the account card may say its line there. If it turns on and nothing arrives, that is F-21, and the offer on Android is hidden until it is mended, as recommended to the arbiter.
6. **Held by:** unit tests that the step settles inside its limits when the phone never answers, and that a reader with no account is never drawn the button; the walk of the export run here, kept as a script, for both sets of questions; `checkMock` on any screen that changes.

### 3. The councils' Fathers: their pictures missing, or not framed right (2026-11-10)

What he saw: on an Ecumenical Council's page (the Second Council of Nicaea), under "The Holy Fathers principally associated", St Tarasius, St Irene and St Adrian show only a letter in a circle, and St John's icon is cut off-centre in its round frame (`build-90/03-council-fathers.png`). His words: "I noticed that in the ecumenical councils, the profile pictures of the Holy Fathers principally associated either don't show, or they do show and it's not framed correctly."

Also in his screenshot: at the top, the way back's chevron stands on the small heading "Seventh Ecumenical Council" ("S<venth"), with no plate under it over the picture.

Where it is: the faces for Updates 2 to find (note 3's covers and their faces; some come through the covers pack, which the live 1.8 website does not serve yet, so say which are a build 90 limit and which are real); the way back on the heading for Admin (the top plates of note 15).

Planned (brainstorm, nothing built until his start): every Father with an icon shows it, cut about the face and centred in its round frame, on every council page; a Father with no icon that passes our rules shows the house's plate, not a bare letter, or a related icon by the same rule as the borrowed covers; the way back stands on its plate, clear of the heading, on every page with a picture at its head. Held by a test and checkMock on the seven councils.

**The way back on the heading (found by the Admin chat).** Cause, on build 90 and at the head alike (the rule and its styles have not changed since build 90):

- A council's page uses the bar that starts clear over the page's picture (`MobileTopBar` with `overlay`), not the Bible reader's plates of note 15. At rest the way back stands well clear of the heading (on the export, its foot at 48px, the heading at 148px).
- Its plate is drawn: night at 55%, with no blur and no edge. Over a dark icon it barely shows, and it dims the words that pass under it instead of hiding them. In his screenshot it is there, a faint disc, with "Seven" greyed under the chevron.
- The bar turns solid only once the page's name (the `h1` that `revealTitleOn` names) has gone entirely under it: the observer's "gone" is the name's foot above the bar's. Words above the name (the council's ordinal line) and then the name itself pass under the clear bar first, under the plates and the chevron. On the Second Council of Nicaea that is from 105px of scroll until about 150px, and his screenshot stopped there.

Where else, measured on the app's export, scrolling every page whose bar starts clear over a picture 5px at a time:

- every council with a picture, from 105px (the ordinal line, then the name);
- Your rule, from 95px;
- a Theology topic, from 185px (a quoted line above the title);
- a Theology path, from 355px;
- a saint's page, the name itself, from 265px.

Chants come out clean. Campaign pages use the same bar (closed in these builds), so they take the same fix.

Planned for the way back (brainstorm, nothing built until his start):

1. **The bar turns solid when the page's first words reach it,** not when the name has gone. `MobileTopBar` gains `solidFrom`, the id of the head's first words, which defaults to the name, and watches that element's top cross the bar's foot. While it is wholly below the bar, the bar stays clear; once any of it is under the bar, the bar is solid. The bar's own title still waits for the name to go (two marks: one for the solid ground, one for the title), so no second name shows early.
2. **Each clear-bar page names its first words:** a council its ordinal line, a Theology topic its quoted line, a Theology path and Your rule their first lines. A saint and a chant keep the default, the name.
3. **The plate shows over any picture:** a fine edge of paper at 13%, as the new post page's Close has, so it reads on a dark icon too. At rest the bar stays clear, as today.
4. **Held by:** a test that every clear-bar page names its first words (or its name is its first word); the same scroll measurement as a script on the export, which must find no words under a button while the bar is clear on any of these pages; and `checkMock` on a council's head in all five palettes.
