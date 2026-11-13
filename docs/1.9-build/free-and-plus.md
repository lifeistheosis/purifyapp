# What is free, and what is Purify Plus (1.9)

The pre-build gate, part 4 (docs/1.9-build/notes/build-93.md, "The pre-build
gate"): a list of what the app says is free and what is Plus, checked against
the code. `lib/ui/__tests__/wordsTrue.test.ts` holds it: the Plus and Pro
sections name exactly the rows the paywall draws (lib/premium/plusRows.ts),
every catalog key named here exists, and the two facts under "Free, with an
account" are read from the code. A line the app shows a reader about what is
free may say only what this list says.

## Free, with no account

- The Scriptures with the Greek beside them and every word's dictionary entry (plus.wordstudy.keep)
- Every chapter read aloud, online (plus.offline.keep)
- Every verse with the Fathers' commentary (plus.crossrefs.keep)
- The prayers, the akathists, and the chant under your prayers (plus.ambience.keep)
- The saints, the calendar, the councils, theology, and history with every event, source and citation (plus.history.keep)
- Search
- Highlights, notes and bookmarks, saving verses, and writing in your journal, on this device (plus.journal.keep, plus.remember.keep)
- Dark, Light and True black (plus.palettes.keep)
- The Bibles you download, each read on its own (plus.compare.keep)
- The whole Bible and the daily readings (plus.plans.keep)
- What you have already gathered in the Florilegium, on this device (plus.florilegium.keep)
- Your profile, handle, badges and banner color in Community (plus.profile.keep)

## Free, with an account

- The days you have prayed your rule and the names you carry, on every device you sign in on: lib/prayers/sync.ts and /api/prayer/sync ask for no Plus. The rule itself stays on the device (prayers.mine.deviceNote).
- The catechism's days, kept with your account (faq.catechism.a2)

## Purify Plus

- **Word study**
- **Seventeen reading modes**
- **Cross-references**
- **The full journal**
- **Listen offline**
- **Ambience**
- **Compare**
- **Reading plans**
- **Remember the verse**
- **Your Florilegium**
- **Your reading, on every device**: highlights, notes, bookmarks, the journal, the Florilegium and the kept library; every file in lib/sync/ asks canSync
- **Follow history year by year**
- **Make your profile yours**
- **Your mark in Community**
- **Discord status**: the Windows app only

## Purify Pro

- **Everything in Purify Plus**
- **Studio Audio**: coming, it wears the coming-soon mark
- **The EIKON Box**
- **EIKON member benefits**

## Pre-launch supporters

- Lifetime cross-device sync with no subscription; the other Plus tools belong to the subscription (plus.promise.supporters)
