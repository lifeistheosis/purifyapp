# AD 3, "Your faith didn't start in the West"

The TikTok edit cut to the owner's `early-christians.mp3` (his voiceover over a beat), 18.9 s,
in AD 2's RUBRIC style: lapis black, cool vellum, rubric red, no gold and no orange. The owner
called AD 2's visuals "insane" and its pacing "pretty good" (2026-10-08), so this one keeps both
and changes the story's object: a map, a road and a letter where AD 2 had a torn page. Every
cut, city, name and word is keyed to times in `timing.json`.

Nothing here is media. The voiceover, the frames and the videos are rebuilt with the tools below.

## The format: hook, history, the problem, the fix

| Part | Time | On screen |
| --- | --- | --- |
| Hook | 0 to 2.4 s | YOUR FAITH / DIDN'T START / IN THE WEST. over a vellum map of Europe, opening close and settling. |
| History | 2.4 to 6.5 s | On the bar line the camera whips east to Jerusalem. A red ink road draws on the beat through Antioch and Smyrna to Rome: Ignatius's own road under guard, c. 108. When the full drums come in, a drop of ink spreads at Rome, the map goes dark, and THE MARTYRS are listed with their places and years. |
| The problem | 6.5 to 9.4 s | His seven letters, sealed in red, each addressed as Purify titles it. THEIR ORIGINAL WRITINGS, then COMPLETELY IGNORED. as the letters grey over. |
| Purify, the fix | 9.4 to 18.9 s | The letter to the Romans breaks its seal. Its page rises out, printed with the reader's own first screen in ink, the envelope falls away, and the page opens into the phone while the screen comes on from the top over the same words. It scrolls to the passage and marks "I am the wheat of God, and let me be ground by the teeth of the wild beasts, that I may be found the pure bread of Christ." on the voice, then holds it to be read. Then five early writers as Purify carries them, the whole road again, Completely *free*., and the lockup. |

## What is on screen, and where it comes from

| Shot | Source | Rights |
| --- | --- | --- |
| Map of the Mediterranean | Natural Earth 4.1.0 land, via world-atlas 2.0.2, projected by `tools/mapdata.mjs` and drawn in code | Public domain data (world-atlas is ISC) |
| Road, ink, letters, seals, phone, the writers' list, lockup | drawn in code, `comp.js` | Purify's own |
| The reader in the phone | the app's own `/saints/ignatius-of-antioch/epistle-to-the-romans` at 390 by 844 | Purify's own |
| The quote | that page, verbatim: Roberts-Donaldson, Ante-Nicene Fathers 1 (1885) | Public domain |
| Martyrs' names, places, years | `lib/saints/saints.ts`, each saint's `reposed` field | Purify's own data |
| Inter, Lora | Open Font License | free for commercial use |

No icon is used. The saint page shows an icon of Ignatius, but `lib/saints/iconRights.ts` lists
its rights as unverified, so only the text screens were captured.

## What the words on screen claim

- The road: Jerusalem to Antioch, then Antioch through Smyrna, Troas, Philippi and the Via
  Egnatia to Rome. That is the way Ignatius was taken, and he wrote to the Romans from Smyrna. The
  reader's own editor's note says it: "sent under guard from Antioch to Rome to be martyred in
  the arena, c. AD 108. He wrote seven letters on the journey."
- THE MARTYRS: Stephen, Jerusalem, c. 34; Peter and Paul, Rome, c. 67; Ignatius, Rome, c. 108;
  Polycarp, Smyrna, c. 155; Justin, Rome, c. 165; Cyprian, Carthage, 258; Lawrence, Rome, 258.
  Each one is exactly as the app's saints index gives it.
- The seven letters and the five writers use the app's own titles. Irenaeus's is "Against
  Heresies: On the Fourth Gospel" because Purify carries selections, not the whole work.
- "Completely free" was checked against the free tier in `lib/premium/plans.ts` ("Every saint's
  life, and the primary writings of the Fathers").
- The risk for the owner to weigh: "completely ignored today" is the voiceover's opinion, not a
  fact the screen can show. It is said, and shown as the letters dimming, but nothing on screen
  presents it as a number.
- Both speech models hear "who pled to keep the church alive" and "Unlock and completely free".
  The script will settle "bled" and "Unlocked". Neither word is shown on screen, and "unlock" is
  banned on screen by `docs/brand/voice.md` anyway.

## Rebuild

From this folder, with the repo's `node_modules` installed and Python 3 with `numpy`, `scipy`,
`soundfile`, `librosa` and `Pillow`. The capture, cover and speech tools are AD 1's, in
`../ad1-edit/tools`.

1. **Measure.** `../ad1-edit/tools/asr_ts.py` and `wordsnap.py` give the words. No beat-only
   file came with this one, so `../ad1-edit/tools/drums.py` splits the mix and `tools/grid.py`
   fits the beat grid to its drums (102 BPM, first beat 0.028 s).
2. **Map.** `npm pack world-atlas@2.0.2`, unpack it, then
   `node tools/mapdata.mjs <unpacked>/package/land-50m.json assets/map.json`.
3. **The reader.** Run the app (`npm run dev` at the repo root), then
   `node tools/reader-capture.mjs http://127.0.0.1:3000/saints/ignatius-of-antioch/epistle-to-the-romans work/ui`
   and `python3 tools/prep.py work/ui assets`. If every dynamic page answers 404 in dev, the dev
   cache is stale: stop the server, `rm -rf .next/dev`, and start it again.
4. **Fonts.** As in AD 2: Inter's OTFs and Lora's latin variable files in `fonts/`.
5. **Render.** Serve the folder (`python3 -m http.server 8771`), then
   `node ../ad1-edit/tools/capture.mjs http://127.0.0.1:8771/index.html frames full 30 18.9`
   and `node ../ad1-edit/tools/cover.mjs http://127.0.0.1:8771/index.html out/cover.png`.
6. **Encode** with the voiceover as it came, the same line as AD 2's README.

## The owner's notes, 2026-10-08

"Absolutely phenomenal work. The touch with the blood, the animation of the map, the pacing.
Extremely nice. This is your best." He called it A plus, almost S tier, and named three things.
They are now rules for every edit, and v2 (`purify-ad3-edit-v2.mp4`) answers all three:

1. **One continuous motion from one object to the next.** In v1 the phone faded up while the
   letter faded out over it, which looked iffy. In v2 the letter's page is the reader's first
   screen inked on vellum. It rises out of the envelope, the envelope falls away, the page grows
   into the screen, and the screen comes on from the top over the same words. A soft-edged wipe
   does that last step, so no frame sits half light and half dark.
2. **Text to be read stays up long enough to read.** v1 cut away about half a second after the
   passage was marked. v2 marks it line by line on the voice from 10.97 s, holds it whole to
   13.1 s with a slow push in, and lets the martyrs' list stand longer too.
3. **No rounded cards with a coloured bar on the left: it reads as vibe coded.** The five writers
   are now set like a manuscript's list: each name centred in Lora with its first letter in red,
   the title in italic beneath, a small red diamond between entries, and no boxes.

The verdict and the three rules are on the SSM board's store as an idea.

On v2 the owner said: "This is perfect." That closed the session. Its record is on the board as
four ideas: the v2 verdict with its preview, what was made, the rules, and what is still open.

## Sound

The clean edit carries the owner's audio only. Effects follow AD 2's way, a separate last step
for his yes or no, once he has ruled on AD 2's set, so both pieces share one approved sound
language.

## Posting

- If the beat is a borrowed TikTok sound, as AD 1's and AD 2's were: TikTok only, never
  promoted (SSM guardrail 2).
- The cover carries the hook over the whole road from Jerusalem to Rome.
- In the books: AD 3 is on the SSM board's store as an idea, with a 540 by 960 preview and the
  poster uploaded to the board. It files into `ssm/` at the next `node ssm/ssm.mjs sync` in the
  purify-ads repo.
