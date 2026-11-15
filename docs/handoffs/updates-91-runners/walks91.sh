#!/usr/bin/env bash
# Updates 91: the after walks on one export (out/), one after another, never beside a build or the suite.
#   bash walks91.sh <out dir> <json dir>
# Updates 89's six source screens and ten links, both readers, motion on then reduced, twice each;
# then /community/ offline (no --online), both readers, motion on and reduced, twice each.
set -u
OUT=$1; J=$2; mkdir -p "$J"
ONLY="/apologetics/atheism/,/bible/,/bible/multi/,/chants/,/reading/collections/anger/,/saints/"
CONTROLS="Luke 10:25-37 Gospel|Ephesians 2:14-22 Epistle|Psalms 4:4|Ephesians 4:26-27|James 1:19-20|An Exact Expositio|Back to the Bible|Psalm 135|Words and history|The Mother of God"
walk() { # name, sells, extra args...
  local name=$1 sells=$2; shift 2
  SELLS_PLUS=$sells NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs "$OUT" --workers 1 --json "$J/$name.json" "$@" > "$J/$name.log" 2>&1
  echo "$name exit $?"
}
for mode in on reduced; do
  pre=mw; extra=(); [ $mode = reduced ] && pre=mwr && extra=(--reduced)
  for run in 1 2; do
    walk "$pre-open-$run" 0 --only "$ONLY" --controls "$CONTROLS" "${extra[@]}"
    walk "$pre-new-$run" 1 --only "$ONLY" --controls "$CONTROLS" "${extra[@]}"
  done
done
for mode in on reduced; do
  pre=cw; extra=(); [ $mode = reduced ] && pre=cwr && extra=(--reduced)
  for run in 1 2; do
    walk "$pre-open-$run" 0 --only /community/ --controls "Ask a Priest" "${extra[@]}"
    walk "$pre-new-$run" 1 --only /community/ --controls "Ask a Priest" "${extra[@]}"
  done
done
echo ALL DONE
