# Content packs: new content without a store build

Written 2026-10-14. The code is `lib/packs/`, the website's answer is
`/api/packs`, and the app asks for it from `components/native/PackBridge.tsx`.

## Why

The apps are a static export. Every word a screen shows was written into the
bundle when the build was made, so a new chosen verse, a corrected one or this
week's board message reached a phone only with the next store build, and a
store build waits a day to a week for review. A drop day that has to wait for
Apple and Google is not a day.

A pack is that same content, served by the website and kept on the phone. A
website deploy, or a message published from the admin panel, reaches the
apps the next time they are online.

## What is in a pack today

| Pack | What it carries | How it changes |
|---|---|---|
| `verse-of-day` | The Verse of the Day card's entries, from yesterday to two months ahead, made by the same `getVerseOfDayTable()` the card renders from | Add or correct a pick in `data/today/verse-picks.json`, then a website deploy |
| `board` | The board message at the top of What's New, the row published in Admin (the committed `board.json` when the table is empty) | Publish it in Admin. No deploy at all |
| `release` | The next Purify update (name, version, date) for the home screen widgets' countdown, from `data/changelog/next-update.json` | Set or move it in that file, then a website deploy |

The website keeps its answer five minutes, and a phone asks at most once in
half an hour, a few seconds after the app opens or comes back to the front.

## How a content drop goes

1. Change the content (a verse pick, a board message).
2. For a file in the repository, push to main. That is a website deploy, and
   the owner's call. For a board message, publish it in Admin.
3. Check the website's answer: `https://purifyapp.net/api/packs` shows the
   new content.
4. Apps that are online pick it up within about half an hour. Apps that are
   offline keep what they had, and pick it up when they are next online.

No store build, no review, no update prompt.

## The rules a pack lives by

- **Data only.** Words and references, never markup or code. The only link a
  pack may carry is a chapter of the app's own Bible (`/bible/<book>/<chapter>`
  with an optional `#v<verse>`), and it has to be the chapter the entry names.
- **Read strictly, every time.** `readPacks()` in `lib/packs/types.ts` rebuilds
  each field it knows and throws away everything else. One bad day spoils the
  whole verse pack, so a half-read table is never shown. A pack at a shape
  number this build does not know is skipped; the other packs are still used.
  What is saved on the phone is checked the same way each time it is read.
- **Never in front of something newer.** A pack is used only when the
  website's release is at least the app's (a failed or rolled-back website
  deploy cannot put old content in front of a newer build) and when it was
  made after the build was built (a pack saved before a store update does not
  cover what the update carries). The build's time is written in by
  `next.config.ts` (`NEXT_PUBLIC_PURIFY_BUILT_AT`, app exports only).
- **The board message is the newer of the two.** A release writes its own
  message into the bundle before the store builds, and the same words reach
  the table only at the announcement. Until then the table is older than the
  bundle, and the bundle's message stays.
- **Fails silent.** No signal, an error page, a slow or oversized answer: the
  screens show what the build carries, exactly as before packs existed.
- **The apps only.** The website renders its own content, already current,
  and never reads a pack.

## Adding a pack

1. Give it a name and a shape number in `PACK_SCHEMAS` (`lib/packs/types.ts`),
   and a reader there that rebuilds it field by field.
2. Make it in `buildPacks()` (`lib/packs/server.ts`) from the same function the
   website's page uses, never from a second copy.
3. Read it on the screen through a hook in `lib/packs/usePacks.ts` whose
   server snapshot is the build's own content.
4. Add a case to `lib/packs/__tests__/server.test.ts` (the website's answer
   passes the app's check) and to the export walk's section 30.

A changed shape gets a new number. Builds that know only the old number skip
the pack and keep their own content, so a new shape never breaks an old app.

## What is proven, and what is not

Proven by `lib/packs/__tests__/` and the export walk's section 30, which plays
the website: the app asks once, sends no account, shows the pack's verse on
Today and its board message on What's New, and throws away a pack whose verse
leads outside the Bible. Not yet seen on a real phone, and not yet against the
live website, since `/api/packs` exists only from the release that adds it.
