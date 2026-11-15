#!/bin/bash
# Updates 94 (2026-11-15): the walk after the mend, on one export of the head, one run at a time.
# --online, the three screens, the two controls; both readers, motion on and --reduced, twice each (8 walks).
# Then a post's replies' Try again with no network (replies94.mjs), twice per lane, and item 4 (offline94.mjs).
cd /home/user/purifyapp
D=docs/handoffs/updates-94-runners/walks
mkdir -p $D
ONLY="/prayers/bows/,/reading/,/community/"
CONTROLS="Read it in Purify|See all"
for reader in open new; do
  for lane in on reduced; do
    for n in 1 2; do
      run="w-$reader-$lane-$n"
      flag=""; [ "$lane" = reduced ] && flag="--reduced"
      if [ "$reader" = new ]; then sp="SELLS_PLUS=1"; else sp=""; fi
      env $sp NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 1 --online $flag --only "$ONLY" --controls "$CONTROLS" --json $D/$run.json --shots $D/shots-$run > $D/$run.txt 2>&1
      echo "$run EXIT $? $(date -u +%H:%M)" >> $D/chain.txt
    done
  done
done
for lane in on reduce; do
  for n in 1 2; do
    NODE_USE_ENV_PROXY=1 node docs/handoffs/updates-94-runners/replies94.mjs out $lane > $D/replies-$lane-$n.txt 2>&1
    echo "replies-$lane-$n EXIT $? $(date -u +%H:%M)" >> $D/chain.txt
  done
done
node docs/handoffs/updates-94-runners/offline94.mjs out $D/mock94.jsonl 390@en@open 800@en@open 1032@en@open 390@ar@open 800@ar@open 1032@ar@open > $D/mock94.txt 2>&1
echo "mock94 EXIT $? $(date -u +%H:%M)" >> $D/chain.txt
echo DONE >> $D/chain.txt
