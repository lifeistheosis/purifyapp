# Now

The state of the work, in one page. The arbiter rewrites this at each change of state; the log is the release's HANDOFF.md. How the chats run: `docs/OPERATIONS.md`.

Updated 2026-11-12, 22:33 UTC.

## 1.9: in flight

- **The final check** (Admin): export cut at 20:42 UTC from 3e65f51ff, whose code is 05aee81e1. Report near 01:00 UTC. If it passes, the test build is cut at once: Android with local-first on, the main web, publish off; then iOS. He walks it as a new reader would.
- **Updates 2:** /reading/ passes on the same export (0 fails at 390, 800 and 1032). Held locally until the report: the councils' fix (e011e8c8f; a Father's card no longer moves under the finger), and a mend to the walk (db29a0470): the community thread was the measure, not the screen, since the page settles 12px above the tab bar once the reply has landed.
- **The report** is now near 01:15 UTC: Admin's container restarted at 21:30, and the check resumed at 21:37.
- **Freeze:** no app code lands during the final check.
- **Tooling:** the pre-push guard is live (376076bcd): main refused, docs at once, the checks on everything else. Chats started before it set `git config core.hooksPath .githooks` before their next push; the arbiter says so in each one's next message. CI's typecheck now passes in a fresh checkout (3ad6cdd56). Tooling is done. After the final check, Admin writes the nightly gate's runner, and the arbiter schedules it.
- **Done for 1.9:** the drop kit (SSM board); the store pictures, 41 of them (Fable, e2aa433d); the EIKON gift (Product images chat; one month of Plus for every order).

## Waiting on him

- His four answers on the owner's desk plan (`docs/plans/owner-desk.md`, last section): the data-built emails sending themselves unless held, the brief's hour, a shop and sourcing chat, and who builds the design kit.
- Walk the test build once it is cut. Then: accept the 1.9 note in Admin, set the drop day, and submit both builds after the phone walks. On release day: the Purify profile's status, and opening campaigns.
- The company: C0 (the address on the D-U-N-S record) and C0b (the papers). Send the company's exact name as the EIN letter has it. All in OWNER-STEPS.md.
- The Company guide waits on two facts: how many owners the LLC has, and how it is taxed. Also: is the EIKON shop registered for Florida sales tax (C3b)? Register the EIKON trade name before Stripe shows it.
- Also: the 22 permission letters, and the Android notifications test.
- Later: the release's social cards (Fable), the promo videos (from his reference), and the EIKON boxes once the next paycheck comes (likely Wednesday 18 November).

## After 1.9 ships

- Money: subscription days fill the chart from the merge on (`plus_events` is 1.9's table). History from before needs a RevenueCat key with the charts permission, which he would make: offer it with the owner's brief. The Revenue tab's by-month chart still shows the shop alone; Admin panel 2 matches it to Money's chart after the quiet board, by his word that the charts show all the money.
- SSM board, in its next message: put the AD 1 TikTok edit's source in the Vault (branch `claude/magical-carson-qissmz`; pull request #24 closed at his word on 2026-11-12, not merged).
- The owner's desk and the Purify look (`docs/plans/owner-desk.md`): the quiet board first (Admin panel 2, with the money chart), then the design kit, the owner's brief, the recurring sends and the reader emails' second edition.
- Every chat rotates (OPERATIONS section 2), the arbiter included.
- The store accounts move to the LLC: Apple and Google (OWNER-STEPS C1 and C2), then C3 to C5.
- 1.9.1: campaign pictures and their legal steps.

## The roster

| Chat | Session | Holds |
|---|---|---|
| Arbiter | session_01VuYTwdsjYL2mmq2C2JSt2A | his words, NOW.md, routing |
| Admin | session_01VuYTwbteJqs1UmDUwqRvzC | the final check, the admin panel, the drop's tooling |
| Updates | session_01VuYTwcNqTWyT6Yab696Eri | fixer |
| Updates 2 | session_01VuYTwdk3C8grkpfDPo8LHF | fixer |
| SSM board | session_01VuYTwcSQmKLThRirvSeWa5 | the drop's words, the Vault |
| Fable 5.2: 1.9 store pictures | session_01VuYTwbUEsUgbUwM7K7xYG1 | design and adverts, by his word |
| Company guide | session_01VuYTwcFgb1g1Py4mRbRNrD | LLCs, tax, Florida (no repository) |
| Product images (his PC) | session_01VuYTwaLq6ij9iFi8D4Kt8a | the EIKON gift, done for 1.9 |
| Tooling: the pre-push guard | session_01VuYTwZxEJPq6tx6VUBChCT | the guard on every push (no app or package files during the freeze) |
| Admin panel 2 | session_01VuYTwdGHpocsLjegCEAape | the admin panel: all money on Money's chart is done and held locally (c066bc5b: the shop blue, Plus green, the EIKON Box magenta, refunds grey, anything unnamed white); next, the quiet board (`docs/plans/owner-desk.md` section 1) |

Admin and Updates were past 700,000 tokens at the last look, so both rotate first after 1.9.
