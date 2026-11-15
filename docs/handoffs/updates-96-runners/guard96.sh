#!/usr/bin/env bash
# Updates 96's checkMock with pixels: /account/ alone on all 21 palettes and looks (guardrail-walk --every), at
# 390, 800 and 1032, en and ar, for one reader per call (new: the shell that sells Plus; open), so each chain
# stays well under the two-hour limit for a background job.
#   bash docs/handoffs/updates-96-runners/guard96.sh <results dir> <new|open>
set -u
RES="${1:?results dir}"; reader="${2:?new or open}"
mkdir -p "$RES"
for size in 390x844 800x1280 1032x1376; do
  for lang in en ar; do
    tag="g-$reader-$lang-${size%%x*}"
    echo "== $tag $(date -u +%H:%M:%S)"
    sells=(); [ "$reader" = new ] && sells=(env SELLS_PLUS=1)
    langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
    "${sells[@]}" env NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --only /account/ \
      --workers 2 --online --every --size "$size" "${langs[@]}" --json "$RES/$tag.json" --looks "$RES/looks-$tag" > "$RES/$tag.log" 2>&1
    echo "   exit $? $(tail -1 "$RES/$tag.log" | cut -c1-200)"
  done
done
