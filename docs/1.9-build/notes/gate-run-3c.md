# Gate 3c: the motion walk's findings, measured again on the head and sorted

Gate 3's walk ran on the export of `d6bef349d` (`docs/handoffs/gate-3-walks/`). This run measured every finding that was not ALLOWED, OTHER or for the eye again, on one export of the head `f637f7b8a`, with the walk at `6b8de456` (a mend: `--controls` taps only the named controls). Each lane ran twice per reader: one worker, one lane at a time, `--only` the 51 (motion on) and 36 (reduced) screens the findings name. Every named control was reached and tapped in every motion-on run. The push guard ran during the open reader's first motion-on run (03:01 to 03:03 UTC, at low priority). A container restart cost the new reader's second motion-on run, which was then run again. Results and 25 stills: `docs/handoffs/gate-3c-walks/`.

Rules: the owner's 2026-11-13 ruling (`docs/handoffs/updates-20-inpage-sorted.md`), every page switch a transition, rule 3 for reduced motion (an in-page change happens at once; a blank, a flash, a misplaced box or a shift on arrival is a FAULT), blanks of 200 ms or more, and a card's picture carried into its page. "4/4" means seen in all four head runs of its lane (two per reader). A finding seen in fewer than two head runs is NOT REPEATED.

## Counts (lines after merging the two readers)

| | motion on | reduced | total |
|---|---|---|---|
| FAULT | 13 | 15 | 28 |
| ALLOWED | 32 | 16 | 48 |
| OTHER | 3 | 4 | 7 |
| for the eye | 22 layer crossings (Gate 3: 10 and 12; 7 a run on the head) | 0 | 22 |
| NOT REPEATED | 51 | 7 | 58 |
| UNSURE | 0 | 0 | 0 |

Gate 3's 99 motion-on and 44 reduced lines are all placed. Merges: Gate 3's two `/email/first-week/` arrival blanks are one line; its four reduced shop flashes are two (Orders, Requests). `/campaigns/detail/`'s arrival blank is new in the motion-on lane on the head; Gate 3 saw it reduced only.

## FAULT

### Motion on (13)
- /account/data/ (and /account/eikon-box/, /notifications/, /profile/, /security/, /sessions/) | the page switch from / | blank | 22 frames, about 0.4 s | 4/4 | rule 4
- /plan/ | page switch from / | blank | 22 frames | 4/4 | rule 4
- /set-password/ | page switch from / | blank | 22 frames | 4/4 | rule 4
- /campaigns/detail/ | page switch from / | blank | 18 frames | 3/4 (and 4/4 reduced) | rule 4
- /email/first-week/ | page switch from / | blank | 18 frames | 2/4 (new 1, open 2) | rule 4
- /email/change/ | "Open Security" (to /signin/) | blank | 24 frames | 4/4 | rule 4
- /email/first-week/, /email/unsubscribe/ | "Choose what email you get" (to /signin/) | blank | 19 frames | 4/4 | rule 4
- /community/ | the "Ask a Priest" tab | cut | 50% of the change in one frame, about 100 ms | 4/4 | rule 1: a tab
- /florilegium/begin/beatitudes/ | "Keep this gathering" | cut | 100% of the change in one frame, 104 ms, 18 parts move | open reader 2/2 (the new reader's page does not show it) | rule 1: the button gives way to a row, content moves
- /reading/collections/anger/ | "Ephesians 4:26-27" (to /bible/ephesians/4/) | jump | the running line "v N of 32" 25 to 27px sideways about 1.1 s after arriving | 4/4 | rules 2 and 3: a shift after arrival
- /reading/collections/anger/ | "James 1:19-20" (to /bible/james/1/) | jump | "v 19 of 27" 27px sideways | 4/4 | the same
- /settings/, /settings/reading-mode/ | the reading-mode preview "John Chapter 1 ..." | jump | the section below ("Councils ...") 467 to 506px in one frame, about 115 ms | 4/4 | rule 1: a section changes size at once
- /shop/stores/ | the EIKON card | carried | its picture is on /shop/eikon/ and is not carried into it | 4/4 | rule 5

### Reduced (15)
- /campaigns/detail/ | page switch from / | blank | 4/4 | rule 3
- /account/ | page switch from / | flash | 330 by 30px for 2 frames | 2/4 (open 1, new 2) | rule 3
- /heresies/ | "Marcionism" (to /heresies/marcionism/) | flash | 150 by 30px for 2 frames | 3/4 | rule 3
- /shop/cart/ (and the shop's other account pages) | "Orders" | flash | 60 by 30px for 1 or 2 frames | 4/4 | rule 3
- /shop/cart/ (the same) | "Requests" | flash | 90 by 60px for 1 or 2 frames | 4/4 | rule 3
- /bible/multi/ | "Back to the Bible" (to /bible/) | jump on arrival | the page 51px, from y 51 to 0 | 4/4 | rule 3: a shift on arrival
- /chants/ | "Psalm 135" (to /chants/psalm-135/) | jump on arrival | 51px | 4/4 | the same
- /chants/ | "Words and history" (the same page) | jump on arrival | 51px | 4/4 | the same
- /saints/ | "The Mother of God" (to /saints/theotokos/) | jump on arrival | 51px | 4/4 | the same
- /apologetics/atheism/ | "An Exact Exposition" (to the work) | jump on arrival | the running line "Chapter 3 of ..." 28px | 3/4 | the same
- /bible/ | "Ephesians 2:14-22" | misplaced | the verse span drawn at y 582, then 530 | 4/4 | rule 3
- /bible/ | "Luke 10:25-37" | misplaced | 582, then 530 | open reader 2/2 | rule 3
- /reading/collections/anger/ | "Psalms 4:4" | misplaced | 582, then 530 | 4/4 | rule 3
- /reading/collections/anger/ | "Ephesians 4:26-27" | misplaced | 582, then 530 | 4/4 | rule 3
- /reading/collections/anger/ | "James 1:19-20" | misplaced | 582, then 530 | 4/4 | rule 3

## ALLOWED
- Motion on (32), not measured again (rule 1): Settings' Familiarity radios ("Completely new", "Learning", "Practicing", "Hidden": 4 cuts, and the fasting preview's 26 to 45px jumps with three of them); Settings' First focus ("The saints' lives" to "Study": 11 cuts, and the reading-mode preview's 48px jump with each); the chants' filters ("Greek", "Serbian", "Contemporary": 64 to 191px).
- Reduced (16), in-page changes at once (rule 3), each seen on the head: Dismiss on / and /signout/ (179px); /calendar/ "October 2026" (the fast row 56px) and "Old" (27px); /fasting/ "Today ..." and "Fri, Nov 13" (67px); /florilegium/ "Begin a new gathering" (103px); /plans/acts/ "Mark day 1 as read" and "Mark day 2 as read" (41px); /privacy/ "Contents" (561px); /signup/ the field (27px); /start/first-liturgy/ "Yes, I am going" and "Not yet, just reading" (77px); /whats-new/ "November 1 update" (187px); a council's "Next: Canon I" (270px, new reader 2/2); Settings' "Completely new" (rule 1). Each is the box moving in the same frame as the change, which the walk calls a jump; a box drawn and then moved would read as misplaced. The calendar's fast row no longer jumps with motion on (Gate 3 and the head).

## OTHER
- "Chant" (the "Pray with chant" sheet): motion on, 251px jump; reduced, drawn at y 520 then 269.
- "Find a word" (the dictionary's full-screen search, CommandPalette.tsx): motion on, an 84px jump and a misplaced row; reduced, the same two.
- /chants/ "Play" (reduced): the full-screen player drawn at y 844, then at 0, 4/4. A full-screen layer opening; whether its still path should draw it once is the arbiter's call.

## For the eye
Layers crossing in passing (rule 4): 22 in Gate 3, 7 a run on the head (the top bar's plates over the page as it leaves).

## NOT REPEATED (0 of 4 head runs unless a number is given)
- Motion-on cuts on page switches: "Privacy Policy" (/account/profile/, /signin/), "Terms" (/account/profile/edit/), "privacy policy" (/terms/), "The calendar" (/dictionary/), Against the Heathen, Confessions, "314 Council of Ancyra", "Christ Flag, Greek", "Requests" and "Messages" in the shop, "Open Purify" (/plan/), "Read" and "Hatred" (/reading/), "The Ecumenical Councils", and the page switches from / to /credits/gpl/, /heresies/, /prayers/hours/, /shop/checkout/success/, /shop/icons/detail/, /topics/ and /whats-new/ (21 lines).
- Motion-on cut in the page: /community/ "1 reply" (tapped in every run, no cut).
- Motion-on blanks: Homilies on Romans (/apologetics/atheism/), "The Fast" (/dictionary/), Morals on Job (/fathers-on/anger/), /shop/checkout/success/'s arrival, "Explore" (/shop/stores/), "The Incarnation" (/theology/path/christ/).
- Motion-on flashes, all 13: /bible/1-chronicles/1/ "Switch translation" (1 of 4, new 2), "Listen", "Pick a chapter", "Before you read"; /community/ "Supporter"; /journal/ "Write"; /reading/ "The Paschal Homily"; "Ephesians 4:26-27" from /reading/collections/anger/; "Hymns on the Nativity"; "About this book"; "Terms" on a shop piece; /signout/ "Share"; /theology/ "1 of 9".
- Motion-on jumps: /councils/ "Move through the years" (24px), /fasting/ "Fri, Nov 13" and "Fri, Oct 30".
- Every misplaced community article, both lanes (Updates 77 and 78's mends hold), and "Ask a Priest"'s misplaced article: motion on 7 lines, reduced 4.
- Reduced: the arrival blank on /account/notifications/ and /account/profile/edit/; the flashes on the shop's "Messages" and /shop/policies/ "Explore". Seen once on the head and not a finding: /bible/multi/'s arrival blank (reduced, open 2).

## FAULT groups, one fixer each (causes read in the code, read only)
1. **The account gate's empty wait** | `components/account/AccountAuthGate.tsx` | its "loading" state draws only a line while the session is read, then `router.replace('/signin?next=...')`, so the switch passes through an empty screen for about 0.4 s | the account family's arrival blank, "Open Security", "Choose what email you get" (both lead into /account/ and on to /signin/).
2. **The same empty wait on other signed pages** | /plan/, /set-password/ (`components/auth/SetPasswordForm.tsx` names /signin/), /campaigns/detail/ (both lanes), /email/first-week/ | files not read past that | can share group 1's fixer.
3. **The community tabs cut** | `components/community/FeedTabs.tsx` | the tab's feed is swapped with no transition (no view transition or motion in the file) | "Ask a Priest".
4. **Keep this gathering cuts** | `components/florilegium/StarterPage.tsx` | the button gives way to the kept row at once | "Keep this gathering".
5. **The running line moves after arrival** | `components/bible/ChapterVerseStatus.tsx` and `components/saints/MobileWorkPill.tsx` (both carry `data-running-line`) | the line settles about 1.1 s after the page arrives and its box moves 25 to 28px sideways; the exact trigger not read | Ephesians 4 and James 1 (motion on), John of Damascus (reduced).
6. **The reading-mode preview changes size at once** | `components/settings/ReadingModeGallery.tsx` | tapping the preview reflows the section below by 467 to 506px in one frame | "John Chapter 1 ...".
7. **EIKON's picture is not carried** | the store card on /shop/stores/ (not located within budget) | the card's picture has no carried name to /shop/eikon/ | EIKON.
8. **Reduced: pages drawn 51 to 52px low, then moved** | not read | the first frame on arrival sits about one top bar low: /bible/, /chants/psalm-135/, /saints/theotokos/ at 51px, and the verse span from a verse link at 582 then 530 (five chapters) | can share group 5's fixer if the cause is one offset.
9. **Reduced: flashes** | not read | the shop's Orders and Requests (one fixer, the shop's own nav), /account/'s arrival, /heresies/ "Marcionism".

Shared fixers: 1 with 2 (one gate pattern); 5 with 8 (arrival placement on the reader pages).
