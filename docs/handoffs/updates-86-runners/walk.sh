#!/usr/bin/env bash
# Updates 86's after side (2026-11-15): Gate 3c's group 7 (EIKON's carry) and
# group 9's three shop and heresies flashes, measured again on one export of
# the head. Both readers, motion on and then reduced, twice each, one worker,
# one run at a time, the named controls only (the walk's --controls), on the
# screens the findings name. Messages is walked with them: it had the same
# start as Orders and Requests and the same mend.
#
#   node scripts/gate/export.mjs        (first, on a clean tree)
#   bash docs/handoffs/updates-86-runners/walk.sh
set -u
cd "$(dirname "$0")/../../.."
OUT_DIR=docs/handoffs/updates-86-runners
ONLY=/shop/stores/,/shop/cart/,/shop/orders/,/shop/orders/detail/,/shop/requests/,/shop/sell/application/,/heresies/
CONTROLS='EIKON|Orders|Requests|Messages|Marcionism'
for lane in on reduced; do
  for reader in new open; do
    for n in 1 2; do
      name="mwr-${reader}-${n}"; [ "$lane" = on ] && name="mw-${reader}-${n}"
      sells=0; [ "$reader" = new ] && sells=1
      extra=(); [ "$lane" = reduced ] && extra=(--reduced)
      echo "== $name ($(date -u +%H:%M:%S))"
      SELLS_PLUS=$sells NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --only "$ONLY" --workers 1 --online \
        --controls "$CONTROLS" --json "$OUT_DIR/$name.json" --shots "$OUT_DIR/$name" "${extra[@]}" > "$OUT_DIR/$name.log" 2>&1
      echo "   exit $? ($(date -u +%H:%M:%S))"
    done
  done
done
