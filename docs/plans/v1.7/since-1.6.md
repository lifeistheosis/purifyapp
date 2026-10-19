# What we have done since 1.6

One entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.

Everything below is on `release/1.7` (from `0c828506`), not pushed: the website
has it at the push, the apps with their store builds. "Gated" means it does
less in production than the code can, and the note says only what it does.

## Fixes

- The Psalms in both numberings: search offers the other, a psalm names it. `a37c2b42`
- The Verse of the Day names its book in the reader's language. `62970fa7`
- Pascha "nearly every" Orthodox church, in 21 languages. `e8179dac`
- The Akathist shows only its opening Kontakion (Hapgood 1906); the modern wording that shipped under her name is gone, the rest waits on a checked printing. `33c0cc39`
- Compline's introduction: real quotation marks, not entities. `33c0cc39`
- You: the Ladder of Divine Ascent from a sharp scan. `1bee3730`
- The reader's bar names the last verse at a chapter's foot. `b40eef73`, `d6aeaa52`
- Owed since 2026-10-06 (docs/release/OWED.md): the link tag and the Windows app on the privacy page. Live since then; said now.

## Saints

- A saint's page on phones: the icon at the top, Life, Writings and Miracles on a switch, twelve large icons streamed from the website. `655c4338`

## Library

- One phone top bar for the five tabs, the bell's sheet. `743cee3a`
- Today B, Discover A (a picture on every tile), You B. `f4e89bf0`, `c037e86b`, `7a14d317`, `1ae7c8b5`
- Search opens on the day and the last five results. `89110ef2`
- Calm labels and drawn chevrons. `e43fef15`, `da40d08a`
- Read aloud: John 1 only, in the demo voice (Kokoro af_heart) until the owner picks the free voice; covers stream from the website. `f3dfa682`, `d2a0b1ce`, `c27dd3e5`
- The player: mini player, Now playing, live captions, sleep timer. `74ab6ce6`, `a59b6d83`, `e6facf29`
- Chants in the Kitchen's place, the Prayer Rope Anthem (en, fr, ar) streamed from the website; Pray with chant. `678c98b6`, `2d2823bd`
- The chapter screen. `17108a4d`
- Before you read for all 78 books. `e06da828`
- Paragraphs: 1251 chapters in 75 books. `39095f71`, `ae1237db`
- Time left, keep scrolling, today's readings in one go. `88df3307`, `bd77bf84`
- The pages under Prayers: lyrics, the drawn cross, the Hours as the day, Learn to pray in order, Your rule (on the device). `33c0cc39`
- The reading room: covers, rows, search, a page for every work. `e8da226b`
- Orthodox History: the timeline, four-part event pages, twenty accounts in English with a picture each (streamed). `b025098b`
- The Orthodox dictionary, 100 words, definitions in English. `91661fd3`, `bfc41df7`
- Saved on phones. `3f5be984`
- Start here and Your first Liturgy. `d5958535`, `1cb02034`
- The walkthroughs. `14599f40`
- A fast day says what it keeps from. `1a9a40a7`

## Shop

Nothing new: the calmer labels and arrows only.

## Perks

- Remember a verse (Plus). `a159c611`
- Ambience (Plus), its own sheet and the one sleep timer. `e741054c`, `c27dd3e5`
- Reading plans as guided days (Plus, as before). `3f5be984`
- The journal on phones (Plus, as before). `3f5be984`

## Stats

None announced.

## Community and plain lines

None: every line of the note is filed under a category.

## Silent: admin and plumbing

- Sync keeps removals and edits, a highlight's colour and the journal's own entries. **Gated:** the colour and the journal wait on `docs/1.7-build/sql/annotation-color-and-journal.sql`, which the owner runs by hand; until then the journal's own entries stay on the device, and the note says so. `0830c8ee`
- Three works that are not public domain left the app (St Paisios's Spiritual Counsels and Epistles, the Four Hundred Chapters on Love as given here), with four sayings on his page. Not in the note. `e1f7396b`
- The export walk's new sections and the editorial queue's items 9 to 12. `9afff2b8`, `0726b6e7`, `b08ead16`, `12e41e15`

## Not ready, and where it goes

- Read aloud past John 1: waits on the owner's voice pick.
- The Akathist's other stanzas: wait on a public-domain printing he chooses.
- More chants: wait on recordings he sends.
- The pills and pictures at the top of What's New: taken from the 1.7 build, after this note.
