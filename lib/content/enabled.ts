/**
 * Is the on-device content layer switched on?
 *
 * The layer is built and kept: a SQLite store on the phone, a package of the
 * app's text imported into it on first open, a repository to read it and a
 * queue for writes made with no signal (the rest of this folder). It was
 * meant to become the one place the readers take their text from, which is
 * still the long answer to the app's size (docs/build/app-size.md).
 *
 * No screen reads it. `useRepository`, `useLocalContent` and `useSyncQueue`
 * have had no caller since they were written, and the test beside this file
 * holds that. Meanwhile every install carried the package (32.7 MB on disk,
 * 10.9 MB packed) and every first open fetched it, parsed it, checked it and
 * wrote it into the store a row at a time: a freeze of seconds on a middling
 * phone, at the worst moment there is, for a store nothing then asked a
 * question of. The July audit said to stop (docs/audit/AUDIT-2026-07-27.md,
 * 2.9), and on 2026-10-12 the owner chose: stop shipping it now, keep what
 * we built.
 *
 * So this is off. Off means two things, and both read this one line:
 *  - the apps do not start the layer (components/content/ContentProvider.tsx);
 *  - an app build does not write the package into the export
 *    (scripts/native-build.mjs reads this file for the word after the equals
 *    sign, so keep it a plain `true` or `false`).
 *
 * To turn it on, a screen has to read through `useRepository()` first. Then
 * set this to true and the build ships the package again; the test will ask
 * for the size limits in lib/build/exportSize.ts to be raised to carry it.
 * A phone that installed 1.5 still holds the store it filled then. Nothing
 * here deletes it.
 */
export const LOCAL_CONTENT_ENABLED = false;
