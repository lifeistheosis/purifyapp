# Now

The state of the work, in one page. The arbiter rewrites this at each change of state; the log is the release's HANDOFF.md. How the chats run: `docs/OPERATIONS.md`.

Updated 2026-11-13 01:24 UTC.

## 1.9: in flight

- **The final check reported at 02:12 UTC: not a pass**, 6 fails in the gate's reach (record: `docs/1.9-build/notes/gate-run-1.md`). Everything else passed: part 2 at 390 for both readers, the sweep of 996 pages, the light looks on 363 pages, offline, /gift/ in 13 states, parts 3 to 5, and the web build.
- **The fails and their owners:**
  1. /calendar/'s date on Light at 800 and 1032: **fixed** (ed9464995, Updates). The fault was wider than Light: today's date now takes the page's ink on a day with no feast, held at 4.5:1 on all 22 palettes and looks.
  2. The councils' Fathers moving under the finger: **fixed** (e0319e71c).
  3. The Search sheet's esc key hint at 800 and 1032: **fixed** (cb114387b).
  4. John 1 interlinear: the "Word details" sheet's Close not mirrored in Arabic (WordPopover.tsx:407; Updates 2's successor).
  5. The saints' webs: a node's place and date cut with an ellipsis at 390 and 320 (WebConstellation.tsx:116; Updates 2's successor).
  6. /prayers/ at 1032: **the measure, not the screen** (f68410abb). The book scrolls itself back before paint, the same with anchoring off. Admin 2's walk now re-taps a "held" control with anchoring off before listing it.
- **The arbiter's rulings:** the webs' lifted saints are allowed for every node (kept in sight above the card it opened, in the house glide); the community thread was the measure; for 1.9 the commentary marks are sampled by Genesis 1's hand walk, and counting by drawn reach goes into 2.0's nightly gate (named to him).
- **Rotations, done between checks:** Admin and Updates 2 wrote batons and were archived. Admin 2 runs the targeted re-check; Updates 3 takes fails 4 and 5. Updates finished 1 and 6 and was archived.
- **Also landing before the re-check:** St. Xenia's refined profile (8395441c8, pushing now): 17 paragraphs from public-domain sources (Opatovich 1873, Bulgakovsky 1890, Sambikin 1896, the Russian Biographical Dictionary 1903, the Britannica 1911), with the disputes said, a Sources list under her life, and one quotation ("Blood, blood, blood!", our English of Bulgakovsky's Russian, labelled). No hymn, web link or picture is free; her picture stays on Holy Cross Monastery's permission.
- **Then:** every fix pushed; the re-check on one export from that head; if it passes, the test build is cut (Android with local-first on, the main web, publish off; then iOS).
- **Before the merge (web only):** the admin link in `lib/billing/applyLifecycle.ts` (`?tab=` where the panel reads `#tab=`), with Updates 3.

## Waiting on him

- His four answers on the owner's desk plan (`docs/plans/owner-desk.md`, last section): the data-built emails sending themselves unless held, the brief's hour, a shop and sourcing chat, and who builds the design kit.
- Walk the test build once it is cut. Then: accept the 1.9 note in Admin, set the drop day, and submit both builds after the phone walks. On release day: the Purify profile's status, and opening campaigns.
- The company: C0 (the address on the D-U-N-S record) and C0b (the papers). Send the company's exact name as the EIN letter has it. All in OWNER-STEPS.md.
- The Company guide waits on two facts: how many owners the LLC has, and how it is taxed. Also: is the EIKON shop registered for Florida sales tax (C3b)? Register the EIKON trade name before Stripe shows it.
- Also: the 22 permission letters, and the Android notifications test.
- Later: the release's social cards (Fable), the promo videos (from his reference), and the EIKON boxes once the next paycheck comes (likely Wednesday 18 November).

## After 1.9 ships

- **Before the merge (web only, a 1.9 fault):** `lib/billing/applyLifecycle.ts` links the admin to `/admin?tab=subscriptions`, but the panel reads only `#tab=`, so it opens Home. Goes to the next free fixer after the final check; billing is audited, so `docs/audit/findings.yaml` is read first.
- **The owner's desk, sections 2 and 3** (the sends and the owner's brief): a fresh admin chat from the baton, once he answers the four questions.
- Money: subscription days fill the charts from the merge on (`plus_events` is 1.9's table). History from before needs a RevenueCat key with the charts permission, which he would make: offer it with the owner's brief.
- SSM board, in its next message: put the AD 1 TikTok edit's source in the Vault (branch `claude/magical-carson-qissmz`; pull request #24 closed at his word on 2026-11-12, not merged).
- The owner's desk and the Purify look (`docs/plans/owner-desk.md`): the quiet board is done; next the design kit, the owner's brief, the recurring sends and the reader emails' second edition.
- Every chat rotates (OPERATIONS section 2), the arbiter included.
- The store accounts move to the LLC: Apple and Google (OWNER-STEPS C1 and C2), then C3 to C5.
- 1.9.1: campaign pictures and their legal steps.

## The roster

| Chat | Session | Holds |
|---|---|---|
| Arbiter | session_01VuYTwdsjYL2mmq2C2JSt2A | his words, NOW.md, routing |
| Admin 2 | session_01VuYTweFNHsJxnX7YJmTvEN | the gate: first the lifted-saints ruling into the tap walk, then the targeted re-check on the arbiter's word (baton `docs/handoffs/admin.md`); the admin panel when the owner's desk resumes |
| Updates 3 | session_01VuYTwcy3Fbt9LcW3Qic77o | fixer: fails 4 (WordPopover's Close in Arabic) and 5 (the webs' place and date cut), from `docs/handoffs/updates-2.md`; then the admin link in `lib/billing/applyLifecycle.ts` |
| SSM board | session_01VuYTwcSQmKLThRirvSeWa5 | the drop's words, the Vault |
| Fable 5.2: 1.9 store pictures | session_01VuYTwbUEsUgbUwM7K7xYG1 | design and adverts, by his word |
| Company guide | session_01VuYTwcFgb1g1Py4mRbRNrD | LLCs, tax, Florida (no repository) |
| Saints: St. Xenia's profile | session_01VuYTwe6Fs6RKfBi7z1GMcb | his word of 2026-11-13: her full life, sourced, for the ad's "Read her life in Purify"; held locally, to land with the final check's fixes |

 Archived on 2026-11-13, their jobs done: Updates (fails 1 and 6), Admin (the final check, recorded in `docs/1.9-build/notes/gate-run-1.md`; baton `docs/handoffs/admin.md`; probes in `scripts/gate/`), Updates 2 (pushed e0319e71c, d70a01deb, cb114387b and e88068504; baton `docs/handoffs/updates-2.md`), Tooling, Admin panel 2 (baton `docs/handoffs/admin-panel.md`) and Product images. His PC's clone was left on `main` with one unpushed commit (2026-11-11): nothing is pushed from it.
