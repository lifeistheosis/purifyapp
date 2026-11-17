# Release chat for 1.9: hand-over

Session session_01VuYTwazD9CHi34ZGwdGSCq, started 2026-11-17 at 01:05 UTC by
Arbiter 14 to push main at the owner's "go" and "Push now" (MERGE-DAY steps 1,
2 and 5, then 6.1 and the reads). Written at its end, about 02:40 UTC, past its
200,000 line (201,876 by get_session at 01:31).

## Where it stands

- **Main is 1.9: pushed, not yet served.** `c7cdc638c..6700c2e65` at 01:56:29
  UTC (6700c2e6570dae62bb5b602a900fff7abfb613d7), a fast-forward, the push
  guard green after 23m 40s. `node scripts/release.mjs live` said NO twice:
  `/sw.js` still `purify-1.8.0` at 02:16:54 and at 02:37:25, 41 minutes after
  the push; `/bibles/en-web/index.json` answered 404 at 02:17. The owner was
  asked at 02:18 (in this chat, and by a notification) to read Render,
  purifyapp, Events (MERGE-DAY 6.2): still building, or failed. A chat cannot
  see Render. Going back is his call only (MERGE-DAY 7); the Way back line
  stays c7cdc638c (`back` rewrites it after a rebase, not after the push).
- **The reads are not done**, since every answer would be 1.8's. Once `/sw.js`
  says `purify-1.9.0`: `node scripts/release.mjs live`, then curl:
  `/whats-new` shows 1.9; `/bibles/en-web/index.json` answers 200; a campaign
  route answers 404 to a reader with no account (campaigns are at testers);
  `/`, a Bible chapter and `/prayers/` answer 200. Also check that a page's
  canonical names https://purifyapp.net (the email preview below drew its links
  from this container's fallback, purifyapp.onrender.com, as no site variable
  is set here; production sets its own).
- **6.3, the Supabase Preview mark:** the owner reads it on
  https://github.com/lifeistheosis/purifyapp/commit/6700c2e6570dae62bb5b602a900fff7abfb613d7.
  `release.mjs back` counted 21 migrations in the push, the 21 signed
  (MERGE-DAY 3); R1's two had been run by his hand at 00:57:42.
- **The release email's preview test is red, by his word "Push now, fix
  after".** `lib/email/__tests__/releaseEmail.test.ts:200`, in "the preview"
  (run only by `node scripts/release.mjs email`, skipped in the normal suite),
  expects each page to contain `EMAIL_THEMES[mode].card` (`#1d1d20` for night),
  but release letters are drawn in the design kit's look
  (`READER_EMAIL_LOOK = "2"`, lib/email/look.ts, his "yes look" of
  2026-11-13), which ignores the mode: the night page carries the kit's own
  colours (`#101013`, `#28282b`, `#ffffff`, `#c3c3c4`). The loop stops at the
  first mode, so only `release-night.html` and `release.txt` were written
  (`.release-logs/email/`). The email itself read right: the subject "Purify
  1.9: Keep a journal by the Church's day, and go deeper into every verse", 7
  points, the 1.8 line, no em dash. A fixer item, test only, before the release
  email is sent: assert what look 2 draws, and `release.mjs email`'s line about
  "the other three" pages goes with it.
- **Android build 101, at his direct word in this chat** ("send me the new
  version for android also", about 01:29): Actions run 43999379696 on `main`
  at 6700c2e65, local first, main web, published; success at 02:06. The
  android-release page's assets are dated 02:05:56 to 02:06:01 UTC:
  app-release.apk 89,860,396 B, app-release.aab 93,981,402 B, app-debug.apk
  112,472,631 B. Sent to him at about 02:20 with these named: the phone's
  voices are still in it (Heart alone is the second push); Gate 6c's final
  check runs on the same app code (b40e4192 plus only the roads' days, the
  voices recorder's tooling aside); its website parts wait for the deploy; the
  AAB is not for Play until the website serves 1.9 (R2 before R4). No iOS
  build was made.

## His words in this chat

The brief's go reached this chat relayed, and this chat's harness does not let
a relayed approval count as his consent for a production push, so he was asked
here once, by a question card, and answered each time:

1. Between 01:12 and 01:22 UTC, to "Push Purify 1.9 to purifyapp.net once
   every check is green?": **"Yes, push when green"**.
2. About 01:26, to the red email preview: **"Push now, fix after"** (over
   "Fix the test, then push", recommended, and "Stop").
3. About 01:29, unasked: **"send me the new version for android also"**.

## The steps, with their output

1. Setup: the branch at 7ba62b996, main at c7cdc638c; not shallow;
   `core.hooksPath .githooks`; `npm ci` exit 0.
2. `release.mjs back` refused first ("origin/main is not an ancestor of this
   branch"), so the merge came first: `git merge --no-ff origin/main`, main's
   one commit c7cdc638c, `git diff HEAD^1 HEAD` 0 lines. Then `back`: Way back
   c7cdc638c, 21 migrations listed. `check`: 1 not ready, the uncommitted Way
   back line; the rest notes (the email's picture and preview, the drop held by
   test:unit, the update prompt off) and the hand-run gates.
3. MERGE-DAY 0.4 confirmed: `lib/billing/applyLifecycle.ts:78` reads
   `/admin#tab=subscriptions` (328a47a6b). ROADS_LIVE, PLUS_INTRO_LIVE and
   PLUS_ORDER_LIVE true; CAMPAIGNS_OPENING "testers".
4. The release commit (roads on, OWNER-STEPS R0c): ACCOUNT_PLACE and
   PLUS_INTRODUCED 2026-11-17 to 2027-02-09, PLUS_SHEET_ORDER 2027-02-10 to
   2027-05-05, 84 days each, the comments made true; the 7 test files that
   read the three tests, 111 passed.
5. The gates on 3d1354414, one after the other: typecheck rc 2 (68 s, the 15
   `.webp` imports of components/admin/drop/cards.generated.ts, because
   `next-env.d.ts`, ignored by git, did not exist yet in the fresh clone; CI
   runs `npx next typegen` first, ci.yml:54-62), test:unit 0 (203 s), lint 0
   (107 s), `node scripts/gate/export.mjs --platform android` 0 (115 s),
   `--platform ios` 0 (97 s), `npm run build` 0 (163 s),
   `release.mjs email` 1 (above). The tree clean after each.
6. Five docs-only commits from other chats had landed on the branch:
   `git pull --rebase=merges` (a plain `--rebase` drops the empty merge and
   with it the fast-forward). The merge became 30700eb56 (parents ed0d814b3
   and c7cdc638c, still 0 lines), the release commit 6700c2e65; against
   3d1354414 only docs/ differed.
7. On 6700c2e65: `npx next typegen` 0, typecheck 0 (86 s), test:unit 0 (237 s),
   lint 0 (126 s). The branch pushed (ed0d814b3..6700c2e65, guard 57 s).
8. Step 5 as written: `git fetch origin main`, the merge-base test, then
   `PURIFY_ALLOW_MAIN=1 git push origin HEAD:main`: the guard ran every check
   on the whole release (23m 40s) and the push went at 01:56:29.
9. 6.1 as above: two NO from `release.mjs live`.
