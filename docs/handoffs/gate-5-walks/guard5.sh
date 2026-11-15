#!/usr/bin/env bash
# Gate 5 (2026-11-15), step 4: checkMock with pixels on the looks no fixer measured, the open reader, en and ar, at
# 390, 800 and 1032, all 21 palettes and looks (--every), one run at a time:
#   /history/alaska-mission/ and /walkthroughs/job/1/ with no network (the event plate held as it opened; the
#   portrait's empty square), by scripts/guardrail-walk.mjs; then /reading/ with a See all's list opened in place,
#   online, by seeall5.mjs.
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-5-walks
for size in 390x844 800x1280 1032x1376; do
  for lang in en ar; do
    tag="g-open-$lang-${size%%x*}"
    langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
    NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --only /history/alaska-mission/,/walkthroughs/job/1/ \
      --workers 2 --every --size "$size" "${langs[@]}" --json "$D/$tag.json" > "$D/$tag.log" 2>&1
    echo "$tag EXIT $? $(date -u +%H:%M:%S) $(tail -1 "$D/$tag.log" | cut -c1-160)"; gzip -f "$D/$tag.json"
  done
done
NODE_USE_ENV_PROXY=1 node $D/seeall5.mjs out $D/seeall5.jsonl 390@en@open 800@en@open 1032@en@open 390@ar@open 800@ar@open 1032@ar@open > $D/seeall5.txt 2>&1
echo "seeall5 EXIT $? $(date -u +%H:%M:%S)"
echo "DONE guard $(date -u +%H:%M:%S)"
