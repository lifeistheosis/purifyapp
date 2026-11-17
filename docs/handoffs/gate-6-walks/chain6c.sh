#!/usr/bin/env bash
# Gate 6c (2026-11-16/17): the rest of the gate on the one export of 4ca097da3 (out/), one step at a time, detached.
# The container is restarted every 81 minutes (23:57, 01:18, 02:39 UTC), which kills whatever runs, so every step is
# cut to finish inside one container's life, writes "OK <step>" to $S/chain.txt when it has run to its end, and is
# skipped when the chain is started again. $S/chain.done is written at the end.
#   setsid nohup bash docs/handoffs/gate-6-walks/chain6c.sh > $S/chain.log 2>&1 &
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-6-walks
export GATE6_SCRATCH=${GATE6_SCRATCH:-/tmp/gate6}
S=$GATE6_SCRATCH
mkdir -p "$S"; touch "$S/chain.txt"
stamp() { date -u +%H:%M:%S; }
say() { echo "$*" >> "$S/chain.txt"; }
last() { grep -v -E '^\s*$|UNDICI|trace-warnings|MODULE_TYPELESS|Reparsing|eliminate this' "$1" | grep -E "${2:-.}" | tail -1 | cut -c1-220; }
# At 800 and 1032 on all 21: one screen of each rail with a current item and the three screens of the fasting dot
# (/reading/ closed the walker's page twice at 21 in Arabic, so the reading room's rail is read on a path's page).
WIDE="/prayers/today/,/prayers/,/fasting/,/shop/,/shop/category/all/,/shop/category/apparel/,/shop/icons/byzantine-three-beam-wall-cross/,/saints/abraham-of-smolensk/,/reading/paths/nativity/,/chants/,/account/,/plan/"
STEPS="reading5 tap-en tap-ar order guard-800-en guard-800-ar guard-1032-en guard-1032-ar tests"
for n in 1 2 3 4; do STEPS="$STEPS light-en-$n light-ar-$n"; done
for n in 1 2 3 4; do STEPS="$STEPS motion-on-$n motion-reduce-$n"; done
STEPS="$STEPS you journal listen player lines round3 web"
for step in $STEPS; do
  grep -q "^OK $step\$" "$S/chain.txt" && continue
  say "START $step $(stamp)"
  case "$step" in
    reading5|tap-en|tap-ar|order) say "OK $step" ;; # run before this chain was cut finer (results in $D)
    guard-*) size=${step#guard-}; lang=${size#*-}; size=${size%-*}
      bash $D/walks6c.sh guard "$size" "$lang" "$WIDE" > /dev/null 2>&1
      say "$step $(stamp) $(last "$D/c-$lang-$size.log" 'screens measured')"; [ -f "$D/c-$lang-$size.json.gz" ] && say "OK $step" ;;
    tests) bash $D/walks6c.sh tests > "$S/tests.out" 2>&1; say "$(grep EXIT "$S/tests.out" | tr '\n' ' ' | cut -c1-300)"
      grep -q "^part3 EXIT" "$S/tests.out" && say "OK $step" ;;
    light-*) n=${step##*-}; lang=${step#light-}; lang=${lang%-*}; tag="light-$lang-390-$n"; langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --workers 3 --online --light "${langs[@]}" --only "$(cat $D/screens-$n.txt)" \
        --looks "$S/looks-$tag" --json "$D/$tag.json" > "$D/$tag.log" 2>&1
      say "$step EXIT $? $(stamp) $(last "$D/$tag.log" 'screens measured')"; [ -f "$D/$tag.json" ] && gzip -f "$D/$tag.json" && say "OK $step" ;;
    motion-*) n=${step##*-}; lane=${step#motion-}; lane=${lane%-*}; tag="m-new-$lane-$n"; r=(); [ "$lane" = reduce ] && r=(--reduced)
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 2 --online --cpu 4 "${r[@]}" --only "$(cat $D/screens-$n.txt)" \
        --json "$D/$tag.json" --shots "$S/shots-$tag" > "$D/$tag.log" 2>&1
      say "$step EXIT $? $(stamp) $(last "$D/$tag.log")"; [ -f "$D/$tag.json" ] && gzip -f "$D/$tag.json" && say "OK $step" ;;
    you|journal|listen|player|lines) bash $D/new6.sh "$step" > "$S/new-$step.out" 2>&1; say "$(grep -v '^DONE' "$S/new-$step.out" | tr '\n' ' ' | cut -c1-600)"
      grep -q "^DONE" "$S/new-$step.out" && say "OK $step" ;;
    round3) NODE_USE_ENV_PROXY=1 node $D/round3-probe.mjs out "$S/round3" > "$D/round3-6c.log" 2>&1; e=$?
      say "round3 EXIT $e $(stamp) $(grep -c 'note line' "$D/round3-6c.log") screens"; cp "$S/round3/round3-words.json" "$D/round3-words-6c.json" 2>/dev/null && say "OK $step" ;;
    web) npm run build > "$S/web-build.txt" 2>&1; e=$?; say "web-build EXIT $e $(stamp) $(grep -E 'Compiled|rror' "$S/web-build.txt" | head -2 | tr '\n' ' ' | cut -c1-200)"
      if [ $e = 0 ]; then
        (npm start > "$S/web-start.txt" 2>&1 &) ; for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/ && break; sleep 2; done
        NODE_USE_ENV_PROXY=1 node scripts/gate/books-version.mjs out http://localhost:3000 > "$D/books-version-6c.log" 2>&1; e=$?
        say "books-version EXIT $e $(stamp) $(last "$D/books-version-6c.log")"
        pkill -f "next start"; pkill -f "next-server"; say "OK $step"
      fi ;;
  esac
done
say "CHAIN DONE $(stamp)"; touch "$S/chain.done"
