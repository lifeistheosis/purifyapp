#!/usr/bin/env bash
# Updates 98v (2026-11-17): the checks for You with days kept, on one export of the fixed head.
# Each step runs to its end, writes "OK <step>" to $W/chain.txt and is skipped when the chain starts again
# (the container restarts and kills every process). Start it, or start it again after a restart:
#   W=<scratch>/98v setsid nohup bash docs/handoffs/updates-98v-walks/chain98v.sh > <scratch>/98v/chain.log 2>&1 &
# Raw results stay in $W; the walks' JSON, gzipped, and the walks' logs go to docs/handoffs/updates-98v-walks/.
set -u
cd /home/user/purifyapp
D=docs/handoffs/updates-98v-walks
W=${W:?scratch dir}
mkdir -p "$W" "$D"
touch "$W/chain.txt"
stamp() { date -u +%H:%M:%S; }
done_() { grep -qx "OK $1" "$W/chain.txt"; }
step() { # name, then the command; its log is $W/<name>.log
  local name=$1; shift
  done_ "$name" && { echo "$name skipped (done)"; return 0; }
  echo "$name START $(stamp)"
  NODE_USE_ENV_PROXY=1 "$@" > "$W/$name.log" 2>&1
  local rc=$?
  echo "$name EXIT $rc $(stamp) $(grep -v -E '^\s*$' "$W/$name.log" | tail -1 | cut -c1-200)"
  echo "OK $name" >> "$W/chain.txt"
  return $rc
}
# You with days kept: round 3's seeds, as new6.sh passes them to the tap walk.
mapfile -t KEPT < <(node -e '
  const y=require("./docs/1.9-build/redesign/round-3/you-lines.json"); const s=y.find(x=>x.name==="you-kept");
  for (const [k,v] of Object.entries(s.set)) { console.log("--store"); console.log(k+"="+(typeof v==="string"?v:JSON.stringify(v))); }')

until grep -q "^unit exit" "$W/../unit.log" 2>/dev/null; do sleep 20; done
grep -q "^OK unit" "$W/chain.txt" || { echo "unit $(tail -1 "$W/../unit.log") $(stamp)"; echo "OK unit" >> "$W/chain.txt"; }

step web npm run build
step export node scripts/gate/export.mjs
[ -f out/account/index.html ] || { echo "no export: stopping $(stamp)"; exit 1; }

# The tap walk, as Gate 6c's `new6.sh you` ran it: with days kept (no network: a stand-in session), and a new reader.
step tap-you-kept node scripts/tap-walk.mjs out --max 1000 --only /account/,/account/profile/ "${KEPT[@]}" --json "$W/tap-you-kept.json"
step tap-you-kept-ar node scripts/tap-walk.mjs out --max 1000 --only /account/,/account/profile/ "${KEPT[@]}" --lang ar --json "$W/tap-you-kept-ar.json"
step tap-you-new env SELLS_PLUS=1 node scripts/tap-walk.mjs out --max 1000 --online --only /account/,/account/profile/,/journal/write/,/prayers/,/plans/gospels/ --json "$W/tap-you-new.json"
step tap-you-new-ar env SELLS_PLUS=1 node scripts/tap-walk.mjs out --max 1000 --online --only /account/ --lang ar --json "$W/tap-you-new-ar.json"

# checkMock with pixels on /account/, every palette and look (all 21), at 390, 800 and 1032, en and ar:
# as a new reader (walks6c.sh guard) and with days kept.
for size in 390x844 800x1280 1032x1376; do
  for lang in en ar; do
    langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
    step "guard-new-$lang-${size%%x*}" env SELLS_PLUS=1 node scripts/guardrail-walk.mjs out --workers 1 --online --every --size "$size" "${langs[@]}" \
      --only /account/ --looks "$W/looks-new-$lang-${size%%x*}" --json "$W/guard-new-$lang-${size%%x*}.json"
    step "guard-kept-$lang-${size%%x*}" node scripts/guardrail-walk.mjs out --workers 1 --every --size "$size" "${langs[@]}" "${KEPT[@]}" \
      --only /account/ --looks "$W/looks-kept-$lang-${size%%x*}" --json "$W/guard-kept-$lang-${size%%x*}.json"
  done
done

# The motion walk on /account/ at CPU 4x, both lanes, as walks6.sh runs it.
for lane in on reduce; do
  r=(); [ "$lane" = reduce ] && r=(--reduced)
  step "motion-$lane" env SELLS_PLUS=1 node scripts/motion-walk.mjs out --workers 2 --online --cpu 4 "${r[@]}" --only /account/ \
    --json "$W/motion-$lane.json" --shots "$W/shots-motion-$lane"
done

for f in "$W"/*.json; do gzip -c "$f" > "$D/$(basename "$f").gz"; done
# The walks' logs only: the build's and the export's stay in $W (the export reads the main web's public key, which is
# printed, saved and committed nowhere).
for f in "$W"/tap-*.log "$W"/guard-*.log "$W"/motion-*.log; do [ -f "$f" ] && cp "$f" "$D/"; done
echo "DONE $(stamp)"
