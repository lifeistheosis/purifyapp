# Baton: Updates 60 (the Size chip's ratio, 1.9)

Written 2026-11-14. get_session read 150,517 once the checks were green, before the export: at the brief's 150,000 line, so item 2 was not started.

## Role and scope

Fixer (docs/roles/fixer.md), from Arbiter 12's brief at its hand-over, reporting to Arbiter 13. Changed components/share/PictureSheet.tsx:460; added lib/share/__tests__/pictureSizeRatio.test.ts and docs/handoffs/updates-60-runners/mockrun60.mjs. No other file touched.

## Done, with hashes

- **cdda2b281, the mend.** The chosen Size chip's ratio, `text-night/55` to `text-night/62` (the same ink on the chip's `bg-paper`). Worst palette, Mosaic: 3.73:1 by pixels before (Updates 58), 3.72:1 by the stylesheet's tokens; 4.61:1 by the tokens after. /60 would leave Mosaic at 4.33:1, so /62 is the least share that holds all 21. The test fails on /55 with Updates 58's 12 palettes (Dark 4.19, Candlelight 4.11, Monastery 3.97, Councils 3.97, Cappadocian 3.94, Night sky 4.35, Dawn 4.22, Incense 3.88, Holy Mountain 3.95, Forest 3.95, Mosaic 3.72, Damask 4.01) and passes on /62.
- **The checklist.** typecheck exit 0. eslint on the two files exit 0. Unit suite: 1194 files passed, 1 skipped; 15,135 tests passed. `npm run build`: compiled successfully, exit 0. `node scripts/gate/export.mjs`: exit 0, cut from fe9a762f8 on a clean tree, 205.2 MB on disk in 7,372 files, 75.1 MB packed; its CSS holds `.text-night\/62`. The rebase onto b37d86ff3 brought docs only; nothing under app/, components/, lib/, public/ or scripts/ differs from fe9a762f8 to a7b53c5a4, so the export stands for the head.
- **a7b53c5a4, the runner.** mockrun60 is mockrun58 with each jsonl line naming its unmeasured words (`unmeasuredList`), and a state `pic-2t` that taps the Size chips as a reader does and is measured with Square chosen.
- **checkMock `{ pixels: true }`.** pic-2, pic-2t, pic-0 and pic-1 at 390, 800 and 1032, en and ar, each on the three groups: 72 measures, 0 fails, 0 runner errors, 0 page errors, 0 unmeasured, 0 allowed. The unchosen chips' `text-paper/45` passed, including Story's 9:16 unchosen in pic-2t, so it was not changed.
- **The chips tapped.** At each width, in en and ar: Square, then only Square pressed and the preview 540x540; Post, 540x675; Story, 540x960; Square again, 540x540.
- **Updates 58's two unmeasured words.** None is on the picture sheet: 0 unmeasured on all three tabs at every width, in both languages. They are on Word study, the journal's sheet or For the living's sheet, which the brief did not ask for again.

## Open, each with its owner

1. **Item 2** (the next checks chat): not started. (a) The ambience preview on Councils at 390 in English, run again before any change (updates-51.md Open 2). (b) A quote's looks tapped (quote51). (c) The florilegium picker with several gatherings, the campaign sheets and highlight names, with keyboard-sheet-walk on a folder (562b2ed8a).
2. **Updates 58's two unmeasured words** (the next checks chat, at the arbiter's word): mockrun60 on ws-0, ws-1, journal and living names them in its jsonl.
3. **The phone walk** (updates-55.md Open 3, the owner): unchanged.

## Gotchas

- `node docs/handoffs/updates-60-runners/mockrun60.mjs out <jsonl> 2 <state@width@lang>...`, as mockrun58. Launch it with run_in_background: a run started with `&` and disown sends no notice when it ends.
- Any whole share works as an opacity modifier; /62 is new to the stylesheet with this mend.
