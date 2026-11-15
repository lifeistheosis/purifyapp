#!/usr/bin/env bash
# Updates 92's walk: the switch into /set-password/, both readers, motion on and then --reduced, four runs each, one
# worker, as Updates 90's walk.sh --set-password ran it.
#   bash docs/handoffs/updates-92-runners/walk92.sh <results dir>
set -u
OUT="${1:?results dir}"
mkdir -p "$OUT"
for mode in on reduced; do
  for reader in open new; do
    for run in 1 2 3 4; do
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
