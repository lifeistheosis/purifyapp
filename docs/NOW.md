# Now

The state of the work, in one page. The arbiter rewrites this at each change of state; the log is the release's HANDOFF.md. How the chats run: `docs/OPERATIONS.md`.

Updated 2026-11-13 01:24 UTC.

## 1.9: in flight

- **The final check reported at 02:12 UTC: not a pass**, 6 fails in the gate's reach (record: `docs/1.9-build/notes/gate-run-1.md`). Everything else passed: part 2 at 390 for both readers, the sweep of 996 pages, the light looks on 363 pages, offline, /gift/ in 13 states, parts 3 to 5, and the web build.
- **The fails and their owners:**
  1. /calendar/'s date on Light at 800 and 1032: **fixed** (ed9464995, Updates). The fault was wider than Light: today's date now takes the page's ink on a day with no feast, held at 4.5:1 on all 22 palettes and looks.
  2. The councils' Fathers moving under the finger: **fixed** (e0319e71c).
  3. The Search sheet's esc key hint at 800 and 1032: **fixed** (cb114387b).
  4. John 1 interlinear: the "Word details" sheet's Close not mirrored in Arabic: **fixed** (05815c9a; and the tablet's word card now drawn over the page, 0d9cc240).
  5. The saints' webs: a node's place and date cut with an ellipsis: **fixed** (74210d49; all 118 webs probed at 390, 360 and 320, nothing cut).
  6. /prayers/ at 1032: **the measure, not the screen** (f68410abb). The book scrolls itself back before paint, the same with anchoring off. Admin 2's walk now re-taps a "held" control with anchoring off before listing it.
- **The arbiter's rulings:** the webs' lifted saints are allowed for every node (kept in sight above the card it opened, in the house glide); the community thread was the measure; for 1.9 the commentary marks are sampled by Genesis 1's hand walk, and counting by drawn reach goes into 2.0's nightly gate (named to him).
- **Rotations, done between checks:** Admin and Updates 2 wrote batons and were archived. Admin 2 runs the targeted re-check; Updates 3 takes fails 4 and 5. Updates finished 1 and 6 and was archived.
- **Also landing before the re-check:** St. Xenia's refined profile, **landed** (2ebc48166; the quotation ruling in docs/editorial-standards.md, d2aed289d): 17 paragraphs from public-domain sources (Opatovich 1873, Bulgakovsky 1890, Sambikin 1896, the Russian Biographical Dictionary 1903, the Britannica 1911), with the disputes said, a Sources list under her life, and one quotation ("Blood, blood, blood!", our English of Bulgakovsky's Russian, labelled). No hymn, web link or picture is free; her picture stays on Holy Cross Monastery's permission.
- **The walk is mended** (5f56967b): every web node allowed when it glides and ends in sight; a "held" control re-tapped with anchoring off.
- **The re-check is cutting now** (Admin 2, from 3b17a0aca, about 04:35 UTC): all six fails are addressed there (WordPopover's Close 0d9cc2400, the webs' tags 74210d49c, the admin links 3b17a0aca). Report expected about 07:30 to 08:00 UTC.
- **Then:** every fix pushed; the re-check on one export from that head; if it passes, the test build is cut (Android with local-first on, the main web, publish off; then iOS).
- **Merge day is written down:** `docs/1.9-build/MERGE-DAY.md`. Ready: all six version identifiers, the checklist, the note, the board message, the release email (7 points), the drop (23 pieces), and the push to main is a fast-forward from a63d37c7a. Still to do on merge day: file the note in his queue, set the drop day, the phone walks, the release email's picture and preview, the cards (Fable), and the campaigns line (his word).
- **The 19 migrations: signed** ("yes to the 19", 2026-11-13 about 04:49 UTC); all safe to run twice. Two clear readers' data by design and cannot be undone (17 and 18, signed 2026-11-11). The headers of 12 (production_baseline) and 2 (the psalms move) now carry his words; the psalms move and shared_pages are pasted by hand before the push (R1).
- **Before the merge (web only):** the admin link in `lib/billing/applyLifecycle.ts` is fixed (328a47a6). Three more owner alerts with a bare hash (orders, fulfillment, goals) go to Admin panel 3.
- **Rulings of 05:20 UTC:** a web card's short line may end in an ellipsis (a preview: the years stand whole, the kinds are whole on the tall face); a tap on a card's short face growing it is an opening, allowed by name in Admin 2's walk, provided keyboard focus lands in the tall card.

## Waiting on him

- **Yes or no, each with its reasons on the page:** the kit's look redone (https://claude.ai/artifact/RErhbgPLD29CXemE9pi4Ht; the emails https://claude.ai/artifact/AGYSKjN65WgQA3eccBqos9) and the three retention emails (round 1 a no: "could use a better design"; round 2 coming, https://claude.ai/artifact/XmM1TmiigBipdaPS8de1sg), with their new words. A fresh Fable chat takes any change from the baton.
- A look at the 1.9 social cards (https://claude.ai/artifact/2H7zX18mPgJh9LMZnkw6bs); his yes clears the drop's `cards` piece (`node scripts/drop.mjs waits cards --clear`).
- The public key for the re-check: given (2026-11-13 03:32 UTC, "yes read the key").
- On the owner's desk plan: question 3 (a shop and sourcing chat after 1.9). Questions 1 (the sends, with a Hold) and 2 (the brief) are his yes (2026-11-13).
- Walk the test build once it is cut. Then: accept the 1.9 note in Admin, set the drop day, and submit both builds after the phone walks. On release day: the Purify profile's status, and opening campaigns.
- The company: C0 (the address on the D-U-N-S record) and C0b (the papers). Send the company's exact name as the EIN letter has it. All in OWNER-STEPS.md.
- The Company guide waits on two facts: how many owners the LLC has, and how it is taxed. Also: is the EIKON shop registered for Florida sales tax (C3b)? Register the EIKON trade name before Stripe shows it.
- Also: the 22 permission letters, and the Android notifications test.
- Later: the release's social cards (Fable), the promo videos (from his reference), and the EIKON boxes once the next paycheck comes (likely Wednesday 18 November).

## After 1.9 ships

- **Before the merge (web only, a 1.9 fault):** `lib/billing/applyLifecycle.ts` links the admin to `/admin?tab=subscriptions`, but the panel reads only `#tab=`, so it opens Home. Goes to the next free fixer after the final check; billing is audited, so `docs/audit/findings.yaml` is read first.
- **The owner's desk, sections 2 and 3** (the sends and the owner's brief): a fresh admin chat from the baton, once he answers the four questions.
- Money: subscription days fill the charts from the merge on (`plus_events` is 1.9's table). History from before needs a RevenueCat key with the charts permission, which he would make: offer it with the owner's brief.
- SSM board, in its next message: put in the Vault the first light-first email template (`docs/brand/kit/email-template.html`, removed by Fable, in history at ef1bec40), and the AD 1 TikTok edit's source (branch `claude/magical-carson-qissmz`; pull request #24 closed at his word on 2026-11-12, not merged).
- The owner's desk and the Purify look (`docs/plans/owner-desk.md`): the quiet board is done; next the design kit, the owner's brief, the recurring sends and the reader emails' second edition.
- Every chat rotates (OPERATIONS section 2), the arbiter included.
- The store accounts move to the LLC: Apple and Google (OWNER-STEPS C1 and C2), then C3 to C5.
- 1.9.1: campaign pictures and their legal steps.

## The roster

| Chat | Session | Holds |
|---|---|---|
| Arbiter | session_01VuYTwdsjYL2mmq2C2JSt2A | his words, NOW.md, routing |
| Admin 2 | session_01VuYTweFNHsJxnX7YJmTvEN | the gate: first the lifted-saints ruling into the tap walk, then the targeted re-check on the arbiter's word (baton `docs/handoffs/admin.md`); the admin panel when the owner's desk resumes |
| Updates 3 | session_01VuYTwcy3Fbt9LcW3Qic77o | fails 4 and 5 and the billing link done and pushed; stays open as the owner of anything the re-check finds in its files |
| Admin panel 3 | session_01VuYTwdp6mhe99XWbxc6bLH | the owner's desk, sections 2 and 3 (the sends on, with a Hold, by his word; the owner's brief at 7:30 his time, Monday's weekly); web only |
| Fable 5.2: retention emails, round 2 | session_01VuYTwavDnAtuKdXD2L7rti | his "retention emails could use a better design": round 2 of the three, one version, reasons on the page (https://claude.ai/artifact/XmM1TmiigBipdaPS8de1sg) |
| Retention emails | session_01VuYTwcNqhaVtjecwr5fvPv | the first-week guide, "pick up where you left off" and the fasting companions: the sending, privacy first, each behind a switch until his yes to its design (Fable designs, with justification) |
| SSM board | session_01VuYTwcSQmKLThRirvSeWa5 | the drop's words, the Vault |
| Fable 5.2: 1.9 store pictures | session_01VuYTwbUEsUgbUwM7K7xYG1 | the 1.9 social cards are done (a736b9af: six cards, 1080 by 1920, stills in `docs/plans/v1.9/store/cards/stills/`, see https://claude.ai/artifact/2H7zX18mPgJh9LMZnkw6bs); waits on his look before the drop's `cards` piece is cleared |
| Company guide | session_01VuYTwcFgb1g1Py4mRbRNrD | LLCs, tax, Florida (no repository) |

 Archived on 2026-11-13, their jobs done: Fable's email designs (the kit's look redone 4745f40c, rule three 204e0265, the retention emails 344e972a; baton `docs/handoffs/fable-designer.md`, near 400,000 tokens), the Design kit chat (tokens, phone first 0c03c9ae7, never parchment ef1bec407, the claude.ai design system; the look passed to Fable), Release prep (`docs/1.9-build/MERGE-DAY.md`, 631d04e67), the Saints chat (St. Xenia's profile), Updates (fails 1 and 6), Admin (the final check, recorded in `docs/1.9-build/notes/gate-run-1.md`; baton `docs/handoffs/admin.md`; probes in `scripts/gate/`), Updates 2 (pushed e0319e71c, d70a01deb, cb114387b and e88068504; baton `docs/handoffs/updates-2.md`), Tooling, Admin panel 2 (baton `docs/handoffs/admin-panel.md`) and Product images. His PC's clone was left on `main` with one unpushed commit (2026-11-11): nothing is pushed from it.
