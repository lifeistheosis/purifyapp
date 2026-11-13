# Build 95: his walk notes

The 1.9 test build cut on 2026-11-13 from 6193982d5 after the pre-build gate passed (Android run 43374905223, build 95; iOS run 43374909047). He walks it as a new reader. Every note here gets a test that fails on the old code (the gate's part 5).

## Note 1 (withdrawn: the old build): the language list opens off the left edge

His word, 2026-11-13 07:06 UTC, with a screenshot from his Android phone (Settings, Language, the "English" picker tapped): "are we serious?"

What the screenshot shows: the list opens with its end at the picker's end and runs off the screen's left edge. Every language name is off the screen, and only the chosen row's check shows. The list lies over the rows beneath it.

The same fault was named and mended once before in 1.9 (components/i18n/LocaleMenu.tsx, the comment above its layout effect: "in Settings, with the picker after the globe, it opened off the left edge and its names could not be seen at 390px"). The gate's walks passed it, so the mend holds in the walks' browser and not on his phone. Why the gate missed it is part of this note's fix: a test that fails on the old code, and a walk that sees what he saw.

**Withdrawn, 2026-11-13 07:08 UTC.** He was walking build 93 (2026-11-10), not build 95. The arbiter had kept build 95 as a run artifact (publish off), so the release page he downloads from (android-release) still held build 93. His next two screenshots settle it: Settings' What's new with the four-point sparkle, and the Amen button, both build 93 notes mended since (What's new wears TimelineList at 6193982d5; no Amen button since 3ed50d182, build 93 note 14; the language list since 209c3ad64, all in build 95). Build 95 was published to the release page at 07:04 UTC (run 43382387529, the same app; its one native change is the email-picture prune). The arbiter's fault, not the app's: a test build is now always published to the release page, and the page's date is checked before he is told (docs/OPERATIONS.md section 5).

## Note 2 (not a fault, but not named to him beforehand): no prayer campaigns

His word, 2026-11-13 07:10 UTC, on build 96 (the page's build, the same app): "okay one thing on the new build I don't see the prayer campaigns"

As built. The app shows campaigns' doors only when the website says so (lib/campaigns/useCampaignsOpen.ts). The build talks to the main web, which runs main, where the switch says closed until the merge (lib/campaigns/flags.ts, "Release day, in order"). With no test web (his choice, 2026-11-11), the release-day order stands in: (1) the merge carries "testers", so the website answers for his account alone and the campaign SQL runs; (2) the store builds go to internal testing and he walks campaigns on his phone, signed in; (3) one line opens them to every reader, at his word, after the lawyer's and the priest's words (items 113 and 129); (4) the stores go public. CLAUDE.md says anything a test build cannot match is named to him before he walks it. This was not named: the arbiter's miss, noted here.
