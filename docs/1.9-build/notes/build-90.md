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
