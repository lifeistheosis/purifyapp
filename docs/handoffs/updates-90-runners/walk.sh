#!/usr/bin/env bash
# Updates 90's walk on one export of the head: both readers, motion on and then
# --reduced, two runs each, one worker. The switches into every page that stood
# behind an empty boundary (item 1), /account/ (item 2), and the theology rows
# that open a page (item 3, named in controls.txt beside this file).
#   bash docs/handoffs/updates-90-runners/walk.sh <results dir> [--set-password]
set -u
OUT="${1:?results dir}"
mkdir -p "$OUT"
HERE="$(cd "$(dirname "$0")" && pwd)"
ONLY="/campaigns/detail/,/email/change/,/email/first-week/,/email/unsubscribe/,/bible/multi/,/shop/request/,/shop/orders/detail/,/shop/ambassador/,/shop/checkout/cancelled/,/shop/checkout/success/,/shop/messages/detail/,/florilegium/gathering/,/account/,$(cat "$HERE/screens.txt")"
CONTROLS="Open Security|Choose what email you get|$(cat "$HERE/controls.txt")"
RUNS="1 2"
if [ "${2:-}" = "--set-password" ]; then ONLY="/set-password/"; CONTROLS="none named"; RUNS="3 4"; fi
for mode in on reduced; do
  for reader in open new; do
    for run in $RUNS; do
      # /set-password/: two more runs in the lane where Updates 83 saw its one blank (motion on, the open reader).
      [ "${2:-}" = "--set-password" ] && { [ "$reader" = new ] || [ "$mode" = reduced ]; } && continue
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
