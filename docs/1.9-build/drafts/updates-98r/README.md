# Updates 98r, parked: Heart alone in the app

His word of 2026-11-16, about 22:35 UTC: "remove locally LLM voices and full drop and turn on campaigns etc (only leave one the standard prerecorded voices)". Parked at the arbiter's word of 00:10 UTC on 2026-11-17: no app code lands during Gate 6c's final check, so a fresh chat applies these after Gate 6c's verdict. What they do, the checks and what is open: `docs/handoffs/updates-98r.md`.

## The patches, in order

1. `0001-Heart-only-the-phone-s-and-the-browser-s-voices-go-a.patch`: the code. `lib/listen/speech/` and `components/player/VoiceSheet.tsx` go; Listen only where Heart's recording is; the audio store, the player and the two chapter readers lose the spoken voice; the Voice row and Now Playing's door go.
2. `0002-Heart-only-the-tests-follow-and-a-test-that-fails-on.patch`: `lib/listen/__tests__/heartOnly.test.ts` and eight older tests that pinned the phone's voice.
3. `0003-Heart-only-the-lines-readers-are-given-say-what-Hear.patch`: the 1.9 note's listening line (and `data/changelog/entries.json`, `patches.json`), the drop and `drop.md`, the FAQ in 21 languages, the Voice sheet's strings out of 21 catalogs, round 3's record, and `lib/whatsNew/__tests__/heartOnlyLines.test.ts`.

## Where they stand

- Made on `a8d0dbbef` (the recorder's commit, Heart alone, already on the branch), as the commits `2884cc67b`, `6db921730` and `004cc0447` in Updates 98r's container (kept there as the tag `parked-98r`, never pushed).
- The tree after all three on `a8d0dbbef`: `0b1fbf15dd34ea51173c91ed26782fe2779ddc4c`; its app folders: `app` `c8ff1d46baf6ba5360e0f1e04bbe501aa90bac78`, `components` `8272a0d2da9ff4e335523a74cc57996e21888cc8`, `lib` `4809af643bfdcc420dbca0bd5a0d27d67fbec4a4`, `data` `65bc2c2425f41a2c39cdaf1fb648608fbd921693`.
- Applied cleanly on `f86e1fc7c` too (01:2x UTC on 2026-11-17, a throwaway worktree): 69 files changed, 417 insertions, 3,714 deletions, the same as on `a8d0dbbef`.

## To apply

From the branch's head, after Gate 6c's verdict:

```
git am docs/1.9-build/drafts/updates-98r/0001-*.patch docs/1.9-build/drafts/updates-98r/0002-*.patch docs/1.9-build/drafts/updates-98r/0003-*.patch
```

Then the fix checklist on the new head (OPERATIONS section 5): typecheck, the whole suite, eslint on the changed files, `npm run build`, one export, checkMock with pixels on the touched screens, and the tap walk, including the Arabic tap walk this chat did not finish (the hand-over's "Not proved"). If the drop or the note moved in the meantime, `git am` stops on patch 3: take the head's drop and note, make the same three changes by hand (the listening line, the also and its two copies, the voices step and the never reasons), then `node scripts/drop.mjs kit` and `npx vitest run lib/drop lib/whatsNew/__tests__/heartOnlyLines.test.ts`.
