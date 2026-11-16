# Build 98 note 2: stills for his yes

His words (2026-11-15): "make the listen system the same as the Bible listening system (UI/ux) one so there isn't a floating button". Rendered by Updates 98g from the export of `b70e3968` (`node scripts/gate/export.mjs --platform android`) with `docs/1.9-build/redesign/tools/shots.mjs` at 390 by 844, scale 2, a phone's voice stood in (`"voice": true`). Nothing drawn by hand.

| Still | What it is, and why |
| --- | --- |
| `note-2-work-rest-390.png` | A Father's work at rest. Listen now sits in the work's own pill beside the sound, as on a Bible chapter, and the button under the title is gone, so nothing floats over the words but that one pill. The reader finds Listen where the Bible taught them to look. |
| `note-2-work-playing-390.png` | The same work while it plays. The pill becomes the Bible's dock: the player over the work's own row. One bar at the foot where two stood, and the mini player steps aside. |
| `note-2-life-rest-390.png` | A saint's life at rest: the Bible's pill with "Life" where the chapter stands, then the sound and Listen. A life's tab bar now steps away on a scroll down and comes back on a scroll up, as on the Bible. |
| `note-2-life-playing-390.png` | The life while it plays: the dock with the life's name alone (it has no parts to turn). It draws in to the small pill as the reader reads on, as a chapter's does. |
| `note-2-study-part-390.png` | A study read part by part: "Part n of N" and its arrows in the pill, with Listen beside the sound. The parts turn from the pill, and from the dock while it plays. |
| `note-2-council-dock-390.png` | A council's canons while they play: the dock with the section's arrows, the same card the Bible's chapters wear. |

Not yet rendered: the Arabic still (the walk's stand-in voice speaks only the reader's language, so in Arabic Listen opened the Voice sheet over an English text; mend `scripts/lib/fake-voice.mjs` to carry an English voice too, then render it). An event's page behaves as a life's (its name: "What happened"), tab bar included. The walk behind these, and checkMock on every palette and look: `scripts/gate/listen-walk.mjs`, results in build-98.md under note 2.
