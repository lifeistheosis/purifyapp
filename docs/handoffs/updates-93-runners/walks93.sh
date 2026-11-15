#!/usr/bin/env bash
# Updates 93: the after walks on one export (out/), one after another, never beside a build or the suite.
#   bash walks93.sh <out dir> <json dir>
# Gate 4's ten Try again screens with no network (no --online), --controls "Try again", both readers,
# motion on then reduced, twice each; then the same screens --online, both readers, both lanes, once.
set -u
OUT=$1; J=$2; mkdir -p "$J"
ONLY="/campaigns/,/campaigns/detail/,/campaigns/mine/,/campaigns/new/,/campaigns/rules/,/community/,/community/moderate/,/shop/,/shop/category/all/,/shop/stores/"
walk() { # name, sells, extra args...
  local name=$1 sells=$2; shift 2
  SELLS_PLUS=$sells NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs "$OUT" --workers 1 --json "$J/$name.json" "$@" > "$J/$name.log" 2>&1
  echo "$name exit $?"
}
for mode in on reduced; do
  pre=tw; extra=(); [ $mode = reduced ] && pre=twr && extra=(--reduced)
  for run in 1 2; do
    walk "$pre-new-$run" 1 --only "$ONLY" --controls "Try again" "${extra[@]}"
    walk "$pre-open-$run" 0 --only "$ONLY" --controls "Try again" "${extra[@]}"
  done
done
for mode in on reduced; do
  pre=ow; extra=(); [ $mode = reduced ] && pre=owr && extra=(--reduced)
  walk "$pre-new-1" 1 --only "$ONLY" --controls "Try again" --online "${extra[@]}"
  walk "$pre-open-1" 0 --only "$ONLY" --controls "Try again" --online "${extra[@]}"
done
echo ALL DONE
