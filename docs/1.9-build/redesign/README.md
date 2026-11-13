# The fifteen screens, redesigned for 1.9

Build 95 note 25 (his word, 2026-11-13 about 08:13 UTC: "I want everything fixed in v1.9 no pushing out to 2", and "Fable" for who designs). Fresh eyes ranked fifteen screens and four faults that repeat: https://claude.ai/artifact/7brw1qS4JPzb61tAHqQk8p. The Fable designer draws them in five rounds; he answers yes or no a screen at a time; on a yes the screen's change goes to an Opus chat to harden and push.

## Where each round stands

| Round | What | Page | State |
|---|---|---|---|
| 1 | Today, and the four house rules | https://claude.ai/artifact/7i93tDncctM4SU3qeqPjb4 | his yes to all five, 2026-11-13 20:47 UTC; being applied |
| 2 | The first launch, Prayers, Discover | https://claude.ai/artifact/NhoSL95Kip76jng4gemM6z | his no to all three (2026-11-13 by 22:05 UTC: "no to all 3"); kept as the record, for the Vault; nothing applied |
| 3 | The Bible's opening, You, Plus | | not begun |
| 4 | Saints, Community, the shop | | not begun |
| 5 | The account's pages, Sign in, Theology, the doctrine lists, the near-empty screens | | not begun |

## How a round is made

Nothing is drawn by hand. The proposal is a change to the app on a branch that is never pushed (`held/fifteen-screens`, local), the export is cut from it, and the stills are the export's own screens.

1. `node docs/1.9-build/redesign/tools/export.mjs` cuts the native export as the store build is cut: the shop and the community on, Plus enforced with a stand-in key. It reads the main web's public Supabase address and anon key from purifyapp.net's own scripts into that one command (his word, 2026-11-13, "yes key always"), checks the role is anon, and prints and writes the key nowhere. About ten minutes. Cut it once from the working branch and move `out/` aside as the before, then from the held branch as the after.
2. `node docs/1.9-build/redesign/tools/shots.mjs <export dir> <out dir> <plan.json> [--check] [--scale=2]` serves an export as the phones' shells do, opens each screen of the plan as the reader the plan describes, takes the stills, and with `--check` holds each to `checkMock` with pixels. A plan line may set the reader's storage, the clock, the width, the language and steps (a tap, a scroll). The checker takes about a minute a still.
3. A round's own folder holds its plans (`plans.mjs`), its pictures (`pics.mjs`: the stills and crops as webp), its page (`page.py`: the design kit's own style block and the words) and the page's check (`check.mjs`: the page as the artifact's frame wraps it, at 360, 390, 412 and 1032 on five palettes).
4. The page is published with the Artifact tool and its link sent to the arbiter with the reasons.

Readers used for the stills: a new reader who has answered the questions (`purify:secondchance.done`), morning of 2026-11-13; days kept are seeded as `purify.prayers.morning.dates`; Arabic is `CapacitorStorage.purify_locale`.

## What a held patch is

`round-N/held.patch` is the round's whole proposal as a diff against the working branch on the day it was drawn. It is kept so the work outlives the machine it was drawn on. It is **not approved and not applied**: nothing in it ships without his yes. On a yes for a screen, that screen's part is cut out as `docs/1.9-build/redesign/<screen>/change.patch` beside its build spec (`spec.md`: the parts, the tokens, the words with existing i18n keys first, the states, the motion, what to test), and the arbiter routes it to an Opus chat.

## Round 1, in short

- **Today**: the day leads once on the night (the date, the saint, the fast and the count to Pascha, the hour's prayer, one Begin); one white button on the screen; no "0 days" (the rope from the first day kept, on the page); the verse on the page, without a box; the day's other prayers as rows in one tray; the fast in words in one tray with the Nativity path; in the Nativity Fast the star rises in the lead's own sky. No new word: every line is an existing key.
- **Rule: no zero as a first sight.** A count shows from one; until then an invitation in words, or nothing.
- **Rule: the small line.** Sentence case, `font-sans text-caption font-semibold text-paper/55`; never capitals spaced out.
- **Rule: a row.** A name, one line, the chevron, a hairline between, in one tray; no icon tile; a picture only when it is the thing itself.
- **Rule: one small choice, one form.** The house's track (`.set-track`) to switch between two to four views; rows in one tray with the chosen row marked to give one answer from a list (drawn in round 2).

Checked: the eleven proposed stills pass `checkMock` with pixels on all five palettes (390, 800, 1032, Arabic, the Nativity Fast, days kept), and the page passes at four widths.

## Held by other chats, and said in the round

- The Fast's own screen and the Journal (a Fable chat): Today's fast row follows the Fast's new look when it lands.
- Settings (Updates 11), Your rule, Community's files, the tab bar (Updates 7): rule 3 and rule 4 touch them only in those chats' hands.
- `components/ui/doors.ts` is shared by the saint's doors, the community profile's, the campaign's and the composer's: rule 4 changes all four together.
