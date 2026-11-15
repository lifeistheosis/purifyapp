#!/usr/bin/env bash
# Updates 83: the motion walk on Gate 3c's groups 1 and 2 and /account/'s flash,
# on one export of the head (node scripts/gate/export.mjs first). Both readers,
# motion on then reduced, twice each, one worker, one lane at a time.
#   bash docs/handoffs/updates-83-runners/walk.sh <results dir>
set -u
OUT="${1:?results dir}"
mkdir -p "$OUT"
ONLY="/account/,/account/data/,/account/eikon-box/,/account/notifications/,/account/profile/,/account/security/,/account/sessions/,/plan/,/set-password/,/campaigns/detail/,/email/first-week/,/email/change/,/email/unsubscribe/"
CONTROLS="Open Security|Choose what email you get"
for mode in on reduced; do
  for reader in open new; do
    for run in 1 2; do
      tag="$([ "$mode" = on ] && echo mw || echo mwr)-$reader-$run"
      extra=(); [ "$mode" = reduced ] && extra=(--reduced)
      sells=(); [ "$reader" = new ] && sells=(env SELLS_PLUS=1)
      echo "== $tag $(date -u +%H:%M:%S)"
      "${sells[@]}" env NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --only "$ONLY" \
        --controls "$CONTROLS" --workers 1 --json "$OUT/$tag.json" --shots "$OUT/$tag-shots" "${extra[@]}" \
        > "$OUT/$tag.log" 2>&1
      echo "   exit $? $(tail -1 "$OUT/$tag.log" | cut -c1-160)"
    done
  done
done
