#!/usr/bin/env bash
# Updates 96's walk: the switch into /set-password/ from /, both readers, motion on and then --reduced, six runs
# each, one worker, as walk92.sh ran it (four runs each there).
#   bash docs/handoffs/updates-96-runners/walk96.sh <results dir> [on|reduced ...]
set -u
OUT="${1:?results dir}"; shift
MODES="${*:-on reduced}"
mkdir -p "$OUT"
for mode in $MODES; do
  for reader in open new; do
    for run in 1 2 3 4 5 6; do
      tag="$([ "$mode" = on ] && echo mw || echo mwr)-$reader-$run"
      extra=(); [ "$mode" = reduced ] && extra=(--reduced)
      sells=(); [ "$reader" = new ] && sells=(env SELLS_PLUS=1)
      echo "== $tag $(date -u +%H:%M:%S)"
      "${sells[@]}" env NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --only /set-password/ \
        --controls "none named" --workers 1 --json "$OUT/$tag.json" --shots "$OUT/$tag-shots" "${extra[@]}" \
        > "$OUT/$tag.log" 2>&1
      echo "   exit $? $(tail -1 "$OUT/$tag.log" | cut -c1-200)"
    done
  done
done
