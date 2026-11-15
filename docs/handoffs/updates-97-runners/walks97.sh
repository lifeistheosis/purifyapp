#!/usr/bin/env bash
# Updates 97: Updates 95's walk on the arrival into Matthew 28, on one export of the head (out/), one walk at a
# time, nothing else running. No network (no --online): both readers, motion on then --reduced, twice each.
# Then --online once per reader and lane.
set -u
cd /home/user/purifyapp
D=docs/handoffs/updates-97-runners
ONLY="/history/alaska-mission/"
CONTROLS="Matthew 28:19-20"
run() { # name, reader(open|new), extra flags
  local name=$1 reader=$2; shift 2
  local env=""; [ "$reader" = new ] && env="SELLS_PLUS=1"
  env $env NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 1 "$@" --only "$ONLY" --controls "$CONTROLS" --json "$D/$name.json" > "$D/$name.log" 2>&1
  echo "$name EXIT $? $(date -u +%H:%M)"; gzip -f "$D/$name.json"
}
for i in 1 2; do
  run mw-open-$i open; run mw-new-$i new
  run mwr-open-$i open --reduced; run mwr-new-$i new --reduced
done
run o-open-1 open --online; run o-new-1 new --online
run or-open-1 open --online --reduced; run or-new-1 new --online --reduced
