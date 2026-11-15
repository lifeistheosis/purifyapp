# Gate 4: the motion walk on the head, sorted (partial: the new reader, with no network)

One export of `f0b9ff348` (`node scripts/gate/export.mjs`, exit 0; the key read and written nowhere). The walk at `01dd428d` (a mend: with `--controls` every control is marked, so a named one past the lane's limit is reached; before it the reduced lane's six never reached EIKON's door or Updates 90's four rows). Runs and stills: `docs/handoffs/gate-4-walks/`.

**What was measured.** The new reader (`SELLS_PLUS=1`): the full walk, motion on (129 screens, 1,283 taps) then reduced (129 screens, 526 taps), two workers; then the targeted walk twice per lane, one worker, `--only` 54 screens (every FAULT line of gate-run-3c.md, every screen Updates 83 to 91 named, the five rows, every new finding) and `--controls` their 39 names (143 taps a run, every one reached, 0 errors). **All of it with no network.** Gate 3 and 3c walked `--online`, so the screens that read the main web (the shop's catalog, campaigns, community feeds) stood in their offline cards here and are not comparable with 3c. That was found late; the online runs (the open reader on the 54 screens, the new reader on the 33 network screens, both lanes, twice; the EIKON probe; /set-password/ four times) were started at 10:47 UTC and not read within this chat's budget. "3/3" below is the full run plus the two targeted runs of the lane.

## Counts (new reader only)

| | motion on | reduced |
|---|---|---|
| FAULT | 6 | 3 |
| ALLOWED | 31 (3c's Settings and chants lines) | 14 |
| OTHER | 2 ("Chant", "Find a word") | 2 (the same) |
| for the eye | 11, 6 and 7 layer crossings; 62 slow screens in the full run | 0 crossings; 5 slow |
| NOT REPEATED | 4 | 0 |
| UNSURE | 2 | 0 |

## FAULT

### Motion on
- /prayers/bows/ | "Read it in Purify" (to a council's canons) | cut | 52% of the change in one frame | 3/3 | rule 2: a page switch
- /reading/ | "See all" | cut | 52% in one frame | 3/3 | rule 1: the row opens at once
- /history/alaska-mission/ from /, and "1782 Philokalia", "1917-1991 New Martyrs", /dictionary/'s "Hesychast councils" (each to a /history/ page) | jump | the page's box 30px down (y 72 to 102) after arrival | 3/3 each | rules 2 and 3
- /history/alaska-mission/ | "Matthew 28:19-20" (to /bible/matthew/28/) | jump | 205px (y 248 to 453) after arrival | 3/3 | rules 2 and 3
- offline: "Try again" on /campaigns/, /campaigns/detail/, /campaigns/mine/, /campaigns/new/, /campaigns/rules/, /community/moderate/, /shop/, /shop/category/all/, /shop/stores/ | flash | 330 by 180px | 3/3 | the retry draws and drops a box
- offline: /community/ | "Try again" | jump | 56px in one frame | 3/3 | rule 1: a section changes size at once

### Reduced
- offline: "Try again" (the same nine screens) | flash | 330 by 180px | 3/3 | rule 3
- the same /history/ arrivals | jump on arrival | 30px | 3/3 from /, 2/3 by the taps | rule 3
- /walkthroughs/job/1/ | "Context for verse 1" and "Context for verse 5" | misplaced | drawn at x 89, then 17 | 3/3 | rule 3

## ALLOWED
- Motion on (31): Settings' Familiarity radios ("Completely new", "Learning", "Practicing": cuts and the 26 to 45px jumps), First focus (11 cuts, each with the 48px jump), the chants' filters ("Greek", "Serbian", "Contemporary"); rule 1, as 3c.
- Reduced (14), in-page changes at once: Dismiss on / and /signout/, /calendar/ "October 2026" and "Old", /privacy/ "Contents", /fasting/ "Today ...", "Fri, Nov 13" and "Wed, Oct 28" (new, the same class), the council's "Next", /start/first-liturgy/'s two, Settings' "Completely new", /signup/'s field, /whats-new/ "November 1 update", and offline /community/ "Try again" (56px).

## OTHER
"Chant" and "Find a word", both lanes, as 3c.

## NOT REPEATED (motion on, 1 of 3)
/apologetics/atheism/ "Against the Heathen" cut; /bible/1-chronicles/1/ "More actions" flash; "Matthew 28:19-20" flash (120 by 30px); /fasting/ "Wed, Oct 28" jump (24px).

## UNSURE
- /bible/1-chronicles/1/ "Pick a chapter" flash (60 by 30px, 2 frames): the two-worker full run and 1 of the 2 alone. The open reader's runs would settle it.
- /set-password/ arrival blank, 22 frames: 1 of 3 motion on (the second targeted run), 0 of 3 reduced. The known fault for the last fixer; its own four runs are in the unread online chain.

## Against gate-run-3c.md (new reader; the network screens offline)
- No longer shows, both lanes, each control reached in every run: the account family's, /plan/'s and /email/first-week/'s arrival blanks; "Open Security"; "Choose what email you get"; the running line after "Ephesians 4:26-27" and "James 1:19-20"; the reading-mode preview ("John Chapter 1", 7 taps a run); reduced, the 51px arrivals (Back to the Bible, Psalm 135, Words and history, The Mother of God), the Exact Exposition's 28px, the five verse spans, Marcionism, the shop's Orders and Requests, /account/'s flash. /set-password/ fell from 4/4 to 1 of 3.
- Not comparable offline: EIKON's carried picture (no store cards offline), /campaigns/detail/'s blank, "Ask a Priest" (the offline feed).
- The five rows, reduced, reached and clean 2/2: the creed row, "Terms" on /privacy/, "Psalm 14:1", "2 Peter 1:3-4". Not reached: the library's "The Symbol of the Faith" row on /theology/ and the journal's begin row ("carry into the week", the Sunday prompt): 0 taps in all four runs, cause not read.
- Came back: nothing.

## FAULT groups, one fixer each (files from the walk, causes not read)
1. **The /history/ page settles 30px after arrival** | `app/(app)/history/[slug]/page.tsx` (the box: `data-route-content`) | both lanes, four entries.
2. **The verse landing from a /history/ link** | `components/bible/KeepScrolling.tsx`, on `app/(app)/bible/[book]/[chapter]/page.tsx` | Matthew 28, 205px. Can share 1's fixer (a box settling after arrival).
3. **The offline retry** | `components/campaigns/CampaignsClosed.tsx` (and the shop's and community's offline cards) | the flash on nine screens, both lanes, and Community's 56px jump. Offline only.
4. **The metany guide's link cuts** | `components/prayers/MetanyGuide.tsx` to `app/(app)/councils/[slug]/[document]/page.tsx` | "Read it in Purify".
5. **"See all" opens at once** | `components/reading/CoverRow.tsx` | /reading/.
6. **The walkthrough's verse context** | the "Context for verse" buttons on /walkthroughs/job/1/ (file not read) | reduced, misplaced.
