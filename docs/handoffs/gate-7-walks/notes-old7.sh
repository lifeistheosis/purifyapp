#!/usr/bin/env bash
# Gate 7, part 5: every fault mended since Gate 6c (its motion rows, You with days kept, Updates 98s's Nicaea tap)
# and every walk note of the last builds (100: none; 101: one, not a fault) has its own test that fails on the old
# code. The old code is 03d77d02b, the tree Gate 6c's app code stood on when Updates 98s began. The head's version
# of each item's tests is put into a worktree of it and run there, then on the head; a test proves its item when
# it fails there (or fails to load: what it proves did not exist) and passes here.
#   bash docs/handoffs/gate-7-walks/notes-old7.sh <scratch dir>
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-7-walks
W=${1:?scratch dir}/old-03d77d02b
OLD=03d77d02b
ITEMS=(
  "motion-reading-door:lib/reading/__tests__/room.test.ts lib/ui/__tests__/gateSixMotion.test.ts"
  "motion-prayers-chant:lib/ui/__tests__/gateSixMotion.test.ts"
  "motion-settings-choices:lib/settings/__tests__/spaceChoicesMove.test.ts lib/settings/__tests__/litPanels.test.ts"
  "motion-dictionary:lib/search/__tests__/dictionaryWords.test.ts"
  "nicaea-tap:lib/ui/__tests__/awayTakesNoTouch.test.ts"
  "you-kept-back-share:lib/you/__tests__/youBack.test.ts"
  "whatsnew-line:lib/whatsNew/__tests__/highlightsSub.test.ts"
  "heart-alone:lib/listen/__tests__/heartOnly.test.ts lib/whatsNew/__tests__/heartOnlyLines.test.ts"
)
[ -d "$W" ] || git worktree add --detach "$W" "$OLD" > /dev/null 2>&1
ln -sfn /home/user/purifyapp/node_modules "$W/node_modules"
ALL=()
for n in "${ITEMS[@]}"; do for f in ${n#*:}; do ALL+=("$f"); done; done
for f in $(printf '%s\n' "${ALL[@]}" | sort -u); do mkdir -p "$W/$(dirname "$f")"; cp "$f" "$W/$f"; done
for n in "${ITEMS[@]}"; do
  item=${n%%:*}
  for f in ${n#*:}; do
    old=$(cd "$W" && npx vitest run "$f" 2>&1 | grep -E 'Tests |Test Files|Error:|FAIL' | tr -s ' ' | tr '\n' ' ' | cut -c1-260)
    new=$(npx vitest run "$f" 2>&1 | grep -E 'Tests |Test Files' | tr -s ' ' | tr '\n' ' ' | cut -c1-200)
    echo "$item | $f | OLD: $old | HEAD: $new"
  done
done
