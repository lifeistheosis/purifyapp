# Build 95: his walk notes

The 1.9 test build cut on 2026-11-13 from 6193982d5 after the pre-build gate passed (Android run 43374905223, build 95; iOS run 43374909047). He walks it as a new reader. Every note here gets a test that fails on the old code (the gate's part 5).

## Note 1: the language list opens off the left edge, its names unseen

His word, 2026-11-13 07:06 UTC, with a screenshot from his Android phone (Settings, Language, the "English" picker tapped): "are we serious?"

What the screenshot shows: the list opens with its end at the picker's end and runs off the screen's left edge. Every language name is off the screen, and only the chosen row's check shows. The list lies over the rows beneath it.

The same fault was named and mended once before in 1.9 (components/i18n/LocaleMenu.tsx, the comment above its layout effect: "in Settings, with the picker after the globe, it opened off the left edge and its names could not be seen at 390px"). The gate's walks passed it, so the mend holds in the walks' browser and not on his phone. Why the gate missed it is part of this note's fix: a test that fails on the old code, and a walk that sees what he saw.
