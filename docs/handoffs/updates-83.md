# Baton: Updates 83 (the signed pages' empty wait, Gate 3c groups 1 and 2, and /account/'s flash)

Done 2026-11-15. The mend: `17276848`. The walk's results: `docs/handoffs/updates-83-runners/` (`walk.sh`, eight runs as `.json.gz`, one still).

## The cause, as proved in the code
- **Group 1, the account family** (`components/account/AccountAuthGate.tsx`). On the device, with no session, the gate first drew its waiting line under the screen's bar, read the session in an effect, and only then called `router.replace('/signin?next=...')`. That made two page switches with an empty screen between them. "Open Security" (/email/change/) and "Choose what email you get" (/email/first-week/, /email/unsubscribe/) are links into /account/security/ and /account/notifications/, so they meet the same gate.
- **/plan/** (`components/premium/PlanScreen.tsx`). It drew "Loading your plan" while it read the plan, then `router.replace('/premium')`. A reader who is not signed in reads as free.
- **/set-password/** (`app/(auth)/set-password/page.tsx`). Its server `redirect("/signin")` ran at build time, so the export baked it in: Next's redirect boundary draws nothing, then replaces. `components/auth/SetPasswordForm.tsx` only names /signin/ in its sign-out, so it was not the cause and is unchanged.
- **/campaigns/detail/ and /email/first-week/'s arrival: a different cause.** Neither sends anyone to sign in. Each page is a new `<Suspense fallback={null}>` boundary (there for the export's `useSearchParams`). In a page switch React shows a new boundary's fallback rather than hold the page being left, so the page shows empty while its script arrives. /campaigns/detail/ also draws an empty `min-h-[60vh]` box while `useCampaignsDoor` asks the network (`components/campaigns/CampaignsGate.tsx`). /email/change/ has the same empty fallback.
- **/account/'s reduced flash (group 9) is not the gate.** /account/ is in the `(you)` group, outside the `(signed)` layout, so `AccountAuthGate` never renders there. The flash is a 330 by 30px box at 30,420, drawn 137 to 178 ms after the tap. Above and below it are the `(you)/loading.tsx` outline (`AfterAMoment`) and the page. Not read further: neither file is mine.

## The mend: one rule (`lib/auth/signedHold.ts`)
A signed page with no session stored does not draw until the session read answers. It suspends inside the page switch. With no new Suspense boundary above it, React keeps the page the reader is leaving on screen. If the answer is signed out, the page sends the reader on while it still holds. That is a push while the address still shows the page being left. It is a replace when the address already shows this page (a step back, a cold start), because the router writes an address only when its page commits. So the reader sees one switch, from the page they left straight to sign in, in the house's motion.
- The hold lasts at most 600 ms. After that the page draws its own waiting state and continues exactly as before.
- A reader with a session stored is never held.
- Nothing is held before hydration.
- Three pages use the rule:
  - `AccountAuthGate`, which gains a `to` prop;
  - `PlanScreen`, sending to /premium;
  - the apps' /set-password/, through the gate, with no baked redirect (`NEXT_REDIRECT` is gone from its payload in the export).
- **The signed-in arrival was read in the code, not walked** (the walk has no test reader). A stored session returns before any hold, so the account pages and /plan/ arrive as before. One deliberate difference: in the apps, a signed-in reader on /set-password/ now sees the form. Until now the baked redirect sent everyone to sign in. The website is unchanged.

## The test
`lib/auth/__tests__/signedHold.test.ts`, 10 tests:
- seven on the hold's steps: it asks once; signed out in time it pushes and keeps holding; it replaces when the address already shows the page; it does not move a reader who went elsewhere; signed in, it draws; past the bound it draws and a late answer moves nothing; it asks again on the next visit.
- three on the gates. All three fail on the old code (run: 3 failed). The behaviour tests cannot import there, because the module did not exist.

## Checklist
- typecheck 0.
- `npm run test:unit`: 1210 files, 15255 tests passed.
- eslint on the five files: clean.
- `npm run build` (web): passed, with /set-password still a server route on the web.
- Push guard: passed.
- One export of the head `17276848` (`node scripts/gate/export.mjs`, exit 0).
- checkMock with pixels was not run: no drawing changed, only when a page draws.

## After: the walk on that export
Both readers, motion on, then `--reduced`, two runs each, one worker. `--only` the 13 screens; `--controls "Open Security|Choose what email you get"`.

| line | Gate 3c | now (8 runs) |
|---|---|---|
| switch into /account/data/, eikon-box, notifications, profile, security, sessions | blank 22 frames, 4/4 | 0 of 8 each |
| "Open Security" | blank 24 frames, 4/4 | 0 of 8 |
| "Choose what email you get" (first-week, unsubscribe) | blank 19 frames, 4/4 | 0 of 8 each |
| switch into /plan/ | blank 22 frames, 4/4 | 0 of 8 |
| switch into /set-password/ | blank 22 frames, 4/4 | 1 of 8 (motion on, open reader, run 1: the gate's waiting line, 22 frames; still kept), NOT REPEATED |
| switch into /email/first-week/ | blank 18 frames, 2/4 | 0 of 8 (not changed) |
| switch into /campaigns/detail/ | blank, 3/4 and 4/4 reduced | 7 of 8 (left) |
| switch into /email/change/ | not listed | blank 18 frames, 2 of 4 motion on (left, not mine) |
| switch into /email/unsubscribe/ | not listed | 1 of 8 reduced, NOT REPEATED |
| /account/ reduced flash | 2/4 | 3 of 4 (left, not the gate) |

## Left, and why
- **/set-password/, 1 of 8.** In one run the gate drew its line instead of holding. The likely cause is that the hold did not take in that one run: either the session read on a cold client passed the bound, or the gate was not yet hydrated. Not proved. A second export was not cut because it was seen only once, under the gate's own repeat rule.
- **The empty `<Suspense fallback={null}>` arrivals**: /campaigns/detail/ (7 of 8), /email/change/ (2 of 4), /email/first-week/ (0 of 8 now), and the campaigns door's empty box. They have a different cause from the sign-in wait. The mend is a fallback that holds the page being left after hydration, or no new boundary on the switch, plus the door answering inside the hold. /email/change/ and the door (`lib/campaigns/`) are not my files. That is a fixer's item on its own.
- **/account/'s flash**: `(you)/loading.tsx`, `AfterAMoment` or the You page. Not mine.
- **A note for the walk** (`scripts/motion-walk.mjs`, not mine). `go()` waits up to 15 s for the address to show the screen it was sent to. A held page goes straight to sign in, so that wait now runs out silently on every signed screen (about 15 s each). The frames are still judged.
