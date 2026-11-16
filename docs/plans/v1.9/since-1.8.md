# What we have done since 1.8

One entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.

## The scope, frozen (Admin, 2026-11-11, the arbiter's word of 17:00 UTC)

What readers can see is the 1.9 note itself: 44 lines under six categories (the EIKON gift's
line added at the arbiter's word of 18:49 UTC)
(`patch-note-1.9.json`, put into `data/changelog/entries.json` and
`patches.json` by `node scripts/release.mjs note 1.9`, which on 2026-11-11
changed nothing). Each line's commits are in the 1.9 record, not copied here:
`docs/1.9-build/PLAN.md` ("Done"), `docs/1.9-build/HANDOFF.md` and
`docs/1.9-build/notes/`. Every line is live with the push to `main` on the
website, and in the apps with the store builds. A fault found before the drop
goes into 1.9 and moves the date, never to a point release (CLAUDE.md).

## Brought up to what 1.9 holds (Admin, 2026-11-16, at the arbiter's word of 05:23 UTC)

The note is 63 lines now. In from the record: eight of the nine lines in
`note-lines-drafted.md` and its change to the earned palettes' line (the
arbiter's call of 2026-11-14 06:16: in, as drafted), and from build 98
(`docs/1.9-build/notes/build-98.md`): every text read aloud listening as a
chapter does (note 2), Quote searching the library (note 5), the version at
the head of the books list (note 7), Now Playing's slide (note 8), the
keyboard (notes 4 and 12, Android), a chant's words meeting the singing
(note 13) and tab switches with the player (note 14). Notes 6 and 9 mend what
is new in 1.9 and need no line. Five lines are written from round 3's designs
as drawn (screens 1, 2, 3, 5 and 6) and are read against the applied screens
before the note goes into his queue (the drop's `step-round3-check`); screen 4,
the Bible's opening, is not in 1.9 (his no).

Waits, and in no line: the voices (Heart for every reader, Emma, Michael and
Fenrir in Purify Plus: in 1.9 at his word, not live until they are recorded
on GitHub's runners once his secrets are in, then the Voice sheet and the
signed route; the drop's `step-voices-line`); prayer campaigns (his account
at the merge, every reader at his word; `step-campaigns-line`); the Bible
versions' downloads (from the merge; `step-bibles-merge`). The drafted line on
the phone's own voices stays out: the voices were settled otherwise on
2026-11-15, and what the phone's voices do beside them is not.

### Gated off, and not in the note

Each switch as it stands on the branch on 2026-11-11:

- **Prayer campaigns**: `CAMPAIGNS_OPENING = "testers"` (`lib/campaigns/flags.ts`).
  After the merge they answer for his account alone. They open for every
  reader at OWNER-STEPS R5c, and only in that push does their line join the
  note (the drop's step `step-campaigns-line`, its words naming no pictures).
  Until then no piece of the drop names them (the drop's never list).
- **Pictures in campaigns**: `PICTURES_IN_STORE_BUILDS = false` (same file).
  They come in 1.9.1, with their legal steps (his word, 2026-11-11 about 14:43
  UTC). The Privacy page's and the Terms' clauses on them stay in 1.9 (his
  "keep legal", about 15:13).
- **The on-phone voice**: not in the 1.9 apps (his "rec voices", about 14:24).
  Its section is parked in `docs/1.9-build/parked/phone-voice` for 2.0
  (`cdaabd4c4`), and a test holds that no build names it. Listening in 1.9 is
  the recorded voice, as in 1.8 (`a26b900df`). The drop's never list holds
  "phone voice" and "phone's voice".
- **The US parish list**: `US_PARISH_LIST_ON = false` (`lib/parishes/listSwitch.ts`),
  off until the bishops or the jurisdictions give permission. A US priest or
  deacon writes his parish instead. "Find a parish" is on the never list.
- **The on-device content layer**: `LOCAL_CONTENT_ENABLED = false`
  (`lib/content/enabled.ts`). No screen reads it. Nothing a reader sees.

### Not ready, with where it goes

- Campaign pictures: 1.9.1 (above).
- The on-phone voice: 2.0 (above).
- Every work with a cover: the reading room's covers pack is not in yet. "Every
  work has a cover" is on the never list. A work without one shows its plate
  (`lib/reading/__tests__/coverArt.test.ts`).
- The Fathers' works recorded in the Heart voice: his PC records them after
  the release, most-read first (`scripts/listen-first-works.mjs`, OWNER-STEPS
  V9). A recording made after a build is heard in it all the same
  (`lib/listen/recordings.ts`), so no release waits on them.

### Settled

- The sharing limit (his item 93): three shared pages a month for everyone,
  without limit in Purify Plus (his word, 2026-11-11 about 17:56 UTC: "Yes,
  keep item 93"). Note line 18 says exactly that, the code ships it
  (`SHARE_LIMIT_FREE = 3`, `lib/journal/share.ts`), and "a month" is off the
  drop's never list. No piece of the drop names the limit.
