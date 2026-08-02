# Fasting rule matrix — proposal for review

**Status: PROPOSAL. No code has been changed.** `lib/calendar/orthodox.ts`
`fastingStatus()` is untouched and still behaves as described in the "Current"
column below.

This exists because the audit found six defects in the fasting chain, three of
them caused by branch ordering. Fixing them means deciding what the rule
*should* be, and that is an editorial and pastoral question, not an engineering
one. So this document proposes the matrix and names a source for every row.
**It needs sign-off from Leona or a qualified Orthodox reviewer before any of
it reaches `fastingStatus()`.**

I have deliberately not selected a Typikon. Where practice differs by
jurisdiction I have said so rather than picking one, because picking one
quietly is how an app starts telling people the wrong thing with confidence.

---

## How the current function works, and why order matters

`fastingStatus()` is a single sequential if-chain (`orthodox.ts:150-339`). The
first branch that matches returns. So a general rule placed above a specific
one silently swallows it, and three of the six defects are exactly that.

Any fix has to be reviewed as an **ordered** list, not a set of rules.

---

## A. Confirmed defects

Each row: what the app says today, what I believe it should say, and the source
that decides it.

| # | Day | Current | Proposed | Source needed |
|---|---|---|---|---|
| A1 | **Great Saturday** (Pascha−1) | "Saturday or Sunday of Great Lent. Wine and oil allowed." | Strict fast | Great Saturday is the one Saturday of the year that is a strict fast day. Canon 66 of the Holy Apostles and Canon 55 of Trullo are the usual citations. **Reviewer to confirm the wording and whether wine is permitted at the Vesperal Liturgy.** |
| A2 | **Dec 20-24 falling on Sat/Sun** | "Nativity Fast, fish allowed" | Stricter than fish; the Dec 20-24 tightening should win over the weekend relaxation | The weekend branch (`:271-278`) runs before the `day >= 20` branch (`:287-294`). Ordering defect. **Reviewer to confirm what Dec 20-24 permits on a weekend.** |
| A3 | **Dec 24, Christmas Eve (paramony)** | Not modelled at all | Strict until the Vigil | Paramony is a distinct rule, not just "day 24 of the fast". **Needs a source and a decision on how to express "until the Vigil" in an app that only knows the date.** |
| A4 | **Jan 5, Theophany Eve** | Falls through to Wed/Fri or "no fast" | Strict fast (paramony) | The fast-free window ends Jan 4 and its own text says "through Theophany Eve (Jan 4)", which is off by one: Theophany Eve is Jan 5. |
| A5 | **Jan 6, Theophany** on a Wed/Fri | "Wednesday fast" | Great Feast; fast released | e.g. 2027-01-06 is a Wednesday. **Reviewer to confirm the release.** |
| A6 | **Sep 14, Exaltation of the Cross** | No rule; "no fast" unless it lands on a Wed/Fri | Strict fast | `daily-saints.json` already has the feast on the correct date; the fasting table simply has no rule for it. |
| A7 | **Aug 29, Beheading of the Forerunner** | Same | Strict fast | Same. |
| A8 | **Cheesefare week** (Pascha−56 to Pascha−49) | Ordinary Wed/Fri rule | Dairy permitted all week, meat forbidden, including Wed and Fri | The adjacent pre-Lent fast-free week (Publican and Pharisee) *is* handled at `:205-212`; Cheesefare was missed. |
| A9 | **Great Feasts on a Wed/Fri** generally | "Wednesday/Friday year-round fast" | Fast relaxed to some degree | Affects Dormition (Aug 15), Nativity of the Theotokos (Sep 8), Entry (Nov 21), Ss Peter and Paul (Jun 29). **The degree of relaxation varies by jurisdiction; this is the row most in need of a ruling.** Nov 21 is the sharpest because it falls inside the Nativity Fast and currently returns `nativityWedFri` = strict. |

## B. Verified correct, for the record

Not everything is wrong, and the review should not re-litigate these:

- Great Lent range: `cleanMonday = pascha − 48`, `holySaturday = pascha − 1`
- Palm Sunday and Annunciation fish exceptions
- Dormition Fast, Aug 1-14, with the Transfiguration fish exception
- Nativity Fast start and end, Nov 15 to Dec 24
- Apostles' Fast start (`allSaintsSunday + 1`) and end (Jun 28), including the
  degenerate case when Pascha is late enough that the fast has zero length
- Bright Week, Trinity week, the week after Publican and Pharisee, the Twelve
  Days of Christmas
- `orthodoxPascha()` itself: verified exact against published Orthodox Pascha
  for 2020-2035, all sixteen years

One dead branch worth removing when the chain is touched: the third
`inRangeInclusive` condition at `orthodox.ts:180` is fully subsumed by the one
above it.

---

## C. The test matrix

Once the rules above are approved, this becomes a table test in
`lib/calendar/__tests__/orthodox.test.ts`, which currently has **three** cases
for `fastingStatus` and covers **none** of the nine defects.

Years chosen so each edge case actually occurs. Pascha: 2026-04-12,
2027-05-02, 2028-04-16.

### C1. Holy Week and Great Lent boundaries
| Date | Year basis | Expect |
|---|---|---|
| Clean Monday (Pascha−48) | 2026, 2027, 2028 | strict |
| First Sat and Sun of Lent | 2026 | wine-oil |
| Every Sat and Sun of one Lent | 2027 | wine-oil |
| Palm Sunday (Pascha−7) | 2026, 2027, 2028 | fish |
| Great Monday to Great Friday | 2026 | strict |
| **Great Saturday (Pascha−1)** | 2026-04-11, 2027-05-01, 2028-04-15 | **A1** |
| Pascha | 2026, 2027, 2028 | fast-free |
| Bright Week, each day | 2026 | fast-free |

### C2. Nativity Fast
| Date | Expect |
|---|---|
| Nov 14 | ordinary rule |
| Nov 15 | fast begins |
| **Nov 21 (Entry) on a weekday** | **A9** |
| Dec 19 | fast |
| **Dec 20 on a Sun (2026)** | **A2** |
| **Dec 23 Sat, Dec 24 Sun (2028)** | **A2 + A3** |
| Dec 24 on a weekday | **A3** |
| Dec 25 | fast-free |

### C3. Theophany
| Date | Expect |
|---|---|
| Jan 4 | fast-free (end of the Twelve Days) |
| **Jan 5** | **A4** |
| **Jan 6, 2027 (a Wednesday)** | **A5** |
| Jan 7 | ordinary rule |

### C4. Fixed strict days
| Date | Expect |
|---|---|
| **Sep 14 on a weekday, and on a Saturday** | **A6** |
| **Aug 29 on a weekday, and on a Saturday** | **A7** |

### C5. Pre-Lent and Dormition
| Date | Expect |
|---|---|
| Publican & Pharisee week (Pascha−70 to −63), incl. Wed and Fri | fast-free |
| **Cheesefare week (Pascha−56 to −49), incl. Wed and Fri** | **A8** |
| Aug 1, Aug 14 | fast |
| Aug 6 (Transfiguration) | fish |
| **Aug 15 (Dormition) on a Wed/Fri** | **A9** |

### C6. Ordinary time
| Date | Expect |
|---|---|
| An ordinary Wed and Fri outside any fast | wine-oil |
| An ordinary Tue and Thu | no fast |
| **Jun 29 (Ss Peter and Paul) on a Wed/Fri** | **A9** |

---

## D. Unresolved, needs a ruling

These are the ones I will not guess at.

1. **A9, the degree of Great Feast relaxation on a Wed/Fri.** Practice differs
   between Greek and Slavic usage and between jurisdictions. Options: fish
   permitted; wine and oil only; no change. This choice affects at least four
   dates a year.
2. **A3, paramony expressed as a date.** The rule is "until the Vigil", and the
   app knows only the day. Does Dec 24 display as strict for the whole day, or
   is a note attached?
3. **Whether the app should state a jurisdiction at all.** `lib/calendar/matrix.ts`
   already defines a per-jurisdiction patch-file format and ships only the
   `ecumenical` entry; the named menologion files are TODOs. If the answer to
   A9 is jurisdiction-dependent, that scaffolding is where it belongs, and the
   fasting table should say which usage it is following rather than presenting
   one as universal.
4. **Whether a partial keeping should ever be displayed differently.** Out of
   scope for the rules themselves, noted because `/fasting` already models
   kept / partial / broken and the pastoral note there was clearly written with
   care.

---

## E. What happens after sign-off

1. The approved matrix becomes the table test, and it goes red first.
2. Only then is the if-chain reordered and the six missing rules added.
3. The chain is reviewed as an ordered list, since three of the defects were
   ordering rather than logic.
4. i18n: each new `ruleId` needs `calendar.fast.<id>.label` and `.rule` keys.
   Note the fast table is currently missing from every non-English catalogue,
   including German, so new keys will render in English everywhere until that
   is addressed separately.
